## 2024-05-23 - Unused Context Subscriptions
**Learning:** The `useDataStream` hook triggers re-renders on every streaming chunk. Components like `Messages` and `PreviewMessage` were calling it without using the data, causing massive unnecessary re-renders during generation.
**Action:** Audit all usages of `useDataStream` (and other context hooks) to ensure they are actually consuming the data.
