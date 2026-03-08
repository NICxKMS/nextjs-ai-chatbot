FLOW: Chat Data
ENTRY: Multiple entry points — Server Actions, Route Handlers, Page components
STEPS:

  ## CREATE — New Chat (during streaming)
  1. `POST /api/chat` → `resolveChatRouteContext()` in `features/chat/lib/chat-route.ts`
  2. `getChatById(chatId)` → checks if chat exists (pure DB, no cache) → `db.query.chats.findFirst()`
  3. If new chat + guest user → `ensureGuestUser(userId)` → `INSERT ... ON CONFLICT DO NOTHING`
  4. `createChatWithInitialMessage({ id, userId, title: "New Chat", model, visibility, message })`:
     - Opens a **transaction**
     - `INSERT INTO Chat` → returns created row via `.returning()`
     - `INSERT INTO Message_v2` → user's first message
     - Transaction commits atomically
  5. No cache invalidation at create time — invalidation happens in `persistChatResponse()` after stream completes

  ## READ — Single Chat (page load)
  1. `app/(chat)/chat/[id]/page.tsx` → `getChatPageState(chatId)` (wrapped in `React.cache`)
  2. `getCachedChat(chatId)`:
     - `'use cache'` directive
     - `withCache(cacheKeys.chat(chatId), () => getChatById(chatId), 'seconds')`
     - Tags: `chat:<chatId>`, Life: `seconds`
  3. `getChatById(chatId)` → `db.query.chats.findFirst({ where: eq(chats.id, chatId) })` → `Chat | null`
  4. `getVisibleChat()` → access control: private chats require `session.user.id === chat.userId`
  5. Returns `{ session, chat }` — memoized per-request via `React.cache`

  ## READ — Chat List (sidebar SSR)
  1. `features/sidebar/components/sidebar-shell.tsx` → `getCachedChats(userId)`
  2. `'use cache'` + `cacheLife('seconds')` + `cacheTag(cacheKeys.chats(userId))`
  3. `getChatsByUserId(userId, { limit: 20 })` → cursor-based pagination (see data-pagination.md)
  4. Returns `{ chats: Chat[], hasMore: boolean }` — cached per userId

  ## READ — Chat List (client pagination)
  1. `SidebarHistoryClient` → `useSWRInfinite` → `GET /api/history?limit=N&cursor=X`
  2. `app/api/history/route.ts`:
     - `getAppSession()` → auth check
     - Zod validation of `limit` (1–100, default 20) and `cursor`
     - `getChatsByUserId(userId, { limit, cursor })` → direct DB call (NO cache wrapper)
     - Response: `{ chats, hasMore, nextCursor }` with `Cache-Control: private, no-cache`

  ## UPDATE — Title (during streaming)
  1. `persistChatResponse()` in `chat-route.ts` → `saveMessagesAndTouchChat({ chatId, messages, title })`
  2. Transaction: `INSERT messages` + `UPDATE Chat SET title = :title, updatedAt = NOW()`
  3. After persist: `refreshChat(chatId)` + `refreshChatList(userId)` (revalidateTag, stale-while-revalidate)

  ## UPDATE — Visibility
  1. `features/visibility/actions/update-visibility.ts` → Server Action `updateChatVisibility(input)`
  2. Auth → Zod validate → ownership check via `getChatById` → `updateVisibilityInDb(chatId, visibility)`
  3. `db.update(chats).set({ visibility, updatedAt: new Date() })`
  4. `invalidateChat(chatId)` + `invalidateChatList(userId)` (updateTag, immediate)

  ## DELETE — Single Chat
  1. `features/chat/actions/delete-chat.ts` → Server Action `deleteChat(input)`
  2. Auth + Zod validate (parallel `getAppSession()` + `getChatById()`) → ownership check
  3. `db.delete(chats).where(eq(chats.id, chatId))` → FK CASCADE deletes messages, votes, artifacts
  4. `invalidateChatList(session.user.id)` (updateTag, immediate)
  5. **NOTE**: `invalidateChat(chatId)` is NOT called — the chat is gone, so no one should be loading it.
     If a user has the chat page open in another tab, their next navigation will 404.

  ## DELETE — All Chats
  1. `features/chat/actions/delete-all-chats.ts` → Server Action `deleteAllChats()`
  2. Auth → `db.delete(chats).where(eq(chats.userId, userId))` → bulk delete + FK CASCADE
  3. `invalidateChatList(session.user.id)` (updateTag, immediate)
  4. **NOTE**: Individual chat caches (`chat:<id>`) are NOT invalidated. They will expire via TTL (`seconds`).
     Acceptable because deletion also removes DB rows — cache misses will return `null`.

BOTTLENECKS:
  - `resolveChatRouteContext()` does `getChatById()` (uncached) on every POST request to verify ownership.
    This is a DB round-trip that could be avoided with cache, but correctness requires fresh data here.
  - `deleteChat` Server Action does `getAppSession()` and `getChatById()` in parallel — good.
  - The history API route does NOT use `'use cache'` — every client pagination request hits the DB directly.
    This is intentional: client-side SWR handles caching, and server cache would conflict with cursor state.

WASTE:
  - `deleteAllChats`: does not invalidate individual `chat:<id>` tags. Stale cache entries persist until TTL
    (`cacheLife('seconds')`) expires. This means a direct URL hit to `/chat/[id]` could briefly serve a
    cached chat that no longer exists in the DB. The page would then show the chat shell but with no
    messages (since those are fetched uncached). Edge case, but worth noting.
  - `createChatWithInitialMessage` opens a transaction for 2 simple INSERTs. Transaction overhead is
    minimal but the atomicity guarantee is correct — if message insert fails, chat should not exist.

SIMPLIFICATION OPPORTUNITIES:
  - `getChatPageState` uses `React.cache` wrapping `getCachedChat` which uses `'use cache'`.
    These are two separate memoization layers: `React.cache` (request-scoped) and `'use cache'`
    (cross-request). Both are necessary — `React.cache` prevents duplicate calls within the same render
    (e.g., `generateMetadata` + `ExistingChatPage` both calling `getChatPageState`), while `'use cache'`
    prevents DB hits across requests.
  - The chat creation flow in `resolveChatRouteContext` could skip the `getChatById` call when the client
    sends a fresh UUID (new chat). However, the server cannot trust the client — the ID could collide
    with an existing chat owned by another user. The ownership check is necessary.

EXIT: Chat objects flow to page components, serialized to JSON for client components
