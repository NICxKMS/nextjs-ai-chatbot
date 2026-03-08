FLOW: Cache Layer
ENTRY: `'use cache'` directive in page/feature functions → `cacheTag()` + `cacheLife()` from `next/cache`
STEPS:

  ## Pattern: `'use cache'` + `withCache()` Helper
  1. Calling function declares `'use cache'` as first statement in function body
  2. `withCache(tag, fetcher, life?)` in `lib/cache/with-cache.ts` is called:
     a. `cacheTag(tag)` → registers the tag string for on-demand invalidation
     b. `applyCacheLife(life)` → if `life` is provided:
        - String preset → `cacheLife(life)` (e.g., `'seconds'`, `'hours'`, `'max'`)
        - Object config → `cacheLife({ stale, revalidate, expire })`
     c. `return fetcher()` → executes the data-fetching function
  3. Next.js caches the return value, keyed by the function arguments (serialized)
  4. Subsequent calls with same args → served from cache until invalidated or expired

  ## Pattern: Direct `'use cache'` (without withCache)
  1. Function declares `'use cache'` + calls `cacheTag()` + `cacheLife()` directly
  2. Used in `getCachedChats` (sidebar) — does not use `withCache()` helper
  3. Functionally identical to the `withCache` pattern — just inline

  ## All `'use cache'` Sites (exhaustive)

  | Function | File | Tag | Life | Fetcher |
  |----------|------|-----|------|---------|
  | `getCachedChat(chatId)` | `app/(chat)/chat/[id]/page.tsx` | `chat:<chatId>` | `seconds` | `getChatById(chatId)` |
  | `getCachedVotes(chatId, userId)` | `app/(chat)/chat/[id]/page.tsx` | `votes:<chatId>` | `seconds` | `getVotesByChatId(chatId, userId)` |
  | `getCachedChats(userId)` | `features/sidebar/components/sidebar-shell.tsx` | `chats:<userId>` | `seconds` | `getChatsByUserId(userId, { limit: 20 })` |
  | `getAvailableModels()` | `features/models/lib/models.ts` | `models` | `hours` | `discoverModels()` + merge |

  ## Cache Key Structure (`lib/cache/keys.ts`)
  - `cacheKeys.chat(chatId)` → `"chat:<chatId>"` — per-chat data
  - `cacheKeys.chats(userId)` → `"chats:<userId>"` — per-user chat list
  - `cacheKeys.votes(chatId)` → `"votes:<chatId>"` — per-chat votes
  - `cacheKeys.models()` → `"models"` — global model catalog

  ## Cache Argument Serialization
  - `'use cache'` uses function arguments as part of the cache key
  - `getCachedChat(chatId: string)` → cache key includes `chatId` value
  - `getCachedVotes(chatId, userId)` → cache key includes both values
  - `getCachedChats(userId)` → cache key includes `userId`
  - `getAvailableModels()` → no args, single global entry
  - **Note**: `cacheTag` is for INVALIDATION (not keying). Arguments determine the cache key.
    The tag is an additional label for bulk invalidation.

  ## Cache Life Presets (Next.js 16)
  All sites use named presets:
  - `'seconds'` → short-lived, data revalidates frequently (~30s stale window typical)
  - `'hours'` → medium-lived, used for model catalog (changes rarely)
  - Custom configs are supported via `CacheLifeConfig` object but not currently used

  ## What is NOT Cached
  - **Messages** (`getMessagesForChatRender`) — called uncached on every page load and stream context.
    Messages change during active chats; caching would serve stale content during streaming.
  - **Artifacts** — all reads go through API routes with `Cache-Control` HTTP headers, not `'use cache'`.
  - **Suggestions** — fetched on-demand via API route with HTTP `Cache-Control: private, max-age=30`.
  - **User data** — never cached. Session uses `React.cache` (request-scoped, not cross-request).
  - **History API** — `GET /api/history` has `Cache-Control: private, no-cache`. Client SWR handles caching.

  ## `next.config.ts` Cache Settings
  - `cacheComponents: true` → enables component-level caching (PPR + `'use cache'` on components)
  - No custom `cacheLife` profiles defined in config — uses Next.js built-in presets only

BOTTLENECKS:
  - `'use cache'` with `cacheLife('seconds')` means cached data is revalidated every ~30 seconds.
    During rapid navigation between different chats, each new chat ID is a cache miss (unique args).
    The cache helps with re-visits to the same chat within the staleness window.
  - Model catalog uses `cacheLife('hours')` — a model configuration change requires either waiting
    for the cache to expire or manually calling `updateTag('models')`.

WASTE:
  - `withCache()` is a thin wrapper over `cacheTag()` + `cacheLife()` + fetcher call. It adds one
    function call of indirection. The direct pattern (as in `getCachedChats`) is equally clear.
    Both patterns coexist — minor inconsistency but not harmful.
  - `getCachedVotes` tags with `votes:<chatId>` but the cache key includes both `chatId` AND `userId`.
    This means invalidating `votes:<chatId>` invalidates entries for ALL users who viewed that chat's votes.
    In practice, typically only one user votes on their own chat, so this is fine.

SIMPLIFICATION OPPORTUNITIES:
  - Standardize on one pattern: either always use `withCache()` or always use direct
    `cacheTag()` + `cacheLife()`. Currently mixed.
  - The `applyCacheLife` function in `with-cache.ts` works around TypeScript overload resolution
    for `cacheLife()`. If Next.js types improve, this workaround can be removed.
  - Messages are the only high-frequency data NOT cached. If the chat page used `cacheTag(chat:<id>)`
    for messages AND `invalidateChat` was called after message persistence, messages could also benefit
    from caching — but this would require careful timing to avoid serving stale messages during streaming.

EXIT: Cached data is served by Next.js to RSC rendering pipeline, transparent to consuming components
