# Uncovered Features

> Features from `features.md` or `interactions.md` that do NOT have a fully corresponding task.

---

## All Gaps Resolved

All 4 previously identified gaps have been patched into the plan.

### 1. Reconnection / Resilience — **RESOLVED**

**Resolution:** New task P07-T15 added to `p07-polish.md`. Creates `useConnectionStatus` hook with `navigator.onLine` monitoring, offline toast, and SSE reconnection with exponential backoff (max 3 retries). Chat component updated to disable submit when offline and auto-reconnect dropped streams.

---

### 2. URL Query Auto-Send — **RESOLVED**

**Resolution:** P03-T22 (chat pages) success criteria extended. New chat page reads `?q=` or `?query=` search params via `useSearchParams`; on mount, auto-submits as first message via `useChat.append()`. ~10 lines of `useEffect`.

---

### 3. Credit/Usage Alert UI — **RESOLVED**

**Resolution:** P03-T19 (chat orchestrator) success criteria extended. When `data-usage` stream part indicates credit depletion, the chat orchestrator renders a non-dismissable `AlertDialog` overlay warning the user. Usage state tracked via DataStreamHandler `data-usage` event.

---

### 4. AutoScroll Setting Wire — **RESOLVED**

**Resolution:** P03-T16 (messages list) success criteria extended. `autoScroll` setting from `useSettingsSnapshot` controls FAB behavior and `followOutput` mode; `atBottomThreshold=100`; `followOutput="smooth"` when autoScroll is on, disabled when off.

---

## Summary

| Gap | Severity | Resolution | Task |
|-----|----------|------------|------|
| Reconnection / resilience | Medium | New task | P07-T15 |
| URL query auto-send | Low | Extended | P03-T22 |
| Credit/usage alert UI | Low | Extended | P03-T19 |
| AutoScroll setting wire | Low | Extended | P03-T16 |

**Overall traceability: 20/20 features fully covered (100%). All interaction gaps resolved.**
