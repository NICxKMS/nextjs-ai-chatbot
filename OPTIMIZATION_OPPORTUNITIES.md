# Optimization Opportunities

## Streaming

- [X] **File:** /app/(chat)/api/chat/route.ts (POST)
  - Category: streaming
  - Severity: high
  - Description:
    1) Creating a new chat awaits `generateTitleFromUserMessage` before starting the main response, forcing an extra model call that delays first-token streaming. @app/(chat)/api/chat/route.ts#205-220 @app/(chat)/actions.ts#19-44
    2) Defer title generation off the critical path (e.g., run after the assistant response begins or finalize in the background) so the chat stream can start immediately.
    3) This keeps UX intact while cutting perceived latency for first messages.
- [X] **File:** /app/(chat)/api/chat/route.ts (POST)
  - Category: streaming
  - Severity: medium
  - Description:
    1) `onFinish` waits for TokenLens enrichment and re-resolves the model before completing the stream, extending tail latency and SSE teardown time. @app/(chat)/api/chat/route.ts#367-399
    2) Parallelize or defer usage enrichment so the stream can close promptly, emitting the usage payload via follow-up update when ready.
    3) Reduces end-of-stream stalls while preserving the same telemetry data for the UI.

## Data-Fetching

- [X] **File:** /app/(chat)/api/chat/route.ts (POST)
  - Category: data-fetching
  - Severity: high
  - Description:
    1) Every request loads the entire chat transcript from the database and only then trims it in application code, amplifying I/O for large histories. @app/(chat)/api/chat/route.ts#187-227 @app/(chat)/api/chat/route.ts#93-111 @lib/db/queries.ts#254-266
    2) Push the windowing logic into the SQL query (e.g., limit & order) or maintain a lightweight recent-history view to avoid over-fetching.
    3) Cuts database read volume and lowers request CPU while keeping model context identical.
- [X] **File:** /app/(chat)/api/chat/[id]/stream/route.ts (GET)
  - Category: data-fetching
  - Severity: medium
  - Description:
    1) Resume logic fetches the full message list just to inspect the last assistant reply when a resumable stream is missing, adding unnecessary load on long chats. @app/(chat)/api/chat/[id]/stream/route.ts#79-108 @lib/db/queries.ts#254-266
    2) Query only the most recent assistant message (or cache the last message metadata) before deciding whether to replay it.
    3) Lowers database pressure and speeds up reconnection without changing the restoration behavior.

## Render-Efficiency

- [X] **File:** /components/data-stream-provider.tsx (DataStreamProvider)
  - Category: render-efficiency
  - Severity: high
  - Description:
    1) Each streamed chunk increments `version`, forcing the entire provider subtree to re-render even when consumers only need append-only access. @components/data-stream-provider.tsx#29-56
    2) Decouple mutation tracking from React state (e.g., event emitters or batched markers) so consumers can read the ref without whole-tree renders per token.
    3) Dramatically reduces client render thrash during long generations while keeping the streaming API intact.
- [X] **File:** /components/chat.tsx (Chat)
  - Category: render-efficiency
  - Severity: medium
  - Description:
    1) The component re-creates the transport, tool callbacks, and several closures on every render, and then passes them deep into memoized children, undermining memoization benefits. @components/chat.tsx#98-198
    2) Stabilize these dependencies (memoize transports/callbacks or lift them out) to prevent avoidable re-render cascades in Messages, Artifact, and input areas.
    3) Improves responsiveness on client devices without altering chat behavior or API usage.

## Bundle-Size

- [X] **File:** /components/artifact.tsx (Artifact)
  - Category: bundle-size
  - Severity: high
  - Description:
    1) The component eagerly imports all artifact client bundles (code editors, sheet tooling, etc.), pulling large editor libraries into the initial chat chunk even when artifacts are never opened. @components/artifact.tsx#15-38
    2) Switch to dynamic imports or provider-specific code-splitting so heavy editors load only when the artifact pane becomes visible.
    3) Shrinks the primary chat bundle and speeds up hydration while preserving artifact capabilities.
- [X] **File:** /components/chat.tsx (Chat)
  - Category: bundle-size
  - Severity: medium
  - Description:
    1) `Chat` statically imports the Artifact drawer and its dependencies, ensuring they ship with the main chat route despite being optional UI. @components/chat.tsx#30-34 @components/chat.tsx#283-301
    2) Lazy-load the Artifact shell (and other rarely used panels) so the core chat experience hydrates with minimal JavaScript.
    3) Keeps artifact functionality reachable while cutting default route payload size.

## Model-Calls

- [X] **File:** /app/(chat)/api/chat/route.ts (POST)
  - Category: model-calls
  - Severity: medium
  - Description:
    1) The handler re-resolves `myProvider.languageModel(selectedChatModel)` multiple times per request, re-wrapping reasoning middleware and repeating provider auth work. @app/(chat)/api/chat/route.ts#329-374 @lib/ai/providers.ts#38-84
    2) Cache the resolved model instance per request so downstream logic shares the same wrapper and metadata.
    3) Decreases per-call overhead—especially for reasoning models—without altering model outputs.
- [X] **File:** /app/(chat)/api/chat/route.ts (POST)
  - Category: model-calls
  - Severity: medium
  - Description:
    1) Tool factories (`createDocument`, `updateDocument`, etc.) run eagerly for every request, even when the selected model has no tool capability, doing redundant setup work. @app/(chat)/api/chat/route.ts#338-351 @app/(chat)/api/chat/route.ts#60-77
    2) Instantiate tool handlers only when `getEnabledTools` elects to expose them.
    3) Reduces server work and cold-start cost while preserving tool behavior for capable models.

## Performance

- [X] **File:** /components/multimodal-input.tsx (MultimodalInput)
  - Category: performance
  - Severity: medium
  - Description:
    1) The local input mirror writes to `localStorage` on every keystroke, introducing synchronous storage I/O that can lag low-end devices. @components/multimodal-input.tsx#106-126
    2) Buffer or debounce persistence (or move to sessionStorage with batching) instead of committing on each input event.
    3) Maintains draft recovery while smoothing typing performance.

## Architecture

- [X] **File:** /components/data-stream-provider.tsx (DataStreamProvider)
  - Category: architecture
  - Severity: medium
  - Description:
    1) Stream parts accumulate indefinitely in a ref with no eviction, so long chat sessions can retain every SSE payload on the client. @components/data-stream-provider.tsx#29-55
    2) Introduce retention policies (size/time caps or on-consume pruning) to bound client memory without breaking resumable replay.
    3) Prevents runaway memory growth during marathon conversations while keeping recovery semantics the same.
