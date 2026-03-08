FLOW: Streaming Render
ENTRY: User submits a message → useChatSession.sendMessage() → SSE stream begins

STEPS:
  1. **Immediate render** (before any streaming):
     → `ChatShell` renders on page load with these immediate children:
       a. `ChatHeader` — fully rendered (no async, reads from context)
       b. `Messages` — renders all initialMessages (or Greeting for new chat)
       c. `MultimodalInput` — rendered if !isReadonly
       d. `StreamBridge` — renders null, subscribes to ChatStreamProvider
       e. `ArtifactPanel` — dynamic import (NOT loaded until artifact opens)

  2. **What is deferred behind Suspense**:
     OUTER Suspense (ChatLayout): `ChatLayoutShell` → sidebar cookie + data fetch
       → Fallback: `ChatLayoutFallback` with SidebarSkeleton — children still render
     INNER Suspense (ChatLayoutShell): `SidebarShell` → session + chat history
       → Fallback: `SidebarSkeleton` — main content still visible
     VoteResolver Suspense: `votesPromise` resolution
       → Fallback: null — chat renders with empty votes
     NoticeHandler Suspense: `useSearchParams()` suspension
       → Fallback: null

  3. **What blocks rendering entirely**:
     → `app/(chat)/page.tsx` (NewChatPage): `await Promise.all([searchParams, availableModels, getDefaultModel()])`
       - Blocks behind `(chat)/loading.tsx` skeleton
     → `app/(chat)/chat/[id]/page.tsx` (ExistingChatPage): `await chatPageStatePromise` + `await Promise.all([messages, models])`
       - Blocks behind `(chat)/chat/[id]/loading.tsx` skeleton
     → These are the ONLY blocking awaits — everything else is streamed or deferred

  4. **Message submission flow**:
     → User types in `PromptInputTextarea` → onChange → `setInput(value)` on context
     → User submits → `ControlledMultimodalInput.handleSubmit(message)`:
       a. If files attached: `uploadFiles(files)` → each file uploaded to `/api/files/upload`
       b. `sendMessage(text, files)` → calls `useChatSession.sendMessage()`
     → `useChatSession.sendMessage()`:
       a. If `messages.length === 0` (new chat): `onNewChat({ id, title: text.slice(0,50), visibility, createdAt })`
         → Adds optimistic entry to PendingChatsProvider → appears in sidebar immediately
       b. Calls `sdkSendMessage({ text, files? })` → AI SDK useChat.sendMessage
       c. `setInput("")` + `setUsage(undefined)` — clear input immediately
       d. AI SDK creates POST to `/api/chat` with transport body:
         ```json
         {
           "id": chatId,
           "message": lastMessage,
           "selectedChatModel": chatModelRef.current,
           "selectedVisibilityType": visibilityRef.current,
           "settings": settingsRef.current
         }
         ```

  5. **SSE stream processing** (AI SDK handles the ReadableStream):
     → `useChat` receives SSE chunks → throttled at `experimental_throttle` (adaptive: 50-150ms)
     → `onData(dataPart)` callback fires for each data part:
       - `data-artifact-*` parts → `setChatStream([{ type, content }])` → ChatStreamProvider
       - `data-chat-title` → `callbacksRef.current.onTitleUpdate(id, title)` → PendingChats.patch
       - `data-usage` → `setUsage(JSON.parse(data))` — token usage stats
       - `data-error` → `toast.error(data)` — show error toast
     → Messages state updates at throttled rate → Messages component re-renders

  6. **ChatStreamProvider RAF batching**:
     → `setChatStream` receives DataPart arrays:
       - Function updaters (resets) → bypass batching, update immediately
       - Array values → accumulated in `pendingRef.current`
       - `requestAnimationFrame` coalesces pending parts → single `setRaw` per frame
       - ~200 SSE deltas/sec → ~60 React state updates/sec

  7. **StreamBridge processing** (renders null):
     → `useChatStream()` → reads chatStream state (triggers re-render on change)
     → `useEffect` processes new deltas (skips already-processed via `lastProcessedRef`):
       - For each new delta: `processStreamDelta(delta, artifactRef.current)` → updated UIArtifact
       - Calls `onArtifactDelta(artifact)` → `artifactStore.setState(() => artifact)`
       - This is a WHOLESALE state replacement — StreamBridge accumulates deltas

  8. **ArtifactPanel loading** (code-split, SSR=false):
     → When `artifactStore.setState` makes `artifact.isVisible = true`:
       - `useArtifact().artifact.isVisible` triggers in ArtifactPanel
       - Dynamic import chunk loaded on demand
       - Panel slides in with spring animation (stiffness: 300, damping: 30)
       - SWR fetches version data: `GET /api/artifact?id={artifactId}`

  9. **Messages re-render during streaming**:
     → `messages` array grows as AI SDK receives text/tool parts
     → `status` changes: `"ready"` → `"submitted"` → `"streaming"` → `"ready"`
     → During `"submitted"`: `<ThinkingMessage />` skeleton shown
     → During `"streaming"`: last message gets `isLoading={true}`
       - MessageItem is memo'd with `fast-deep-equal` on `message.parts`
       - Previous messages skip re-render (parts unchanged)
       - Only last message re-renders as new parts arrive
     → `useScrollToBottom()` auto-scrolls as content grows (IntersectionObserver sentinel)

  10. **Stream completion**:
      → `onFinish()` callback: `setChatStream(() => [])` — clears stream buffer
      → Status returns to `"ready"`
      → Messages finalized in useChat internal state
      → URL updated (new chat): `window.history.replaceState({}, "", /chat/${id})`
      → Token usage (`usage` state) displayed in ContextDisplay

RENDER TIMELINE:
  ```
  T=0ms    User clicks submit
  T=0ms    Input clears, optimistic sidebar entry appears
  T=0ms    Status → "submitted", ThinkingMessage shows
  T=50ms   First SSE chunk arrives, Status → "streaming"
  T=50ms   ThinkingMessage replaced by streaming message content
  T=50ms+  SSE chunks arrive at ~200/sec
  T=16ms   RAF batching coalesces artifact deltas per frame
  T=50-150ms  useChat throttle coalesces text updates
  T=varies Artifact panel opens if createArtifact tool invoked
  T=end    Stream completes, onFinish fires, buffer cleared
  T=end    URL updated (new chats only)
  ```

BOTTLENECKS:
  - **File upload before submit**: `uploadFiles()` uploads each file sequentially via `Promise.all` to `/api/files/upload`. Large files or slow networks delay the actual message send.
  - **useChat throttle**: Adaptive 50-150ms throttle means there's intentional delay between SSE arrival and DOM update. On slow connections (3g), this is 150ms — users may perceive lag.
  - **StreamBridge processes ALL deltas in useEffect**: If chatStream accumulates rapidly, the useEffect runs on every state change (after RAF batching), processing the batch. This is O(n) per batch.
  - **ArtifactPanel dynamic import**: First artifact render requires loading the code-split chunk — network round-trip for the chunk + parse + render. Cold cache penalty ~100-500ms.

WASTE:
  - `StreamBridge` subscribes to `useChatStream()` even when no artifacts are being streamed — most messages don't involve artifacts. The component re-renders on every chatStream change even if no artifact-* parts are present.
  - `ChatStreamProvider` accumulates ALL data parts (not just artifact ones) in state, but `useChatSession.onData` only pushes artifact-* parts to it. The filtering happens at the writer level, which is correct — but the naming suggests it handles all stream data.
  - Token usage is parsed from a JSON string (`data-usage`) — could be structured data directly from the server.

SIMPLIFICATION OPPORTUNITIES:
  - StreamBridge could skip processing entirely if `chatStream` contains no new items (already does this via `lastProcessedRef`), but the component still re-renders to check — a `useMemo` or `useRef` comparison before the effect could avoid this.
  - The `onNewChat` callback creates a PendingChat with `title: text.slice(0, 50)` as a placeholder, then `onTitleUpdate` replaces it when the server generates the real title. If the title arrives quickly, users see a flash of truncated text → real title.
  - `handleArtifactDelta` uses `useCallback` with empty deps and calls `artifactStore.setState(() => artifact)` — the wrapping function is unnecessary; `artifactStore.setState` is already stable.

EXIT: Message is fully rendered in the chat with:
  - All text, reasoning, tool, and attachment parts visible
  - Artifact panel open if artifact was created/updated
  - Token usage displayed in ContextDisplay
  - URL updated to `/chat/{id}` for new chats
  - Sidebar chat entry title updated with server-generated title
  - Stream buffer cleared, status back to "ready"
