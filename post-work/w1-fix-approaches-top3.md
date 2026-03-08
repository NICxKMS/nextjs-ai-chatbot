# Fix Approaches: Top 3 Data Layer Bugs

**Date:** 2026-03-07
**Source:** w1-audit-lib-data-db.md — Deep-dive findings
**Status:** Research only — no code changes applied

---

## Bug 1: Suggestion→Artifact FK Missing CASCADE

### Current State
```ts
// lib/db/schema.ts:146-149
artifactRef: foreignKey({
    columns: [t.artifactId, t.artifactCreatedAt],
    foreignColumns: [artifacts.id, artifacts.createdAt],
}),
// No .onDelete("cascade") — Postgres default is NO ACTION
```

### Impact
- `handleRestore()` in `app/api/artifact/route.ts` calls `deleteArtifactVersion(id, afterRestore)`
- If ANY deleted artifact version has suggestions → Postgres FK violation → 500 error
- Affects every artifact that receives AI suggestions and later has a version restore

### Approach A: Schema Migration (RECOMMENDED)
**Risk:** LOW · **Effort:** ~15 min · **Disruption:** Requires migration

**Schema change:**
```ts
// lib/db/schema.ts:146-149
artifactRef: foreignKey({
    columns: [t.artifactId, t.artifactCreatedAt],
    foreignColumns: [artifacts.id, artifacts.createdAt],
}).onDelete("cascade"),
```

**Generated migration** (Drizzle Kit `pnpm drizzle-kit generate` will produce):
```sql
-- 0004_*.sql
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_artifact_id_artifact_created_at_Artifact_id_created_at_fk";
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_artifact_id_artifact_created_at_Artifact_id_created_at_fk"
  FOREIGN KEY ("artifact_id","artifact_created_at")
  REFERENCES "public"."Artifact"("id","created_at")
  ON DELETE CASCADE ON UPDATE NO ACTION;
```

**Steps:**
1. Add `.onDelete("cascade")` to `artifactRef` in schema.ts
2. Run `pnpm drizzle-kit generate` → produces migration SQL
3. Verify generated SQL matches expectation
4. Run `pnpm drizzle-kit migrate` against dev database
5. Test: create artifact → request suggestions → restore to earlier version → verify suggestions are cleaned up

**Why this approach:** Matches every other FK in the schema. Cascade is the correct semantic — suggestions belong to a specific artifact version; when that version is deleted, its suggestions are meaningless. No application code changes needed.

### Approach B: Application-Level Cleanup (ALTERNATIVE)
**Risk:** MEDIUM · **Effort:** ~30 min · **Disruption:** Code only, no migration

**Change:** Delete suggestions before deleting artifact versions in `handleRestore()`.

```ts
// app/api/artifact/route.ts — handleRestore()
async function handleRestore(data: RestoreArtifactInput, userId: string): Promise<Response> {
    const existing = await getArtifactById(data.id)
    if (!existing) { /* ... */ }
    if (existing.userId !== userId) { /* ... */ }

    const restorePoint = new Date(data.timestamp)
    const afterRestore = new Date(restorePoint.getTime() + 1)
    
    // NEW: Delete suggestions for versions being removed
    await db      // Would need new data function
        .delete(suggestions)
        .where(and(
            eq(suggestions.artifactId, data.id),
            gte(suggestions.artifactCreatedAt, afterRestore)
        ))
    
    await deleteArtifactVersion(data.id, afterRestore)
    // ...
}
```

**Why NOT this approach:** Requires a new data function, adds code complexity, and is fragile — any future code that deletes artifact versions must remember to clean up suggestions first. The FK cascade handles this automatically and universally.

### Recommendation: **Approach A** — schema migration with `.onDelete("cascade")`

---

## Bug 2: transferGuestChats Orphans Artifact & Suggestion Ownership

### Current State
```ts
// lib/data/chat.ts:272-280
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
    const result = await db
        .update(chats)
        .set({ userId: toUserId, updatedAt: new Date() })
        .where(eq(chats.userId, fromUserId))
        .returning({ id: chats.id })
    return result.length
}
```

Only `Chat.userId` is updated. `Artifact.userId` and `Suggestion.userId` remain pointing to the guest UUID.

### Impact (post-transfer failures)
| Operation | Result | Root Cause |
|-----------|--------|------------|
| Save artifact | 403 Forbidden | `artifact.userId !== session.user.id` |
| Restore artifact | 403 Forbidden | Same ownership check |
| Update artifact (AI tool) | Error thrown | Same ownership check |
| GET /api/artifact | 403 Forbidden | Same ownership check |
| GET /api/suggestions | 403 Forbidden | Same ownership check |

### Approach A: Atomic Multi-Table Transfer (RECOMMENDED)
**Risk:** LOW · **Effort:** ~20 min · **Disruption:** Single function change

```ts
// lib/data/chat.ts — replace transferGuestChats
export async function transferGuestChats(fromUserId: string, toUserId: string): Promise<number> {
    try {
        return await db.transaction(async (tx) => {
            // 1. Transfer chats
            const transferred = await tx
                .update(chats)
                .set({ userId: toUserId, updatedAt: new Date() })
                .where(eq(chats.userId, fromUserId))
                .returning({ id: chats.id })

            if (transferred.length === 0) return 0

            // 2. Transfer artifacts owned by this guest
            await tx
                .update(artifacts)
                .set({ userId: toUserId, updatedAt: new Date() })
                .where(eq(artifacts.userId, fromUserId))

            // 3. Transfer suggestions owned by this guest
            await tx
                .update(suggestions)
                .set({ userId: toUserId })
                .where(eq(suggestions.userId, fromUserId))

            return transferred.length
        })
    } catch (error) {
        throwDatabaseError(error, "Failed to transfer guest chats", {
            fromUserId,
            toUserId,
        })
    }
}
```

**Import changes:** Add `artifacts` and `suggestions` to schema imports in chat.ts.

**Why transaction:** If the artifact transfer succeeds but suggestion transfer fails, the guest would have partial ownership — worse than full orphaning. All-or-nothing is the correct semantic.

**Note on PgBouncer compatibility:** The codebase already uses `db.transaction()` in `createChatWithInitialMessage` and `saveMessagesAndTouchChat` with the same PgBouncer config (`prepare: false`). Confirmed working.

### Approach B: Cascading Through Chat FK (NOT VIABLE)
Could we change `Artifact.userId` to be derived from `Chat.userId`? No — artifact ownership is deliberately separate from chat ownership (allows future scenarios like shared artifacts). The userId column on artifacts serves as an independent authorization check.

### Approach C: Remove Artifact userId Checks, Use Chat Ownership (ALTERNATIVE)
**Risk:** MEDIUM-HIGH · **Effort:** ~45 min · **Disruption:** Changes authorization model

Replace all `artifact.userId !== session.user.id` checks with `chat.userId !== session.user.id` (since we know the chat was transferred correctly). This would mean checking artifact access through the parent chat.

**Why NOT this approach:** Changes the authorization model across 5+ files. Higher risk, more code changes, and loses the defense-in-depth of artifact-level ownership. If an artifact is somehow associated with a wrong chat, chat-level checks would miss it.

### Data Migration for Existing Orphans
If the app has been deployed with the current bug, there may be existing orphaned artifacts/suggestions in the database. A one-time fix:

```sql
-- Find orphaned artifacts (artifact.userId is a dead guest UUID, but chat was transferred)
SELECT a.id, a."user_id" as artifact_owner, c."user_id" as chat_owner
FROM "Artifact" a
JOIN "Chat" c ON a."chat_id" = c."id"
WHERE a."user_id" != c."user_id";

-- Fix orphaned artifacts
UPDATE "Artifact" a
SET "user_id" = c."user_id"
FROM "Chat" c
WHERE a."chat_id" = c."id" AND a."user_id" != c."user_id";

-- Fix orphaned suggestions (same pattern)
UPDATE "Suggestion" s
SET "user_id" = c."user_id"
FROM "Artifact" a
JOIN "Chat" c ON a."chat_id" = c."id"
WHERE s."artifact_id" = a."id" AND s."user_id" != c."user_id";
```

### Recommendation: **Approach A** + data migration script for existing orphans

---

## Bug 3: deleteMessagesByIdAfter Race Condition

### Current State
```ts
// lib/data/message.ts:87-110
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
    // QUERY 1: Find the target message's createdAt
    const target = await db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(and(eq(messages.id, messageId), eq(messages.chatId, chatId)))
        .limit(1)

    const targetMessage = target[0]
    if (!targetMessage) return

    // GAP — no transaction boundary — new messages could be inserted here

    // QUERY 2: Delete all messages at/after that timestamp
    await db
        .delete(messages)
        .where(
            and(eq(messages.chatId, chatId), gte(messages.createdAt, targetMessage.createdAt)),
        )
}
```

### Impact
The race window (~5-15ms) allows:
1. Streaming response's `persistChatResponse` inserts messages between QUERY 1 and QUERY 2
2. Those messages have `createdAt >= target` → erroneously deleted
3. User sees disappearing messages (the stream had already rendered them client-side)

### Approach A: Single Subquery DELETE (RECOMMENDED)
**Risk:** VERY LOW · **Effort:** ~10 min · **Disruption:** Minimal, atomic

```ts
import { and, eq, gte, sql } from "drizzle-orm"

export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
    try {
        await db
            .delete(messages)
            .where(
                and(
                    eq(messages.chatId, chatId),
                    gte(
                        messages.createdAt,
                        db
                            .select({ createdAt: messages.createdAt })
                            .from(messages)
                            .where(
                                and(
                                    eq(messages.id, messageId),
                                    eq(messages.chatId, chatId),
                                ),
                            )
                            .limit(1),
                    ),
                ),
            )
    } catch (error) {
        throwDatabaseError(error, "Failed to delete messages after target", {
            chatId,
            messageId,
        })
    }
}
```

**Why this approach:** Drizzle ORM v0.45.1 supports subqueries in `where()` clauses. This compiles to a single SQL statement:
```sql
DELETE FROM "Message_v2"
WHERE "chat_id" = $1
  AND "created_at" >= (
    SELECT "created_at" FROM "Message_v2"
    WHERE "id" = $2 AND "chat_id" = $1
    LIMIT 1
  )
```
Single statement = atomic at the Postgres level (no transaction needed). The subquery evaluates within the same snapshot as the DELETE.

**Edge case:** If the subquery returns NULL (message not found), the `>=` comparison with NULL produces NULL/false → zero rows deleted. This preserves the current early-return behavior.

### Approach B: Wrap in Transaction
**Risk:** LOW · **Effort:** ~10 min · **Disruption:** Minimal

```ts
export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
    try {
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
                .where(
                    and(
                        eq(messages.chatId, chatId),
                        gte(messages.createdAt, targetMessage.createdAt),
                    ),
                )
        })
    } catch (error) {
        throwDatabaseError(error, "Failed to delete messages after target", {
            chatId,
            messageId,
        })
    }
}
```

**Note:** With Postgres default READ COMMITTED isolation, a transaction still allows concurrent INSERTs to be visible to QUERY 2. To fully prevent the race, you'd need SERIALIZABLE or REPEATABLE READ isolation:
```ts
await db.transaction(async (tx) => { /* ... */ }, {
    isolationLevel: "repeatable read",
})
```

**Why Approach A is better:** The subquery approach achieves atomicity without the overhead of a transaction BEGIN/COMMIT, without needing to reason about isolation levels, and works correctly with PgBouncer in any mode. It's also conceptually simpler — one SQL statement, one operation.

### Approach C: Raw SQL (FALLBACK)
If the Drizzle subquery syntax doesn't compile correctly:

```ts
import { sql } from "drizzle-orm"

export async function deleteMessagesByIdAfter(chatId: string, messageId: string): Promise<void> {
    try {
        await db.execute(sql`
            DELETE FROM "Message_v2"
            WHERE "chat_id" = ${chatId}
              AND "created_at" >= (
                SELECT "created_at" FROM "Message_v2"
                WHERE "id" = ${messageId} AND "chat_id" = ${chatId}
                LIMIT 1
              )
        `)
    } catch (error) {
        throwDatabaseError(error, "Failed to delete messages after target", {
            chatId,
            messageId,
        })
    }
}
```

**Why only as fallback:** Raw SQL bypasses Drizzle's type safety and schema awareness. Prefer the query builder.

### Recommendation: **Approach A** — single subquery DELETE via Drizzle query builder

---

## Implementation Order

| Priority | Bug | Approach | Prerequisites |
|----------|-----|----------|---------------|
| 1 | FK CASCADE (Bug 1) | Schema migration | None — independent fix |
| 2 | transferGuestChats (Bug 2) | Atomic multi-table transfer | Bug 1 should be deployed first (suggestions cascade correctly) |
| 3 | deleteMessagesByIdAfter (Bug 3) | Subquery DELETE | None — independent fix |

**Rationale:** Bug 1 first because Bug 2's transaction also touches suggestions — we want the FK cascade in place before we're confident about data integrity. Bug 3 is independent and lowest practical risk.

---

## Verification Plan

### Bug 1 — FK CASCADE
1. Apply migration to dev DB
2. Create artifact → request suggestions → verify suggestions exist
3. Restore to earlier version → verify newer suggestions are cascade-deleted
4. Verify no FK errors in app logs

### Bug 2 — transferGuestChats
1. Create guest session → create chat → create artifact → request suggestions
2. Register/login with the guest session active
3. Verify: artifact operations work (save, restore, view, suggestions)
4. Run orphan detection SQL against dev DB → should return 0 rows

### Bug 3 — deleteMessagesByIdAfter
1. Send a message → wait for response → edit the message
2. Verify trailing messages are deleted
3. Stress test: rapid message edits during streaming → verify no message loss

---

## Technical Notes

- **Drizzle ORM v0.45.1** — confirmed installed; supports `.onDelete()` on `foreignKey()`, subqueries in `.where()`, and `db.transaction()`
- **Drizzle Kit v0.31.9** — migration generation via `pnpm drizzle-kit generate`
- **PgBouncer compatibility** — `prepare: false` is set; `db.transaction()` already used in 2 places
- **Migration convention** — auto-named by Drizzle Kit (e.g., `0004_*.sql`), stored in `lib/db/migrations/`
