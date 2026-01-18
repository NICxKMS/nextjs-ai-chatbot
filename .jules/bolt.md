## 2026-01-18 - Broken React.memo Implementation
**Learning:** Found a component (`PreviewMessage`) using `React.memo` with a custom comparison function that returned `false` (re-render) by default instead of `true` (skip re-render). This effectively disabled memoization while adding the overhead of the check.
**Action:** When auditing performance, always check the return value of custom `memo` comparators. A fall-through `return false` negates the optimization.
