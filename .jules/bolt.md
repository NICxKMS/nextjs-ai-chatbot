## 2026-01-26 - SidebarHistory useMemo placement
**Learning:** `SidebarHistory` uses `useSWRInfinite` unconditionally but has early returns for `isLoading` and `!user`. `useMemo` for derived state (like chat grouping) MUST be placed before these early returns to ensure hooks are called in the same order, even though the data might be missing (handle `undefined` checks inside `useMemo`).
**Action:** Always place derived state hooks immediately after data fetching hooks and before conditional returns in components with complex loading states.
