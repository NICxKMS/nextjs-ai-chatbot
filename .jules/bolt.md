# Bolt's Journal

## 2024-05-23 - Broken React.memo Implementation
**Learning:** Found a critical anti-pattern in `React.memo` usage where the comparison function returns `false` (re-render) even when all equality checks pass. This makes the expensive deep equality checks completely wasted overhead, as the component re-renders anyway.
**Action:** Always verify the return value of custom `memo` comparison functions. If checks pass, it MUST return `true`. Also ensure all primitive props are checked before expensive deep comparisons.
