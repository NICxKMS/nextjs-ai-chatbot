## 2024-03-24 - Unnecessary Context Subscription
**Learning:** `useDataStream` triggers re-renders on every streaming chunk. Components that don't use the data stream should not call this hook.
**Action:** Always check if a hook that consumes context is actually providing used data. Remove if unused.
