## 2026-01-28 - [Broken React.memo and Unused Context Subscription]
**Learning:** Found components using `React.memo` where the comparison function defaulted to `return false`, forcing re-renders on every update. Also, components were subscribing to a frequent-update context (`useDataStream`) without using the data, causing re-renders.
**Action:** Always ensure `memo` comparison returns `true` when checks pass. Remove unused hooks that trigger context subscriptions.
