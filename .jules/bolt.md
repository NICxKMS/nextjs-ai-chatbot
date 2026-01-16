## 2026-01-16 - Unnecessary Context Subscription
**Learning:** `useDataStream()` triggers re-renders on every chunk because it consumes a context that updates frequently. Components using it just for side-effects or not using it at all pay a heavy performance price.
**Action:** Audit context consumers in high-frequency update paths (like streaming) and ensure only components that actually render the data are subscribed.
