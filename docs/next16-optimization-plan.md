# Next.js 16 Optimization Plan for this Codebase

This document maps the current data flow and lists targeted optimizations to leverage Next.js 16 features. It includes concrete file-level action items and references.

## Summary of Relevant Next.js 16 Changes

- **Cache Components + `use cache`**: Opt-in caching model with `cacheLife` and `cacheTag`. [Docs]
- **Caching APIs**: `revalidateTag(tag, profile?)` new signature. New `updateTag()` and `refresh()` for read-your-writes in Server Actions. [Docs]
- **Async Request APIs**: `cookies`, `headers`, `draftMode`, route `params` are async-only. [Docs]
- **proxy.ts** replaces `middleware.ts` for Node runtime network boundary. [Docs]
- **React Compiler**: Stable support via `reactCompiler: true` and Babel plugin. [Docs]
- **Turbopack by default**: `--turbo/--turbopack` flags no longer needed. [Docs]
- **next/image changes**: defaults and config updates; use `remotePatterns`, `minimumCacheTTL=4h` default. [Docs]
- **Enhanced routing/prefetch**: Automatic optimizations, no code changes required. [Docs]

[Docs]: https://nextjs.org/blog/next-16

## Current Data Flow (Repository Map)

- **Auth and gating**
  - `proxy.ts`: Auth gate and guest redirect before app/API. Node runtime. Matches `/`, `/chat/:id`, `/api/*`, `/login`, `/register`.
  - `app/(auth)/auth.ts`: NextAuth credentials + guest provider. Exposes `auth()` used in pages and routes.

- **App shell & page**
  - `app/(chat)/layout.tsx`: Reads `cookies()` and `auth()` to configure the sidebar. Server Component.
  - `app/(chat)/page.tsx`: Reads `auth()` + `cookies()`, generates chat `id`, renders `<Chat/>` with provider wrappers.

- **Chat generation (streaming)**
  - `app/(chat)/api/chat/route.ts`:
    - Streams UI messages using `ai` SDK and `ResumableStreamContext` via `after()`.
    - DB writes/reads via `lib/db/queries.ts` (`saveChat`, `saveMessages`, `getRecentMessagesByChatId`, etc.).
    - Caching used for TokenLens model catalog via `unstable_cache`.
    - Side effects update `title` and `lastContext`; uses `revalidateTag` for history.

- **History, Documents, Suggestions, Votes**
  - `app/(chat)/api/history/route.ts`: GET (cached), DELETE (revalidate tag).
  - `app/(chat)/api/document/route.ts`: GET (cached), POST/DELETE (write, then revalidate tags).
  - `app/(chat)/api/suggestions/route.ts`: GET (cached by `documentId`).
  - `app/(chat)/api/vote/route.ts`: GET (cached), PATCH -> write + revalidate tag.

- **DB Layer**
  - `lib/db/queries.ts`: All DB queries. `import "server-only"` to enforce server runtime.

- **Observability**
  - `instrumentation.ts`: `@vercel/otel` registration.

- **Config**
  - `next.config.ts`: `cacheComponents: true` already enabled; `images.remotePatterns` configured.
  - `package.json`: `next@16`, `react@19.2`, dev script still uses `--turbo`.

## Optimization Opportunities (Next.js 16 Feature Adoption)

### 1) Migrate `unstable_cache` to Cache Components + `use cache`

Replace legacy `unstable_cache` wrappers with explicit cached functions using `use cache`, `cacheLife`, and `cacheTag`.

- Files and targets:
  - `app/(chat)/api/history/route.ts`
    - Today: `unstable_cache(() => getChatsByUserId(...), [key...], { tags: [...] })()`
    - Change: Create a cached function (e.g., `getUserChatsCached({ id, limit, startingAfter, endingBefore })`) with:
      - `'use cache'`
      - `cacheLife('minutes')` (history is frequently updated)
      - `cacheTag(`history:user:${id}`)`
    - Replace route usage to call the cached function directly.
  - `app/(chat)/api/document/route.ts` GET
    - Add `cacheLife('hours')`, `cacheTag(`document:${id}`)`.
  - `app/(chat)/api/suggestions/route.ts` GET
    - Add `cacheLife('hours')`, `cacheTag(`suggestions:document:${documentId}`)`.
  - `app/(chat)/api/vote/route.ts` GET
    - Add `cacheLife('seconds'|'minutes')`, `cacheTag(`votes:chat:${chatId}`)`.
  - `app/(chat)/api/chat/route.ts` (TokenLens catalog)
    - Replace `unstable_cache` on `getTokenlensCatalog` with a small cached function:
      - `'use cache'`
      - `cacheLife('days')`
      - `cacheTag('tokenlens-catalog')`

Notes:
- Prefer defining cached helpers in `lib/` and calling them from routes/pages/components.
- Cache keys are derived from function arguments by the compiler; keep parameters explicit and stable (strings, numbers).

References: Cache Components, `use cache`, `cacheLife`, `cacheTag`.

### 2) Update revalidation to new APIs and semantics

- `revalidateTag(tag, profile?)`: Update all calls using the old options object (`{ expire: 0 }`) to the new signature.
  - Examples to update:
    - `app/(chat)/api/chat/route.ts` (history) — pick `profile` based on UX needs. For "eventually consistent" lists, use `'max'` or `'minutes'`.
    - `app/(chat)/api/document/route.ts` (document + suggestions)
    - `app/(chat)/api/vote/route.ts` (votes)
    - `app/(chat)/api/history/route.ts` (history after DELETE)

- Consider `updateTag()` + `refresh()` for "read-your-writes" UX where changes should reflect immediately:
  - `updateTag()` is Server Actions–only. For places where you already have Server Actions (e.g., `app/(chat)/actions.ts`), move write operations there (when feasible) and call:
    - `updateTag('history:user:${userId}')` (e.g., after visibility changes)
    - `refresh()` to update the client router/stale components.
  - Keep route writes on APIs that need streaming or complex flows (like chat). Use `revalidateTag` there.

References: `revalidateTag`, `updateTag`, `refresh`.

### 3) Replace ad-hoc in-memory caches with `use cache`

- `app/(chat)/actions.ts`
  - `titleGenerationCache` (Map) and trimming logic can be replaced with a cached function using `'use cache'` and `cacheLife('minutes'|'hours')`. This is safer for serverless and prevents unbounded memory growth.
- `app/(chat)/api/chat/route.ts`
  - `reasoningProviderOptionsCache` Map → replace with a cached function keyed by `model.id` + `reasoningType` + `budget`.
  - `tokenlensCatalogPromise` manual promise handling → remove if using cached function as described above.

### 4) React Compiler: turn on automatic memoization

- In `next.config.ts`, set `reactCompiler: true`.
- Install `babel-plugin-react-compiler` as a dev dependency.
- Validate UI behavior and measure re-render reductions in busy components (`components/chat`, `components/ui/*`).
- Known caveats: avoid mutating props, prefer stable object identities for props, refactor dynamic style object creation inside render if needed.

References: React Compiler support in Next.js 16.

### 5) Turbopack by default: simplify scripts

- In `package.json`, update scripts:
  - `"dev": "next dev --turbo"` → `"dev": "next dev"`.
  - `build` already uses `next build` (good). Turbopack is default, no flags needed.

Reference: Turbopack by default in Next.js 16.

### 6) proxy.ts: already adopted

- You’ve correctly migrated from `middleware.ts` to `proxy.ts` and export `proxy()`.
- If you previously used any `skipMiddleware*` flags, the new name is `skipProxyUrlNormalize` (not present here, but note for future changes).

References: proxy.ts migration.

### 7) Async Request APIs: verify usage across the app

- Observed correct usage of async `cookies()` in `app/(chat)/page.tsx` and `layout.tsx`.
- `app/(chat)/api/chat/[id]/stream/route.ts` correctly uses async `params`.
- Run a quick internal audit to ensure no synchronous usage remains elsewhere (e.g., `headers()`, `draftMode()`).

Reference: Async-only dynamic APIs in v16.

### 8) Partial Prerendering via Cache Components

- With `cacheComponents: true`, consider PPR-style splits in UI:
  - Cache stable outer shells (e.g., sidebar user avatar/profile stub) with `use cache` and `cacheLife('minutes')` + user-scoped `cacheTag`.
  - Keep chat content dynamic; stream under Suspense boundaries where applicable.
- This yields fast initial HTML + streamed dynamic content for chat.

References: Cache Components and PPR.

### 9) next/image readiness and defaults

- No `next/image` usage found. If/when adding it:
  - Prefer `images.remotePatterns` (already configured) over deprecated `images.domains`.
  - Be aware of new defaults:
    - `minimumCacheTTL` default is 4h (was 60s).
    - `imageSizes` default removed 16; add back if you really need 16px variants.
    - `qualities` defaults to `[75]`; quality props are coerced to the nearest configured value.

References: next/image changes.

### 10) Scroll behavior semantics changed

- Next.js no longer overrides global `scroll-behavior: smooth` during navigation.
- If you want the previous override behavior, add `data-scroll-behavior="smooth"` to your `<html>` in RootLayout.

Reference: Scroll behavior override.

## Concrete File-by-File Action List

- **next.config.ts**
  - Keep `cacheComponents: true`.
  - Add `reactCompiler: true` (then install Babel plugin). Consider `skipProxyUrlNormalize` only if needed.

- **package.json**
  - Change `dev` script to `next dev` (remove `--turbo`).

- **app/(chat)/api/history/route.ts**
  - Replace `unstable_cache` with a cached helper function using `'use cache'`, `cacheLife('minutes')`, `cacheTag('history:user:${id}')`.
  - Update any `revalidateTag(tag, { expire: 0 })` to the new signature (e.g., `revalidateTag(tag, 'minutes'|'max')`).

- **app/(chat)/api/document/route.ts**
  - GET: use `'use cache'` + `cacheLife('hours')` + `cacheTag('document:${id}')`.
  - POST/DELETE: update `revalidateTag` signature for `document:${id}` and `suggestions:document:${id}`.

- **app/(chat)/api/suggestions/route.ts**
  - GET: use `'use cache'` + `cacheLife('hours')` + `cacheTag('suggestions:document:${documentId}')`.

- **app/(chat)/api/vote/route.ts**
  - GET: use `'use cache'` + `cacheLife('seconds'|'minutes')` + `cacheTag('votes:chat:${chatId}')`.
  - PATCH: keep write; update `revalidateTag` signature.

- **app/(chat)/api/chat/route.ts**
  - Replace `unstable_cache` on TokenLens catalog with cached helper using `'use cache'` + `cacheLife('days')` + `cacheTag('tokenlens-catalog')`.
  - Consider replacing `reasoningProviderOptionsCache` Map with a `use cache` helper keyed by model + budget.

- **app/(chat)/actions.ts**
  - Replace `titleGenerationCache` Map with a cached function using `'use cache'` + `cacheLife('minutes'|'hours')`.
  - Where viable, move writes (e.g., visibility updates already here) to Server Actions and call `updateTag()` + `refresh()` for immediate UI reflect.

## Validation Checklist

- Run E2E tests (`pnpm test`) to ensure streaming and cache invalidations behave as expected.
- Verify chat history updates after writes:
  - If using `revalidateTag`, expect brief stale reads (background refresh).
  - If moved to Server Actions, confirm `updateTag` + `refresh` performs instant updates.
- Confirm dev/build:
  - `pnpm dev` without `--turbo` works as expected.
  - (Optional) Enable React Compiler and compare renders/perf.

## References

- Next.js 16 overview: https://nextjs.org/blog/next-16
- Upgrade to v16 guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Cache Components: https://nextjs.org/docs/app/getting-started/cache-components
- `use cache`: https://nextjs.org/docs/app/api-reference/directives/use-cache
- `cacheLife`: https://nextjs.org/docs/app/api-reference/functions/cacheLife
- `cacheTag`: https://nextjs.org/docs/app/api-reference/functions/cacheTag
- `revalidateTag`: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- `updateTag`: https://nextjs.org/docs/app/api-reference/functions/updateTag
- `refresh`: https://nextjs.org/docs/app/api-reference/functions/refresh
- `proxy.ts`: https://nextjs.org/docs/app/getting-started/proxy
- Turbopack by default: https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default
- next/image changes: https://nextjs.org/docs/app/guides/upgrading/version-16#nextimage-changes
