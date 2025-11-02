## bundle-size

- [x] **File:** /app/(chat)/layout.tsx (Layout)
  - Category: bundle-size
  - Severity: critical
  - Description:
      1) Loads the full Pyodide runtime for every visit via a `beforeInteractive` script, adding several megabytes to the initial payload @app/(chat)/layout.tsx#14-30.
      2) Gate the script behind feature detection or lazy loading so only sessions that actually execute Pyodide fetch it.
      3) Reduces baseline JS/download cost while keeping artifact execution intact.
  - Sources (if applicable, from web): <https://nextjs.org/docs/app/building-your-application/optimizing/scripts>

- [x] **File:** /components/text-editor.tsx (Editor)
  - Category: bundle-size
  - Severity: high
  - Description:
      1) Statically imports the full TipTap + math/table toolchain into the primary client bundle, even when the editor is not rendered @components/text-editor.tsx#1-88.
      2) Load the editor subtree with `next/dynamic` (and defer math/table extensions) so it downloads only when an artifact editor is opened.
      3) Shrinks the default interactive bundle and improves first-load interactivity without removing editor capabilities.
  - Sources (if applicable, from web): <https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading>

## render-efficiency

- [x] **File:** /components/data-stream-provider.tsx (DataStreamProvider)
  - Category: render-efficiency
  - Severity: high
  - Description:
      1) Provider state lives at the layout level, so every SSE delta rebuilds the provider value and forces the entire chat shell (sidebar, header, etc.) to re-render @components/data-stream-provider.tsx#22-33.
      2) Constrain the provider to the chat surface or switch to a ref/event-emitter pattern that isolates streaming updates from global layout state.
      3) Keeps sidebar/navigation stable during streaming, reducing unnecessary React work.

- [x] **File:** /components/messages.tsx (Messages)
  - Category: render-efficiency
  - Severity: high
  - Description:
      1) The component subscribes to the data-stream context but never reads its value, so each streaming chunk still retriggers a full message list render @components/messages.tsx#46-118.
      2) Remove the unused subscription or introduce a selector hook so only consumers that need stream data update.
      3) Preserves message rendering while cutting redundant reconciliation during long generations.

- [x] **File:** /components/sidebar-history.tsx (SidebarHistory)
  - Category: render-efficiency
  - Severity: medium
  - Description:
      1) On every render it flattens and re-groups the entire paginated history array, which grows linearly with chat count @components/sidebar-history.tsx#208-322.
      2) Memoize the grouping step (or virtualize the list) so unchanged history pages do not trigger repeated O(n) work.
      3) Improves sidebar responsiveness for heavy users without altering UX.

## performance

- [x] **File:** /components/chat.tsx (Chat)
  - Category: performance
  - Severity: high
  - Description:
      1) Appends each streaming delta by cloning the entire data array (`[...ds, dataPart]`), producing O(n²) copying and GC pressure for long responses @components/chat.tsx#126-133.
      2) Persist stream parts in a ref or incremental buffer so new chunks do not require copying the full history.
      3) Keeps UI streaming smooth under large outputs while maintaining current behavior.

- [x] **File:** /hooks/use-auto-resume.ts (useAutoResume)
  - Category: performance
  - Severity: medium
  - Description:
      1) When the resumable stream fires it rebuilds message state via `[...initialMessages, message]`, repeatedly cloning the static history and risking duplicate inserts @hooks/use-auto-resume.ts#21-52.
      2) Track resumed messages incrementally (e.g., functional updates keyed by message id) so resuming avoids large array copies.
      3) Reduces work when recovering long conversations while preserving auto-resume UX.

## data-fetching

- [x] **File:** /app/(chat)/api/chat/route.ts (POST handler)
  - Category: data-fetching
  - Severity: high
  - Description:
      1) Entitlement checks, chat lookup, and message history fetch run sequentially even though they hit independent tables/services, elongating the request before the model call starts @app/(chat)/api/chat/route.ts#153-212.
      2) Parallelize independent queries (e.g., via `Promise.all`) and defer non-blocking writes with `after()` so the model request begins sooner.
      3) Cuts server latency per prompt without changing rate limits or persistence semantics.

## model-calls

- [x] **File:** /app/(chat)/api/chat/route.ts (streamText invocation)
  - Category: model-calls
  - Severity: high
  - Description:
      1) Converts and forwards the full chat history to the model for every turn, allowing conversations to grow unbounded in token size and latency @app/(chat)/api/chat/route.ts#186-295.
      2) Introduce history windowing (summaries, truncation, or selective replay) to keep prompts within a manageable context envelope.
      3) Preserves answer quality while containing token usage, response time, and Gateway costs.

## streaming

- [x] **File:** /app/(chat)/api/chat/route.ts (stream id persistence)
  - Category: streaming
  - Severity: medium
  - Description:
      1) Writes the stream identifier to the database on the critical path before starting the SSE flow, adding an extra round trip before any bytes flush @app/(chat)/api/chat/route.ts#198-213.
      2) Defer the write with `after()` or batch it with other completion tasks so streaming can begin immediately.
      3) Improves perceived latency while retaining resumable stream support.
