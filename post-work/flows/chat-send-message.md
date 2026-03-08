FLOW: Send Message (Client-Side → Server → Display)
ENTRY: User types in multimodal-input.tsx textarea and clicks submit or presses Enter

STEPS:
  1. `ControlledMultimodalInput` (features/chat/components/multimodal-input.tsx) →
     `handleSubmit` callback fires → uploads inline file attachments via `uploadFiles()` →
     calls `sendMessage(text, files)` from ChatSessionContext

  2. `useChatSession.sendMessage` (features/chat/hooks/use-chat-session.ts:171-197) →
     Trims input text, gates on `isReadonly` and non-empty →
     If `messages.length === 0` (new chat): calls `onNewChat` callback to notify sidebar (PendingChats) →
     Calls `sdkSendMessage({ text, files })` from AI SDK `useChat` →
     Clears input (`setInput("")`), resets usage state

  3. `useChat` + `DefaultChatTransport` (features/chat/hooks/use-chat-session.ts:91-109) →
     Transport's `prepareSendMessagesRequest` builds request body: `{ id, message: messages.at(-1), selectedChatModel, selectedVisibilityType, settings }` →
     Reads current values from refs (chatModelRef, visibilityRef, settingsRef) for stale-closure safety →
     POSTs to `/api/chat` as SSE stream

  4. **Server**: `POST /api/chat` (app/api/chat/route.ts) →
     See "Chat API Pipeline" flow for full server-side processing →
     Returns `Response` with SSE stream (`JsonToSseTransformStream`)

  5. `useChat.onData` callback (features/chat/hooks/use-chat-session.ts:124-152) →
     Receives SDK data parts as `{ type: 'data-<name>', data: unknown }` →
     Routes by type prefix:
       - `data-artifact-*` → strips prefix, pushes to `setChatStream` (ChatStreamProvider)
       - `data-chat-title` → calls `onTitleUpdate(id, title)` to update sidebar
       - `data-usage` → parses JSON, sets usage state
       - `data-error` → shows toast error

  6. `ChatStreamProvider` (features/chat/components/chat-stream-provider.tsx) →
     RAF-batched state updates: coalesces ~200 SSE deltas/sec → ~60 React updates/sec →
     Accumulated `DataPart[]` array in split context (StateCtx separate from DispatchCtx)

  7. `StreamBridge` (features/chat/components/stream-bridge.tsx) →
     Reads `chatStream` from `useChatStream()` →
     Processes only new deltas (tracks `lastProcessedRef`) →
     Calls `processStreamDelta(delta, currentArtifact)` for each →
     Emits `onArtifactDelta(artifact)` to parent artifact UI

  8. `Messages` component (features/chat/components/messages.tsx) →
     Reads `messages` and `status` from `useChatSessionContext()` →
     Maps each message to memoized `MessageItem` →
     Shows `ThinkingMessage` when `status === "submitted"` (before first token) →
     Last message gets `isLoading=true` when `status === "streaming"`

  9. `ChatMessage` (features/chat/components/message.tsx) →
     Renders message parts: text (with sanitization), files/attachments, tool invocations, reasoning →
     Tool parts dispatch to `ArtifactPreview` (for createArtifact/updateArtifact) or `GenericToolResult` →
     Text parts rendered via `MessageContent` ai-element

  10. `useChat.onFinish` callback (features/chat/hooks/use-chat-session.ts:153-155) →
      Resets chat stream: `setChatStream(() => [])` →
      AI SDK updates `status` from `"streaming"` → `"ready"`

BOTTLENECKS:
  - File upload is sequential (uploadFiles → Promise.all per file, but each file waits for /api/files/upload round-trip before message sends)
  - `useChat.experimental_throttle` (adaptive 50-150ms) intentionally gates UI updates — by design, not waste
  - Sidebar notification (onNewChat) is synchronous within sendMessage — blocks before sdkSendMessage fires

WASTE:
  - `setChatStream` RAF batching allocates a new array on every batch (`[...prev, ...batch]`) — grows linearly with stream length; could use a ref-based ring buffer for long conversations
  - `StreamBridge` processes the full delta array each render via `chatStream.slice(lastProcessedRef.current + 1)` — allocates a new array each time
  - `MessageItem` memo comparison does `fast-deep-equal` on `message.parts` — O(n) per message on every render cycle, though prevented from firing on non-loading messages

SIMPLIFICATION OPPORTUNITIES:
  - File upload could be parallelized with message send (upload files, then re-attach URLs as they resolve) instead of blocking the entire submit
  - `onNewChat` sidebar notification could be deferred to after `sdkSendMessage` returns (non-blocking)
  - The `data-artifact-*` prefix stripping and routing in `onData` could use a lookup map instead of repeated `if` chains

EXIT: Messages rendered in chat view, artifact panel updated via StreamBridge, sidebar title updated, usage stats displayed in ContextDisplay
