## 2024-05-22 - [Derived State in Render]
**Learning:** Found O(N) derived state calculation (`groupChatsByDate`) executing inside `SidebarHistory` render pass via IIFE. This forces recalculation on unrelated state updates (e.g. dialogs).
**Action:** Always wrap expensive derived state (grouping, filtering lists) in `useMemo`. Avoid IIFEs for logic in JSX.
