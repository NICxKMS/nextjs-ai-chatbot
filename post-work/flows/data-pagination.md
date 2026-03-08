FLOW: Cursor-Based Pagination
ENTRY: `GET /api/history?limit=N&cursor=X` (Route Handler) and `getCachedChats(userId)` (SSR sidebar)
STEPS:

  ## API ROUTE (`app/api/history/route.ts`)
  1. `getAppSession()` → auth check → reject unauthenticated
  2. Zod validation via `historyQuerySchema`:
     - `limit`: string → parseInt → clamp to [1, 100], default 20
     - `cursor`: string → trim → undefined if empty
  3. `getChatsByUserId(session.user.id, { limit, cursor })` → DB query
  4. Response: `{ chats, hasMore, nextCursor }` with `Cache-Control: private, no-cache`

  ## SSR SIDEBAR (`features/sidebar/components/sidebar-shell.tsx`)
  1. `getCachedChats(userId)` → `getChatsByUserId(userId, { limit: 20 })` (no cursor, first page only)
  2. Returns `{ chats, hasMore }` — first page of results, cached via `'use cache'` + `cacheLife('seconds')`

  ## CORE PAGINATION LOGIC (`getChatsByUserId` in `lib/data/chat.ts`)

  ### Step 1: Resolve Cursor
  1. If `cursor` is provided (a chat UUID):
     - Lookup cursor chat: `db.query.chats.findFirst({ where: eq(id, cursor) AND eq(userId), columns: { updatedAt: true } })`
     - Extract `cursorDate = cursorChat.updatedAt`
     - **N+1 RISK**: This is an EXTRA DB query to resolve the cursor timestamp. Every paginated request
       after the first page costs 2 DB queries instead of 1.
  2. If no cursor → `cursorDate = undefined` → no cursor condition

  ### Step 2: Build Compound Cursor Condition
  1. Uses a **compound cursor** on `(updatedAt, id)` to handle same-timestamp ties:
     ```sql
     WHERE userId = :userId
       AND (
         updatedAt < :cursorDate
         OR (updatedAt = :cursorDate AND id < :cursorId)
       )
     ```
  2. This prevents skipping rows when multiple chats share the same `updatedAt` timestamp
  3. Both `<` comparisons ensure strict ordering: earlier dates first, then earlier IDs for ties

  ### Step 3: Execute Query
  1. ```sql
     SELECT * FROM Chat
     WHERE userId = :userId [AND cursorCondition]
     ORDER BY updatedAt DESC, id DESC
     LIMIT :limit + 1
     ```
  2. **Over-fetch by 1**: requests `limit + 1` rows to determine if more pages exist
  3. Uses index `chat_user_updated_idx ON (userId, updatedAt DESC, id DESC)` — full index scan

  ### Step 4: Build Response
  1. If `results.length > limit` → `hasMore = true`, trim to `limit` rows
  2. `nextCursor = lastChat.id` (the ID of the last returned chat)
  3. Return `{ chats: Chat[], hasMore: boolean, nextCursor?: string }`

  ## CLIENT CONSUMPTION (SidebarHistoryClient)
  1. `useSWRInfinite` for pagination — fetches `GET /api/history?limit=20&cursor=<nextCursor>`
  2. Each subsequent page passes the `nextCursor` from the previous response
  3. SWR handles deduplication, caching, and revalidation on the client side

  ## INDEX USAGE
  - Query uses `chat_user_updated_idx ON (userId, updatedAt DESC, id DESC)`
  - The compound cursor condition `(updatedAt < X OR (updatedAt = X AND id < Y))` uses the index efficiently:
    - Postgres can seek to the cursor position in the B-tree
    - The DESC ordering matches the index sort order
  - **VERIFIED**: The index definition in schema.ts uses `.desc()` on both `updatedAt` and `id`:
    `index("chat_user_updated_idx").on(t.userId, t.updatedAt.desc(), t.id.desc())`

BOTTLENECKS:
  - **Cursor resolution query**: Every paginated request (except the first) requires TWO DB queries:
    1. Lookup cursor chat's `updatedAt` timestamp
    2. Execute the actual paginated query
    This could be avoided by passing `(updatedAt, id)` as the cursor instead of just `id`.
    The client would send `cursor=<updatedAt>|<id>` and the server would parse both values,
    eliminating the cursor resolution query entirely.
  - **Over-fetch by 1**: Requesting `limit + 1` rows is a standard pattern but means slightly more
    data is transferred from Postgres even when not needed. The overhead is one row — negligible.
  - **Full Chat objects returned**: The paginated query returns `SELECT *` — all columns including
    `model`, `visibility`, etc. The sidebar UI likely only needs `id`, `title`, `updatedAt`, and
    possibly `visibility`. Fetching all columns transfers more data than necessary.

WASTE:
  - The cursor resolution uses `db.query.chats.findFirst()` which supports Drizzle's query builder
    with relation loading. For a simple PK lookup, `db.select().from(chats).where(eq(id)).limit(1)`
    would be more efficient (no relation resolution overhead), though the difference is minimal.
  - The `historyQuerySchema` preprocesses `limit` with `Number.parseInt` + clamping + fallback.
    This is defensive but makes the schema harder to read. A simpler `z.coerce.number().int().min(1).max(100).default(20)` would achieve the same result.

SIMPLIFICATION OPPORTUNITIES:
  - **Compound cursor encoding**: Change cursor format from `chatId` to `<updatedAt_iso>|<chatId>`.
    This eliminates the cursor resolution query, saving one DB round-trip per paginated request.
    Trade-off: slightly larger cursor string in URL, but saves a DB query every time.
  - **Reduced column selection**: Change paginated query to select only the columns needed for the
    sidebar display: `db.select({ id, title, updatedAt, visibility }).from(chats)...`
  - **First-page optimization**: The SSR sidebar uses `getCachedChats` with `'use cache'`, while
    the API route does not use `'use cache'`. This is correct — the SSR path benefits from caching
    (same data re-served during ISR), while the API path must be fresh for SWR cursor state.

EXIT: `{ chats: Chat[], hasMore: boolean, nextCursor?: string }` → consumed by SidebarHistoryClient via SWR or by SSR sidebar render
