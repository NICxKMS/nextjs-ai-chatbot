# Next.js 16 Research Summary

**Research Date:** 2025-12-16
**Researcher:** ouroboros-researcher
**Purpose:** Phase 0A - Next.js 16 Technical Research for App Optimization Audit

---

## Version Information

| Property               | Value                                              |
| ---------------------- | -------------------------------------------------- |
| Current stable version | **16.0.10**                                        |
| Release date           | **October 21, 2025**                               |
| Node.js minimum        | 20.9.0 (LTS) - Node.js 18 no longer supported      |
| TypeScript minimum     | 5.1.0                                              |
| Browser support        | Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ |

---

## Key New Features

### 1. Cache Components (Major Feature)

**Description:** A new programming model for explicit, opt-in caching leveraging `'use cache'` directive.

**How to enable:**

```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,
};
export default nextConfig;
```

**Key concepts:**

- All dynamic code executes at request time by default (no implicit caching)
- Uses `'use cache'` directive for pages, components, and functions
- Compiler automatically generates cache keys
- Completes the Partial Prerendering (PPR) story
- Replaces `experimental.ppr` and `experimental.dynamicIO`

**Usage:**

```typescript
import { cacheLife, cacheTag } from "next/cache";

export default async function Page() {
  "use cache";
  cacheLife("hours"); // or 'days', 'weeks', 'max', or custom object

  const data = await fetch("https://api.example.com/data");
  return <div>...</div>;
}
```

---

### 2. Turbopack (Stable - Now Default)

**Description:** Default bundler for all new Next.js projects.

**Performance improvements:**

- 2–5× faster production builds
- Up to 10× faster Fast Refresh
- 50%+ of dev sessions already using Turbopack

**Configuration moved from experimental:**

```typescript
// Before (Next.js 15)
const nextConfig = {
  experimental: {
    turbopack: {
      /* options */
    },
  },
};

// After (Next.js 16)
const nextConfig = {
  turbopack: {
    /* options */
  },
};
```

**Opting out:**

```bash
next dev --webpack
next build --webpack
```

---

### 3. Turbopack File System Caching (Beta)

**Description:** Stores compiler artifacts on disk for faster compile times across restarts.

**How to enable:**

```typescript
const nextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};
```

---

### 4. React Compiler Support (Stable)

**Description:** Automatic memoization with zero manual code changes.

**How to enable:**

```typescript
const nextConfig = {
  reactCompiler: true, // moved from experimental
};
```

**Requirements:**

```bash
npm install -D babel-plugin-react-compiler@latest
```

**Note:** Compile times will be higher as React Compiler relies on Babel.

---

### 5. React 19.2 Integration

**New React features available:**

- **View Transitions:** Animate elements that update inside a Transition or navigation
- **useEffectEvent:** Extract non-reactive logic from Effects into reusable Effect Event functions
- **Activity:** Render "background activity" by hiding UI with `display: none` while maintaining state

---

### 6. Enhanced Routing and Navigation

**Improvements:**

- **Layout deduplication:** Shared layouts downloaded once instead of per-link
- **Incremental prefetching:** Only prefetches parts not already in cache
- **Prefetch cache improvements:**
  - Cancels requests when link leaves viewport
  - Prioritizes link prefetching on hover
  - Re-prefetches when data is invalidated

**Trade-off:** More individual prefetch requests, but much lower total transfer sizes.

---

### 7. New Caching APIs

#### `updateTag()` (New)

Server Actions-only API for read-your-writes semantics:

```typescript
"use server";
import { updateTag } from "next/cache";

export async function updateUserProfile(userId: string, profile: Profile) {
  await db.users.update(userId, profile);
  updateTag(`user-${userId}`); // Expire cache and refresh immediately
}
```

#### `refresh()` (New)

Server Actions-only API for refreshing uncached data:

```typescript
"use server";
import { refresh } from "next/cache";

export async function markNotificationAsRead(notificationId: string) {
  await db.notifications.markAsRead(notificationId);
  refresh(); // Refresh uncached data displayed elsewhere
}
```

#### `revalidateTag()` (Updated)

Now requires cacheLife profile as second argument:

```typescript
// ✅ Correct (Next.js 16)
revalidateTag("blog-posts", "max");
revalidateTag("products", { expire: 3600 });

// ⚠️ Deprecated
revalidateTag("blog-posts");
```

#### `cacheLife()` and `cacheTag()` (Stable)

`unstable_` prefix removed:

```typescript
// Before
import { unstable_cacheLife as cacheLife } from "next/cache";

// After
import { cacheLife, cacheTag } from "next/cache";
```

---

### 8. `proxy.ts` (Replaces `middleware.ts`)

**Description:** Network boundary and routing focus clarified. Runs on Node.js runtime.

**Migration:**

```bash
mv middleware.ts proxy.ts
```

```typescript
// proxy.ts
export default function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}
```

**Config changes:**

- `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`

**Note:** `middleware.ts` still available for Edge runtime but deprecated.

---

### 9. Build Adapters API (Alpha)

**Description:** Custom adapters for build process hooks.

```typescript
const nextConfig = {
  experimental: {
    adapterPath: require.resolve("./my-adapter.js"),
  },
};
```

---

### 10. Next.js DevTools MCP

**Description:** Model Context Protocol integration for AI-assisted debugging.

**Features:**

- Next.js knowledge context
- Unified browser/server logs
- Automatic error access
- Page awareness

---

## Breaking Changes from v15

### 1. Async Request APIs (Fully Required)

Synchronous access completely removed:

```typescript
// ❌ No longer works
const cookieStore = cookies();
const headerStore = headers();
const { slug } = params;

// ✅ Required
const cookieStore = await cookies();
const headerStore = await headers();
const { slug } = await params;
```

**Affected APIs:**

- `cookies()`
- `headers()`
- `draftMode()`
- `params` (in layouts, pages, routes)
- `searchParams` (in pages)

**Type helpers available via:**

```bash
npx next typegen
```

---

### 2. Image Component Changes

| Change                       | Impact                                               |
| ---------------------------- | ---------------------------------------------------- |
| Local src with query strings | Requires `images.localPatterns.search` config        |
| `minimumCacheTTL` default    | Changed from 60s to 4 hours (14400s)                 |
| `imageSizes` default         | Removed 16 from default array                        |
| `qualities` default          | Changed from [1..100] to [75] only                   |
| `dangerouslyAllowLocalIP`    | New security restriction, blocks local IP by default |
| `maximumRedirects` default   | Changed from unlimited to 3                          |
| `next/legacy/image`          | Deprecated, use `next/image`                         |
| `images.domains`             | Deprecated, use `images.remotePatterns`              |

---

### 3. Removed Features

| Feature                                      | Migration Path                                                   |
| -------------------------------------------- | ---------------------------------------------------------------- |
| AMP support                                  | Use modern web standards and Next.js optimizations               |
| `next lint` command                          | Use ESLint or Biome directly                                     |
| `serverRuntimeConfig`, `publicRuntimeConfig` | Use environment variables                                        |
| `experimental.turbopack` location            | Move to top-level `turbopack`                                    |
| `experimental.dynamicIO`                     | Use `cacheComponents: true`                                      |
| `experimental.ppr`                           | Use `cacheComponents: true`                                      |
| `export const experimental_ppr`              | Use Cache Components model                                       |
| `devIndicators` options                      | `appIsrStatus`, `buildActivity`, `buildActivityPosition` removed |
| `unstable_rootParams()`                      | Alternative API coming in future minor                           |

---

### 4. Behavior Changes

| Change                | New Behavior                                           |
| --------------------- | ------------------------------------------------------ |
| Default bundler       | Turbopack (opt out with `--webpack`)                   |
| Prefetch cache        | Complete rewrite with layout deduplication             |
| Dev/build directories | Separate directories, concurrent execution enabled     |
| Lockfile behavior     | Prevents multiple `next dev` or `next build` instances |
| Parallel routes       | `default.js` required for all slots                    |
| ESLint plugin         | Defaults to Flat Config format                         |
| Scroll behavior       | No longer overrides `scroll-behavior: smooth`          |
| Modern Sass API       | `sass-loader` bumped to v16                            |

---

## Deprecated Patterns

| Pattern                         | Replacement                                       |
| ------------------------------- | ------------------------------------------------- |
| `middleware.ts` filename        | `proxy.ts`                                        |
| `next/legacy/image`             | `next/image`                                      |
| `images.domains` config         | `images.remotePatterns`                           |
| `revalidateTag(tag)` single arg | `revalidateTag(tag, profile)` or `updateTag(tag)` |
| `dynamic = "force-dynamic"`     | Not needed (default behavior)                     |
| `dynamic = "force-static"`      | Use `'use cache'` with `cacheLife('max')`         |
| `revalidate` segment config     | Use `cacheLife()` function                        |
| `fetchCache`                    | Use `'use cache'` directive                       |

---

## Recommended Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Core features
  cacheComponents: true, // Enable Cache Components + PPR
  reactCompiler: true, // Enable React Compiler

  // Turbopack config (moved from experimental)
  turbopack: {
    // resolveAlias, rules, etc.
  },

  // Experimental features
  experimental: {
    turbopackFileSystemCacheForDev: true, // Beta: FS caching
    // adapterPath: './my-adapter.js', // Alpha: Build adapters
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
    // Restore previous defaults if needed:
    // minimumCacheTTL: 60,
    // imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // qualities: [50, 75, 100],
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
```

---

## Performance Best Practices

### 1. Leverage Cache Components

```typescript
// Cache entire pages or sections
export default async function Page() {
  "use cache";
  cacheLife("hours");
  // ...
}

// Cache specific functions
async function getCachedData() {
  "use cache";
  cacheTag("data");
  return await fetchData();
}
```

### 2. Use Suspense for Dynamic Content

```typescript
<Suspense fallback={<Loading />}>
  <DynamicContent />
</Suspense>
```

### 3. Enable Turbopack FS Caching

```typescript
experimental: {
  turbopackFileSystemCacheForDev: true,
}
```

### 4. Optimize Images

```typescript
images: {
  remotePatterns: [...],
  qualities: [75], // Single quality reduces variations
}
```

### 5. Use `updateTag` for Immediate Updates

```typescript
// In Server Actions for read-your-writes
updateTag("user-data");
```

---

## Caching Behavior Changes

### fetch() Defaults

- Data returned from `fetch` is **NOT** automatically cached in the Data Cache
- Dynamic rendering: Fetch runs on every request
- Static rendering: Fetched data stored in Data Cache and Full Route Cache
- Use `cache: 'force-cache'` to opt into caching

### Cache Components Model

- All pages dynamic by default
- Explicit caching with `'use cache'`
- `cacheLife()` for duration control
- `cacheTag()` for invalidation
- `updateTag()` for immediate refresh
- `revalidateTag(tag, profile)` for SWR behavior

---

## Server Components Improvements

- React 19.2 integration
- Activity component for background rendering
- View Transitions for animations
- `useEffectEvent` for non-reactive logic extraction
- Improved streaming with Suspense
- Better error boundaries

---

## Edge Runtime Updates

- `proxy.ts` runs on **Node.js runtime** only
- Edge runtime available via deprecated `middleware.ts`
- Future edge runtime guidance coming in minor release
- Cache Components requires Node.js runtime

---

## Action Items for Audit

### Critical (Must Fix)

- [ ] Update all `cookies()`, `headers()`, `draftMode()` calls to async
- [ ] Update all `params` and `searchParams` access to async
- [ ] Rename `middleware.ts` to `proxy.ts` (if using Node.js runtime)
- [ ] Move `experimental.turbopack` to top-level `turbopack`
- [ ] Replace `experimental.dynamicIO` with `cacheComponents: true`
- [ ] Update `revalidateTag()` calls with cacheLife profile

### High Priority

- [ ] Remove `next lint` from scripts, use ESLint directly
- [ ] Add `default.js` to all parallel route slots
- [ ] Update `images.domains` to `images.remotePatterns`
- [ ] Replace `next/legacy/image` with `next/image`
- [ ] Review and update caching strategy with Cache Components

### Recommended

- [ ] Enable `cacheComponents: true` for PPR benefits
- [ ] Enable `reactCompiler: true` for automatic memoization
- [ ] Enable `turbopackFileSystemCacheForDev: true` for faster dev
- [ ] Review image config defaults and restore if needed
- [ ] Update ESLint to Flat Config format

### Testing Required

- [ ] Verify async API migrations work correctly
- [ ] Test prefetching behavior with new cache
- [ ] Verify image optimization with new defaults
- [ ] Test Server Actions with new caching APIs
- [ ] Verify parallel routes with default.js files

---

## Upgrade Commands

```bash
# Automated upgrade
npx @next/codemod@canary upgrade latest

# Manual upgrade
npm install next@latest react@latest react-dom@latest

# TypeScript types
npm install -D @types/react@latest @types/react-dom@latest

# React Compiler (if enabling)
npm install -D babel-plugin-react-compiler@latest
```

---

## References

- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [Version 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Cache Components Documentation](https://nextjs.org/docs/app/getting-started/cache-components)
- [Caching Guide](https://nextjs.org/docs/app/guides/caching)
- [GitHub Releases](https://github.com/vercel/next.js/releases)
