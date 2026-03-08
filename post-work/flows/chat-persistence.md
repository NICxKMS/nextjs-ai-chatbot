FLOW: Message Persistence (onFinish → convert → retry save → cache invalidation → client signal)
ENTRY: `onFinish` callback in `result.toUIMessageStream()` (app/api/chat/route.ts:177)

STEPS:
  1. `onFinish({ messages: responseMessages })` (app/api/chat/route.ts:177) →
     Triggered by AI SDK when the full model response is complete (all steps done) →
     `responseMessages` is the array of assistant UIMessages generated during this streaming session →
     Includes all multi-step tool call results and final text →
     OUTPUT: `UIMessage[]` ready for persistence

  2. `persistChatResponse({ chatId, userId, responseMessages, isNewChat, generatedTitle })` →
     (features/chat/lib/chat-route.ts:264-285) →
     SUB-STEPS:

  3. `toAssistantDbMessages(chatId, responseMessages)` (features/chat/lib/chat-route.ts:73-81) →
     Maps each UIMessage to `NewMessage` format: `{ id, chatId, role, parts, attachments: [] }` →
     Role preserved as-is from UIMessage →
     OUTPUT: `NewMessage[]` ready for DB insertion

  4. Title resolution: `const title = isNewChat ? generatedTitle : undefined` →
     Only sets title for new chats →
     If `generatedTitle` is undefined (title gen still running or failed): no title update →
     OUTPUT: Optional title string

  5. `runWithPersistenceRetries(() => saveMessagesAndTouchChat({ chatId, messages, title }))` →
     (features/chat/lib/chat-route.ts:89-110) →
     Retry wrapper with delay schedule:
       - Attempt 1: immediate (0ms delay)
       - Attempt 2: 150ms delay
       - Attempt 3: 400ms delay
     Total max attempts: 3 (CHAT_PERSISTENCE_RETRY_DELAYS_MS.length + 1) →
     OUTPUT: Success or throws last error

  6. `saveMessagesAndTouchChat({ chatId, messages, title })` (lib/data/chat.ts:198-221) →
     DB TRANSACTION:
       - `INSERT INTO messages VALUES (...)` — batch insert all assistant messages
       - `UPDATE chats SET { title?, updatedAt } WHERE id = chatId` — touch chat + optional title
     Both in single transaction for atomicity →
     OUTPUT: Messages persisted + chat updated

  7. Cache invalidation (features/chat/lib/chat-route.ts:283-284) →
     `refreshChat(chatId)` → `revalidateTag(cacheKeys.chat(chatId), "max")` — stale-while-revalidate
     `refreshChatList(userId)` → `revalidateTag(cacheKeys.chats(userId), "max")` — stale-while-revalidate
     Uses `revalidateTag` (NOT `updateTag`) — Route Handler context, eventual consistency OK →
     OUTPUT: Cache entries marked for revalidation

  --- FAILURE PATH ---

  8. If ALL 3 retry attempts fail: error thrown from `runWithPersistenceRetries` →
     Caught in `onFinish` catch block (app/api/chat/route.ts:189)

  9. `recoverChatPersistenceFailure({ chatId, userId, isNewChat, generatedTitle })` →
     (features/chat/lib/chat-route.ts:300-320) →
     Attempts to save a RECOVERY message instead of the actual response:
       - Creates `createPersistenceRecoveryMessage(chatId)` with text:
         "The last assistant response could not be saved. Please resend your last message or continue the conversation from here."
       - Runs through SAME retry logic: `runWithPersistenceRetries(() => saveMessagesAndTouchChat(...))`
     If recovery succeeds:
       - `refreshChat(chatId)` + `refreshChatList(userId)` → cache invalidation
       - Returns `true` → no client error signal
     If recovery also fails:
       - Returns `false` → proceeds to client notification

  10. Client error signal (app/api/chat/route.ts:199-205) →
      If recovery failed (`recovered === false`):
        - Writes `data-error` event to stream: `CHAT_PERSISTENCE_FAILURE_SIGNAL` =
          "The assistant response was shown, but it could not be saved. Please copy anything you need and try again once storage recovers."
        - `try/catch` — if client already disconnected, signal is lost (server-side log only)
      OUTPUT: Error toast shown to user via `onData` handler

  11. `logChatPersistenceFailure(...)` (features/chat/lib/chat-route.ts:322-343) →
      `console.error("[onFinish] Failed to persist chat data:", ...)` →
      Logs: chatId, userId, isNewChat, messageCount, error message →
      OUTPUT: Server-side error log

  --- USER MESSAGE PERSISTENCE (earlier in pipeline) ---

  12. Note: The USER'S message is persisted BEFORE streaming starts (API pipeline step 5f/5g):
      - New chat: `createChatWithInitialMessage(...)` — atomic transaction
      - Existing chat: `saveMessages([userDbMessage])`
      This is NOT part of onFinish — it happens synchronously in the request pipeline

BOTTLENECKS:
  - The entire `onFinish` callback blocks the stream close — the client doesn't receive the final "done" event until persistence completes
  - Wait:  Actually, `onFinish` runs during `writer.merge()` which the stream is still open — but usage emission (step 14 of API pipeline) awaits `result.usage` which may resolve before/after onFinish
  - Retry delays (0ms + 150ms + 400ms = 550ms total worst case) add latency to stream close
  - The DB transaction in `saveMessagesAndTouchChat` locks the chat row during the UPDATE

WASTE:
  - The recovery message path (step 9) duplicates the retry logic — runs another 3-attempt cycle just to save a 1-message recovery note
  - `toAssistantDbMessages` creates new objects with `attachments: []` for every message — the AI SDK messages may not have attachments at all
  - The `generatedTitle` race condition means the title may not be available during persistence — the chat stays "New Chat" until a separate update (if title gen resolves after onFinish)

SIMPLIFICATION OPPORTUNITIES:
  - Consider writing persistence to a queue (fire-and-forget from the stream handler) and processing it asynchronously — eliminates blocking on stream close
  - The recovery message flow could be simplified: if persistence fails, just log and notify the client — the recovery message approach means the chat history shows a confusing "could not be saved" message permanently
  - Cache invalidation could be batched: `refreshChat` + `refreshChatList` are two separate `revalidateTag` calls that could theoretically be combined

EXIT: Assistant messages persisted in DB, chat title updated (if available), cache entries revalidated. On failure: recovery message saved (or client notified via toast), server-side error logged.
