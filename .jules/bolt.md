## 2024-05-23 - Broken React.memo Implementation
**Learning:** `React.memo` comparison function should return `true` when props are equal. The codebase contained an anti-pattern where it returned `false` by default, effectively disabling memoization while keeping the overhead.
**Action:** When using `React.memo` with a custom comparison function, ensure the default/fall-through return value is `true` (skip render) if all specific difference checks pass.
