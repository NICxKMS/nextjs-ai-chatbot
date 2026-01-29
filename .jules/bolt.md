## 2024-05-22 - [Sidebar History Re-renders]
**Learning:** The SidebarHistory component was re-calculating chat grouping on every render, including unrelated state changes like opening dialogs. This is because the grouping logic was inside the render phase.
**Action:** Extract expensive logic to `lib/` and use `useMemo` to memoize derived state.
