# Bolt's Journal

## 2024-05-22 - DataStream Context Re-renders
**Learning:** React Context updates trigger re-renders in all consuming components, even if they don't use the value.
**Action:** Be careful with `useContext` (or custom hooks wrapping it) in heavy components. If the value isn't used, remove the hook. If only part of the value is used, consider splitting the context or using selectors (if available/applicable).
