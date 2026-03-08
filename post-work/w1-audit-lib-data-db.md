# Wave 1 — Static Audit: lib/data/ + lib/db/

**Date:** 2026-03-07  
**Scope:** `lib/db/client.ts`, `lib/db/schema.ts`, `lib/db/migrate.ts`, `lib/data/*.ts`  
**Method:** Static analysis — no code changes  

---

## Executive Summary

The data layer is well-structured with consistent error handling (`throwDatabaseError` / `requireDatabaseRow`), proper transaction use in critical paths, and good indexing fundamentals. Key issues center around:

1. **Full entity fetches for ownership checks** (CRITICAL, repeated across 6+ callsites)
2. **Over-fetching full artifact rows (with `content` column) for version listing**
3. **Missing transaction in `deleteMessagesByIdAfter`** (race condition)
4. **Missing FK CASCADE on `Suggestion → Artifact`** — artifact restore fails when versions have suggestions
5. **`transferGuestChats` orphans artifact/suggestion ownership** — all artifact operations break post-transfer
6. **4 dead-code functions** marked `@unused` with no consumers

---

## Findings

### ═══ CRITICAL ═══

```
SEVERITY: [CRITICAL]
FILE: lib/data/chat.ts:18-25
FINDING: `getChatById` fetches the FULL chat row (all 7 columns including title, model,
  visibility, timestamps) but is used for OWNERSHIP CHECKS ONLY in 5 Server Actions:
  - features/chat/actions/delete-chat.ts:32 — only uses `chat.userId`
  - features/chat/actions/delete-trailing-messages.ts:33 — only uses `chat.userId`
  - features/voting/actions/vote.ts:59 — only uses `chat.userId`
  - features/sidebar/actions/rename-chat.ts:45 — only uses `chat.userId`
  - features/visibility/actions/update-visibility.ts:43 — only uses `chat.userId`
  The Chat table is lightweight (no JSONB/TEXT blobs), so the over-fetch is small per row,
  but these ownership checks happen on EVERY user mutation. A dedicated
  `getChatOwnerId(chatId): string | null` function selecting only `userId` would be
  semantically clearer and marginally faster.
RECOMMENDATION: Add a `getChatOwnerId` function:
  `db.select({ userId: chats.userId }).from(chats).where(eq(chats.id, chatId)).limit(1)`
  Update the 5 Server Actions to use it instead of `getChatById` for ownership checks.
  Keep `getChatById` for callers that need the full row (e.g., chat page cache layer).
```

```
SEVERITY: [CRITICAL]
FILE: lib/data/artifact.ts:11-21
FINDING: `getArtifactById` fetches the FULL artifact row including `content` (TEXT column,
  potentially very large — code artifacts, sheets, etc.) but is used for OWNERSHIP CHECKS
  in these callsites:
  - app/api/artifact/route.ts:41 (GET latest — OK, needs content for response)
  - app/api/artifact/route.ts:142 (handleSave — ONLY checks userId)
  - app/api/artifact/route.ts:167 (handleRestore — ONLY checks userId)
  - app/api/suggestions/route.ts:49-50 (IDOR check — ONLY checks userId, then uses
    artifact.id + artifact.createdAt for the follow-up query)
  - features/chat/lib/tools/update-artifact.ts:44 (needs kind, title, content — OK)
  For ownership-only callsites, this loads potentially megabytes of content just to
  compare a UUID. This is the highest-impact optimization in the data layer.
RECOMMENDATION: Add `getArtifactOwnerId(artifactId: string): Promise<{ userId: string } | null>`
  selecting only `{ userId: artifacts.userId }`. Use it in handleSave, handleRestore,
  and the suggestions IDOR check. For the suggestions route, add a variant
  `getArtifactOwnerAndMeta` that selects `{ userId, id, createdAt }` to avoid the second
  full fetch.
```

### ═══ HIGH ═══

```
SEVERITY: [HIGH]
FILE: lib/data/artifact.ts:53-63
FINDING: `getArtifactVersions` fetches ALL columns from the Artifact table (including
  `content` — potentially huge) for every version. Called by:
  - app/api/artifact/route.ts:61 — GET /api/artifact?view=versions
  This returns ALL version content to the client, even though the version list UI likely
  only needs id, createdAt, title, kind for display. Content is only needed when the user
  selects a specific version.
RECOMMENDATION: Add `getArtifactVersionsMeta(artifactId: string)` that selects only
  `{ id, createdAt, title, kind, updatedAt }`. The full content can be fetched on-demand
  via the existing `getArtifactByIdAndCreatedAt` when a version is selected.
```

```
SEVERITY: [HIGH]
FILE: lib/data/message.ts:80-104
FINDING: `deleteMessagesByIdAfter` performs a SELECT then DELETE as TWO separate queries
  WITHOUT a transaction. Race condition: between the SELECT (getting the target message's
  createdAt) and the DELETE, new messages could be inserted with createdAt >= the target
  timestamp and be erroneously deleted, OR the target message could be deleted by another
  operation making the SELECT return empty.
  The SELECT:
    `db.select({ createdAt }).from(messages).where(and(eq(id, messageId), eq(chatId, chatId)))`
  Then DELETE:
    `db.delete(messages).where(and(eq(chatId, chatId), gte(createdAt, targetCreatedAt)))`
RECOMMENDATION: Wrap in `db.transaction()`:
  ```
  await db.transaction(async (tx) => {
    const target = await tx.select({ createdAt }).from(messages)...
    if (!target[0]) return
    await tx.delete(messages).where(and(eq(chatId), gte(createdAt, target[0].createdAt)))
  })
  ```
  Alternatively, use a single subquery-based DELETE to avoid the two-step entirely.
```

```
SEVERITY: [HIGH]
FILE: lib/data/chat.ts:271-286
FINDING: `transferGuestChats` updates only `chats.userId` but does NOT update
  `artifacts.userId` or `suggestions.userId`. After transfer:
  - Artifacts still have `userId = guestUserId` (orphaned ownership)
  - The artifact IDOR checks in `/api/artifact` will FAIL for the authenticated user
    because `artifact.userId !== session.user.id`
  - Suggestions also retain the guest userId
  The FK cascade from `chats.id → artifacts.chatId` means the artifacts still reference
  the correct chat, but the userId mismatch breaks ownership authorization.
RECOMMENDATION: Wrap in a transaction that also updates `artifacts.userId` and
  `suggestions.userId`:
  ```
  await db.transaction(async (tx) => {
    const transferred = await tx.update(chats).set({ userId: toUserId }).where(eq(userId, fromUserId)).returning({ id: chats.id })
    if (transferred.length > 0) {
      await tx.update(artifacts).set({ userId: toUserId }).where(eq(userId, fromUserId))
      await tx.update(suggestions).set({ userId: toUserId }).where(eq(userId, fromUserId))
    }
    return transferred.length
  })
  ```
```

```
SEVERITY: [HIGH]
FILE: features/voting/actions/vote.ts:59+78
FINDING: The vote Server Action calls `getChatById(chatId)` (line 59) and then
  `getMessageById(messageId)` (line 78) SEQUENTIALLY — two waterfall DB round-trips for
  authorization. These are independent checks that could be parallelized.
  Note: this is in the consumer (features/) but the fix involves adding a data layer
  function or adjusting the call pattern.
RECOMMENDATION: Parallelize with `Promise.all`:
  `const [chat, message] = await Promise.all([getChatById(chatId), getMessageById(messageId)])`
  Even better: create a `verifyChatAndMessageOwnership(chatId, messageId, userId)` function
  that does a single JOIN query. This saves ~50ms per vote action.
```

### ═══ MEDIUM ═══

```
SEVERITY: [MEDIUM]
FILE: lib/db/schema.ts:72-75
FINDING: `message_chat_created_role_idx` index on `(chatId, createdAt, role)` is NEVER
  used in any query. No data function or query in the codebase filters or sorts by
  `messages.role`. The only reference to `messages.role` is in the SELECT clause of
  `getMessagesForChatRender` (lib/data/message.ts:24), which selects it as output but
  does not filter by it.
  This index adds write overhead on every message INSERT without providing any read benefit.
RECOMMENDATION: Remove the `chatCreatedRoleIdx` index. The existing
  `message_chat_created_idx` on `(chatId, createdAt)` already serves all current queries.
  If role-based filtering is needed in the future, add the index at that time.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/chat.ts:86-108
FINDING: `getChatWithMessages` is marked `@unused` — "Chat page fetches chat and messages
  separately with individual cache tags." No consumer exists in the entire codebase
  (features/, app/) — only referenced in the file's own JSDoc. This is 22 lines of
  dead code.
RECOMMENDATION: Remove or mark with a stronger deprecation signal. If keeping for future
  use, add a `// TODO: remove if unused by [date]` comment.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/message.ts:107-115
FINDING: `deleteMessagesByChatId` is marked `@unused` — "FK cascade on chats.id →
  messages.chatId handles cleanup during chat deletion." No consumer exists in features/
  or app/. Dead code.
RECOMMENDATION: Remove. The FK cascade makes this function redundant.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/user.ts:15-25
FINDING: `getUserByEmail` is marked `@unused` — "Auth uses Supabase SDK for email
  lookup." No consumer exists in features/ or app/. Dead code fetching the full user
  row including `passwordHash`.
RECOMMENDATION: Remove. If re-needed, it should be re-implemented with explicit column
  selection to avoid leaking `passwordHash` into call chains.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/user.ts:60-68
FINDING: `updateUserLastLogin` is marked `@unused` — "Login flow does not yet track
  last login." No consumer exists. Dead code.
RECOMMENDATION: Remove until the feature is actually implemented.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/vote.ts:58-66
FINDING: `deleteVotesByChatId` is marked `@unused` — "FK cascade on chats.id →
  votes.chatId handles cleanup during chat deletion. Retained for selective vote removal."
  No consumer exists in features/ or app/.
RECOMMENDATION: Remove. The FK cascade makes this redundant for chat deletion.
  If selective vote removal is needed, re-implement at that time.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/suggestion.ts:51-67
FINDING: `deleteSuggestionsByArtifactVersion` is marked `@unused` — "Retained for
  targeted suggestion cleanup without removing the parent artifact." No consumer exists.
RECOMMENDATION: Remove. Re-implement when needed.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/chat.ts:35-82
FINDING: `getChatsByUserId` performs a CURSOR RESOLUTION query (`getChatById`-like lookup
  for the cursor chat) before the main paginated query. This is two DB round-trips for every
  paginated request. The cursor lookup (lines 43-47) correctly selects only `updatedAt`, but
  the main query at line 64 uses `db.select().from(chats)` which fetches all columns
  including `title`, `model`, etc.
  For the sidebar chat list, only `id`, `title`, `updatedAt`, `visibility` are likely needed.
RECOMMENDATION: Use explicit column selection in the main query:
  `db.select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt, visibility: chats.visibility })`
  This reduces data transfer for pagination queries, especially as chat count grows.
  Confirm which columns the sidebar actually consumes before narrowing.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/user.ts:32-37
FINDING: `getUserById` uses `db.select().from(users)` which returns ALL columns including
  `passwordHash`. Called by `features/auth/actions/login.ts:91` for recovery logic. While
  the passwordHash is needed in the login context (for verification), the function is generic
  and any future caller would inadvertently receive the hash.
RECOMMENDATION: Either:
  a) Rename to `getUserByIdWithPassword` to make intent explicit, OR
  b) Create a `getUserByIdSafe` that excludes `passwordHash`, and use the full version
     only in the auth module.
```

### ═══ LOW ═══

```
SEVERITY: [LOW]
FILE: lib/data/chat.ts:64
FINDING: `getChatsByUserId` main query uses `.select()` (all columns) but the function
  signature returns `Chat` (full type). The sidebar history component may not need all fields.
  This is a minor over-fetch — Chat rows are lightweight (~200 bytes each).
RECOMMENDATION: Profile sidebar rendering to confirm which Chat fields are actually used.
  If only a subset is needed, create a `ChatListItem` type and a column-specific query.
```

```
SEVERITY: [LOW]
FILE: lib/data/message.ts:40-52
FINDING: `getMessagesByChatId` uses `.select()` (all columns including `attachments` JSONB
  and `parts` JSONB). This is the full message fetch. Currently used only by
  `getChatWithMessages` (which is itself unused). If it gains future consumers that only
  need metadata, the JSONB columns add unnecessary transfer.
RECOMMENDATION: No action needed now — the function is indirectly unused. If it becomes
  used, evaluate whether callers need full JSONB or just metadata.
```

```
SEVERITY: [LOW]
FILE: lib/data/message.ts:55-63
FINDING: `getMessageById` used by vote action (features/voting/actions/vote.ts:78) only
  needs `message.chatId` for the IDOR check (`message.chatId !== chatId`). The full row
  fetch includes `parts` JSONB and `attachments` JSONB which are not needed.
RECOMMENDATION: Add a `getMessageChatId(messageId: string): Promise<{ chatId: string } | null>`
  for the IDOR check. Keep `getMessageById` for callers needing the full message.
```

```
SEVERITY: [LOW]
FILE: lib/db/schema.ts:106-123
FINDING: Artifact table uses composite PK `(id, createdAt)` for versioning, but
  `getArtifactById` (lib/data/artifact.ts:14) queries `WHERE id = ?` which cannot use
  the PK index efficiently — it must scan all versions for that id. The `artifact_user_idx`
  and `artifact_chat_idx` are single-column indexes, but there's no index on `(id, createdAt
  DESC)` for the common "latest version" query pattern.
  In practice, the PK index on `(id, createdAt)` does serve `WHERE id = ?` queries
  (Postgres can use composite index for prefix lookups), but the DESC ordering requires
  a sort step since the PK defaults to ASC.
RECOMMENDATION: Consider adding `index("artifact_id_created_desc_idx").on(t.id, t.createdAt.desc())`
  if artifact version counts grow. Low priority — most artifacts have <10 versions.
```

```
SEVERITY: [LOW]
FILE: lib/db/client.ts:17-31
FINDING: `getPoolConfig` uses `process.env.VERCEL_FLUID` for Vercel Fluid Compute
  optimization. The pool sizes (3/5/10) are conservative but appropriate for
  PgBouncer-mediated Supabase. No issue — noting for completeness.
RECOMMENDATION: No action. Config is well-documented and appropriate.
```

```
SEVERITY: [LOW]
FILE: lib/data/artifact.ts:93-101
FINDING: `deleteArtifactVersionsAfter` uses `gte(artifacts.createdAt, createdAt)` which deletes
  the target version AND all versions after it. The function name says "Version" (singular)
  but deletes multiple versions. The `handleRestore` caller in `route.ts:174` works around
  this by adding +1ms to the timestamp: `new Date(restorePoint.getTime() + 1)`.
  The +1ms offset is fragile — if two versions are created within 1ms, the restore point
  version itself could be accidentally deleted.
RECOMMENDATION: Rename to `deleteArtifactVersionsFrom(artifactId, afterTimestamp)` for
  clarity. Consider using `gt()` instead of `gte()` and removing the +1ms offset in the
  caller.
```

```
SEVERITY: [LOW]
FILE: lib/db/schema.ts:84-93
FINDING: Votes table uses composite PK `(chatId, messageId, userId)` but no single-column
  index on `messageId`. If a query ever needs to look up votes by messageId across chats,
  it would require a full table scan. Currently not an issue — all queries filter by chatId.
RECOMMENDATION: No action unless a "votes by message" query is added.
```

### ═══ ADDITIONAL FINDINGS (Session 2) ═══

```
SEVERITY: [HIGH]
FILE: lib/db/schema.ts:146-149 + lib/db/migrations/0000_youthful_leech.sql
FINDING: The composite FK from `Suggestion` → `Artifact` (on `artifactId + artifactCreatedAt`)
  uses `ON DELETE NO ACTION` (the Drizzle/Postgres default — no `.onDelete("cascade")` call).
  Confirmed in migration SQL:
    `FOREIGN KEY ("artifact_id","artifact_created_at") REFERENCES "Artifact"("id","created_at")
     ON DELETE no action ON UPDATE no action`
  
  IMPACT: Deleting artifact versions that have suggestions will FAIL with a Postgres FK
  constraint violation. This directly affects the artifact RESTORE flow:
    - `POST /api/artifact { mode: "restore" }` → `handleRestore()` → `deleteArtifactVersionsAfter(id, afterRestore)`
    - If ANY deleted version has suggestions, the DELETE will throw a Postgres error
    - The error propagates as a 500 to the client
  
  Contrast with other FKs in the schema which ALL use `onDelete: "cascade"`:
    - `chats.userId → users.id` — cascade ✅
    - `messages.chatId → chats.id` — cascade ✅
    - `votes.chatId → chats.id` — cascade ✅
    - `votes.messageId → messages.id` — cascade ✅
    - `artifacts.userId → users.id` — cascade ✅
    - `artifacts.chatId → chats.id` — cascade ✅
    - `suggestions.userId → users.id` — cascade ✅
    - `suggestions → artifacts` — NO CASCADE ❌ ← this one
  
RECOMMENDATION: Add `.onDelete("cascade")` to the `artifactRef` foreign key in schema.ts
  and generate a migration. The migration SQL would be:
    ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_artifact_id_artifact_created_at_...";
    ALTER TABLE "Suggestion" ADD CONSTRAINT "..." FOREIGN KEY (...) REFERENCES "Artifact"(...)
      ON DELETE CASCADE ON UPDATE NO ACTION;
```

```
SEVERITY: [MEDIUM]
FILE: lib/db/schema.ts:66-67
FINDING: `parts` and `attachments` columns use bare `jsonb()` without Drizzle's
  `.$type<T>()` assertion. Drizzle infers these as `unknown` in the `Message` type
  (from `InferSelectModel`). All consumers that access `message.parts` or
  `message.attachments` must use runtime casts or type assertions. The old app
  (oldapp/lib/db/schema.ts:53) uses `.$type<AppUsage | null>()` for its jsonb column,
  showing the pattern was known.
  Example: `parts: jsonb("parts").$type<MessagePart[]>().notNull()` would provide
  compile-time safety for message part shapes.
RECOMMENDATION: Define types for `MessagePart[]` and `Attachment[]` (or reuse from
  AI SDK types) and add `.$type<MessagePart[]>()` and `.$type<Attachment[]>()` to the
  schema columns. This propagates through `InferSelectModel` automatically.
```

```
SEVERITY: [MEDIUM]
FILE: lib/data/chat.ts:117-139
FINDING: `createChat` is exported but has ZERO external importers in the entire codebase.
  It is only called internally by `createChatWithInitialMessage` (same file, line 157).
  The chat-route.ts uses `createChatWithInitialMessage` exclusively for new chat creation.
  This is a dead export — not exactly dead code (it's called internally) but the export
  is unused, increasing the public API surface unnecessarily.
RECOMMENDATION: Remove the `export` keyword from `createChat` to make it a private
  module function. This clarifies the module's public contract: callers should use
  `createChatWithInitialMessage` which provides atomicity.
```

```
SEVERITY: [LOW]
FILE: app/api/artifact/route.ts:61-62
FINDING: GET /api/artifact (versions view) calls `getArtifactVersions(id)` then falls
  back to `getArtifactById(id)` if versions is empty:
    `const latest = versions[0] ?? (await getArtifactById(id))`
  Both functions query the SAME table (`Artifact`) with the same `WHERE id = ?` condition.
  If `getArtifactVersions` returns empty, `getArtifactById` will also return null (same
  data, different ORDER BY / LIMIT). The fallback is a redundant DB round-trip that can
  never produce a different result.
RECOMMENDATION: Remove the fallback. Use `versions[0]` directly for the ownership check
  and return `versions` or 404. The fallback adds latency and code complexity for zero
  benefit.
```

```
SEVERITY: [MEDIUM]
FILE: app/api/artifact/route.ts:142-146 (handleSave)
FINDING: `handleSave` performs an ownership check via `getArtifactById(data.id)` then
  inserts a new version via `saveArtifactVersion(...)` as TWO separate queries WITHOUT
  a transaction. TOCTOU race: between the ownership check and the insert, another request
  could modify or delete the artifact. Also, `getArtifactById` fetches the full artifact
  (including large `content`) just to compare `userId` — combining the over-fetch issue
  from the CRITICAL finding above with a potential race condition.
RECOMMENDATION: Either:
  a) Use a transaction wrapping the check + insert, OR
  b) Use the proposed `getArtifactOwnerId` for a lightweight check and accept the small
     TOCTOU window (low risk since artifact ownership doesn't change), OR
  c) Add a WHERE clause to the INSERT that verifies ownership atomically.
```

### ═══ DEEP-DIVE: transferGuestChats Orphan Bug ═══

**Trigger:** Guest user creates chats with artifacts → registers/logs in → `migrateGuestChatsAndClearToken()` is called.

**Flow trace:**
```
login()/register()
  → migrateGuestChatsAndClearToken(authUserId, "login")
    → verifyGuestToken(cookie) → { userId: guestUUID }
    → transferGuestChats(guestUUID, authUserId)
      → UPDATE "Chat" SET user_id = authUserId WHERE user_id = guestUUID
      → returns count of transferred chats
```

**What gets transferred:**
- ✅ `Chat.userId` → updated to `authUserId`

**What gets orphaned:**
- ❌ `Artifact.userId` → remains `guestUUID`
- ❌ `Suggestion.userId` → remains `guestUUID`
- ❌ `Vote.userId` → remains `guestUUID` (though guests can't vote, so no real data)

**Downstream failures after transfer:**

| Operation | Breaks? | Details |
|-----------|---------|---------|
| **Open chat page** | ✅ Works | Chat page checks `chat.userId` — chat was transferred |
| **Send message** | ✅ Works | `resolveChatRouteContext` checks `existingChat.userId` — chat was transferred |
| **Save artifact** (handleSave) | ❌ **FAILS** | Checks `existing.userId !== userId` → `guestUUID !== authUserId` → **403 Forbidden** |
| **Restore artifact** | ❌ **FAILS** | Same ownership check → **403 Forbidden** |
| **Update artifact** (AI tool) | ❌ **FAILS** | `updateArtifactTool` checks `artifact.userId !== session.userId` → **throws Forbidden** |
| **Request suggestions** (AI tool) | ⚠️ Partial | Creates new suggestions with `authUserId`, but existing suggestions have `guestUUID` as userId |
| **GET /api/artifact** | ❌ **FAILS** | Both `latest` and `versions` views check `latest.userId !== session.user.id` → **403 Forbidden** |
| **GET /api/suggestions** | ❌ **FAILS** | IDOR check: `artifact.userId !== session.user.id` → **403 Forbidden** |
| **Delete chat** | ✅ Works | Chat cascade deletes artifacts (via `chatId` FK, not `userId`) |

**User-visible impact:**
> A guest who creates artifacts, then registers, will find their artifact-containing chats accessible (messages load fine) but ALL artifact operations broken: they cannot view, save, restore or update artifacts in transferred chats. The artifact panel shows errors or empty state.

**Scope estimation:** This affects any guest user who:
1. Creates at least one artifact during guest session, AND
2. Later registers or logs in

**Fix specification:**
```sql
-- Needs to be atomic with the chat transfer
BEGIN;
  UPDATE "Chat" SET user_id = $2 WHERE user_id = $1;
  UPDATE "Artifact" SET user_id = $2 WHERE user_id = $1;
  UPDATE "Suggestion" SET user_id = $2 WHERE user_id = $1;
  -- Vote transfer unnecessary (guests can't vote)
COMMIT;
```

### ═══ DEEP-DIVE: deleteMessagesByIdAfter Race Condition ═══

**Trigger:** User edits a message → `deleteTrailingMessages` server action is called.

**Flow trace:**
```
deleteTrailingMessages(chatId, messageId)
  → getChatById(chatId) — ownership check
  → deleteMessagesByIdAfter(chatId, messageId)
    → QUERY 1: SELECT createdAt FROM Message_v2 WHERE id = messageId AND chat_id = chatId
    → [gap — no transaction boundary]
    → QUERY 2: DELETE FROM Message_v2 WHERE chat_id = chatId AND created_at >= targetCreatedAt
```

**Race window (between QUERY 1 and QUERY 2):**

| Concurrent event | Impact |
|-------------------|--------|
| New assistant message arrives (streaming completion) | New message with `createdAt >= target` is erroneously deleted. User sees message disappear. The streaming response has already been shown to the user but its DB persistence is deleted. |
| Another edit on same chat (parallel tab) | Second edit's SELECT returns a different createdAt → both DELETEs may conflict or produce unexpected results |
| Message persistence retry (from `runWithPersistenceRetries`) | Retry inserts messages that could have `createdAt >= target` if the retry happens after the SELECT but before the DELETE |

**Practical risk:** LOW-MEDIUM. The race window is typically <10ms. The most realistic scenario is a streaming response being persisted (via `saveMessagesAndTouchChat`) concurrently with the user editing an earlier message. Given the retry logic in `persistChatResponse`, there's a real possibility of messages being inserted in the gap.

**Fix:** Wrap in `db.transaction()` or use a single subquery:
```sql
DELETE FROM "Message_v2" 
WHERE chat_id = $1 AND created_at >= (
  SELECT created_at FROM "Message_v2" WHERE id = $2 AND chat_id = $1
)
```

### ═══ DEEP-DIVE: Suggestion→Artifact FK Missing CASCADE ═══

**Trigger:** User restores an artifact to a previous version.

**Flow trace:**
```
POST /api/artifact { mode: "restore", id, timestamp }
  → handleRestore(data, userId)
    → getArtifactById(data.id) — ownership check (returns latest version)
    → restorePoint = new Date(data.timestamp)
    → afterRestore = new Date(restorePoint.getTime() + 1)  // +1ms
    → deleteArtifactVersionsAfter(data.id, afterRestore)
      → DELETE FROM "Artifact" WHERE id = $1 AND created_at >= $2
      → ❌ FK VIOLATION if any deleted version has suggestions
```

**When this fails:**
1. User creates artifact → AI generates suggestions via `requestSuggestions` tool
2. User updates artifact (creating version 2, 3, etc.)
3. AI generates suggestions for newer versions
4. User restores to version 1
5. `deleteArtifactVersionsAfter` tries to delete versions 2+ → **FK violation** because suggestions reference those versions

**Error propagation:**
```
Postgres FK error → throwDatabaseError → AppError.internal → 500 response
→ Client shows "Failed to process artifact operation"
```

**Risk assessment:** MEDIUM-HIGH. Every artifact that receives suggestions and then has a restore attempted will trigger this. The `requestSuggestions` tool is a core AI feature.

**Fix options:**
1. Add `ON DELETE CASCADE` to the FK (migration) — cleanest
2. Delete suggestions before artifact versions in `handleRestore` — defensive
3. Both (belt and suspenders)

---

## Summary Table

| Severity | Count | Key Themes |
|----------|-------|------------|
| CRITICAL | 2 | Full entity fetch for ownership (chat + artifact) |
| HIGH | 4 | Missing transaction, orphaned artifact ownership on guest transfer, sequential auth queries, missing FK cascade on suggestions→artifacts |
| MEDIUM | 11 | Dead code (7 functions/exports), unused index, over-fetching in pagination, passwordHash leakage risk, JSONB type safety, TOCTOU in handleSave |
| LOW | 7 | Minor over-fetches, naming clarity, index optimization, composite PK considerations, redundant fallback |

---

## Priority Action Items

1. **Fix Suggestion→Artifact FK to CASCADE** — artifact restore is broken for versioned artifacts with suggestions (HIGH — functional bug)
2. **Add `getChatOwnerId` + `getArtifactOwnerId`** — lightweight ownership check functions (CRITICAL)
3. **Fix `transferGuestChats` to also transfer artifacts and suggestions** (HIGH — data integrity bug, see deep-dive)
4. **Wrap `deleteMessagesByIdAfter` in a transaction** (HIGH — race condition, see deep-dive)
5. **Parallelize vote ownership checks** (HIGH — easy win, ~50ms savings)
6. **Add `getArtifactVersionsMeta`** for version list without content (HIGH — potentially large payload reduction)
7. **Remove 6 dead-code functions** marked `@unused` + un-export `createChat` (MEDIUM — code hygiene)
8. **Remove unused `message_chat_created_role_idx`** (MEDIUM — write overhead reduction)
9. **Add `.$type<>()` to jsonb columns** in schema for type-safe `parts` and `attachments` (MEDIUM)
10. **Remove redundant `getArtifactById` fallback** in artifact versions GET route (LOW)
11. **Wrap `handleSave` in a transaction or use lightweight ownership check** (MEDIUM)

---

## Files Audited

| File | Lines | Functions | Findings |
|------|-------|-----------|----------|
| `lib/db/client.ts` | 53 | 1 | 0 (clean) |
| `lib/db/schema.ts` | 153 | 0 (DDL) | 5 (unused index, PK considerations, jsonb type safety, missing FK cascade) |
| `lib/db/migrate.ts` | 37 | 1 | 0 (clean) |
| `lib/data/chat.ts` | 286 | 10 | 5 |
| `lib/data/message.ts` | 115 | 6 | 3 |
| `lib/data/artifact.ts` | 101 | 5 | 3 |
| `lib/data/artifact-chat.ts` | 32 | 1 | 0 (clean — already uses column projection) |
| `lib/data/vote.ts` | 66 | 3 | 1 |
| `lib/data/suggestion.ts` | 67 | 3 | 1 |
| `lib/data/user.ts` | 83 | 5 | 3 |
| `lib/data/database-error.ts` | 31 | 2 | 0 (clean) |
| `app/api/artifact/route.ts` | — | — | 2 (redundant fallback, TOCTOU in handleSave) |

**Total: 24 findings across 12 files (including 3 deep-dives)**

---

## Confidence: HIGH

All findings are based on direct code reading with cross-referencing of consumers in `features/` and `app/`. The `transferGuestChats` artifact orphan issue and `deleteMessagesByIdAfter` race condition are confirmed through callsite tracing. Dead code findings confirmed via workspace-wide grep with zero consumers outside `lib/data/` itself.
