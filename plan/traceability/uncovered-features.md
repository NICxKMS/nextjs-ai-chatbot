> **Updated per redesign audit (2026-03-01)**

# Uncovered Features

> Features from `features.md` or `interactions.md` that do NOT have a fully corresponding task.
> Reflects redesign: credit/usage alert UI removed (no credit system), task IDs updated.

---

## All Gaps Resolved

3 previously identified gaps have been resolved. 1 gap (Credit/Usage Alert UI) was **removed** because the redesign eliminates all credit/gateway/quota logic.

### 1. Reconnection / Resilience — **RESOLVED**

**Resolution:** SSE reconnection is handled natively by `useChat` built-in SSE lifecycle management + error boundaries. No explicit `navigator.onLine` monitoring or offline toast is required — the Vercel AI SDK's `useChat` hook manages SSE reconnection internally, and route-level error boundaries (P7-T01) handle unrecoverable failures.

> **Redesign note:** Original resolution was P7-T15 (pre-redesign task ID). Per redesign, SSE reconnection is handled natively by `useChat` + error boundaries. Connection resilience (`navigator.onLine` monitoring, offline toast, disabled submit) is **not** included in any task — the redesign does not mandate it, and `useChat` + error boundaries provide sufficient coverage.
>
> <!-- Audit: PO-1 (Wave 2/4) — Removed false claim that P7-T03 includes navigator.onLine monitoring + offline toast. P7-T03 covers ARIA, keyboard nav, and prefers-reduced-motion only. Aligned with final_plan/phase-07-plan.md which says "Removed as standalone task — SSE reconnection handled natively by useChat + error boundary." -->

---

### 2. URL Query Auto-Send — **RESOLVED**

**Resolution:** P3-T25 (chat pages) success criteria extended. New chat page reads `?q=` or `?query=` search params via `useSearchParams`; on mount, auto-submits as first message via `useChat.append()`. ~10 lines of `useEffect`.

---

### 3. Credit/Usage Alert UI — **REMOVED**

**Resolution:** The redesign eliminates all credit/gateway/quota logic (see `../../plan-archives/redesign/cleanup-inventory.md` §1). There is no `data-usage` stream part, no `AppUsage` type, no credit depletion `AlertDialog`. Rate limiting for abuse prevention (50 req/min) uses standard HTTP 429 responses, not a credit system.

---

### 4. AutoScroll Setting Wire — **RESOLVED**

**Resolution:** P3-T17 (messages list) success criteria extended. Auto-scroll handled by `useScrollToBottom` hook. Not a user-facing setting — behavior is automatic during streaming, with manual override via scroll position detection. `atBottomThreshold=100`; `followOutput="smooth"`. Scroll-to-bottom FAB appears when not at bottom.

---

## Summary

| Gap | Severity | Resolution | Task |
|-----|----------|------------|------|
| Reconnection / resilience | Medium | Resolved via `useChat` + error boundaries | Native (useChat) |
| URL query auto-send | Low | Extended | P3-T25 |
| Credit/usage alert UI | — | **REMOVED** (no credit system) | — |
| AutoScroll setting wire | Low | Extended | P3-T17 |

**Overall traceability: 20 tracked features (19 active + 1 removed) with all active features fully covered. Credit/usage alert removed per redesign. All remaining gaps resolved.**
