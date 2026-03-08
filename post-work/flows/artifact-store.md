FLOW: Artifact Store
ENTRY: Any call to `artifactStore.setState()` or `artifactStore.reset()`

STEPS:
  --- STORE INTERNALS ---

  1. `artifactStore` (features/artifacts/lib/artifact-store.ts) — module-level singleton:
     - `state: UIArtifact` — single mutable variable holding current state
     - `listeners: Set<() => void>` — subscriber callbacks
     - No React context, no SWR, no provider required

  2. State shape (`UIArtifact` from lib/types/artifact.types.ts):
     ```
     {
       artifactId: string        // "init" → no artifact loaded
       title: string
       kind: ArtifactKind        // "text" | "code" | "sheet" | "image"
       content: string
       isVisible: boolean
       status: ArtifactStatus    // "idle" | "streaming"
       suggestions?: ArtifactSuggestion[]
       boundingBox?: BoundingBox  // for panel open animation
     }
     ```

  3. Initial state (`initialArtifactData` from features/artifacts/types/artifact.types.ts):
     - `artifactId: "init"`, `title: ""`, `kind: "text"`, `content: ""`, `isVisible: false`, `status: "idle"`
     - No suggestions, no boundingBox

  --- WRITE PATH ---

  4. `artifactStore.setState(updater: (prev: UIArtifact) => UIArtifact)`:
     - Calls `updater(state)` → gets `next`
     - If `next === state` (same reference) → early return, NO emit (no-op optimization)
     - Otherwise: `state = next` → `emitChange()`

  5. `artifactStore.reset()`:
     - `state = initialArtifactData` → `emitChange()`
     - Called on chat navigation (`useChatSideEffects.onChatChange`)

  6. `emitChange()`:
     - Iterates `listeners` Set → calls each listener callback
     - Listeners are synchronous — all subscribers notified in the same microtask

  --- WRITE CALLERS ---

  7. Writers and what they write:
     | Caller | Method | What it writes |
     |--------|--------|----------------|
     | `StreamBridge.onArtifactDelta` | `setState(() => artifact)` | Full UIArtifact from processStreamDelta (wholesale replace) |
     | `ArtifactCloseButton` | `setState(prev => ({ ...prev, isVisible: false }))` | Toggles visibility, preserves all other state |
     | `ArtifactPreview HitboxLayer` | `setState(prev => ({ ...prev, artifactId, title, kind, isVisible: true, boundingBox }))` | Opens panel with metadata + animation origin |
     | `ArtifactPreview CompactToolResult` | `setState(prev => ({ ...prev, artifactId, kind, title, content: "", isVisible: true, boundingBox }))` | Same as hitbox but also clears content |
     | `ArtifactPreview bounding box effect` | `setState(current => ({ ...current, boundingBox }))` | Updates animation origin rect (with shallow equality check) |
     | `ArtifactPanel version sync effect` | `setArtifact(prev => ({ ...prev, content: latestContent }))` | Syncs store content with latest version data |
     | `useChatSideEffects.onChatChange` → `artifactStore.reset()` | `reset()` | Resets to initialArtifactData on chat navigation |

  --- READ PATH ---

  8. `useArtifact()` hook (features/artifacts/hooks/use-artifact.ts):
     - `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
     - Returns `{ artifact: UIArtifact, setArtifact, resetArtifact }` — full state + stable action refs
     - `stableActions` extracted outside hook — `{ setArtifact: artifactStore.setState, resetArtifact: artifactStore.reset }` — never reallocated
     - Re-renders component on ANY state change (no selector — gets full UIArtifact)

  9. `useArtifactSelector<T>(selector)` hook (features/artifacts/hooks/use-artifact-selector.ts):
     - `useSyncExternalStore` with custom `getSnapshot`:
       a. Gets raw snapshot from `artifactStore.getSnapshot()`
       b. If same snapshot reference as last call → returns cached selection (satisfies contract)
       c. Applies `selectorRef.current(nextSnapshot)` → derived value
       d. If derived value unchanged (`Object.is`) → returns previous selection (prevents re-render)
     - Uses refs for caching: `prevSnapshotRef`, `prevSelectionRef`
     - SSR: `getServerSnapshot` → `selector(initialArtifactData)`

  10. Selector consumers (read-only subscriptions):
      | Component | Selector | Purpose |
      |-----------|----------|---------|
      | `ArtifactActions` | `s => s.status` | Disable buttons during streaming |
      | `ArtifactActions` | `s => s.content` | Provide content to action handlers |
      | `ArtifactPreview` | `s => s.isVisible` | Toggle between preview and compact card |
      | `ArtifactPreview` | `s => s.status` | Show loading indicators |
      | `ArtifactPreview` | `s => s.content` | Display streaming content |
      | `ArtifactPreview` | `s => s.title` | Show title |
      | `ArtifactPreview` | `s => s.kind` | Switch editor type |
      | `VersionFooter` | `s => s.artifactId` | Embed in restore request |

  11. Full-state consumers (via `useArtifact()`):
      | Component | Usage |
      |-----------|-------|
      | `ArtifactPanel` | Reads full state for rendering + writes content sync |
      | `ArtifactPreview HitboxLayer` | Reads for streaming check + writes to open panel |

EXIT: State change propagates synchronously to all subscribed components via useSyncExternalStore, triggering targeted re-renders

BOTTLENECKS:
  - Step 6 (synchronous emit): All listeners fire synchronously. If there are many subscribers (e.g., multiple ArtifactPreview instances in a chat with many artifacts), each store update triggers all of them.
  - Step 4 (no batching): Each `setState` call immediately emits. During streaming, StreamBridge calls `setState` for every processed delta. React batches the resulting re-renders, but the store emits N times for N deltas in a RAF frame.

WASTE:
  - Step 7 (StreamBridge wholesale replace): `setState(() => artifact)` — creates a new function on every call. The function ignores `prev` entirely. Could use `setState` with the object directly if the API supported it, but the updater pattern ensures consistency.
  - Step 10 (multiple selectors in ArtifactPreview): ArtifactPreview uses 5 separate `useArtifactSelector` calls. Each one subscribes independently and caches independently. A single selector returning a tuple `{ isVisible, status, content, title, kind }` would be more efficient but would re-render on any change to these 5 fields.
  - Step 8 (useArtifact full state): Components using `useArtifact()` re-render on ANY state change, including irrelevant fields. ArtifactPanel genuinely needs everything, but HitboxLayer could use a selector instead.

SIMPLIFICATION OPPORTUNITIES:
  - StreamBridge could batch multiple deltas into a single `setState` call — it already processes all new deltas in a loop, but calls `onArtifactDelta` (which calls `setState`) for each one. Instead, accumulate the final state across all deltas and emit once.
  - ArtifactCloseButton's direct `artifactStore.setState` call (bypassing hooks) is an intentional optimization — no subscription. This pattern could be documented as a recommended pattern for write-only consumers.
  - Consider adding a `getBatch()` API to the store that defers `emitChange()` until a batch is complete. This would help StreamBridge avoid N emissions per frame.
