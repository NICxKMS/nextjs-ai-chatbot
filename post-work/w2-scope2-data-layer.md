# W2 Scope 2 — Data Layer Bugs Report

## Summary

Fixed 3 correctness bugs, added 3 lightweight query functions, and removed 1 dead function across 4 files.

---

## 1. FK Cascade: Suggestion → Artifact

**File:** `lib/db/schema.ts`

**Problem:** The `suggestion` table's composite FK to `artifacts(id, createdAt)` was missing `ON DELETE CASCADE`. Deleting or restoring artifact versions caused FK violations for related suggestions.

**Before:**
```ts
artifactRef: foreignKey({
  columns: [t.artifactId, t.artifactCreatedAt],
  foreignColumns: [artifacts.id, artifacts.createdAt],
}),
```

**After:**
```ts
artifactRef: foreignKey({
  columns: [t.artifactId, t.artifactCreatedAt],
  foreignColumns: [artifacts.id, artifacts.createdAt],
}).onDelete("cascade"),
```

**Note:** Schema change only — no migration file generated. Migration must be generated separately via `drizzle-kit generate`.

---

## 2. Atomic Guest Transfer

**File:** `lib/data/chat.ts`

**Problem:** `transferGuestChats` only updated `chats.userId`, leaving `artifacts.userId` and `suggestions.userId` pointing at the old guest user. Post-transfer, artifact ownership checks failed silently.

**Before:**
```ts
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
  const result = await db
    .update(chats)
    .set({ userId: toUserId, updatedAt: new Date() })
    .where(eq(chats.userId, fromUserId))
    .returning({ id: chats.id })
  return result.length
}
```

**After:**
```ts
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
  return await db.transaction(async (tx) => {
    const updatedAt = new Date()

    const transferredChats = await tx
      .update(chats)
      .set({ userId: toUserId, updatedAt })
      .where(eq(chats.userId, fromUserId))
      .returning({ id: chats.id })

    await tx
      .update(artifacts)
      .set({ userId: toUserId, updatedAt })
      .where(eq(artifacts.userId, fromUserId))

    await tx
      .update(suggestions)
      .set({ userId: toUserId })
      .where(eq(suggestions.userId, fromUserId))

    return transferredChats.length
  })
}
```

**Decisions:**
- All three tables updated in a single `db.transaction()` — atomic rollback on any failure.
- Suggestions table has no `updatedAt` column, so only `userId` is updated.
- Artifacts `updatedAt` is set to same timestamp as chats for consistency.
- The function signature and return type are unchanged — callers (`features/auth/lib/action-utils.ts`) need no changes.
- New imports added: `artifacts`, `suggestions` from schema; removed unused `asc` and `Message` type imports.

---

## 3. Race Condition: deleteMessagesByIdAfter

**File:** `lib/data/message.ts`

**Problem:** SELECT then DELETE without a transaction — concurrent streaming could insert messages between the two operations, causing those messages to survive deletion.

**Before:**
```ts
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
  const target = await db
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
    .limit(1)

  const targetMessage = target[0]
  if (!targetMessage) return

  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), gte(messages.createdAt, targetMessage.createdAt)))
}
```

**After:**
```ts
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const target = await tx
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
      .limit(1)

    const targetMessage = target[0]
    if (!targetMessage) return

    await tx
      .delete(messages)
      .where(and(eq(messages.chatId, chatId), gte(messages.createdAt, targetMessage.createdAt)))
  })
}
```

**Decision:** Transaction approach over single subquery DELETE. Drizzle ORM doesn't natively support subqueries in DELETE WHERE clauses without `sql` template literals, and the transaction approach is more readable, uses the same Drizzle query builder pattern as the rest of the codebase, and provides equal atomicity guarantees (PostgreSQL transactions hold row-level locks).

---

## 4. Lightweight Ownership Queries

### getChatOwnerId

**File:** `lib/data/chat.ts`

```ts
export async function getChatOwnerId(chatId: string): Promise<string | null> {
  const result = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)
  return result[0]?.userId ?? null
}
```

- Selects **only** `userId` — no title, model, visibility, timestamps.
- Not cached — intended for authorization checks in Server Actions.
- Returns `null` when chat not found.

### getArtifactOwnerId

**File:** `lib/data/artifact.ts`

```ts
export async function getArtifactOwnerId(artifactId: string): Promise<string | null> {
  const result = await db
    .select({ userId: artifacts.userId })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .orderBy(desc(artifacts.createdAt))
    .limit(1)
  return result[0]?.userId ?? null
}
```

- Selects **only** `userId` from the latest version (artifact has composite PK: id + createdAt).
- `ORDER BY createdAt DESC LIMIT 1` ensures we get the newest version's owner.
- Not cached — authorization use only.

### getArtifactVersionsMeta

**File:** `lib/data/artifact.ts`

```ts
export async function getArtifactVersionsMeta(
  artifactId: string,
  limit = 100,
): Promise<{ id: string; createdAt: Date; title: string; kind: string }[]> {
  return await db
    .select({
      id: artifacts.id,
      createdAt: artifacts.createdAt,
      title: artifacts.title,
      kind: artifacts.kind,
    })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .orderBy(desc(artifacts.createdAt))
    .limit(limit)
}
```

- Excludes `content` (potentially large TEXT column) and `userId`/`chatId`.
- Same ordering and limit pattern as existing `getArtifactVersions`.

---

## 5. Dead Code Removal

**File:** `lib/data/chat.ts`

Removed `getChatWithMessages()` — annotated `@unused`, zero consumers. Chat page fetches chat and messages separately with individual cache tags.

Also removed its dependency: the `DEFAULT_MESSAGE_LIMIT` constant (only used by `getChatWithMessages`) and the `asc` import and `Message` type import which were no longer needed.

---

## Validation

| Check | Status |
|-------|--------|
| `biome check` on all 4 files | ✅ Clean |
| TypeScript errors in modified files | ✅ None |
| Full `tsc --noEmit` | ✅ Only pre-existing error in read-only `ai-elements/reasoning.tsx` |
| No unrelated files modified | ✅ |
| Caller compatibility (`action-utils.ts`) | ✅ `transferGuestChats` signature unchanged |

---

## Files Changed

| File | Changes |
|------|---------|
| `lib/db/schema.ts` | Added `.onDelete("cascade")` to Suggestion→Artifact FK |
| `lib/data/chat.ts` | Rewrote `transferGuestChats` (atomic transaction), added `getChatOwnerId`, removed `getChatWithMessages` + unused imports/constants |
| `lib/data/message.ts` | Wrapped `deleteMessagesByIdAfter` in `db.transaction()` |
| `lib/data/artifact.ts` | Added `getArtifactOwnerId` and `getArtifactVersionsMeta` |
