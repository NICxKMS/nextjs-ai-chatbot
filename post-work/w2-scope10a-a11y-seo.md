# Scope 10a — Accessibility + SEO + Layout Improvements

**Date:** 2026-03-07
**Status:** ✅ Complete

---

## Summary

Added WCAG-required accessibility landmarks, screen reader support for chat messages, and SEO infrastructure (robots.txt, sitemap.xml) to the application.

---

## Changes

### 1. `app/layout.tsx` — Skip Navigation + Metadata

| Change | Detail |
|--------|--------|
| Skip-nav link | Added `<a href="#main-content">` as **first child** inside `<body>`, before all providers. Uses `sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground` — visually hidden by default, visible and styled on keyboard focus. |
| `id="main-content"` | Added wrapper `<div id="main-content">` around `{children}` inside `TooltipProvider`. All routed content (chat, auth, etc.) renders inside this target. |
| `metadataBase` | Added `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")` to the `metadata` export. Ensures OpenGraph and other metadata URLs resolve correctly. |

### 2. `features/sidebar/components/sidebar-shell.tsx` — Nav Landmark

Wrapped `SidebarHistoryClient` inside `<nav aria-label="Chat history">` within the `<SidebarContent>` block.

**Architectural decision:** The task suggested modifying `components/ui/sidebar.tsx` (the generic `SidebarContent` component). After reviewing usage, `SidebarContent` is a **generic UI primitive** from the shadcn sidebar kit — adding `<nav>` inside it would make it non-generic and semantically incorrect for any future non-navigation use. Since it's only used at one call site (`sidebar-shell.tsx`), the `<nav>` was added **at the call site** where the semantic meaning is clear. This preserves component genericity while achieving the same WCAG compliance.

### 3. `features/chat/components/messages.tsx` — Screen Reader Announcements

| Change | Detail |
|--------|--------|
| `aria-label="Chat messages"` | Added to the outer container (changed from `<div>` to `<section>` per lint recommendation). Creates a labeled region landmark for screen readers. |
| `aria-live="polite"` | Added to the scrollable message list container (`data-testid="messages-list"`). Screen readers will announce new messages as they arrive, after finishing current speech. |

**Element choice:** Used `<section>` instead of `<div role="region">` per Biome's `useSemanticElements` lint rule — semantically equivalent, cleaner HTML.

### 4. `app/robots.ts` — New File

Generates `robots.txt` via Next.js `MetadataRoute.Robots`:
- **Allow:** `/` (all public pages)
- **Disallow:** `/api/*`, `/login`, `/register`
- **Sitemap:** Points to `${NEXT_PUBLIC_APP_URL}/sitemap.xml`

### 5. `app/sitemap.ts` — New File

Generates `sitemap.xml` via Next.js `MetadataRoute.Sitemap`:
- Lists `/` (home/chat page) — the only public route in this application
- Uses `NEXT_PUBLIC_APP_URL` for base URL with `http://localhost:3000` fallback

---

## WCAG Criteria Addressed

| Criterion | Description | Implementation |
|-----------|-------------|----------------|
| **2.4.1** Bypass Blocks (Level A) | Mechanism to bypass repeated navigation | Skip-nav link in `app/layout.tsx` |
| **1.3.1** Info and Relationships (Level A) | Structure conveyed through semantics | `<nav aria-label="Chat history">` landmark on sidebar |
| **4.1.3** Status Messages (Level AA) | Status messages announced by screen readers | `aria-live="polite"` on message list |
| **1.3.1** Info and Relationships (Level A) | Content regions identified | `<section aria-label="Chat messages">` on message container |

---

## SEO Infrastructure

| File | Purpose |
|------|---------|
| `app/robots.ts` | Prevents search engines from indexing `/api/*`, `/login`, `/register` |
| `app/sitemap.ts` | Enables search engine discovery of public pages |
| `metadataBase` in layout | Ensures OpenGraph URLs resolve to correct domain |

---

## Validation

- `pnpm format` — ✅ No fixes needed
- `pnpm lint` — ✅ No issues
- `pnpm typecheck` — ✅ Only pre-existing `playwright.config.ts` error (missing test module, unrelated)

---

## Files Modified

| File | Type |
|------|------|
| `app/layout.tsx` | Modified |
| `features/sidebar/components/sidebar-shell.tsx` | Modified |
| `features/chat/components/messages.tsx` | Modified |
| `app/robots.ts` | **Created** |
| `app/sitemap.ts` | **Created** |

---

## Not Implemented (Out of Scope)

- **Focus trap on artifact panel** (WCAG 2.4.3) — deferred to Scope 6
- **package.json changes** — deferred to Scope 10b
