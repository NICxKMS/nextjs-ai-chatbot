FLOW: Persistence Retry
ENTRY: `persistChatResponse()` in `features/chat/lib/chat-route.ts` — called from `onFinish` callback in `POST /api/chat`
STEPS:

  ## PRIMARY PERSISTENCE PATH
  1. AI stream completes → `onFinish({ messages: responseMessages })` callback fires
  2. `persistChatResponse()` called with: `{ chatId, userId, responseMessages, isNewChat, generatedTitle }`
  3. `toAssistantDbMessages(chatId, responseMessages)` → converts `UIMessage[]` to `NewMessage[]`:
     - Maps each message: `{ id, chatId, role, parts, attachments: [] }`
  4. `title = isNewChat ? generatedTitle : undefined` → only set title for new chats
  5. `runWithPersistenceRetries(() => saveMessagesAndTouchChat({ chatId, messages, title }))`:

  ## RETRY MECHANISM (`runWithPersistenceRetries`)
  1. Configuration: `CHAT_PERSISTENCE_RETRY_DELAYS_MS = [150, 400]` → 3 total attempts
  2. **Attempt 1** (immediate, 0ms delay):
     - Calls `saveMessagesAndTouchChat` → DB transaction: INSERT messages + UPDATE chat
     - On success → return (done)
     - On failure → capture error, wait 150ms
  3. **Attempt 2** (after 150ms delay):
     - Retry same operation
     - On success → return (done)
     - On failure → capture error, wait 400ms
  4. **Attempt 3** (after 400ms delay):
     - Final retry attempt
     - On success → return (done)
     - On failure → throw `lastError` (all retries exhausted)

  Total maximum wait: 0 + 150 + 400 = 550ms of delay + 3x DB operation time

  ## INNER OPERATION (`saveMessagesAndTouchChat`)
  1. Opens a Drizzle transaction:
     a. `tx.insert(messages).values(data.messages)` — batch INSERT all assistant messages
     b. `tx.update(chats).set({ title?, updatedAt }).where(eq(chatId))` — touch/rename chat
  2. Transaction ensures atomicity: messages and chat update succeed or fail together
  3. If `data.messages` is empty, skip INSERT but still UPDATE chat (touch `updatedAt`)

  ## POST-PERSISTENCE CACHE REFRESH
  1. After successful persist: `refreshChat(chatId)` + `refreshChatList(userId)`
  2. Uses `revalidateTag` (stale-while-revalidate) — not `updateTag` (immediate)
  3. This is correct: we're in a Route Handler context, not a Server Action

  ## FAILURE RECOVERY PATH
  1. If all 3 attempts fail → error caught in `onFinish` → `recoverChatPersistenceFailure()` called
  2. Recovery creates a "tombstone" message:
     - `createPersistenceRecoveryMessage(chatId)` → `NewMessage` with role `assistant`, text:
       "The last assistant response could not be saved. Please resend your last message..."
  3. Recovery ALSO uses `runWithPersistenceRetries` — 3 more attempts to save the tombstone
  4. On recovery success:
     - `refreshChat(chatId)` + `refreshChatList(userId)` — update caches
     - Return `true`
  5. On recovery failure:
     - Return `false` — all 6 total attempts failed

  ## TOTAL FAILURE PATH
  1. If recovery also fails → `logChatPersistenceFailure()`:
     - `console.error("[onFinish] Failed to persist chat data:", JSON.stringify({...}))`
  2. Client receives `CHAT_PERSISTENCE_FAILURE_SIGNAL` via stream:
     - Signal text: "The assistant response was shown, but it could not be saved..."
  3. The streamed response WAS shown to the user but is NOT persisted in DB
  4. User can copy the response and try again

  ## FAILURE SIGNAL DELIVERY
  1. On total failure, the stream writer emits the failure signal:
     ```
     writer.write({ type: "error", error: CHAT_PERSISTENCE_FAILURE_SIGNAL })
     ```
  2. This happens inside the `onFinish` → catch block → after recovery failure

BOTTLENECKS:
  - **Total retry time**: Up to 550ms of delays + 3x DB transaction time. If the DB is slow (~200ms),
    total worst case is ~1.15 seconds before failure is declared.
  - **Blocking onFinish**: The `onFinish` callback runs inside the stream. While the stream response
    has already been sent to the client, the HTTP connection may remain open during persistence.
    However, the client already has the full response — this is background work.
  - **Double retry on failure**: Recovery path adds another 3 attempts (550ms more). Total worst case
    for complete failure: ~2.3 seconds of retries before giving up.

WASTE:
  - The recovery tombstone message ("Please resend your last message...") adds noise to the chat history.
    It persists even if the user successfully resends. No cleanup mechanism exists for tombstone messages.
  - `generatedTitle` is passed through both primary and recovery paths. If title generation failed or
    hasn't completed, it's `undefined` — handled correctly by the `title ? { title, updatedAt } : { updatedAt }`
    conditional in `saveMessagesAndTouchChat`.

SIMPLIFICATION OPPORTUNITIES:
  - The retry delays `[150, 400]` are arbitrary but reasonable — they give transient DB issues time to
    resolve without being so long that the user notices. Could be configurable via env var for tuning.
  - Consider exponential backoff instead of fixed delays: 100ms, 300ms, 900ms — but the current
    progressive delays (150, 400) are effectively similar for 3 attempts.
  - The recovery tombstone approach is pragmatic but could be improved with a client-side "retry save"
    mechanism that re-submits the response data. Currently, the user must resend their original message.
  - If `saveMessagesAndTouchChat` fails because the chat was deleted (FK error), retrying is futile.
    The retry mechanism doesn't distinguish between transient (connection) and permanent (FK) errors.
    Adding error classification could short-circuit retries for permanent failures.

EXIT: Messages persisted in DB + cache tags refreshed, OR tombstone message persisted, OR total failure logged + signal sent to client
