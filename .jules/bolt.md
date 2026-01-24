## 2024-05-22 - SidebarHistory Memoization
**Learning:** React hooks must be called before any early returns. When optimizing a component with early returns, ensure `useMemo` and other hooks are placed at the top level, even if they depend on data that might trigger an early return (handle nulls inside the hook).
**Action:** Always check for early returns when introducing `useMemo` or `useCallback`.

## 2024-05-22 - Build Artifacts
**Learning:** `tsc` can generate `tsconfig.tsbuildinfo` which should not be committed.
**Action:** Always delete `tsconfig.tsbuildinfo` before submitting or ensure it is in `.gitignore`.
