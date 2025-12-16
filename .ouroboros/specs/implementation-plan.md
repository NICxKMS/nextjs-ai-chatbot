# App Optimization Implementation Plan

> **Created**: 2024-12-16  
> **Last Validated**: 2024-12-16  
> **Total Tasks**: 37 actionable items (28 original + 9 gap fixes)  
> **Estimated Duration**: 3-4 weeks  
> **Status**: 🔴 Not Started
> **Audit Coverage**: 69.7% (53/76 issues addressed)

---

## Progress Overview

| Phase                       | Tasks  | Completed | Progress                        |
| --------------------------- | ------ | --------- | ------------------------------- |
| Phase 0: Critical Hydration | 3      | 0         | ⬜⬜⬜ 0%                       |
| Phase 1: High Priority      | 12     | 0         | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0%     |
| Phase 2: Medium Priority    | 14     | 0         | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0% |
| Phase 3: Low Priority       | 8      | 0         | ⬜⬜⬜⬜⬜⬜⬜⬜ 0%             |
| **TOTAL**                   | **37** | **0**     | **0%**                          |

### Quick Status Legend

- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- ❌ Blocked
- 🔄 Needs Review

---

## Phase 0: Critical Hydration Fixes (Day 1)

> **Priority**: 🔴 CRITICAL  
> **Blocks**: ALL other phases  
> **Goal**: Eliminate hydration mismatches that break the app

---

### Task 0.1: Fix localStorage in Sidebar useState Initial Value

- [ ] **Status**: Not Started
- **Issue ID**: H-001
- **Priority**: 🔴 CRITICAL
- **Estimated Time**: 1h
- **Files**:
  - `components/ui/sidebar.tsx`
- **Dependencies**: None
- **Risk Level**: Medium (sidebar state may reset on page load)

#### Problem Description

Using `localStorage.getItem()` directly in `useState()` initial value causes hydration mismatch because:

- Server renders with `null` (no localStorage)
- Client renders with stored value
- React detects content mismatch → hydration error

#### Acceptance Criteria

- [ ] No hydration warnings in console related to sidebar
- [ ] Sidebar state persists correctly across page refreshes
- [ ] SSR renders consistent initial state
- [ ] Client-side hydration completes without errors

#### Implementation Steps

1. Replace `useState(localStorage.getItem(...))` with `useState(null)`
2. Add `useEffect` to read localStorage after mount
3. Add loading state to prevent flash of incorrect content
4. Test SSR output matches initial client render

#### Code Changes

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

// Use isHydrated to prevent flash if needed
```

#### Verification Steps

1. Run `npm run build && npm run start`
2. Open browser DevTools Console
3. Hard refresh page (Ctrl+Shift+R)
4. Confirm no hydration warnings appear
5. Toggle sidebar, refresh, confirm state persists

#### Rollback Plan

- Revert file to previous commit
- If state persistence is broken, add fallback default

---

### Task 0.2: Replace Math.random() in Skeleton Render Keys

- [ ] **Status**: Not Started
- **Issue ID**: H-002
- **Priority**: 🔴 CRITICAL
- **Estimated Time**: 30m
- **Files**:
  - `components/ui/sidebar.tsx`
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

Using `Math.random()` for React keys during render causes:

- Different keys on server vs client
- React cannot match elements → full re-render
- Hydration mismatch warnings

#### Acceptance Criteria

- [ ] No `Math.random()` calls in render paths
- [ ] Skeleton elements use stable, deterministic keys
- [ ] No hydration warnings related to key mismatches

#### Implementation Steps

1. Find all `Math.random()` usage in component render
2. Replace with index-based keys (acceptable for static lists)
3. Or use deterministic ID generation based on content

#### Code Changes

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

// ✅ ALTERNATIVE (for dynamic content)
{
  items.map((item, index) => (
    <Skeleton key={item.id ?? `skeleton-${index}`} className="h-8" />
  ));
}
```

#### Verification Steps

1. Search codebase: `grep -r "Math.random" components/`
2. Run build and check for hydration warnings
3. Verify skeleton loading states render correctly

#### Rollback Plan

- Simple revert, low risk change

---

### Task 0.3: Fix useLocalStorage Hook Initialization

- [ ] **Status**: Not Started
- **Issue ID**: H-003
- **Priority**: 🔴 CRITICAL
- **Estimated Time**: 1.5h
- **Files**:
  - `lib/settings/provider.tsx`
  - Any file using `useLocalStorage` hook
- **Dependencies**: None
- **Risk Level**: Medium (affects all settings persistence)

#### Problem Description

The `useLocalStorage` hook (likely from `usehooks-ts`) reads localStorage during initial render unless `initializeWithValue: false` is set. This causes server/client mismatch.

#### Acceptance Criteria

- [ ] All `useLocalStorage` calls include `{ initializeWithValue: false }`
- [ ] No hydration warnings from settings provider
- [ ] Settings load correctly after hydration
- [ ] Default values render on SSR

#### Implementation Steps

1. Audit all `useLocalStorage` usages in codebase
2. Add `initializeWithValue: false` option to each call
3. Handle the `undefined` initial state appropriately
4. Add loading states where needed

#### Code Changes

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

#### Verification Steps

1. Search: `grep -r "useLocalStorage" lib/ components/`
2. Verify all instances have the option set
3. Build and test for hydration warnings
4. Test settings persistence across refreshes

#### Rollback Plan

- Revert changes to provider
- May need to implement custom hook as fallback

---

## Phase 1: High Priority Fixes (Days 2-3)

> **Priority**: 🟠 HIGH  
> **Impact**: Major performance and UX improvements  
> **Prerequisites**: Phase 0 complete

---

### Task 1.1: Create Hydration-Safe useWindowSize Hook

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**:
  - `hooks/use-window-size.ts` (create or modify)
  - `components/chat-header.tsx`
  - `components/toolbar.tsx`
  - `components/artifact.tsx`
  - `components/document-preview.tsx`
  - `components/document.tsx`
- **Dependencies**: Task 0.1, 0.2, 0.3 complete
- **Risk Level**: Medium (affects 5 components)

#### Problem Description

Current `useWindowSize` returns `0` or `undefined` during SSR, causing:

- Layout shifts when real dimensions load
- Conditional rendering mismatches
- CLS (Cumulative Layout Shift) issues

#### Acceptance Criteria

- [ ] Hook returns `null` or meaningful defaults during SSR
- [ ] Components handle loading state gracefully
- [ ] No layout shift on hydration
- [ ] CLS score < 0.1

#### Implementation Steps

1. Create/modify hook to return `null` during SSR
2. Add `isReady` boolean to indicate hydration complete
3. Update all 5 consuming components
4. Add CSS to prevent layout shift (use CSS media queries as fallback)

#### Code Changes

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

#### Verification Steps

1. Test each of the 5 components on mobile and desktop
2. Check for layout shift using Chrome DevTools Performance
3. Verify no hydration warnings

#### Rollback Plan

- Revert hook changes
- Components may need individual fixes

---

### Task 1.2: Move Mobile Detection to Edge Middleware

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**:
  - `middleware.ts` (create/modify)
  - `hooks/use-mobile.ts` (deprecate or modify)
  - `app/layout.tsx`
- **Dependencies**: None (can run parallel to Task 1.1)
- **Risk Level**: Low

#### Problem Description

Client-side mobile detection causes:

- Flash of desktop layout on mobile
- Unnecessary JavaScript execution
- Poor Core Web Vitals

#### Acceptance Criteria

- [ ] Mobile detection happens at Edge (middleware)
- [ ] Device type available via cookie or header
- [ ] No client-side detection for initial render
- [ ] Correct layout renders on first paint

#### Implementation Steps

1. Create/update middleware to detect User-Agent
2. Set cookie or header with device type
3. Read device type in server components
4. Fallback to client detection for edge cases

#### Code Changes

```typescript
// ✅ middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

  const response = NextResponse.next();
  response.cookies.set("device-type", isMobile ? "mobile" : "desktop", {
    httpOnly: false, // Allow client access
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

```typescript
// ✅ Usage in Server Component
import { cookies } from "next/headers";

export default async function Layout({ children }) {
  const deviceType = cookies().get("device-type")?.value ?? "desktop";
  const isMobile = deviceType === "mobile";

  return <html data-device={deviceType}>{/* ... */}</html>;
}
```

#### Verification Steps

1. Test with mobile User-Agent in DevTools
2. Verify cookie is set correctly
3. Check first paint shows correct layout

#### Rollback Plan

- Remove middleware
- Fall back to client-side detection

---

### Task 1.3: Fix resolvedTheme Hydration Mismatch

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 1.5h
- **Files**:
  - `components/sidebar-user-nav.tsx`
  - `components/sheet-editor.tsx`
- **Dependencies**: Task 0.3 (settings provider fix)
- **Risk Level**: Low

#### Problem Description

Using `resolvedTheme` from next-themes during SSR causes className mismatch because theme is only known on client.

#### Acceptance Criteria

- [ ] No theme-related hydration warnings
- [ ] No flash of wrong theme colors
- [ ] Theme persists correctly

#### Implementation Steps

1. Use `mounted` state pattern from next-themes docs
2. Render neutral/skeleton state until mounted
3. Apply theme-specific classes only after mount

#### Code Changes

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

#### Better Alternative (CSS-based)

```typescript
// ✅ BEST: Let CSS handle theming
// No JS theme detection needed for colors
return (
  <div className="bg-white dark:bg-black">
    {/* Tailwind handles dark mode via CSS */}
  </div>
);
```

#### Verification Steps

1. Toggle between light/dark themes
2. Refresh page in each theme
3. Check for hydration warnings

#### Rollback Plan

- Revert to previous implementation
- Accept hydration warning as known issue

---

### Task 1.4: Virtualize Messages List

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 3h
- **Files**:
  - `components/messages.tsx`
  - `package.json` (add @tanstack/react-virtual)
- **Dependencies**: None
- **Risk Level**: Medium (core chat functionality)

#### Problem Description

Rendering all messages in a long conversation:

- Causes scroll jank
- Uses excessive memory
- Slows down initial render

#### Acceptance Criteria

- [ ] Only visible messages + buffer are rendered
- [ ] Smooth scrolling with 100+ messages
- [ ] Auto-scroll to bottom works correctly
- [ ] Message selection/interaction preserved

#### Implementation Steps

1. Install `@tanstack/react-virtual`
2. Wrap messages in virtualizer
3. Handle variable height messages
4. Preserve scroll position on new messages
5. Test with conversation export/import

#### Code Changes

```typescript
// ✅ AFTER: components/messages.tsx
import { useVirtualizer } from "@tanstack/react-virtual";

export function Messages({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimate, actual varies
    overscan: 5, // Render 5 extra items above/below
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
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

#### Verification Steps

1. Load conversation with 100+ messages
2. Scroll up and down, check for jank
3. Profile with React DevTools
4. Verify DOM node count stays low

#### Rollback Plan

- Remove virtualizer, revert to simple map
- Consider pagination as alternative

---

### Task 1.5: Virtualize Sidebar History

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**:
  - `components/sidebar-history.tsx`
- **Dependencies**: Task 1.4 (learn from messages implementation)
- **Risk Level**: Low

#### Problem Description

Users with many chats experience slow sidebar rendering.

#### Acceptance Criteria

- [ ] Sidebar renders smoothly with 500+ chat items
- [ ] Search/filter still works
- [ ] Active chat highlight preserved

#### Implementation Steps

1. Apply same virtualization pattern as messages
2. Handle fixed-height list items (simpler than messages)
3. Preserve grouping by date if applicable

#### Code Changes

```typescript
// Similar to Task 1.4, but simpler with fixed heights
const virtualizer = useVirtualizer({
  count: filteredChats.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48, // Fixed height items
  overscan: 10,
});
```

#### Verification Steps

1. Create/import 500+ chat history items
2. Test sidebar scroll performance
3. Verify search still works

#### Rollback Plan

- Revert to non-virtualized list
- Implement pagination as fallback

---

### Task 1.6: Add Image Dimensions to ImageEditor

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 1h
- **Files**:
  - `components/image-editor.tsx`
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

`<Image>` components without width/height cause:

- Layout shifts (CLS)
- LCP delays
- Console warnings

#### Acceptance Criteria

- [ ] All Image components have explicit dimensions
- [ ] Aspect ratio preserved during load
- [ ] No CLS from image loading

#### Implementation Steps

1. Add width/height props to all Image components
2. Use `fill` with sized container as alternative
3. Add placeholder/blur for better UX

#### Code Changes

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
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>

// ✅ ALTERNATIVE (fill with container)
<div className="relative aspect-video w-full">
  <Image
    src={imageSrc}
    alt="Editor image"
    fill
    className="object-contain"
  />
</div>
```

#### Verification Steps

1. Load image editor
2. Check for layout shift during image load
3. Verify Lighthouse CLS score

#### Rollback Plan

- Revert, accept CLS warning

---

### Task 1.7: Add Cache-Control Headers to API Routes

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**:
  - `app/api/*/route.ts` (10 files)
  - Consider creating shared utility
- **Dependencies**: None
- **Risk Level**: Low (caching is additive)

#### Problem Description

API responses without cache headers:

- Force re-fetch on every request
- Waste bandwidth and server resources
- Slow down repeat interactions

#### Acceptance Criteria

- [ ] All GET endpoints have appropriate Cache-Control
- [ ] Mutable endpoints have no-store
- [ ] Edge caching works for public data

#### Implementation Steps

1. Audit all API routes for cachability
2. Create cache header utility function
3. Add headers to each route
4. Document caching strategy

#### Code Changes

```typescript
// ✅ lib/api/cache-headers.ts
export const cacheHeaders = {
  // Immutable data (rarely changes)
  immutable: {
    "Cache-Control": "public, max-age=31536000, immutable",
  },
  // User-specific data
  private: {
    "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
  },
  // Real-time data
  noStore: {
    "Cache-Control": "no-store, must-revalidate",
  },
  // Shared cacheable data
  shared: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
};

// ✅ Usage in route
export async function GET() {
  const data = await fetchData();
  return NextResponse.json(data, {
    headers: cacheHeaders.private,
  });
}
```

#### API Routes to Update

1. `app/api/chat/route.ts` - noStore (streaming)
2. `app/api/history/route.ts` - private, short TTL
3. `app/api/document/route.ts` - private
4. `app/api/suggestions/route.ts` - shared, medium TTL
5. `app/api/vote/route.ts` - noStore (mutations)
6. `app/api/files/route.ts` - private
7. `app/api/user/route.ts` - private
8. Additional routes as discovered...

#### Verification Steps

1. Check response headers in DevTools Network tab
2. Verify cached responses return 304
3. Test cache invalidation on mutations

#### Rollback Plan

- Remove headers, no functional impact

---

### Task 1.8: Add Static Asset Caching to vercel.json

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 30m
- **Files**:
  - `vercel.json`
- **Dependencies**: None
- **Risk Level**: Very Low

#### Problem Description

Static assets (fonts, images, JS chunks) may not have optimal cache headers.

#### Acceptance Criteria

- [ ] vercel.json includes cache headers config
- [ ] Static assets cached for 1 year
- [ ] HTML/API routes have appropriate short cache

#### Implementation Steps

1. Create or update vercel.json
2. Add headers configuration
3. Deploy and verify

#### Code Changes

```json
// ✅ vercel.json
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

#### Verification Steps

1. Deploy to Vercel
2. Check font/static file headers
3. Verify caching in browser DevTools

#### Rollback Plan

- Remove vercel.json headers section

---

### Task 1.9: Configure Edge Runtime for Proxy Route

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 1h
- **Files**:
  - `app/api/proxy/route.ts`
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

Proxy route running in Node.js runtime adds latency. Edge runtime would be faster for simple proxy operations.

#### Acceptance Criteria

- [ ] Proxy route configured for Edge runtime
- [ ] No functionality regression
- [ ] Lower latency for proxy requests

#### Implementation Steps

1. Add Edge runtime export
2. Remove any Node.js-only APIs
3. Test proxy functionality

#### Code Changes

```typescript
// ✅ app/api/proxy/route.ts
export const runtime = "edge";

export async function GET(request: Request) {
  // Ensure no Node.js-only APIs are used
  // fetch() works in Edge
  // Buffer/fs do NOT work in Edge
}
```

#### Verification Steps

1. Deploy and test proxy requests
2. Compare response times before/after
3. Check Vercel logs for runtime

#### Rollback Plan

- Remove `runtime = 'edge'` export

---

### Task 1.10: Fix Auth State Hydration (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: CR-006
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**:
  - `components/auth-provider.tsx`
  - `components/sidebar-user-nav.tsx`
  - Any component using auth state conditionally
- **Dependencies**: Task 0.3 complete
- **Risk Level**: Medium

#### Problem Description

Auth state conditional rendering causes hydration mismatch because:

- Server has no auth state (null/undefined)
- Client may have cached auth from previous session
- Conditional UI based on auth causes content mismatch

#### Acceptance Criteria

- [ ] No auth-related hydration warnings
- [ ] Correct UI renders for logged-in and logged-out states
- [ ] No flash of wrong auth state

#### Implementation Steps

1. Use `mounted` state pattern for auth-dependent UI
2. Render neutral/skeleton state until auth resolved
3. Apply auth-specific content only after hydration

#### Code Changes

```typescript
// ❌ BEFORE (causes hydration mismatch)
const { user } = useAuth();
return user ? <UserProfile /> : <LoginButton />;

// ✅ AFTER (hydration-safe)
const { user, isLoading } = useAuth();
const [mounted, setMounted] = useState(false);

useEffect(() => setMounted(true), []);

if (!mounted || isLoading) {
  return <AuthSkeleton />; // Same on server and client
}

return user ? <UserProfile /> : <LoginButton />;
```

#### Verification Steps

1. Hard refresh while logged in
2. Hard refresh while logged out
3. Check console for hydration warnings

#### Rollback Plan

- Revert to previous implementation
- Accept hydration warning as known issue

---

### Task 1.11: Lazy-Load Syntax Highlighting (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: B-003
- **Priority**: 🟠 HIGH
- **Estimated Time**: 3h
- **Files**:
  - `components/code-editor.tsx`
  - `lib/syntax/*.ts` (if exists)
  - Components using syntax highlighting
- **Dependencies**: None
- **Risk Level**: Medium

#### Problem Description

Heavy syntax highlighting libraries (shiki, prism, etc.) are loaded eagerly, impacting:

- Initial bundle size
- Time to interactive
- Users who never view code

#### Acceptance Criteria

- [ ] Syntax highlighter loaded only when code block visible
- [ ] Loading state shown while highlighter loads
- [ ] No bundle regression for non-code pages

#### Implementation Steps

1. Identify syntax highlighting imports
2. Wrap in dynamic import with loading state
3. Consider using lighter alternative for simple cases
4. Test code rendering still works

#### Code Changes

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

// Show plain code or loading state until highlighter ready
```

#### Verification Steps

1. Check bundle size for pages without code
2. Verify syntax highlighting works when code present
3. Test loading state UX

#### Rollback Plan

- Revert to eager loading if issues found

---

### Task 1.12: Create Checkpoint - Phase 1 Verification

- [ ] **Status**: Not Started
- **Priority**: 🟠 HIGH
- **Estimated Time**: 2h
- **Files**: None (verification only)
- **Dependencies**: Tasks 1.1-1.11 complete
- **Risk Level**: None

#### Acceptance Criteria

- [ ] All Phase 0 and Phase 1 tasks complete
- [ ] No hydration warnings in production build
- [ ] Lighthouse Performance > 80
- [ ] CLS < 0.1
- [ ] LCP < 2.5s
- [ ] All existing tests pass

#### Verification Steps

1. Run full test suite: `npm test`
2. Run production build: `npm run build`
3. Start production server: `npm start`
4. Run Lighthouse audit in Chrome
5. Test on mobile device/emulator
6. Check browser console for errors
7. Test all major user flows

#### Metrics to Record

| Metric                 | Before | After | Target  |
| ---------------------- | ------ | ----- | ------- |
| Lighthouse Performance | ?      | ?     | > 80    |
| CLS                    | ?      | ?     | < 0.1   |
| LCP                    | ?      | ?     | < 2.5s  |
| FID                    | ?      | ?     | < 100ms |
| Bundle Size (main)     | ?      | ?     | < 200KB |
| Hydration Warnings     | ?      | 0     | 0       |

---

## Phase 2: Medium Priority Optimization (Week 2)

> **Priority**: 🟡 MEDIUM  
> **Impact**: Bundle size, DX, and further performance  
> **Prerequisites**: Phase 1 complete

---

### Task 2.1: Remove Duplicate clsx/classnames Packages

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - `package.json`
  - All files importing classnames
- **Dependencies**: None
- **Risk Level**: Low

#### Implementation Steps

1. Search for all `classnames` imports
2. Replace with `clsx` (smaller, same API)
3. Remove `classnames` from package.json
4. Run tests

#### Code Changes

```typescript
// Find: import classnames from 'classnames';
// Replace: import clsx from 'clsx';
// Or use: import { cn } from '@/lib/utils';
```

---

### Task 2.2: Remove Unused @icons-pack/react-simple-icons

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - `package.json`
  - Search for any usages
- **Dependencies**: None
- **Risk Level**: Low (if truly unused)

#### Implementation Steps

1. Search codebase for imports from package
2. If unused, remove from package.json
3. If used, consider replacing with specific icon imports

#### Verification Steps

1. `grep -r "react-simple-icons" .`
2. Build and test

---

### Task 2.3: Remove Console Statements from Production

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - 6 files with console statements
- **Dependencies**: None
- **Risk Level**: Very Low

#### Implementation Steps

1. Search: `grep -rn "console\." --include="*.ts" --include="*.tsx"`
2. Replace with proper logging or remove
3. Add ESLint rule to prevent future occurrences

#### Files to Update

1. File 1 - TBD from search
2. File 2 - TBD from search
3. ... (6 total)

---

### Task 2.4: Migrate unstable_cache to 'use cache'

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 2h
- **Files**:
  - Files using `unstable_cache`
- **Dependencies**: Next.js 15 stable release
- **Risk Level**: Medium

#### Implementation Steps

1. Identify all `unstable_cache` usages
2. Replace with `'use cache'` directive (if Next.js 15)
3. Test caching behavior

---

### Task 2.5: Implement Pyodide On-Demand Loading

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 3h
- **Files**:
  - Files loading Pyodide
- **Dependencies**: None
- **Risk Level**: Medium

#### Problem Description

Pyodide is a large WASM bundle (~10MB). Loading eagerly impacts performance.

#### Implementation Steps

1. Find Pyodide import/initialization
2. Wrap in dynamic import
3. Show loading state while loading
4. Cache loaded instance

#### Code Changes

```typescript
// ✅ On-demand loading
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

---

### Task 2.6: Configure API Timeouts

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - API routes
  - `next.config.js`
- **Dependencies**: None
- **Risk Level**: Low

#### Implementation Steps

1. Add timeout configuration to next.config
2. Add timeouts to streaming routes
3. Handle timeout errors gracefully

---

### Task 2.7: Fix Context Wide Re-renders in DataStreamProvider

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 2h
- **Files**:
  - `components/data-stream-provider.tsx`
- **Dependencies**: None
- **Risk Level**: Medium

#### Problem Description

Context value changes cause all consumers to re-render.

#### Implementation Steps

1. Split context into multiple contexts (state vs actions)
2. Memoize context values
3. Use context selectors if needed

---

### Task 2.8: Theme System Cleanup

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1.5h
- **Files**:
  - Theme-related components
  - CSS variables
- **Dependencies**: Task 1.3 complete
- **Risk Level**: Low

#### Implementation Steps

1. Audit theme-related code
2. Remove redundant theme logic
3. Consolidate CSS variables

---

### Task 2.9: Configure Multi-Region Deployment

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 2h
- **Files**:
  - `vercel.json`
  - Database configuration
- **Dependencies**: Task 1.8 complete
- **Risk Level**: Medium (infrastructure change)

#### Implementation Steps

1. Configure regions in vercel.json
2. Ensure database supports multi-region
3. Test from different geographic locations

---

### Task 2.10: Fix Console Output Images (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: IM-002
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - `components/console.tsx`
- **Dependencies**: Task 1.6 complete
- **Risk Level**: Low

#### Problem Description

Native `<img>` elements in Console output component miss Next.js image optimization.

#### Implementation Steps

1. Locate native `<img>` usage in console component
2. Replace with next/image or add proper dimensions
3. Handle dynamic image sources appropriately

---

### Task 2.11: Add Resource Hints (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: NET-001
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - `app/layout.tsx`
  - `app/head.tsx`
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

Limited preconnect/prefetch hints slow down resource loading.

#### Implementation Steps

1. Add preconnect for API domains
2. Add preconnect for font providers
3. Add prefetch for critical assets
4. Add dns-prefetch for third-party services

#### Code Changes

```tsx
// app/layout.tsx or app/head.tsx
<link rel="preconnect" href="https://api.example.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://analytics.example.com" />
```

---

### Task 2.12: API Response Pagination (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: API-002, API-005
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 3h
- **Files**:
  - `app/api/history/route.ts`
  - `components/sidebar-history.tsx`
  - Related data fetching code
- **Dependencies**: None
- **Risk Level**: Medium

#### Problem Description

Large message lists and chat history lack pagination, causing:

- Slow API responses
- High memory usage on client
- Poor UX for users with many chats

#### Implementation Steps

1. Add cursor-based pagination to history API
2. Update frontend to request pages
3. Implement infinite scroll or load more button
4. Add total count header for UI

---

### Task 2.13: Fix Skeleton/Content CLS (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: CLS-002, CLS-005
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 2h
- **Files**:
  - `components/document-skeleton.tsx`
  - `components/sidebar-skeleton.tsx`
  - Other skeleton components
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

Skeleton placeholder dimensions don't match actual content, causing layout shifts.

#### Implementation Steps

1. Audit all skeleton components
2. Compare skeleton dimensions with actual content
3. Fix height/width mismatches
4. Add appropriate aspect ratios

---

### Task 2.14: Create Checkpoint - Phase 2 Verification

- [ ] **Status**: Not Started
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**: None
- **Dependencies**: Tasks 2.1-2.13 complete
- **Risk Level**: None

#### Metrics to Record

| Metric       | Phase 1 | Phase 2 | Target |
| ------------ | ------- | ------- | ------ |
| Bundle Size  | ?       | ?       | -20%   |
| Unused Deps  | ?       | 0       | 0      |
| Console Logs | 6       | 0       | 0      |

---

## Phase 3: Low Priority Improvements (Week 3+)

> **Priority**: 🟢 LOW  
> **Impact**: Code quality and future-proofing  
> **Prerequisites**: Phase 2 complete

---

### Task 3.1: Remove Unused CSS Variables

- [ ] **Status**: Not Started
- **Priority**: 🟢 LOW
- **Estimated Time**: 2h
- **Files**:
  - `app/globals.css`
  - Component CSS files
- **Dependencies**: None
- **Risk Level**: Low

---

### Task 3.2: Enable React Strict Mode

- [ ] **Status**: Not Started
- **Priority**: 🟢 LOW
- **Estimated Time**: 30m
- **Files**:
  - `next.config.js`
- **Dependencies**: All hydration issues fixed
- **Risk Level**: May reveal additional issues

#### Implementation Steps

```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  // ...
};
```

---

### Task 3.3: Set Up Bundle Analyzer

- [ ] **Status**: Not Started
- **Priority**: 🟢 LOW
- **Estimated Time**: 1h
- **Files**:
  - `package.json`
  - `next.config.js`
- **Dependencies**: None
- **Risk Level**: None (dev tool only)

#### Implementation Steps

1. Install `@next/bundle-analyzer`
2. Configure in next.config.js
3. Add npm script for analysis
4. Document how to use

---

### Task 3.4: Add PWA/Service Worker Support

- [ ] **Status**: Not Started
- **Priority**: 🟢 LOW
- **Estimated Time**: 4h
- **Files**:
  - `public/manifest.json`
  - Service Worker file
  - `next.config.js`
- **Dependencies**: All caching configured
- **Risk Level**: Medium

---

### Task 3.5: Address Remaining Lint Rule Fixes

- [ ] **Status**: Not Started
- **Priority**: 🟢 LOW
- **Estimated Time**: 2h
- **Files**:
  - Various (based on lint output)
- **Dependencies**: None
- **Risk Level**: Very Low

#### Implementation Steps

1. Run `npm run lint`
2. Address each warning/error
3. Consider adding stricter rules

---

### Task 3.6: Review framer-motion Usage (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: B-006
- **Priority**: 🟡 MEDIUM → LOW
- **Estimated Time**: 3h
- **Files**:
  - 10 components using framer-motion
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

framer-motion is imported in 10 components, adding to bundle size. Some animations could use CSS.

#### Implementation Steps

1. Audit all framer-motion usages
2. Identify simple animations replaceable with CSS
3. Replace where beneficial (simple fades, transforms)
4. Keep framer-motion for complex orchestration

---

### Task 3.7: Fix suggestions-extension Cleanup (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: UPDATE-001
- **Priority**: 🟡 MEDIUM
- **Estimated Time**: 1h
- **Files**:
  - `lib/editor/suggestions-extension.ts`
- **Dependencies**: None
- **Risk Level**: Low

#### Problem Description

Missing cleanup function in TipTap suggestions extension may cause memory leaks.

#### Implementation Steps

1. Review suggestions extension code
2. Add proper cleanup in useEffect returns
3. Clean up event listeners and subscriptions

---

### Task 3.8: Add Environment Variable Documentation (NEW - Gap Fix)

- [ ] **Status**: Not Started
- **Issue ID**: BUILD-005
- **Priority**: 🟢 LOW
- **Estimated Time**: 1h
- **Files**:
  - `README.md`
  - `.env.example`
- **Dependencies**: None
- **Risk Level**: None

#### Problem Description

No documentation for NEXT*PUBLIC* environment variables.

#### Implementation Steps

1. List all NEXT*PUBLIC* variables in codebase
2. Document purpose of each in README
3. Create/update .env.example with all variables

---

## Verification Checklist

### Post-Phase 0

- [ ] Build completes without errors
- [ ] No hydration warnings in browser console
- [ ] App functions correctly after hard refresh

### Post-Phase 1

- [ ] Lighthouse Performance score > 80
- [ ] CLS < 0.1
- [ ] LCP < 2.5s
- [ ] All major user flows work
- [ ] No console errors in production

### Post-Phase 2

- [ ] Bundle size reduced by > 10%
- [ ] No unused dependencies
- [ ] No console.log in production code
- [ ] API caching working

### Post-Phase 3

- [ ] React Strict Mode enabled without issues
- [ ] Bundle analyzer available
- [ ] Technical debt documented

---

## Risk Register

| ID  | Risk                                  | Likelihood | Impact | Mitigation                               | Owner  |
| --- | ------------------------------------- | ---------- | ------ | ---------------------------------------- | ------ |
| R1  | Virtualization breaks scroll behavior | Medium     | High   | Test thoroughly, have rollback plan      | Dev    |
| R2  | Edge runtime missing Node.js APIs     | Low        | Medium | Test all code paths before deploying     | Dev    |
| R3  | Cache invalidation issues             | Medium     | Medium | Implement cache busting, test mutations  | Dev    |
| R4  | Theme changes affect accessibility    | Low        | High   | Test with screen readers, check contrast | Dev    |
| R5  | Multi-region adds complexity          | Medium     | Low    | Start with single region, add gradually  | DevOps |
| R6  | Pyodide lazy loading affects UX       | Low        | Medium | Add loading indicators, preload on hover | Dev    |

---

## Dependencies Graph

```
Phase 0 (CRITICAL - Must complete first)
├── Task 0.1: localStorage fix ──┐
├── Task 0.2: Math.random fix ───┼──→ Phase 1
└── Task 0.3: useLocalStorage ───┘

Phase 1 (HIGH - Core optimizations)
├── Task 1.1: useWindowSize ────────→ (enables Task 1.2)
├── Task 1.2: Edge mobile detection ─→ (independent)
├── Task 1.3: resolvedTheme fix ────→ (depends on 0.3)
├── Task 1.4: Virtualize messages ──→ (enables Task 1.5)
├── Task 1.5: Virtualize sidebar ───→ (depends on 1.4)
├── Task 1.6: Image dimensions ─────→ (independent)
├── Task 1.7: Cache-Control headers ─→ (independent)
├── Task 1.8: vercel.json caching ──→ (independent)
├── Task 1.9: Edge proxy runtime ───→ (independent)
├── Task 1.10: Auth state hydration ─→ (NEW - depends on 0.3)
├── Task 1.11: Lazy syntax highlight → (NEW - independent)
└── Task 1.12: CHECKPOINT ──────────→ Phase 2

Phase 2 (MEDIUM - Optimization)
├── Task 2.1-2.9: Original tasks ───→ (parallel)
├── Task 2.10: Console images ──────→ (NEW - depends on 1.6)
├── Task 2.11: Resource hints ──────→ (NEW - independent)
├── Task 2.12: API pagination ──────→ (NEW - independent)
├── Task 2.13: Skeleton CLS fix ────→ (NEW - independent)
└── Task 2.14: CHECKPOINT ──────────→ Phase 3

Phase 3 (LOW - Polish)
├── Task 3.1-3.5: Original tasks ───→ (parallel)
├── Task 3.6: framer-motion review ─→ (NEW - independent)
├── Task 3.7: suggestions cleanup ──→ (NEW - independent)
├── Task 3.8: Env var docs ─────────→ (NEW - independent)
└── Task 3.2: Strict Mode ──────────→ (depends on all fixes)
```

---

## Timeline Summary

| Week             | Phase   | Tasks         | Goal                                   |
| ---------------- | ------- | ------------- | -------------------------------------- |
| Week 1, Day 1    | Phase 0 | 0.1, 0.2, 0.3 | Zero hydration errors                  |
| Week 1, Days 2-4 | Phase 1 | 1.1-1.12      | Core performance + gap fixes           |
| Week 2           | Phase 2 | 2.1-2.14      | Bundle optimization + API improvements |
| Week 3+          | Phase 3 | 3.1-3.8       | Polish & maintenance                   |

---

## Validation Status

> **Validation Date**: 2024-12-16  
> **Validation Report**: `.ouroboros/specs/optimization/validation-report.md`

| Metric               | Value      |
| -------------------- | ---------- |
| Total Audit Issues   | 76         |
| Issues Covered       | 53 (69.7%) |
| Issues OK/Acceptable | 18 (23.7%) |
| Remaining Gaps (LOW) | 17         |

All CRITICAL and HIGH severity issues are now covered. Remaining gaps are LOW priority items that can be addressed in future iterations.

---

## Notes

- Always run `npm run build` after each task to catch issues early
- Commit after each completed task with descriptive message
- Update this document's checkboxes as tasks complete
- Record actual time spent for future estimation accuracy
- Review validation report for detailed gap analysis

---

_Last Updated: 2024-12-16_
_Validated: 2024-12-16_
