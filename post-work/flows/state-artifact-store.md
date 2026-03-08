FLOW: Artifact Store (Module-Level Singleton → useSyncExternalStore → UI)
ENTRY: `StreamBridge.onArtifactDelta(artifact)` or `ChatShell.handleArtifactDelta()` calls `artifactStore.setState(() => artifact)`
STEPS:
  1. `ChatShell` creates stable callback: `handleArtifactDelta = useCallback((artifact) => artifactStore.setState(() => artifact), [])` → passed as `onArtifactDelta` prop to `StreamBridge`
  2. `StreamBridge` processes accumulated deltas via `processStreamDelta()` → calls `onArtifactDelta(artifact)` for each delta → `artifactStore.setState(() => artifact)` replaces store state wholesale
  3. `artifactStore.setState(updater)` → calls `updater(state)` → if `next === state` (same ref), no-ops → otherwise `state = next` → calls `emitChange()`
  4. `emitChange()` → iterates `listeners` Set → calls each listener function → triggers `useSyncExternalStore` re-render check in all subscriber hooks
  5. `useArtifact()` → `useSyncExternalStore(artifactStore.subscribe, artifactStore.getSnapshot, artifactStore.getServerSnapshot)` → returns full `UIArtifact` state + stable `setArtifact` / `resetArtifact` actions → re-renders on ANY state field change
  6. `useArtifactSelector(selector)` → `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` where:
     - `getSnapshot()` caches both the store snapshot AND the derived selection
     - If store snapshot unchanged (`Object.is`), returns cached selection (satisfies useSyncExternalStore contract)
     - If store snapshot changed, runs `selector(nextSnapshot)` → if selected value unchanged (`Object.is`), returns old reference (prevents unnecessary re-render)
     - Example: `useArtifactSelector(s => s.isVisible)` only re-renders when `isVisible` flips, ignoring content/title/status changes
  7. `artifactStore.reset()` → `state = initialArtifactData` → `emitChange()` → all subscribers notified → UI reflects empty/hidden artifact panel
  8. Reset is triggered by: `useChatSideEffects.onChatChange` (on navigation to different chat) → `artifactStore.reset` passed as callback
  9. Server snapshot: `getServerSnapshot()` returns `initialArtifactData` (artifactId="init", isVisible=false) → ensures SSR renders no artifact panel
BOTTLENECKS:
  - `emitChange()` iterates ALL listeners synchronously — if many components subscribe via `useArtifact()`, each listener fires in sequence. However, React batches the resulting state updates, so only one re-render pass occurs.
  - During active streaming, `setState` is called once per processed delta in `StreamBridge` (inside a loop). Each call triggers `emitChange()` → all subscribers are notified per delta, even though multiple deltas may arrive in the same RAF batch. The loop in StreamBridge processes N deltas sequentially with N store updates, but only the last one produces the visible UI state.
WASTE:
  - `StreamBridge` calls `onArtifactDelta(artifact)` inside a loop for each new delta. Each call triggers `artifactStore.setState(() => artifact)` → `emitChange()`. For a batch of 10 deltas, this means 10 store updates and 10 listener notification rounds. Only the final state matters for rendering. The intermediate states are wasted work.
  - `useArtifact()` subscribes to the full `UIArtifact` snapshot — consumers that only need `isVisible` or `status` re-render unnecessarily on content changes during streaming. The `useArtifactSelector` hook exists specifically for this — but usage needs to be verified at each consumer.
  - `stableActions` object in `useArtifact()` is pre-constructed outside the hook (good), but `useArtifact` returns a new object `{ artifact, setArtifact, resetArtifact }` on every call since `artifact` changes — consumers destructure anyway so the wrapper object itself is unnecessary GC.
SIMPLIFICATION OPPORTUNITIES:
  - Batch delta processing in `StreamBridge`: instead of calling `artifactStore.setState` per delta in the loop, accumulate the final artifact state and call `setState` once after the loop. This reduces N store updates to 1 per RAF batch.
  - For consumers that only need to write (e.g., `StreamBridge`), bypass the hook entirely and import `artifactStore.setState` directly — this is already done in `ChatShell` and `useChatSideEffects`.
  - The `useArtifactSelector` memoization pattern (prevSnapshotRef + prevSelectionRef) could be simplified if React's built-in `Object.is` comparison were relied upon — but the manual cache ensures the `useSyncExternalStore` contract is satisfied without relying on React internals.
  - Consider whether `useArtifact()` should even exist vs. making `useArtifactSelector` the only hook. `useArtifact()` is `useArtifactSelector(s => s)` with extra write methods attached — the write methods are already module-level stable functions.
EXIT: UI components (`ArtifactPanel`, `ArtifactActions`, `ArtifactPreview`, etc.) reflect the current artifact state. Artifact panel shows/hides based on `isVisible`, content renders based on `kind`, and streaming status controls loading indicators. On chat change, store resets to initial state.
