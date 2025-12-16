# GitHub Issues Export - NextJS AI Chatbot Optimization

> **Project**: nextjs-ai-chatbot-optimization  
> **Generated**: 2024-12-16  
> **Total Issues**: 37  
> **Source**: [implementation-plan.md](../.ouroboros/specs/implementation-plan.md)

---

## Phase 0: Critical Hydration Fixes

---

## Issue: [Task 0.1] Fix localStorage in sidebar useState

**Priority**: 🔴 CRITICAL  
**Phase**: Phase 0 - Critical Hydration Fixes  
**Estimated Time**: 1 hour  
**Audit Reference**: H-001

### Problem

Using `localStorage.getItem()` directly in `useState()` initial value causes hydration mismatch because:

- Server renders with `null` (no localStorage)
- Client renders with stored value
- React detects content mismatch → hydration error

### Files to Modify

- `components/ui/sidebar.tsx`

### Acceptance Criteria

- [ ] No hydration warnings in console related to sidebar
- [ ] Sidebar state persists correctly across page refreshes
- [ ] SSR renders consistent initial state
- [ ] Client-side hydration completes without errors

### Implementation Guide

1. Replace `useState(localStorage.getItem(...))` with `useState(null)`
2. Add `useEffect` to read localStorage after mount
3. Add loading state to prevent flash of incorrect content
4. Test SSR output matches initial client render

```typescript
// ❌ BEFORE (causes hydration mismatch)
const [open, setOpen] = useState(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sidebar-open") === "true";
  }
  return true;
});

// ✅ AFTER (hydration-safe)
const [open, setOpen] = useState(true); // Default for SSR
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  const stored = localStorage.getItem("sidebar-open");
  if (stored !== null) {
    setOpen(stored === "true");
  }
  setIsHydrated(true);
}, []);
```

### Verification

1. Run `npm run build && npm run start`
2. Open browser DevTools Console
3. Hard refresh page (Ctrl+Shift+R)
4. Confirm no hydration warnings appear
5. Toggle sidebar, refresh, confirm state persists

### Dependencies

None

### Labels

`priority: critical`, `phase: 0`, `type: bug`, `hydration`

---

## Issue: [Task 0.2] Replace Math.random() in Skeleton Render Keys

**Priority**: 🔴 CRITICAL  
**Phase**: Phase 0 - Critical Hydration Fixes  
**Estimated Time**: 30 minutes  
**Audit Reference**: H-002

### Problem

Using `Math.random()` for React keys during render causes:

- Different keys on server vs client
- React cannot match elements → full re-render
- Hydration mismatch warnings

### Files to Modify

- `components/ui/sidebar.tsx`

### Acceptance Criteria

- [ ] No `Math.random()` calls in render paths
- [ ] Skeleton elements use stable, deterministic keys
- [ ] No hydration warnings related to key mismatches

### Implementation Guide

1. Find all `Math.random()` usage in component render
2. Replace with index-based keys (acceptable for static lists)
3. Or use deterministic ID generation based on content

```typescript
// ❌ BEFORE (non-deterministic)
{
  [1, 2, 3].map(() => <Skeleton key={Math.random()} className="h-8" />);
}

// ✅ AFTER (deterministic)
{
  [1, 2, 3].map((_, index) => (
    <Skeleton key={`skeleton-${index}`} className="h-8" />
  ));
}
```

### Verification

1. Search codebase: `grep -r "Math.random" components/`
2. Run build and check for hydration warnings
3. Verify skeleton loading states render correctly

### Dependencies

None

### Labels

`priority: critical`, `phase: 0`, `type: bug`, `hydration`

---

## Issue: [Task 0.3] Fix useLocalStorage Hook Initialization

**Priority**: 🔴 CRITICAL  
**Phase**: Phase 0 - Critical Hydration Fixes  
**Estimated Time**: 1.5 hours  
**Audit Reference**: H-003

### Problem

The `useLocalStorage` hook (likely from `usehooks-ts`) reads localStorage during initial render unless `initializeWithValue: false` is set. This causes server/client mismatch.

### Files to Modify

- `lib/settings/provider.tsx`
- Any file using `useLocalStorage` hook

### Acceptance Criteria

- [ ] All `useLocalStorage` calls include `{ initializeWithValue: false }`
- [ ] No hydration warnings from settings provider
- [ ] Settings load correctly after hydration
- [ ] Default values render on SSR

### Implementation Guide

1. Audit all `useLocalStorage` usages in codebase
2. Add `initializeWithValue: false` option to each call
3. Handle the `undefined` initial state appropriately
4. Add loading states where needed

```typescript
// ❌ BEFORE (reads localStorage during SSR attempt)
const [settings, setSettings] = useLocalStorage(
  "user-settings",
  defaultSettings
);

// ✅ AFTER (defers localStorage read to client)
const [settings, setSettings] = useLocalStorage(
  "user-settings",
  defaultSettings,
  {
    initializeWithValue: false,
  }
);

// Handle undefined initial state
const effectiveSettings = settings ?? defaultSettings;
```

### Verification

1. Search: `grep -r "useLocalStorage" lib/ components/`
2. Verify all instances have the option set
3. Build and test for hydration warnings
4. Test settings persistence across refreshes

### Dependencies

None

### Labels

`priority: critical`, `phase: 0`, `type: bug`, `hydration`

---

## Phase 1: High Priority Fixes

---

## Issue: [Task 1.1] Create Hydration-Safe useWindowSize Hook

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Current `useWindowSize` returns `0` or `undefined` during SSR, causing:

- Layout shifts when real dimensions load
- Conditional rendering mismatches
- CLS (Cumulative Layout Shift) issues

### Files to Modify

- `hooks/use-window-size.ts` (create or modify)
- `components/chat-header.tsx`
- `components/toolbar.tsx`
- `components/artifact.tsx`
- `components/document-preview.tsx`
- `components/document.tsx`

### Acceptance Criteria

- [ ] Hook returns `null` or meaningful defaults during SSR
- [ ] Components handle loading state gracefully
- [ ] No layout shift on hydration
- [ ] CLS score < 0.1

### Implementation Guide

1. Create/modify hook to return `null` during SSR
2. Add `isReady` boolean to indicate hydration complete
3. Update all 5 consuming components
4. Add CSS to prevent layout shift (use CSS media queries as fallback)

```typescript
// ✅ NEW: hooks/use-window-size.ts
import { useState, useEffect } from "react";

interface WindowSize {
  width: number;
  height: number;
}

interface UseWindowSizeReturn {
  windowSize: WindowSize | null;
  isReady: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useWindowSize(): UseWindowSizeReturn {
  const [windowSize, setWindowSize] = useState<WindowSize | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    handleResize();
    setIsReady(true);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const width = windowSize?.width ?? 0;

  return {
    windowSize,
    isReady,
    isMobile: isReady && width < 768,
    isTablet: isReady && width >= 768 && width < 1024,
    isDesktop: isReady && width >= 1024,
  };
}
```

### Dependencies

- Task 0.1, 0.2, 0.3 complete

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.2] Move Mobile Detection to Edge Middleware

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Client-side mobile detection causes:

- Flash of desktop layout on mobile
- Unnecessary JavaScript execution
- Poor Core Web Vitals

### Files to Modify

- `middleware.ts` (create/modify)
- `hooks/use-mobile.ts` (deprecate or modify)
- `app/layout.tsx`

### Acceptance Criteria

- [ ] Mobile detection happens at Edge (middleware)
- [ ] Device type available via cookie or header
- [ ] No client-side detection for initial render
- [ ] Correct layout renders on first paint

### Implementation Guide

1. Create/update middleware to detect User-Agent
2. Set cookie or header with device type
3. Read device type in server components
4. Fallback to client detection for edge cases

```typescript
// ✅ middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

  const response = NextResponse.next();
  response.cookies.set("device-type", isMobile ? "mobile" : "desktop", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Dependencies

None (can run parallel to Task 1.1)

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.3] Fix resolvedTheme Hydration Mismatch

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 1.5 hours  
**Audit Reference**: N/A

### Problem

Using `resolvedTheme` from next-themes during SSR causes className mismatch because theme is only known on client.

### Files to Modify

- `components/sidebar-user-nav.tsx`
- `components/sheet-editor.tsx`

### Acceptance Criteria

- [ ] No theme-related hydration warnings
- [ ] No flash of wrong theme colors
- [ ] Theme persists correctly

### Implementation Guide

1. Use `mounted` state pattern from next-themes docs
2. Render neutral/skeleton state until mounted
3. Apply theme-specific classes only after mount

```typescript
// ❌ BEFORE
const { resolvedTheme } = useTheme();
return <div className={resolvedTheme === "dark" ? "bg-black" : "bg-white"} />;

// ✅ AFTER
const { resolvedTheme } = useTheme();
const [mounted, setMounted] = useState(false);

useEffect(() => setMounted(true), []);

if (!mounted) {
  return <div className="bg-neutral-100 dark:bg-neutral-900" />; // CSS handles it
}

return <div className={resolvedTheme === "dark" ? "bg-black" : "bg-white"} />;
```

### Dependencies

- Task 0.3 (settings provider fix)

### Labels

`priority: high`, `phase: 1`, `type: bug`, `hydration`

---

## Issue: [Task 1.4] Virtualize Messages List

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 3 hours  
**Audit Reference**: N/A

### Problem

Rendering all messages in a long conversation:

- Causes scroll jank
- Uses excessive memory
- Slows down initial render

### Files to Modify

- `components/messages.tsx`
- `package.json` (add @tanstack/react-virtual)

### Acceptance Criteria

- [ ] Only visible messages + buffer are rendered
- [ ] Smooth scrolling with 100+ messages
- [ ] Auto-scroll to bottom works correctly
- [ ] Message selection/interaction preserved

### Implementation Guide

1. Install `@tanstack/react-virtual`
2. Wrap messages in virtualizer
3. Handle variable height messages
4. Preserve scroll position on new messages
5. Test with conversation export/import

```typescript
// ✅ AFTER: components/messages.tsx
import { useVirtualizer } from "@tanstack/react-virtual";

export function Messages({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <Message message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.5] Virtualize Sidebar History

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Users with many chats experience slow sidebar rendering.

### Files to Modify

- `components/sidebar-history.tsx`

### Acceptance Criteria

- [ ] Sidebar renders smoothly with 500+ chat items
- [ ] Search/filter still works
- [ ] Active chat highlight preserved

### Implementation Guide

Apply same virtualization pattern as Task 1.4, but with fixed-height items.

```typescript
const virtualizer = useVirtualizer({
  count: filteredChats.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // Fixed height items
  overscan: 10,
});
```

### Dependencies

- Task 1.4 (learn from messages implementation)

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.6] Add Image Dimensions to ImageEditor

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

`<Image>` components without width/height cause:

- Layout shifts (CLS)
- LCP delays
- Console warnings

### Files to Modify

- `components/image-editor.tsx`

### Acceptance Criteria

- [ ] All Image components have explicit dimensions
- [ ] Aspect ratio preserved during load
- [ ] No CLS from image loading

### Implementation Guide

```typescript
// ❌ BEFORE
<Image src={imageSrc} alt="Editor image" />

// ✅ AFTER (explicit dimensions)
<Image
  src={imageSrc}
  alt="Editor image"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// ✅ ALTERNATIVE (fill with container)
<div className="relative aspect-video w-full">
  <Image src={imageSrc} alt="Editor image" fill className="object-contain" />
</div>
```

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.7] Add Cache-Control Headers to API Routes

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

API responses without cache headers:

- Force re-fetch on every request
- Waste bandwidth and server resources
- Slow down repeat interactions

### Files to Modify

- `app/api/*/route.ts` (10 files)
- Create `lib/api/cache-headers.ts`

### Acceptance Criteria

- [ ] All GET endpoints have appropriate Cache-Control
- [ ] Mutable endpoints have no-store
- [ ] Edge caching works for public data

### Implementation Guide

```typescript
// ✅ lib/api/cache-headers.ts
export const cacheHeaders = {
  immutable: { "Cache-Control": "public, max-age=31536000, immutable" },
  private: {
    "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
  },
  noStore: { "Cache-Control": "no-store, must-revalidate" },
  shared: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
};

// Usage in route
export async function GET() {
  const data = await fetchData();
  return NextResponse.json(data, { headers: cacheHeaders.private });
}
```

### API Routes to Update

- `app/api/chat/route.ts` - noStore (streaming)
- `app/api/history/route.ts` - private, short TTL
- `app/api/document/route.ts` - private
- `app/api/suggestions/route.ts` - shared, medium TTL
- `app/api/vote/route.ts` - noStore (mutations)
- `app/api/files/route.ts` - private
- `app/api/user/route.ts` - private

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.8] Add Static Asset Caching to vercel.json

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 30 minutes  
**Audit Reference**: N/A

### Problem

Static assets (fonts, images, JS chunks) may not have optimal cache headers.

### Files to Modify

- `vercel.json`

### Acceptance Criteria

- [ ] vercel.json includes cache headers config
- [ ] Static assets cached for 1 year
- [ ] HTML/API routes have appropriate short cache

### Implementation Guide

```json
{
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, stale-while-revalidate=604800"
        }
      ]
    }
  ]
}
```

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `infrastructure`

---

## Issue: [Task 1.9] Configure Edge Runtime for Proxy Route

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Proxy route running in Node.js runtime adds latency. Edge runtime would be faster.

### Files to Modify

- `app/api/proxy/route.ts`

### Acceptance Criteria

- [ ] Proxy route configured for Edge runtime
- [ ] No functionality regression
- [ ] Lower latency for proxy requests

### Implementation Guide

```typescript
// ✅ app/api/proxy/route.ts
export const runtime = "edge";

export async function GET(request: Request) {
  // Ensure no Node.js-only APIs are used
  // fetch() works in Edge
  // Buffer/fs do NOT work in Edge
}
```

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `performance`

---

## Issue: [Task 1.10] Fix Auth State Hydration

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: CR-006

### Problem

Auth state conditional rendering causes hydration mismatch because:

- Server has no auth state (null/undefined)
- Client may have cached auth from previous session
- Conditional UI based on auth causes content mismatch

### Files to Modify

- `components/auth-provider.tsx`
- `components/sidebar-user-nav.tsx`
- Any component using auth state conditionally

### Acceptance Criteria

- [ ] No auth-related hydration warnings
- [ ] Correct UI renders for logged-in and logged-out states
- [ ] No flash of wrong auth state

### Implementation Guide

```typescript
// ❌ BEFORE (causes hydration mismatch)
const { user } = useAuth();
return user ? <UserProfile /> : <LoginButton />;

// ✅ AFTER (hydration-safe)
const { user, isLoading } = useAuth();
const [mounted, setMounted] = useState(false);

useEffect(() => setMounted(true), []);

if (!mounted || isLoading) {
  return <AuthSkeleton />;
}

return user ? <UserProfile /> : <LoginButton />;
```

### Dependencies

- Task 0.3 complete

### Labels

`priority: high`, `phase: 1`, `type: bug`, `hydration`

---

## Issue: [Task 1.11] Lazy-Load Syntax Highlighting

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 3 hours  
**Audit Reference**: B-003

### Problem

Heavy syntax highlighting libraries (shiki, prism, etc.) are loaded eagerly, impacting:

- Initial bundle size
- Time to interactive
- Users who never view code

### Files to Modify

- `components/code-editor.tsx`
- `lib/syntax/*.ts` (if exists)
- Components using syntax highlighting

### Acceptance Criteria

- [ ] Syntax highlighter loaded only when code block visible
- [ ] Loading state shown while highlighter loads
- [ ] No bundle regression for non-code pages

### Implementation Guide

```typescript
// ❌ BEFORE (eager loading)
import { highlight } from "shiki";

// ✅ AFTER (lazy loading)
const [highlighter, setHighlighter] = useState(null);

useEffect(() => {
  if (hasCodeContent) {
    import("shiki").then(({ getHighlighter }) => {
      getHighlighter({ theme: "github-dark" }).then(setHighlighter);
    });
  }
}, [hasCodeContent]);
```

### Dependencies

None

### Labels

`priority: high`, `phase: 1`, `type: enhancement`, `bundle-size`

---

## Issue: [Task 1.12] Create Checkpoint - Phase 1 Verification

**Priority**: 🟠 HIGH  
**Phase**: Phase 1 - High Priority Fixes  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Need to verify all Phase 0 and Phase 1 tasks are complete and metrics are met.

### Files to Modify

None (verification only)

### Acceptance Criteria

- [ ] All Phase 0 and Phase 1 tasks complete
- [ ] No hydration warnings in production build
- [ ] Lighthouse Performance > 80
- [ ] CLS < 0.1
- [ ] LCP < 2.5s
- [ ] All existing tests pass

### Verification Steps

1. Run full test suite: `npm test`
2. Run production build: `npm run build`
3. Start production server: `npm start`
4. Run Lighthouse audit in Chrome
5. Test on mobile device/emulator
6. Check browser console for errors
7. Test all major user flows

### Metrics to Record

| Metric                 | Target  |
| ---------------------- | ------- |
| Lighthouse Performance | > 80    |
| CLS                    | < 0.1   |
| LCP                    | < 2.5s  |
| FID                    | < 100ms |
| Bundle Size (main)     | < 200KB |
| Hydration Warnings     | 0       |

### Dependencies

- Tasks 1.1-1.11 complete

### Labels

`priority: high`, `phase: 1`, `type: verification`, `milestone`

---

## Phase 2: Medium Priority Optimization

---

## Issue: [Task 2.1] Remove Duplicate clsx/classnames Packages

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Duplicate utility packages increase bundle size unnecessarily.

### Files to Modify

- `package.json`
- All files importing classnames

### Acceptance Criteria

- [ ] No classnames package in dependencies
- [ ] All imports use clsx or cn utility

### Implementation Guide

```typescript
// Find: import classnames from 'classnames';
// Replace: import clsx from 'clsx';
// Or use: import { cn } from '@/lib/utils';
```

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `bundle-size`

---

## Issue: [Task 2.2] Remove Unused @icons-pack/react-simple-icons

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Unused icon package adds to bundle size.

### Files to Modify

- `package.json`
- Search for any usages

### Acceptance Criteria

- [ ] Package removed if unused
- [ ] Build succeeds without package

### Implementation Guide

1. Search codebase for imports from package
2. If unused, remove from package.json
3. If used, consider replacing with specific icon imports

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `bundle-size`

---

## Issue: [Task 2.3] Remove Console Statements from Production

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Console statements in production code are unprofessional and can leak sensitive info.

### Files to Modify

- 6 files with console statements

### Acceptance Criteria

- [ ] No console.log in production code
- [ ] ESLint rule prevents future occurrences

### Implementation Guide

1. Search: `grep -rn "console\." --include="*.ts" --include="*.tsx"`
2. Replace with proper logging or remove
3. Add ESLint rule: `"no-console": "error"`

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `code-quality`

---

## Issue: [Task 2.4] Migrate unstable_cache to use cache

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

`unstable_cache` is deprecated in favor of `'use cache'` directive.

### Files to Modify

- Files using `unstable_cache`

### Acceptance Criteria

- [ ] All unstable_cache usages replaced
- [ ] Caching behavior works correctly

### Dependencies

- Next.js 15 stable release

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `next-js`

---

## Issue: [Task 2.5] Implement Pyodide On-Demand Loading

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 3 hours  
**Audit Reference**: N/A

### Problem

Pyodide is a large WASM bundle (~10MB). Loading eagerly impacts performance.

### Files to Modify

- Files loading Pyodide

### Acceptance Criteria

- [ ] Pyodide loaded only when needed
- [ ] Loading state shown while loading
- [ ] Instance cached after load

### Implementation Guide

```typescript
const [pyodide, setPyodide] = useState(null);
const [loading, setLoading] = useState(false);

async function loadPyodide() {
  if (pyodide) return pyodide;
  setLoading(true);
  const { loadPyodide } = await import("pyodide");
  const instance = await loadPyodide();
  setPyodide(instance);
  setLoading(false);
  return instance;
}
```

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `bundle-size`

---

## Issue: [Task 2.6] Configure API Timeouts

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Missing timeout configuration can lead to hanging requests.

### Files to Modify

- API routes
- `next.config.js`

### Acceptance Criteria

- [ ] Timeout configuration added
- [ ] Timeout errors handled gracefully

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `infrastructure`

---

## Issue: [Task 2.7] Fix Context Wide Re-renders in DataStreamProvider

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Context value changes cause all consumers to re-render unnecessarily.

### Files to Modify

- `components/data-stream-provider.tsx`

### Acceptance Criteria

- [ ] Context split into state vs actions
- [ ] Values properly memoized
- [ ] Re-renders minimized

### Implementation Guide

1. Split context into multiple contexts (state vs actions)
2. Memoize context values
3. Use context selectors if needed

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `performance`

---

## Issue: [Task 2.8] Theme System Cleanup

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1.5 hours  
**Audit Reference**: N/A

### Problem

Redundant theme logic increases complexity.

### Files to Modify

- Theme-related components
- CSS variables

### Acceptance Criteria

- [ ] No redundant theme code
- [ ] CSS variables consolidated

### Dependencies

- Task 1.3 complete

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `code-quality`

---

## Issue: [Task 2.9] Configure Multi-Region Deployment

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Single-region deployment increases latency for users in other regions.

### Files to Modify

- `vercel.json`
- Database configuration

### Acceptance Criteria

- [ ] Regions configured
- [ ] Database supports multi-region
- [ ] Low latency from different locations

### Dependencies

- Task 1.8 complete

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `infrastructure`

---

## Issue: [Task 2.10] Fix Console Output Images

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: IM-002

### Problem

Native `<img>` elements in Console output miss Next.js image optimization.

### Files to Modify

- `components/console.tsx`

### Acceptance Criteria

- [ ] No native img elements without dimensions
- [ ] Images properly optimized

### Dependencies

- Task 1.6 complete

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `performance`

---

## Issue: [Task 2.11] Add Resource Hints

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: NET-001

### Problem

Limited preconnect/prefetch hints slow down resource loading.

### Files to Modify

- `app/layout.tsx`
- `app/head.tsx`

### Acceptance Criteria

- [ ] Preconnect hints for API domains
- [ ] Preconnect for font providers
- [ ] DNS-prefetch for third-party services

### Implementation Guide

```tsx
<link rel="preconnect" href="https://api.example.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://analytics.example.com" />
```

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `performance`

---

## Issue: [Task 2.12] API Response Pagination

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 3 hours  
**Audit Reference**: API-002, API-005

### Problem

Large message lists and chat history lack pagination, causing:

- Slow API responses
- High memory usage on client
- Poor UX for users with many chats

### Files to Modify

- `app/api/history/route.ts`
- `components/sidebar-history.tsx`
- Related data fetching code

### Acceptance Criteria

- [ ] Cursor-based pagination implemented
- [ ] Frontend requests pages
- [ ] Infinite scroll or load more button works
- [ ] Total count header added

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `api`

---

## Issue: [Task 2.13] Fix Skeleton/Content CLS

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 2 hours  
**Audit Reference**: CLS-002, CLS-005

### Problem

Skeleton placeholder dimensions don't match actual content, causing layout shifts.

### Files to Modify

- `components/document-skeleton.tsx`
- `components/sidebar-skeleton.tsx`
- Other skeleton components

### Acceptance Criteria

- [ ] Skeleton dimensions match content
- [ ] No layout shifts from skeleton to content

### Implementation Guide

1. Audit all skeleton components
2. Compare skeleton dimensions with actual content
3. Fix height/width mismatches
4. Add appropriate aspect ratios

### Dependencies

None

### Labels

`priority: medium`, `phase: 2`, `type: enhancement`, `performance`

---

## Issue: [Task 2.14] Create Checkpoint - Phase 2 Verification

**Priority**: 🟡 MEDIUM  
**Phase**: Phase 2 - Medium Priority Optimization  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

Need to verify Phase 2 completion and metrics.

### Acceptance Criteria

- [ ] Bundle size reduced
- [ ] No unused dependencies
- [ ] No console.log in production

### Metrics to Record

| Metric       | Phase 1 | Phase 2 | Target |
| ------------ | ------- | ------- | ------ |
| Bundle Size  | ?       | ?       | -20%   |
| Unused Deps  | ?       | 0       | 0      |
| Console Logs | 6       | 0       | 0      |

### Dependencies

- Tasks 2.1-2.13 complete

### Labels

`priority: medium`, `phase: 2`, `type: verification`, `milestone`

---

## Phase 3: Low Priority Improvements

---

## Issue: [Task 3.1] Remove Unused CSS Variables

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Unused CSS variables increase stylesheet size.

### Files to Modify

- `app/globals.css`
- Component CSS files

### Acceptance Criteria

- [ ] No unused CSS variables
- [ ] Stylesheet size reduced

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `code-quality`

---

## Issue: [Task 3.2] Enable React Strict Mode

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 30 minutes  
**Audit Reference**: N/A

### Problem

React Strict Mode helps identify potential problems.

### Files to Modify

- `next.config.js`

### Acceptance Criteria

- [ ] React Strict Mode enabled
- [ ] No additional issues revealed

### Implementation Guide

```javascript
module.exports = {
  reactStrictMode: true,
};
```

### Dependencies

- All hydration issues fixed

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `code-quality`

---

## Issue: [Task 3.3] Set Up Bundle Analyzer

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 1 hour  
**Audit Reference**: N/A

### Problem

No visibility into bundle composition.

### Files to Modify

- `package.json`
- `next.config.js`

### Acceptance Criteria

- [ ] Bundle analyzer installed
- [ ] npm script added
- [ ] Documentation provided

### Implementation Guide

1. Install `@next/bundle-analyzer`
2. Configure in next.config.js
3. Add npm script for analysis
4. Document how to use

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `tooling`

---

## Issue: [Task 3.4] Add PWA/Service Worker Support

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 4 hours  
**Audit Reference**: N/A

### Problem

No offline support or PWA capabilities.

### Files to Modify

- `public/manifest.json`
- Service Worker file
- `next.config.js`

### Acceptance Criteria

- [ ] manifest.json created
- [ ] Service worker registered
- [ ] Offline support works

### Dependencies

- All caching configured

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `pwa`

---

## Issue: [Task 3.5] Address Remaining Lint Rule Fixes

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 2 hours  
**Audit Reference**: N/A

### Problem

Lint warnings indicate code quality issues.

### Files to Modify

- Various (based on lint output)

### Acceptance Criteria

- [ ] No lint warnings
- [ ] Stricter rules considered

### Implementation Guide

1. Run `npm run lint`
2. Address each warning/error
3. Consider adding stricter rules

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `code-quality`

---

## Issue: [Task 3.6] Review framer-motion Usage

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 3 hours  
**Audit Reference**: B-006

### Problem

framer-motion is imported in 10 components, adding to bundle size. Some animations could use CSS.

### Files to Modify

- 10 components using framer-motion

### Acceptance Criteria

- [ ] Simple animations use CSS
- [ ] framer-motion kept for complex orchestration
- [ ] Bundle size reduced

### Implementation Guide

1. Audit all framer-motion usages
2. Identify simple animations replaceable with CSS
3. Replace where beneficial (simple fades, transforms)
4. Keep framer-motion for complex orchestration

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: enhancement`, `bundle-size`

---

## Issue: [Task 3.7] Fix suggestions-extension Cleanup

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 1 hour  
**Audit Reference**: UPDATE-001

### Problem

Missing cleanup function in TipTap suggestions extension may cause memory leaks.

### Files to Modify

- `lib/editor/suggestions-extension.ts`

### Acceptance Criteria

- [ ] Cleanup function added
- [ ] Event listeners properly removed
- [ ] No memory leaks

### Implementation Guide

1. Review suggestions extension code
2. Add proper cleanup in useEffect returns
3. Clean up event listeners and subscriptions

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: bug`, `memory-leak`

---

## Issue: [Task 3.8] Add Environment Variable Documentation

**Priority**: 🟢 LOW  
**Phase**: Phase 3 - Low Priority Improvements  
**Estimated Time**: 1 hour  
**Audit Reference**: BUILD-005

### Problem

No documentation for NEXT*PUBLIC* environment variables.

### Files to Modify

- `README.md`
- `.env.example`

### Acceptance Criteria

- [ ] All env vars documented
- [ ] .env.example updated

### Implementation Guide

1. List all NEXT*PUBLIC* variables in codebase
2. Document purpose of each in README
3. Create/update .env.example with all variables

### Dependencies

None

### Labels

`priority: low`, `phase: 3`, `type: documentation`

---

## Quick Reference Labels

```
priority: critical
priority: high
priority: medium
priority: low

phase: 0
phase: 1
phase: 2
phase: 3

type: bug
type: enhancement
type: documentation
type: verification

hydration
performance
bundle-size
code-quality
api
infrastructure
tooling
pwa
memory-leak
next-js
milestone
```

---

_Generated from implementation-plan.md on 2024-12-16_
