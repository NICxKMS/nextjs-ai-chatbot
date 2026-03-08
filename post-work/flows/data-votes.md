FLOW: Vote Data
ENTRY: Server Action `voteOnMessage` (write), Chat page (read)
STEPS:

  ## READ — Votes for Chat Page
  1. `app/(chat)/chat/[id]/page.tsx` → `getVotesPromise(chatId, session)`
  2. Guest users or unauthenticated → returns `Promise.resolve([])` immediately (no DB call)
  3. Authenticated users → `getCachedVotes(chatId, session.user.id)`:
     - `'use cache'` directive
     - `withCache(cacheKeys.votes(chatId), () => getVotesByChatId(chatId, userId), 'seconds')`
     - Tags: `votes:<chatId>`, Life: `seconds`
  4. `getVotesByChatId(chatId, userId)` in `lib/data/vote.ts`:
     - `db.select().from(votes).where(eq(chatId) AND eq(userId))` → `Vote[]`
     - No ordering specified — returns in natural insertion order
     - No limit — returns all votes for the chat by this user
  5. Vote promise is resolved inside `<Suspense>` via `<VoteResolver votesPromise={votesPromise} />`
  6. Votes are provided to child components via `<VotesProvider chatId={chatId}>`
  7. `.catch()` handler: if vote fetch fails, returns `[]` — graceful degradation

  ## WRITE — Vote on Message
  1. `features/voting/actions/vote.ts` → `voteOnMessage(input)` Server Action
  2. Auth: `getAppSession()` → reject if no session
  3. Guest check: reject guests (guests cannot vote)
  4. Validate: `voteSchema.safeParse(input)` → `{ chatId, messageId, type: 'up' | 'down' }`
  5. Ownership: `getChatById(chatId)` → verify `chat.userId === session.user.id`
  6. IDOR check: `getMessageById(messageId)` → verify `message.chatId === chatId`
     - **Sequential N+1 risk**: Steps 5 and 6 are SEQUENTIAL — `getChatById` then `getMessageById`.
       These could be parallelized since they're independent lookups.
  7. Rate limit: `checkRateLimit(rateLimitKeys.rateLimitVote(userId), 20, 60)` → 20 votes/min
  8. Execute: `upsertVote({ chatId, messageId, userId, isUpvoted: type === 'up' })`:
     - `db.insert(votes).values(data).onConflictDoUpdate({ target: [chatId, messageId, userId], set: { isUpvoted } }).returning()`
     - Uses PostgreSQL `ON CONFLICT DO UPDATE` — single atomic query for insert-or-update
  9. Invalidate: `invalidateVotes(chatId)` → `updateTag(cacheKeys.votes(chatId))` (immediate)
  10. Returns `{ success: true, data: { messageId, type } }` for optimistic reconciliation

BOTTLENECKS:
  - **Sequential authorization queries**: `getChatById` (step 5) and `getMessageById` (step 6) are called
    sequentially. Both are independent DB lookups. Parallelizing with `Promise.all` would save ~one DB
    round-trip latency.
  - Vote reads return ALL votes for a chat (no pagination/limit). For very long conversations with many
    votes, this could be a growing result set. In practice, users vote on a small fraction of messages.

WASTE:
  - `getVotesByChatId` returns full `Vote` objects (chatId, messageId, userId, isUpvoted). The client
    likely only needs `messageId` and `isUpvoted` — `chatId` and `userId` are already known.
  - `deleteVotesByChatId` exists in `lib/data/vote.ts` but is **@unused** — FK cascade handles cleanup.

SIMPLIFICATION OPPORTUNITIES:
  - Parallelize `getChatById` and `getMessageById` in the vote Server Action:
    `const [chat, message] = await Promise.all([getChatById(chatId), getMessageById(messageId)])`
  - Consider a reduced vote query that returns only `{ messageId, isUpvoted }` for the chat page.
  - The composite PK `(chatId, messageId, userId)` means the `onConflictDoUpdate` is using the PK
    for conflict detection — efficient and correct.

EXIT: Votes flow as `{ messageId, type }` to the client for optimistic UI reconciliation, or as `Vote[]` to `VotesProvider` context during page render
