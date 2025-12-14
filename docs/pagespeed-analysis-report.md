# PageSpeed Analysis Report

**URL**: https://ai-assistant-3iqr77cal-nicx2291.vercel.app/  
**Date**: 2025-12-13  
**Lighthouse Version**: 13.0.1

---

## Executive Summary

| Metric | Mobile | Desktop | Target | Status |
|--------|--------|---------|--------|--------|
| **Performance Score** | 50/100 | 69/100 | 90+ | 🔴 Needs Work |
| **LCP** | 9.1s | 9.1s | <2.5s | 🔴 Critical |
| **FCP** | 1.1s | 1.1s | <1.8s | 🟢 Good |
| **CLS** | 0 | 0.379 | <0.1 | 🔴 Desktop Issue |
| **TBT** | 780ms | ~300ms | <200ms | 🔴 High |
| **TTI** | 9.1s | 9.1s | <3.8s | 🔴 Critical |

---

## Root Cause Analysis

### 1. LCP 9.1s - JavaScript Bundle Bloat

#### Problem
Heavy JavaScript bundles blocking render with 1.6s bootup time and 2.3s main thread work.

#### Affected Files

| File | Issue | Bundle Impact |
|------|-------|---------------|
| `components/greeting.tsx:1` | Static framer-motion import | +140KB |
| `components/messages.tsx:3` | Static framer-motion import | +140KB |
| `components/message.tsx:4` | Static framer-motion import | +140KB |
| `components/suggested-actions.tsx:4` | Static framer-motion import | +140KB |
| `components/sidebar-history.tsx:4` | Static framer-motion import | +140KB |
| `components/artifact.tsx` | Static artifact definitions import | +400KB |

#### Bundle Analysis

| Bundle | Size | CPU Time | Root Cause |
|--------|------|----------|------------|
| `0ec9c5ba655de7b7.js` | 256KB | 679ms | react-data-grid (sheet artifact) |
| `f1620c0d61c801d3.js` | 154KB | 121ms | CodeMirror (code artifact) |
| `c525d1a33bc1c875.js` | 146KB | 70ms | TipTap editor |
| `ff84e4de3e6587a8.js` | 41KB | 197ms | Framer Motion |
| `6598ba207129010d.js` | 65KB | 625ms | React DOM |

#### Fix: Replace Framer Motion with CSS

**File**: `components/greeting.tsx`

```tsx
// ❌ Before (loads 140KB)
import { motion } from "framer-motion";

export const Greeting = () => (
    <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
    >
        Hello there!
    </motion.div>
);

// ✅ After (0KB)
export const Greeting = () => (
    <div className="animate-fade-in">
        Hello there!
    </div>
);
```

**File**: `app/globals.css`

```css
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.5s ease-out 0.5s both;
}
```

#### Fix: Lazy Load Artifact Definitions

**File**: `components/artifact.tsx`

```tsx
// ❌ Before (loads all artifact code ~400KB)
import { codeArtifact } from "@/artifacts/code/client";
import { imageArtifact } from "@/artifacts/image/client";
import { sheetArtifact } from "@/artifacts/sheet/client";
import { textArtifact } from "@/artifacts/text/client";

// ✅ After (loads on demand)
const artifactLoaders = {
    code: () => import("@/artifacts/code/client").then((m) => m.codeArtifact),
    text: () => import("@/artifacts/text/client").then((m) => m.textArtifact),
    sheet: () => import("@/artifacts/sheet/client").then((m) => m.sheetArtifact),
    image: () => import("@/artifacts/image/client").then((m) => m.imageArtifact),
};

// Then load dynamically based on artifact.kind
const definition = await artifactLoaders[artifact.kind]();
```

---

### 2. Desktop CLS 0.379 - Layout Shifts

#### Problem 1: Avatar Image Missing Explicit Size

**File**: `components/sidebar-user-nav.tsx:62-68`

```tsx
// ❌ Before (causes CLS)
<Image
    alt={displayLabel}
    className="rounded-full"
    height={24}
    src={`https://avatar.vercel.sh/${avatarSeed}`}
    width={24}
/>

// ✅ After (prevents CLS)
<Image
    alt={displayLabel}
    className="size-6 rounded-full shrink-0"
    height={24}
    priority
    src={`https://avatar.vercel.sh/${avatarSeed}`}
    width={24}
/>
```

**Changes**:
- Added `size-6` class for explicit CSS dimensions
- Added `shrink-0` to prevent flexbox compression
- Added `priority` to disable lazy loading (image is above fold on desktop)

#### Problem 2: Sidebar Hydration Delay

**File**: `components/ui/sidebar.tsx:222-227`

```tsx
// ❌ Before (causes 256px shift)
if (isMobile === undefined) {
    return null;
}

// ✅ After (reserves space)
if (isMobile === undefined) {
    return (
        <div
            aria-hidden="true"
            className="hidden md:block w-[--sidebar-width] shrink-0"
            data-sidebar-placeholder="true"
        />
    );
}
```

**Why Desktop CLS ≠ Mobile CLS**:
- **Desktop**: Sidebar renders expanded at 256px width → main content shifts left
- **Mobile**: Sidebar is a Sheet overlay → main content width unchanged

#### Problem 3: Hydration Mismatch (React Error #418)

**File**: `components/settings/theme-selector.tsx:93`

```tsx
// ❌ Before (server/client mismatch)
<span>{`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}</span>

// ✅ After
<span suppressHydrationWarning>
    {`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
</span>
```

---

### 3. Missing Preconnect (300ms LCP savings)

#### Problem
No preconnect for `vercel.live` which is loaded on every page.

**File**: `app/layout.tsx`

```tsx
// ✅ Add in <head>
<head>
    <link rel="preconnect" href="https://vercel.live" crossOrigin="anonymous" />
    <link rel="dns-prefetch" href="https://vercel.live" />
</head>
```

---

### 4. Viewport Accessibility Issue

#### Problem
`maximum-scale=1` blocks user zooming, violating WCAG 2.1.

**File**: `app/layout.tsx`

```tsx
// ❌ Before
export const viewport = {
    maximumScale: 1,
};

// ✅ After
export const viewport = {
    maximumScale: 5,
};
```

---

### 5. Unused JavaScript (616KB)

| Bundle | Total | Unused | % Unused | Library |
|--------|-------|--------|----------|---------|
| `0ec9c5ba655de7b7.js` | 253KB | 187KB | 74% | TipTap/ProseMirror |
| `c525d1a33bc1c875.js` | 145KB | 134KB | 92% | Artifact code |
| `f1620c0d61c801d3.js` | 154KB | 121KB | 79% | CodeMirror |
| `e294235c80882554.js` | 95KB | 71KB | 75% | Unknown |
| `ff84e4de3e6587a8.js` | 41KB | 24KB | 57% | Framer Motion |

#### Fix: Update next.config.ts

```typescript
experimental: {
    optimizePackageImports: [
        // ... existing
        "react-data-grid",
        "papaparse",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-context-menu",
    ],
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours) - Est. +15 points

| Fix | File | Impact |
|-----|------|--------|
| Add preconnect | `app/layout.tsx` | -300ms LCP |
| Fix avatar sizing | `components/sidebar-user-nav.tsx` | CLS → 0 |
| Fix hydration warning | `components/settings/theme-selector.tsx` | UX |
| Fix viewport | `app/layout.tsx` | Accessibility |

### Phase 2: Framer Motion (2-3 hours) - Est. +10 points

| Fix | Files | Impact |
|-----|-------|--------|
| CSS animations for greeting | `components/greeting.tsx`, `globals.css` | -140KB |
| CSS animations for messages | `components/messages.tsx` | -140KB |
| Implement LazyMotion | New `lib/motion/provider.tsx` | -13KB |

### Phase 3: Code Splitting (4-6 hours) - Est. +5-10 points

| Fix | File | Impact |
|-----|------|--------|
| Lazy artifact definitions | `components/artifact.tsx` | -400KB initial |
| Sidebar placeholder | `components/ui/sidebar.tsx` | CLS prevention |
| Update optimizePackageImports | `next.config.ts` | Better tree-shaking |

---

## Projected Improvements

| Metric | Current | After Phase 1 | After All |
|--------|---------|---------------|-----------|
| Mobile Score | 50 | 65 | 80-85 |
| Desktop Score | 69 | 82 | 90-95 |
| LCP | 9.1s | 5.5s | 2.5-3.0s |
| TBT | 780ms | 400ms | 150-200ms |
| CLS (Desktop) | 0.379 | 0 | 0 |

---

## Files Requiring Changes

### Critical Path (Phase 1)

1. `app/layout.tsx` - Preconnect, viewport
2. `components/sidebar-user-nav.tsx` - Avatar image fix
3. `components/settings/theme-selector.tsx` - Hydration warning

### Framer Motion (Phase 2)

1. `components/greeting.tsx` - CSS animation
2. `components/messages.tsx` - CSS animation  
3. `components/message.tsx` - LazyMotion
4. `components/suggested-actions.tsx` - CSS animation
5. `app/globals.css` - Animation keyframes
6. `lib/motion/provider.tsx` - New LazyMotion wrapper

### Code Splitting (Phase 3)

1. `components/artifact.tsx` - Dynamic artifact imports
2. `components/ui/sidebar.tsx` - Hydration placeholder
3. `next.config.ts` - optimizePackageImports

---

## Third-Party Analysis

| Resource | Size | Impact | Status |
|----------|------|--------|--------|
| vercel.live | 249B | Low | 🟢 Minimal |
| cdn.jsdelivr.net (Pyodide) | 8.2KB | Medium | 🟢 Lazy loaded |
| Fonts (self-hosted) | 60KB | Low | 🟢 Optimized |

**Total third-party**: 8.5KB (excellent)

---

## Testing Recommendations

After implementing fixes, run:

```bash
# Local testing
pnpm build && pnpm start
npx lighthouse http://localhost:3000 --view

# Or use PageSpeed Insights
https://pagespeed.web.dev/analysis?url=YOUR_URL
```

---

## References

- [web.dev Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing)
- [Framer Motion LazyMotion](https://www.framer.com/motion/lazy-motion/)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
