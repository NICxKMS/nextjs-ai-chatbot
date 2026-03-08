FLOW: Cache Invalidation
ENTRY: Server Actions (immediate via `updateTag`) and Route Handlers (stale-while-revalidate via `revalidateTag`)
STEPS:

  ## TWO INVALIDATION STRATEGIES

  ### Strategy 1: `updateTag()` — Immediate Consistency (Server Actions)
  - Imported from `next/cache`
  - Semantics: the NEXT request that reads this tag will wait for fresh data before responding
  - No stale content served after invalidation
  - Used for user-initiated mutations where read-your-own-writes is essential

  ### Strategy 2: `revalidateTag(tag, 'max')` — Stale-While-Revalidate (Route Handlers)
  - Imported from `next/cache`
  - Called with second argument `'max'` (revalidation urgency)
  - Semantics: stale content is served to the current request while fresh data loads in background
  - Acceptable for background persistence where slight delay is OK

  ## INVALIDATION HELPERS (`lib/cache/revalidate.ts`)

  | Helper | Tag | Strategy | Used By |
  |--------|-----|----------|---------|
  | `invalidateChat(chatId)` | `chat:<chatId>` | `updateTag` | `deleteTrailingMessages`, `updateChatVisibility` |
  | `invalidateChatList(userId)` | `chats:<userId>` | `updateTag` | `deleteChat`, `deleteAllChats`, `updateChatVisibility` |
  | `invalidateVotes(chatId)` | `votes:<chatId>` | `updateTag` | `voteOnMessage` |
  | `refreshChat(chatId)` | `chat:<chatId>` | `revalidateTag` | `persistChatResponse`, `recoverChatPersistenceFailure` |
  | `refreshChatList(userId)` | `chats:<userId>` | `revalidateTag` | `persistChatResponse`, `recoverChatPersistenceFailure` |
  | `refreshVotes(chatId)` | `votes:<chatId>` | `revalidateTag` | (unused — defined but not called anywhere) |

  ## MUTATION → INVALIDATION MAP (Complete)

  | Mutation | Trigger | Invalidations |
  |----------|---------|---------------|
  | Delete single chat | Server Action `deleteChat` | `invalidateChatList(userId)` |
  | Delete all chats | Server Action `deleteAllChats` | `invalidateChatList(userId)` |
  | Delete trailing messages | Server Action `deleteTrailingMessages` | `invalidateChat(chatId)` |
  | Update visibility | Server Action `updateChatVisibility` | `invalidateChat(chatId)` + `invalidateChatList(userId)` |
  | Vote on message | Server Action `voteOnMessage` | `invalidateVotes(chatId)` |
  | Persist chat response | Route Handler `POST /api/chat` (onFinish) | `refreshChat(chatId)` + `refreshChatList(userId)` |
  | Recover persistence failure | Route Handler `POST /api/chat` (fallback) | `refreshChat(chatId)` + `refreshChatList(userId)` |
  | Create new chat (during stream) | `resolveChatRouteContext` | *none* — deferred to `persistChatResponse` |
  | Save user message (existing chat) | `resolveChatRouteContext` | *none* — deferred to `persistChatResponse` |
  | Save artifact version | Tool call / API POST | *none* — no cache tags for artifacts |
  | Restore artifact | API POST | *none* — no cache tags for artifacts |

  ## TIMING ANALYSIS

  ### Server Action Path (immediate):
  1. User clicks delete/vote/visibility change
  2. Server Action executes mutation
  3. `updateTag()` called — cache entry marked stale
  4. Next navigation/revalidation fetches fresh data — no stale served
  5. Typical latency: DB mutation + `updateTag()` ≈ 50-200ms

  ### Route Handler Path (stale-while-revalidate):
  1. AI stream completes → `onFinish` callback fires
  2. `persistChatResponse()` saves messages + updates chat
  3. `refreshChat(chatId)` + `refreshChatList(userId)` called
  4. Current requests may still see stale data; next requests get fresh
  5. Typical latency: DB transaction + `revalidateTag()` ≈ 100-500ms (including retry delays)

  ## GAPS AND EDGE CASES

  ### Missing Invalidations
  1. **`deleteChat` does not call `invalidateChat(chatId)`** — only `invalidateChatList`.
     If another browser tab has this chat page open, the cached chat data persists until TTL expires.
     However, the DB data is deleted, so opening the chat in a new tab will get `null` from DB.
  2. **`deleteAllChats` does not invalidate individual `chat:<id>` tags** — same reasoning as above.
     All individual chat caches expire via TTL (`seconds`) naturally.
  3. **`refreshVotes()` is defined but never called** — no Route Handler path currently needs it.
  4. **New chat creation has no immediate cache invalidation** — the sidebar list won't show the new
     chat until `persistChatResponse` calls `refreshChatList`. This means during streaming, the sidebar
     is stale. The client-side SWR refresh handles this via polling or manual refetch.
  5. **Artifact operations have NO cache invalidation** — artifacts are not cached via `'use cache'`,
     so there's nothing to invalidate. API responses use HTTP `Cache-Control` headers only.

  ### Race Conditions
  1. **Rapid fire mutations**: If a user deletes a chat while a stream for that chat is finishing,
     `persistChatResponse` may attempt to save messages to a deleted chat → DB FK error.
     The persistence retry mechanism handles this with retries, but the error will eventually propagate.
  2. **Stale sidebar during streaming**: New chat appears in sidebar only after stream completes and
     `refreshChatList` is called. If the user navigates away before stream finishes, the chat exists
     in DB but the sidebar may not show it until next page load or SWR refetch.

BOTTLENECKS:
  - `updateTag()` is synchronous (void return) — it marks the tag but doesn't wait for cache rebuild.
    The next read triggers the actual refresh. This is fast but means the first read after invalidation
    has higher latency (cold cache miss → DB query).
  - `revalidateTag()` with `'max'` still serves stale to the current requestor. For the chat streaming
    path, this means the user who just sent a message may see stale sidebar data until their next
    navigation event.

WASTE:
  - `refreshVotes()` is exported from `revalidate.ts` but never used. Dead code.
  - `updateChatVisibility` calls BOTH `invalidateChat(chatId)` AND `invalidateChatList(userId)`.
    The chat list cache contains `Chat[]` which includes `visibility` — so invalidating the list is
    correct. `invalidateChat` is also correct because the individual chat page shows visibility.
    Both are necessary — no waste here.

SIMPLIFICATION OPPORTUNITIES:
  - Remove `refreshVotes()` from `revalidate.ts` — it's unused dead code.
  - Consider adding `invalidateChat(chatId)` to `deleteChat` for correctness in multi-tab scenarios.
    The cost is one `updateTag()` call (essentially free).
  - The dual strategy (updateTag vs revalidateTag) is well-motivated: Server Actions need immediate
    consistency, Route Handlers can tolerate staleness. This is a good architectural choice.

EXIT: Cache tags are invalidated → Next.js cache layer marks entries as stale → subsequent reads fetch fresh data from DB
