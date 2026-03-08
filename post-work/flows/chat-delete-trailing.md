FLOW: Delete Trailing Messages (Edit Message → Server Delete → Client Trim → Re-Submit)
ENTRY: User clicks edit on a message → edits text → submits via MessageEditor component

STEPS:
  1. `useChatSession.editMessage(messageId, content)` (features/chat/hooks/use-chat-session.ts:206-223) →
     Trims content → validates non-empty →
     OUTPUT: Cleaned edit text

  2. **Server-side delete** (features/chat/hooks/use-chat-session.ts:213-216) →
     `deleteTrailingMessages({ chatId: id, messageId })` — Server Action call →
     Waits for server response BEFORE modifying client state →
     PURPOSE: Prevents flash of empty state while round-trip is in-flight →
     OUTPUT: `ActionResult<void>`

  3. `deleteTrailingMessages` Server Action (features/chat/actions/delete-trailing-messages.ts) →
     SUB-STEPS:

  3a. **Validation** (line 28-34) →
      `deleteMessagesSchema.safeParse(input)` →
      Schema: `{ chatId: z.string().uuid(), messageId: z.string().uuid() }` →
      OUTPUT: Parsed input

  3b. **Auth + Fetch** (line 37) →
      `Promise.all([getAppSession(), getChatById(parsed.data.chatId)])` →
      PARALLEL: session and chat lookup →
      OUTPUT: `[AppSession | null, Chat | null]`

  3c. **Auth + Ownership check** (lines 39-57) →
      `!session` → 401 →
      `!chat` → 404 →
      `chat.userId !== session.user.id` → 403 →
      OUTPUT: Authorized operation

  3d. **Execute delete** (lines 60-68) →
      `deleteMessagesByIdAfter(parsed.data.chatId, parsed.data.messageId)` →
      (lib/data/message.ts:83-106) →
      TWO-PHASE delete:
        Phase 1: `SELECT createdAt FROM messages WHERE id = messageId AND chatId = chatId LIMIT 1`
        Phase 2: `DELETE FROM messages WHERE chatId = chatId AND createdAt >= targetCreatedAt`
      NOTE: Uses `createdAt >=` comparison — if two messages share exact same timestamp, BOTH are deleted (known limitation, documented in code) →
      OUTPUT: Target message + all subsequent messages deleted

  3e. **Cache invalidation** (line 71) →
      `invalidateChat(parsed.data.chatId)` → `updateTag(cacheKeys.chat(chatId))` →
      Uses `updateTag` (immediate consistency) →
      NOTE: Does NOT invalidate chat list (title/metadata unchanged) →
      OUTPUT: Chat data cache invalidated

  3f. Return `{ success: true, data: undefined }`

  4. **Error handling** (features/chat/hooks/use-chat-session.ts:214-216) →
     If `!result.success` → throws Error with `result.error.message` →
     This propagates to the MessageEditor's error handling →
     OUTPUT: Error thrown to caller

  5. **Client-side trim** (features/chat/hooks/use-chat-session.ts:219-222) →
     `setMessages(prev => { const idx = prev.findIndex(m => m.id === messageId); return idx === -1 ? prev : prev.slice(0, idx) })` →
     Removes the edited message AND all messages after it from local state →
     OUTPUT: Messages array truncated to just before the edit point

  6. **Reset usage** →
     `setUsage(undefined)` — clears previous token usage display →
     OUTPUT: Usage display cleared

  7. **Re-submit** (features/chat/hooks/use-chat-session.ts:223) →
     `void sdkSendMessage({ text })` — sends the edited text as a new message →
     This triggers the full "Send Message" flow (new POST /api/chat) →
     OUTPUT: New streaming response begins

  --- CLIENT UX DURING FLOW ---

  8. User sees:
     - MessageEditor appears (triggered by MessageActions setMode("edit"))
     - User edits text and submits
     - Brief pause while server deletes (step 2)
     - Messages after edit point disappear (step 5)
     - New "submitted" state while waiting for first token
     - New streaming response renders

BOTTLENECKS:
  - Step 2 waits for server round-trip BEFORE trimming client state — this is intentional (prevents flash) but adds visible latency
  - Step 3d's two-phase delete (SELECT then DELETE) requires two DB queries — could be a single query with subquery
  - The entire flow is synchronous: server delete → client trim → re-submit — no parallelism

WASTE:
  - `getChatById` in the server action fetches the full chat row just for ownership check — only `userId` is needed
  - The `createdAt >= timestamp` deletion strategy may over-delete if messages share timestamps — a UUID-based approach would be more precise
  - Cache invalidation happens for the chat but the client is about to overwrite the messages anyway via the new stream — the invalidation is only useful for other clients viewing the same chat

SIMPLIFICATION OPPORTUNITIES:
  - Client could optimistically trim messages BEFORE the server call returns (with rollback on failure) — would feel faster to users
  - The two-phase delete could be a single SQL: `DELETE FROM messages WHERE chatId = $1 AND createdAt >= (SELECT createdAt FROM messages WHERE id = $2 AND chatId = $1)`
  - Steps 5+7 (trim + re-submit) could be combined into a single `useChat` API call if the SDK supports "replace and submit" semantics
  - The server action and re-submit could potentially be combined: server deletes messages and immediately processes the new message in one round-trip (but this would require a custom API endpoint, not a Server Action + POST combo)

EXIT: Server messages deleted from DB (target + all after), client messages trimmed, new message submitted as fresh request → full Send Message flow begins. Chat cache invalidated.
