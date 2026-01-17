## 2024-05-23 - Unused Context Subscriptions Cause Massive Re-renders
**Learning:** The `useDataStream` hook triggers a re-render on every single stream chunk. Components like `Messages` and `PreviewMessage` were importing and calling this hook without using its return value, causing the entire message list to re-render hundreds of times during a response generation.
**Action:** Always verify if a context hook is actually used. If not, remove it to decouple the component from high-frequency updates.
