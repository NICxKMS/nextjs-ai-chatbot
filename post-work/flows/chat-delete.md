FLOW: Delete Chat (Server Action → Auth → Cascade Delete → Cache Invalidation)
ENTRY: User triggers `deleteChat` Server Action (features/chat/actions/delete-chat.ts)

STEPS:
  1. **Validation** (features/chat/actions/delete-chat.ts:24-30) →
     `deleteChatSchema.safeParse(input)` →
     Schema: `{ chatId: z.string().uuid() }` →
     Sync validation — fail fast before any async work →
     OUTPUT: Parsed `{ chatId }` or error response

  2. **Auth + Fetch** (features/chat/actions/delete-chat.ts:33) →
     `Promise.all([getAppSession(), getChatById(parsed.data.chatId)])` →
     PARALLEL: session resolution and chat lookup run concurrently →
     `getAppSession()` → React.cache-memoized session (Supabase → guest fallback) →
     `getChatById(chatId)` → `db.query.chats.findFirst({ where: eq(chats.id, chatId) })` →
     OUTPUT: `[AppSession | null, Chat | null]`

  3. **Auth check** (features/chat/actions/delete-chat.ts:35-39) →
     If `!session` → `unauthorized:chat:auth_required` →
     OUTPUT: Verified session

  4. **Ownership check** (features/chat/actions/delete-chat.ts:42-55) →
     If `!chat` → `not_found:chat:chat_not_found` →
     If `chat.userId !== session.user.id` → `forbidden:chat:owner_mismatch` →
     OUTPUT: Authorized delete

  5. **Execute delete** (features/chat/actions/delete-chat.ts:58-66) →
     `deleteChatData(parsed.data.chatId)` → `db.delete(chats).where(eq(chats.id, chatId))` →
     FK CASCADE handles cleanup:
       - `messages` table → all messages deleted
       - `votes` table → all votes deleted
       - `artifacts` table → all artifacts + artifact_versions deleted
       - `suggestions` table → all suggestions deleted
     Single SQL DELETE triggers cascade chain →
     OUTPUT: Chat and all related data removed

  6. **Cache invalidation** (features/chat/actions/delete-chat.ts:69) →
     `invalidateChatList(session.user.id)` → `updateTag(cacheKeys.chats(userId))` →
     Uses `updateTag` (immediate consistency, Server Action context) →
     NOTE: Does NOT invalidate individual chat cache — the chat no longer exists →
     OUTPUT: Chat list cache invalidated

  7. **Return** →
     `{ success: true, data: undefined }` →
     OUTPUT: `ActionResult<void>` — success

  --- DELETE ALL CHATS (features/chat/actions/delete-all-chats.ts) ---
  Variant flow — same pattern, simpler:

  A1. **Auth only** (no input validation needed) →
      `getAppSession()` → session check

  A2. **Execute** →
      `deleteAllChatsData(session.user.id)` → `db.delete(chats).where(eq(chats.userId, userId))` →
      Deletes ALL chats for user → FK cascade for each

  A3. **Cache invalidation** →
      `invalidateChatList(session.user.id)` → `updateTag`

  A4. Return `{ success: true, data: undefined }`

BOTTLENECKS:
  - FK CASCADE delete is a single DB operation but may be slow for chats with many messages/artifacts — the database does the heavy lifting
  - `deleteAllChats` deletes ALL chats in one query — could be very slow for users with hundreds of chats (table scan + cascade for each)
  - No batching or chunking for `deleteAllChats` — single DELETE WHERE userId=X

WASTE:
  - `deleteChat` fetches the full `Chat` object just to check ownership — only needs `userId` column; could use `db.select({ userId: chats.userId })` for a lighter query
  - Individual chat cache is NOT invalidated — stale chat data may persist in cache until TTL expires (acceptable since the chat no longer exists, but any cached references become orphans)

SIMPLIFICATION OPPORTUNITIES:
  - `getChatById` could be replaced with a combined `getChatOwnerId(chatId)` query that only selects `userId` — reduces data transfer
  - `deleteAllChats` could benefit from a confirmation step or soft-delete pattern — currently irreversible
  - Both actions share the same auth+ownership pattern — could extract a `withChatOwnership(chatId, fn)` helper that handles auth, fetch, and ownership in one call

EXIT: Chat(s) deleted from DB with cascade, chat list cache invalidated, `ActionResult<void>` returned to client.
