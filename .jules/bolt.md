# Bolt's Journal

## 2024-05-22 - Unnecessary Context Subscription
**Learning:** React Context is powerful but dangerous. Subscribing to a context that updates frequently (like a data stream) in components that don't need the data causes massive performance degradation due to unnecessary re-renders.
**Action:** Always verify if a component actually uses the data from a hook before leaving it in. If a hook triggers re-renders, it must be essential for that component.
