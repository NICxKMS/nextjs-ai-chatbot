FLOW: Chat Stream State (SSE → RAF Batching → Dispatch → Consumers)
ENTRY: User submits a message via `ChatShell.sendMessage()` → AI SDK initiates SSE connection to `/api/chat`
STEPS:
  1. `useChatSession.sendMessage()` → validates input, calls `onNewChat?()` for pending sidebar entry (if first message), calls `sdkSendMessage({ text })` → AI SDK's `useChat` opens SSE stream via `DefaultChatTransport` to `/api/chat`
  2. `DefaultChatTransport.prepareSendMessagesRequest()` → reads from refs: `chatModelRef.current`, `visibilityRef.current`, `settingsRef.current` → attaches model/visibility/settings to request body (stale-closure safe via refs)
  3. AI SDK SSE events arrive → `useChat.onData(dataPart)` callback fires for each data part → dataPart has shape `{ type: 'data-artifact-id', data: unknown }`
  4. `onData` handler → filters by type prefix:
     - `data-artifact-*` → strips `data-` prefix, wraps as `DataPart` → calls `setChatStream([{ type, content }])` (dispatch to ChatStreamProvider)
     - `data-chat-title` → calls `callbacksRef.current.onTitleUpdate?.(id, title)` → patches pending sidebar entry title
     - `data-usage` → `JSON.parse` → `setUsage(parsed)` (local state)
     - `data-error` → `toast.error(data)` (immediate user feedback)
  5. `setChatStream(arrayValue)` (ChatStreamProvider dispatch) → pushes parts into `pendingRef.current` array → schedules RAF if not already queued (`rafRef.current === null`)
  6. `requestAnimationFrame` fires → drains `pendingRef.current` → calls `setRaw(prev => [...prev, ...batch])` → single React state update for all coalesced deltas
  7. `StateCtx` (ChatStreamProvider state context) updates → `useChatStream()` consumers re-render
  8. `StreamBridge` (renders null) → subscribes via `useChatStream()` → `useEffect` fires on `chatStream` change → slices new deltas from `lastProcessedRef + 1` → processes each through `processStreamDelta(delta, artifactRef.current)` → accumulates artifact state
  9. `processStreamDelta(delta, current)` (pure function) → switch on delta.type:
     - `artifact-id` → SET artifactId, status='streaming', isVisible=true
     - `artifact-title` → SET title
     - `artifact-kind` → SET kind
     - `artifact-clear` → RESET content="", suggestions=[]
     - `artifact-textDelta` → APPEND to content
     - `artifact-codeDelta`/`sheetDelta`/`imageDelta` → REPLACE content
     - `artifact-suggestion` → APPEND to suggestions array
     - `artifact-finish` → SET status='idle'
  10. `StreamBridge.onArtifactDelta(artifact)` → calls `artifactStore.setState(() => artifact)` → module-level store updates → `emitChange()` → all `useSyncExternalStore` subscribers re-render
  11. `useChat.onFinish()` callback → `setChatStream(() => [])` → function updater bypasses RAF batching → immediate state reset → clears accumulated stream deltas
  12. AI SDK internally handles message text streaming via `experimental_throttle` (adaptive: 50ms-150ms based on connection quality) → `messages` array updates → `ChatSessionContext` consumers (Messages, MultimodalInput) re-render
BOTTLENECKS:
  - RAF batching (~16ms coalescing window) introduces 1-frame latency between SSE arrival and React update. This is intentional — coalescing ~200 deltas/sec into ~60 updates/sec.
  - `StreamBridge` processes deltas in a `useEffect` which runs after paint — there's an additional frame of latency between `chatStream` update and artifact store update. Total: SSE → RAF batch (frame 1) → StreamBridge effect (frame 2) → artifact UI (frame 3). Three-frame pipeline.
  - `processStreamDelta` is called in a loop for all new deltas — each creates a new object via spread. For chatty streams with many deltas per frame, this creates GC pressure.
  - `StateCtx` (ChatStreamProvider state) causes ALL `useChatStream()` consumers to re-render on every batched update. Currently only `StreamBridge` subscribes, so impact is minimal.
WASTE:
  - `StreamBridge` is a render-null component that exists solely to bridge React context (ChatStreamProvider) to a module-level store (artifactStore). The indirection of Context → useEffect → store.setState adds a frame of latency vs. directly writing to the store from `onData`.
  - `setChatStream` for array values spreads `pendingRef.current` via push then spreads again in setRaw — double spread allocation per batch.
  - Each `processStreamDelta` call creates a new `UIArtifact` object even for fields that don't change (e.g., `artifact-textDelta` spreads all fields to append to content).
  - The `chatStream` array grows unboundedly during a streaming session — only cleared on `onFinish`. For long generations with hundreds of deltas, this array can grow large.
SIMPLIFICATION OPPORTUNITIES:
  - Eliminate `StreamBridge` entirely by having `useChatSession.onData` write directly to `artifactStore` instead of going through ChatStreamProvider context. This would: (a) remove a React context re-render cycle, (b) cut one frame of latency, (c) eliminate the need for `ChatStreamProvider` entirely (it exists only for this bridge pattern). The `onData` handler already has access to all data — it just needs to call `processStreamDelta` and `artifactStore.setState` directly.
  - If the above is too aggressive, at minimum the `StreamBridge` could use `useRef` + store subscription instead of context to avoid the re-render step.
  - `processStreamDelta` could use an immutable update library or structural sharing to avoid creating new objects when only one field changes.
  - `experimental_throttle` adaptive calculation runs `useMemo(getAdaptiveThrottle, [])` once — connection quality can change during a session. Consider re-evaluating on visibility change or periodically.
EXIT: All stream data is distributed: artifact content flows into `artifactStore` for panel rendering, message text is managed by AI SDK's internal state, chat title patches reach the sidebar via pending chats callbacks, and usage/error data is handled locally. Stream state is cleared on finish.
