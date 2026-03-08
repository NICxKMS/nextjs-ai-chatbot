# Wave 1 — Static Audit: `app/` (Routes, Layouts, Pages, API)

**Date:** 2026-03-07
**Scope:** Every file under `app/` — root layout, route groups, pages, API route handlers
**Method:** Static code analysis, cross-referencing with helper modules

---

## Table of Contents

1. [Summary](#summary)
2. [File Inventory](#file-inventory)
3. [Findings — Chat Page Waterfall](#1-chat-page-waterfall)
4. [Findings — generateMetadata & React.cache](#2-generatemetadata--reactcache)
5. [Findings — Suspense/Error/Loading Boundaries](#3-suspenseerrorloading-boundaries)
6. [Findings — Rate Limiting & Response Consistency](#4-rate-limiting--response-consistency)
7. [Findings — SEO, Metadata, Provider Tree](#5-seo-metadata--provider-tree)
8. [Findings — API Route Security & Robustness](#6-api-route-security--robustness)
9. [Findings — Miscellaneous](#7-miscellaneous)
10. [Summary Table](#summary-table)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 5     |
| MEDIUM   | 10    |
| LOW      | 6     |
| **Total** | **22** |

The most significant findings are: (1) missing rate limiting on 4 of 6 API endpoints, (2) sequential await waterfall on existing chat page blocking TTFB by ~200–400ms, and (3) missing `robots.txt`/`sitemap.xml` for SEO. The architecture is generally sound — Suspense boundaries are well-placed, error boundaries exist at every route group level, and React.cache sharing between `generateMetadata` and page is correctly implemented.

---

## File Inventory

| Path | Type | Lines |
|------|------|-------|
| `app/layout.tsx` | Root layout (Server Component) | ~54 |
| `app/globals.css` | Global styles (Tailwind v4) | ~180 |
| `app/global-error.tsx` | Global error boundary (Client) | ~113 |
| `app/not-found.tsx` | 404 page (Server Component) | ~28 |
| `app/(auth)/layout.tsx` | Auth layout + guard (Server) | ~40 |
| `app/(auth)/error.tsx` | Auth error boundary (Client) | ~44 |
| `app/(auth)/loading.tsx` | Auth loading skeleton | ~5 |
| `app/(auth)/login/page.tsx` | Login page | ~13 |
| `app/(auth)/register/page.tsx` | Register page | ~13 |
| `app/(chat)/layout.tsx` | Chat layout + sidebar (Server) | ~93 |
| `app/(chat)/error.tsx` | Chat error boundary (Client) | ~42 |
| `app/(chat)/loading.tsx` | Chat loading skeleton | ~36 |
| `app/(chat)/page.tsx` | New chat page (Server) | ~37 |
| `app/(chat)/chat/[id]/page.tsx` | Existing chat page (Server) | ~115 |
| `app/(chat)/chat/[id]/loading.tsx` | Existing chat loading skeleton | ~65 |
| `app/api/chat/route.ts` | POST — streaming chat | ~250 |
| `app/api/artifact/route.ts` | GET + POST — artifact CRUD | ~192 |
| `app/api/files/upload/route.ts` | POST — file upload | ~140 |
| `app/api/health/route.ts` | GET — health check | ~96 |
| `app/api/history/route.ts` | GET — chat history | ~75 |
| `app/api/suggestions/route.ts` | GET — artifact suggestions | ~80 |

---

## 1. Chat Page Waterfall

### F-01: Existing Chat Page — Sequential Await Chain (~200–400ms)

```
SEVERITY: [HIGH]
FILE: app/(chat)/chat/[id]/page.tsx:85-101
FINDING: The existing chat page has a multi-step sequential waterfall:
  1. `await params`
  2. `getChatPageState(chatId)` — internally does `Promise.all([getAppSession(), getCachedChat()])` (~50-200ms)
  3. If chat found, access control check
  4. `getVotesPromise(chatId, session)` — kicked off (not awaited)
  5. `await Promise.all([getMessagesForChatRender(chatId), availableModelsPromise])` (~50-200ms)

  Steps 2 and 5 are sequential — messages cannot fetch until session+chat resolves.
  The `availableModelsPromise` is started at line 87 (before step 2) and joined in step 5,
  which is good parallelization. However, `getMessagesForChatRender` is blocked behind
  access control.
  
  Total TTFB impact: session (~50-200ms) + chat (~20-50ms) + messages (~50-100ms) = ~120-350ms
  sequential. The access control dependency (must verify ownership before fetching messages)
  is architecturally correct but could be optimized via speculative fetch.
  
RECOMMENDATION: 
  - Start `getMessagesForChatRender(chatId)` speculatively in parallel with `getChatPageState()`,
    then discard results if access control fails. This turns the waterfall into a single parallel
    round: `Promise.all([getChatPageState(), getMessagesForChatRender(), getAvailableModels()])`.
  - Trade-off: a denied user causes a wasted DB query. Acceptable since most
    requests are by the chat owner, and the message query is read-only.
```

### F-02: New Chat Page — Unnecessary Sequential Await

```
SEVERITY: [MEDIUM]
FILE: app/(chat)/page.tsx:19-23
FINDING: `getDefaultModel` receives `availableModelsPromise` but still uses `await Promise.all([
  searchParams, availableModelsPromise, getDefaultModel(null, availableModelsPromise)])`.
  
  `getDefaultModel` internally reads cookies (another dynamic API) and then awaits
  `availableModelsPromise`. Since `searchParams` is also a promise (Next.js 16),
  and cookies/searchParams share the same dynamic request context, the parallelization
  with Promise.all is correct. However, `searchParams` resolution is near-instant
  (in-memory) while the model calls hit cache.
  
  This is already parallelized — no actual waterfall. Marking as informational.
  
RECOMMENDATION: No immediate change needed. Already parallel.
```

### F-03: Chat API Route — Sequential Pipeline in `resolveChatRouteContext`

```
SEVERITY: [HIGH]
FILE: features/chat/lib/chat-route.ts:170-215 (called from app/api/chat/route.ts:66)
FINDING: The POST /api/chat handler has a multi-phase sequential pipeline:
  1. `requireChatSession()` → `getAppSession()` (~50-200ms Supabase HTTP)
  2. `enforceChatRateLimit()` → Redis INCR (~5-20ms)
  3. `readChatRequest()` → JSON parse (~<1ms)
  4. `resolveChatRouteContext()` → internally:
     a. `Promise.all([getAvailableModels(), getChatById(chatId)])` (~20-80ms)
     b. `getMessagesForChatRender(chatId)` (if existing chat, ~50-100ms)
     c. `createChatWithInitialMessage()` or `saveMessages()` (~20-50ms)

  Steps 1-4 are fully sequential. Rate limit (step 2) depends on session (step 1), which
  is correct. But within step 4, the message fetch (4b) could start alongside 4a for
  existing chats. Total worst-case: ~200-450ms before streaming begins.
  
RECOMMENDATION:
  - Within `resolveChatRouteContext`: for existing chats, start `getMessagesForChatRender`
    in parallel with the `Promise.all([getAvailableModels(), getChatById()])` call.
  - Consider starting `getAvailableModels()` before `enforceChatRateLimit()` since models
    are cached and rate limiting is the rare rejection path.
```

---

## 2. `generateMetadata` & React.cache

### F-04: Correct React.cache Sharing Between Metadata and Page

```
SEVERITY: [LOW] (positive finding)
FILE: app/(chat)/chat/[id]/page.tsx:46-77
FINDING: `getChatPageState` is wrapped in `React.cache()` (line 46), and both
  `generateMetadata` (line 72) and the page component (line 86) call it with the
  same `chatId` argument. This correctly deduplicates the session + chat DB fetch
  across metadata generation and page rendering within the same request.
  
  The `'use cache'` directive in `getCachedChat` (line 22) provides cross-request
  caching, while `React.cache` provides intra-request deduplication. Both layers
  are present and correctly composed.
  
RECOMMENDATION: No change needed. This is well-implemented.
```

### F-05: generateMetadata Not Present on New Chat Page

```
SEVERITY: [LOW]
FILE: app/(chat)/page.tsx:7-9
FINDING: The new chat page uses static `export const metadata` rather than
  `generateMetadata`. This is correct — there's no dynamic data needed for
  the "New Chat" title. Static metadata is preferred for performance.
  
RECOMMENDATION: No change needed.
```

---

## 3. Suspense/Error/Loading Boundaries

### F-06: Good Suspense Coverage in Chat Layout

```
SEVERITY: [LOW] (positive finding)
FILE: app/(chat)/layout.tsx:78-92
FINDING: The chat layout has well-structured Suspense boundaries:
  1. `<Suspense fallback={null}>` for `NoticeHandler` (search params, non-blocking)
  2. `<Suspense fallback={<ChatLayoutFallback>}>` for `ChatLayoutShell` (sidebar cookie read)
  3. Inside ChatLayoutShell: `<Suspense fallback={<SidebarSkeleton />}>` for `SidebarShell`

  The fallback strategy is thoughtful — ChatLayoutFallback preserves the `{children}` 
  (page content) while the sidebar loads, preventing a blank screen. The session promise
  is started eagerly and passed to SessionProvider outside the Suspense boundary.
  
RECOMMENDATION: No change needed. Well-designed streaming architecture.
```

### F-07: Missing Suspense Boundary Around New Chat Page Awaits

```
SEVERITY: [MEDIUM]
FILE: app/(chat)/page.tsx:17-33
FINDING: The `NewChatPage` is an async Server Component that awaits `searchParams`,
  `availableModels`, and `getDefaultModel`. These awaits block the page render, but
  the parent `(chat)/layout.tsx` wraps children inside a Suspense boundary via
  `ChatLayoutShell`. So the loading.tsx skeleton IS the fallback.
  
  However, considering the page awaits model resolution (~cached, fast) and search
  params (~instant), the delay is minimal. The loading skeleton in `(chat)/loading.tsx`
  covers this gap.
  
RECOMMENDATION: Acceptable as-is. The layout-level Suspense + loading.tsx provides coverage.
```

### F-08: Auth Layout Suspense — Correct Dynamic API Isolation

```
SEVERITY: [LOW] (positive finding)  
FILE: app/(auth)/layout.tsx:28-38
FINDING: The auth layout correctly isolates the `getAppSession()` call (which reads
  cookies, a dynamic API) inside a `<Suspense>` boundary via the `AuthGuard` async
  component. This allows the static centered container shell to prerender immediately
  with `cacheComponents: true`, while the auth guard streams once cookies resolve.
  
RECOMMENDATION: No change needed. This follows the Next.js 16 pattern correctly.
```

### F-09: Full Error Boundary Coverage

```
SEVERITY: [LOW] (positive finding)
FILE: app/global-error.tsx, app/(auth)/error.tsx, app/(chat)/error.tsx
FINDING: Error boundaries exist at all three levels:
  - `global-error.tsx` — root level, renders own HTML shell with inline styles (correct
    for when root layout fails)
  - `(auth)/error.tsx` — auth route group level
  - `(chat)/error.tsx` — chat route group level
  
  All three use `useEffect` for error logging, expose `error.digest`, and provide
  both "Go Home" and "Try Again" actions. The global error correctly avoids importing
  layout-level providers.
  
  Missing: No error boundary at `(chat)/chat/[id]/` level. If the existing chat page
  throws, it bubbles up to `(chat)/error.tsx`, which is acceptable but means the sidebar
  is also replaced. A page-level error boundary could preserve the sidebar.
  
RECOMMENDATION: Consider adding `app/(chat)/chat/[id]/error.tsx` to catch page-level
  errors while preserving the sidebar layout. Low priority — current coverage is adequate.
```

---

## 4. Rate Limiting & Response Consistency

### F-10: Missing Rate Limiting on `/api/artifact` (GET + POST)

```
SEVERITY: [CRITICAL]
FILE: app/api/artifact/route.ts:19,90
FINDING: Neither the GET nor POST handler on `/api/artifact` has rate limiting.
  - GET allows unlimited fetches of artifact versions (DB reads per request)
  - POST allows unlimited save/restore operations (DB writes per request)
  
  Both endpoints are authenticated, but a compromised or malicious session could
  hammer the database. The rate limit key `rateLimitKeys.rateLimit` and 
  `rateLimitKeys.rateLimitDaily` exist in cache/keys.ts but are documented as
  "reserved for future" and "test-only".
  
RECOMMENDATION:
  - Add rate limiting to both GET and POST, using `checkRateLimit()` from `lib/cache/rate-limit.ts`
  - Suggested limits: GET 60/min, POST 30/min
  - Add `rateLimitKeys.rateLimitArtifact(userId)` to cache/keys.ts
```

### F-11: Missing Rate Limiting on `/api/history` (GET)

```
SEVERITY: [HIGH]
FILE: app/api/history/route.ts:34
FINDING: The GET /api/history endpoint has no rate limiting. Each request performs
  a paginated DB query with potential cursor lookup (two DB queries: cursor resolution
  + main query). An authenticated user could rapidly poll this endpoint.
  
  The endpoint does have Zod validation (historyQuerySchema) and proper auth checks.
  
RECOMMENDATION:
  - Add rate limiting: 30 requests/min per user
  - Add `rateLimitKeys.rateLimitHistory(userId)` to cache/keys.ts
```

### F-12: Missing Rate Limiting on `/api/suggestions` (GET)

```
SEVERITY: [HIGH]
FILE: app/api/suggestions/route.ts:13
FINDING: The GET /api/suggestions endpoint has no rate limiting. Each request performs
  an IDOR ownership check (1-2 DB queries) plus a suggestions fetch (1 DB query).
  
RECOMMENDATION:
  - Add rate limiting: 60 requests/min per user
  - Consider combining with a general API rate limit key
```

### F-13: Missing Rate Limiting on `/api/health` (GET)

```
SEVERITY: [MEDIUM]
FILE: app/api/health/route.ts:81
FINDING: The health check endpoint has no rate limiting and no authentication.
  Each request makes two queries (DB `SELECT 1` + Redis `PING`). Public exposure
  without rate limiting allows anyone to DDoS the DB and cache.
  
  The endpoint does set `Cache-Control: public, max-age=60, s-maxage=60`, but clients
  can bypass CDN with cache-busting query strings.
  
RECOMMENDATION:
  - Add IP-based rate limiting: 10 requests/min (not user-based since unauthenticated)
  - Consider making health checks configurable via an auth token for monitoring services
  - Alternatively, add `Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=30`
```

### F-14: Inconsistent Response Shape Across API Endpoints

```
SEVERITY: [MEDIUM]
FILE: app/api/artifact/route.ts, app/api/history/route.ts, app/api/suggestions/route.ts
FINDING: API endpoints return different response structures:
  - `/api/artifact` GET returns: `[artifact, ...]` (bare array)
  - `/api/artifact` POST save returns: `{ artifact }` (wrapped)
  - `/api/artifact` POST restore returns: `{ success: true }` (flag)
  - `/api/history` GET returns: `{ chats, hasMore, nextCursor }`
  - `/api/suggestions` GET returns: `{ suggestions }`
  - `/api/health` GET returns: `{ status, timestamp, checks }`
  - `/api/chat` POST returns: SSE stream (correct for streaming)
  - `/api/files/upload` POST returns: `{ url, pathname, contentType }`
  
  The artifact GET endpoint returns a bare array, unlike all other endpoints which
  wrap data in an object. This inconsistency makes client code harder to standardize.
  
RECOMMENDATION:
  - Wrap artifact GET in `{ versions: [...] }` or `{ artifacts: [...] }` for consistency
  - Document the API response contract in a shared type
```

### F-15: Rate Limit Graceful Degradation — Silent Allowance

```
SEVERITY: [MEDIUM]
FILE: lib/cache/rate-limit.ts:12-14 (used by all rate-limited endpoints)
FINDING: When Redis is unavailable, `checkRateLimit` returns `true` (allow). This is
  intentional graceful degradation, but it means ALL rate limits become ineffective
  when Redis is down. There's no logging or alerting when this degradation occurs.
  
  Combined with F-13 (health endpoint has no rate limiting at all), a Redis outage
  simultaneously disables rate limiting and makes the health endpoint report "degraded"
  — but there's no connection between these two states.
  
RECOMMENDATION:
  - Add a `console.warn` in `checkRateLimit` when Redis returns null, with rate-limited
    logging (at most once per minute) to surface the degradation
  - Consider a circuit breaker pattern for rate limiting: if Redis is down for >N seconds,
    apply a conservative in-memory rate limit
```

---

## 5. SEO, Metadata & Provider Tree

### F-16: Missing `robots.txt` and `sitemap.xml`

```
SEVERITY: [HIGH]
FILE: app/ (missing files)
FINDING: No `robots.txt` or `sitemap.xml` exists in the `app/` directory. Next.js 16
  supports `app/robots.ts` and `app/sitemap.ts` for programmatic generation.
  
  Without robots.txt, search engines may crawl API routes, auth pages, and other
  non-public paths. Without sitemap.xml, public chat pages (visibility: "public")
  are not discoverable.
  
RECOMMENDATION:
  - Add `app/robots.ts` to disallow `/api/`, `/(auth)/`, and private chat paths
  - Add `app/sitemap.ts` if public chats should be indexed (depends on product intent)
  - At minimum, robots.txt should exist to block API crawling
```

### F-17: Root Layout — Minimal SEO Metadata

```
SEVERITY: [MEDIUM]
FILE: app/layout.tsx:10-22
FINDING: Root layout metadata has:
  ✅ title, description
  ✅ openGraph (title + description + type)
  ✅ viewport (via exported const)
  
  Missing:
  - No `metadataBase` URL — OpenGraph/Twitter cards won't have absolute URLs
  - No Twitter card metadata
  - No favicon/icons definition (relies on default /favicon.ico)
  - No `manifest` for PWA
  - No canonical URL
  
RECOMMENDATION:
  - Add `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')`
  - Add `twitter: { card: 'summary_large_image', title, description }`
  - Add `icons` configuration
```

### F-18: Auth Layout Metadata — Missing OpenGraph

```
SEVERITY: [LOW]
FILE: app/(auth)/layout.tsx:7-10
FINDING: Auth layout has `title: "Authentication"` and `description` but no OpenGraph
  or Twitter metadata. Since auth pages shouldn't be indexed (see F-16), this is very
  low priority.
  
RECOMMENDATION: Low priority. Address only after F-16 (robots.txt) is in place.
```

### F-19: Provider Tree — Reasonable Structure, Minor Optimization

```
SEVERITY: [MEDIUM]
FILE: app/layout.tsx:43-51, app/(chat)/layout.tsx:78-92
FINDING: The provider tree from root to chat page is:
  
  Root: html > body > ThemeProvider > TooltipProvider > {children}
  Chat: NoticeHandler(Suspense) > SessionProvider > PendingChatsProvider > 
        Suspense > SidebarProvider > SidebarInset > {page}
  Page: ChatStreamProvider > VotesProvider > ChatShell
  
  Total nesting: ~10 context providers deep. Each "use client" provider boundary
  is a potential re-render trigger.
  
  Analysis:
  - `ThemeProvider` and `TooltipProvider` in root layout: correct placement (shared across all routes)
  - `SessionProvider` outside Suspense: correct (session promise is eagerly started)
  - `PendingChatsProvider` outside Suspense: correct (shared between sidebar and content)
  - `ChatStreamProvider` at page level: correct (per-chat scoping)
  - `VotesProvider` at page level: correct (per-chat scoping)
  
  The split-context pattern in ChatStreamProvider (StateCtx + DispatchCtx) is a good
  optimization to prevent writer-only re-renders.
  
  Minor concern: `TooltipProvider` in root layout wraps ALL content including auth pages,
  which don't use tooltips. The overhead is minimal (just a context value).
  
RECOMMENDATION: No immediate action needed. The tree is well-structured. Consider lazily
  initializing TooltipProvider in the chat layout only if profiling shows overhead.
```

---

## 6. API Route Security & Robustness

### F-20: CSRF Protection — Present on POST, Missing Context for GET

```
SEVERITY: [MEDIUM]
FILE: app/api/chat/route.ts:44, app/api/artifact/route.ts:92, app/api/files/upload/route.ts:60
FINDING: All three POST endpoints correctly use `validateOrigin(request)` for CSRF protection.
  
  GET endpoints (`/api/artifact`, `/api/history`, `/api/suggestions`, `/api/health`) do not
  have CSRF protection, which is correct — GET requests should be idempotent and CSRF
  protection on GETs is unnecessary (browsers send credentials on cross-origin GETs, but
  GETs shouldn't mutate state).
  
  The `validateOrigin` implementation (lib/utils/validate-origin.ts) falls back to Referer
  header if Origin is missing, which handles the edge case of browsers that strip Origin
  on same-origin redirects. Good defensive implementation.
  
RECOMMENDATION: No change needed. CSRF protection is correctly applied.
```

### F-21: Artifact POST — Missing CSRF on GET Fetch of Full Entity

```
SEVERITY: [MEDIUM]
FILE: app/api/artifact/route.ts:19-80
FINDING: The `/api/artifact` GET endpoint fetches full artifact content (including
  potentially large code/text) without any caching beyond the `Cache-Control: private,
  max-age=10` header. The ownership check requires fetching the latest/first version
  to verify `userId`, which means the full entity content is loaded just for an auth check.
  
  This is the "full entity fetch for ownership" anti-pattern identified in Wave 0.
  
RECOMMENDATION:
  - Add a lightweight ownership check query (SELECT userId FROM artifacts WHERE id = ?)
    before fetching the full artifact content
  - This prevents loading potentially large content for unauthorized requests
```

---

## 7. Miscellaneous

### F-22: `maxDuration` Only Set on Chat Route

```
SEVERITY: [MEDIUM]
FILE: app/api/chat/route.ts:38, app/api/artifact/route.ts, app/api/files/upload/route.ts
FINDING: Only `/api/chat` exports `maxDuration = 60`. Other routes use the default
  serverless function timeout (likely 10s on Vercel Hobby, 60s on Pro). The file
  upload route (`/api/files/upload`) could benefit from an explicit `maxDuration`
  since uploads to Vercel Blob may take time onfrom slow connections.
  
RECOMMENDATION:
  - Add `export const maxDuration = 30` to /api/files/upload
  - Consider adding explicit maxDuration to all API routes for documentation clarity
```

---

## Summary Table

| ID | Severity | File | Finding |
|----|----------|------|---------|
| F-01 | HIGH | `(chat)/chat/[id]/page.tsx:85-101` | Sequential await waterfall on existing chat page (~200-350ms) |
| F-02 | MEDIUM | `(chat)/page.tsx:19-23` | New chat page await chain (already parallelized — informational) |
| F-03 | HIGH | `features/chat/lib/chat-route.ts:170-215` | Sequential pipeline in resolveChatRouteContext (~200-450ms pre-stream) |
| F-04 | LOW | `(chat)/chat/[id]/page.tsx:46-77` | ✅ Correct React.cache sharing between metadata and page |
| F-05 | LOW | `(chat)/page.tsx:7-9` | ✅ Correct static metadata on new chat page |
| F-06 | LOW | `(chat)/layout.tsx:78-92` | ✅ Well-structured Suspense boundaries |
| F-07 | MEDIUM | `(chat)/page.tsx:17-33` | Page-level awaits covered by parent Suspense — acceptable |
| F-08 | LOW | `(auth)/layout.tsx:28-38` | ✅ Correct dynamic API isolation in Suspense |
| F-09 | LOW | error.tsx files | ✅ Full error boundary coverage; minor gap at chat/[id] level |
| F-10 | **CRITICAL** | `api/artifact/route.ts:19,90` | **Missing rate limiting on artifact GET + POST** |
| F-11 | HIGH | `api/history/route.ts:34` | Missing rate limiting on history GET |
| F-12 | HIGH | `api/suggestions/route.ts:13` | Missing rate limiting on suggestions GET |
| F-13 | MEDIUM | `api/health/route.ts:81` | Missing rate limiting on unauthenticated health check |
| F-14 | MEDIUM | Multiple API routes | Inconsistent response shape (bare array vs wrapped object) |
| F-15 | MEDIUM | `lib/cache/rate-limit.ts:12-14` | Silent graceful degradation when Redis unavailable |
| F-16 | HIGH | `app/` (missing) | **Missing robots.txt and sitemap.xml** |
| F-17 | MEDIUM | `app/layout.tsx:10-22` | Missing metadataBase URL, Twitter cards, icons |
| F-18 | LOW | `(auth)/layout.tsx:7-10` | Missing OpenGraph on auth layout (very low priority) |
| F-19 | MEDIUM | layout.tsx + providers | Provider tree ~10 deep — acceptable, TooltipProvider scope broad |
| F-20 | MEDIUM | POST routes | ✅ CSRF protection correctly applied on all POST routes |
| F-21 | MEDIUM | `api/artifact/route.ts:19-80` | Full entity fetch for ownership check (content waste) |
| F-22 | MEDIUM | `api/files/upload/route.ts` | Missing explicit maxDuration on upload route |

---

## Priority Recommendations

### Immediate (CRITICAL + HIGH)

1. **F-10**: Add rate limiting to `/api/artifact` GET and POST
2. **F-11**: Add rate limiting to `/api/history` GET
3. **F-12**: Add rate limiting to `/api/suggestions` GET
4. **F-16**: Add `app/robots.ts` (at minimum to block `/api/` crawling)
5. **F-01**: Speculative parallel fetch on existing chat page

### Next Wave (MEDIUM)

6. **F-03**: Parallelize `resolveChatRouteContext` internal fetches
7. **F-13**: Rate limit health check endpoint
8. **F-14**: Standardize API response shapes
9. **F-15**: Add logging for rate limit degradation
10. **F-17**: Add metadataBase, Twitter cards to root metadata
11. **F-21**: Lightweight ownership check for artifact endpoints
12. **F-22**: Add explicit maxDuration to upload route

### Low Priority

13. **F-09**: Optional error boundary at chat/[id] level
14. **F-18**: OpenGraph on auth layout (after F-16)

---

## Confidence: HIGH

All findings are based on direct code reading with cross-referencing of helper modules.
Rate limit gaps confirmed by grep search across all API routes. Waterfall analysis
based on tracing the actual call chain through `chat-route.ts`, `session.ts`, and
data layer functions.
