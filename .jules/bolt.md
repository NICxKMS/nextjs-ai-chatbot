## 2024-05-23 - Unused Context Subscription
**Learning:** Components calling a context hook (e.g., `useDataStream()`) without using its return value still subscribe to context updates. If the context updates frequently (like a data stream), this forces the component to re-render on every update, defeating optimizations like `React.memo`.
**Action:** Always verify that context hooks are actually used. If a component only needs to exist within a provider but doesn't consume the data, it shouldn't call the hook.
