FLOW: Message Data
ENTRY: Chat page render, chat streaming (persist), message editing (delete trailing)
STEPS:

  ## READ — Chat Page Render
  1. `app/(chat)/chat/[id]/page.tsx` → `getMessagesForChatRender(chatId)` (direct call, NO cache wrapper)
  2. `lib/data/message.ts` → `getMessagesForChatRender(chatId, limit=500)`:
     - `db.select({ id, role, parts }).from(messages).where(eq(chatId)).orderBy(asc(createdAt)).limit(500)`
     - Returns `Pick<Message, 'id' | 'role' | 'parts'>[]` — reduced shape (no attachments, no chatId, no createdAt)
  3. `convertToUIMessages(dbMessages)` → maps to AI SDK `UIMessage[]` format (type assertion, no transformation)
  4. Passed as `initialMessages` prop to `ChatShell` client component

  ## READ — Chat Route Context (streaming)
  1. `resolveChatRouteContext()` in `chat-route.ts` → `getMessagesForChatRender(chatId)` (uncached)
  2. Only called for EXISTING chats (not new chats — new chats have no prior messages)
  3. Converted via `convertToUIMessages` → combined with the new user message → fed to `streamText`

  ## READ — Full Messages (getChatWithMessages)
  1. `getChatWithMessages(chatId)` in `lib/data/chat.ts` — parallel fetch of chat + messages
  2. `db.select().from(messages).where(eq(chatId)).orderBy(asc(createdAt)).limit(500)`
  3. Returns full `Message[]` (all columns)
  4. **@unused** — Chat page fetches separately with individual cache tags. Retained for non-cached contexts.

  ## READ — Single Message (vote validation)
  1. `getMessageById(messageId)` in `lib/data/message.ts`
  2. `db.select().from(messages).where(eq(messages.id, messageId)).limit(1)` → `Message | null`
  3. Used by `voteOnMessage` Server Action → IDOR check: verifies `message.chatId === chatId`

  ## CREATE — User Message (new chat)
  1. `resolveChatRouteContext()` → `createChatWithInitialMessage()`:
     - Transaction: INSERT Chat + INSERT Message_v2 atomically
  2. Message shape: `{ id, chatId, role: 'user', parts, attachments: [] }`

  ## CREATE — User Message (existing chat)
  1. `resolveChatRouteContext()` → `saveMessages([userDbMessage])`:
     - `db.insert(messages).values([msg]).returning()` — single INSERT, returns rows
  2. No transaction needed — only one row inserted

  ## CREATE — Assistant Messages (after streaming)
  1. `persistChatResponse()` → `saveMessagesAndTouchChat({ chatId, messages, title? })`:
     - Transaction: `INSERT INTO Message_v2 VALUES (batch)` + `UPDATE Chat SET updatedAt/title`
     - Uses `runWithPersistenceRetries()` — up to 3 attempts with [0ms, 150ms, 400ms] delays
  2. `responseMessages` are `UIMessage[]` mapped to DB format via `toAssistantDbMessages()`

  ## DELETE — Trailing Messages (message edit flow)
  1. `deleteTrailingMessages` Server Action → `deleteMessagesByIdAfter(chatId, messageId)`
  2. First: looks up target message's `createdAt`:
     - `db.select({ createdAt }).from(messages).where(eq(id) AND eq(chatId)).limit(1)`
  3. Then: bulk delete all messages in chat with `createdAt >= targetMessage.createdAt`:
     - `db.delete(messages).where(eq(chatId) AND gte(createdAt, targetCreatedAt))`
  4. **Known limitation**: if two messages share the exact same `createdAt` timestamp, both are deleted.
     Acceptable for branch-from-message but documented in code.
  5. After delete: `invalidateChat(chatId)` (updateTag, immediate)

  ## DELETE — Bulk (via chat deletion)
  1. FK CASCADE: `messages.chatId → chats.id ON DELETE CASCADE`
  2. `deleteMessagesByChatId` exists but is **@unused** — FK cascade handles it

BOTTLENECKS:
  - `getMessagesForChatRender` is called **uncached** on both page render AND chat route context.
    On page render, this is a deliberate choice — messages change frequently (during active chat).
    However, during rapid back-to-back submissions, this could cause unnecessary DB hits.
  - Message limit cap of 500 rows: prevents unbounded result sets but could truncate very long conversations.
    No indication is given to the user that messages were truncated.
  - `deleteMessagesByIdAfter` does TWO sequential queries (lookup + delete). Could be a single subquery:
    `DELETE WHERE chatId = X AND createdAt >= (SELECT createdAt FROM messages WHERE id = Y AND chatId = X)`

WASTE:
  - `saveMessages` returns the full inserted rows via `.returning()`, but `resolveChatRouteContext` 
    discards the return value when saving the user message for existing chats.
  - `getMessagesByChatId` (full column SELECT) exists but is unused in the current codebase — 
    `getMessagesForChatRender` (reduced columns) is preferred everywhere.
  - `deleteMessagesByChatId` is unused — FK cascade handles this automatically.

SIMPLIFICATION OPPORTUNITIES:
  - `deleteMessagesByIdAfter` could be a single query using a subquery instead of two sequential queries.
  - The reduced `ChatRenderMessage` type (`Pick<Message, 'id' | 'role' | 'parts'>`) is a good optimization —
    it avoids transferring `attachments` and `createdAt` which aren't needed for rendering.
  - Consider adding `'use cache'` with `cacheTag(cacheKeys.chat(chatId))` around message reads on
    the chat page — the same tag already covers chat data. However, this requires careful consideration
    of stale message display during active streaming.

EXIT: Messages flow as `UIMessage[]` to ChatShell client component, or as DB rows to the AI SDK for context
