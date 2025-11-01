# Code Audit Opportunities

## High Priority

- [x] **Stabilize resumable stream context reuse** (`app/(chat)/api/chat/route.ts#getStreamContext` / `POST`)  
  - **What**: A module-level `globalStreamContext` caches a `createResumableStreamContext({ waitUntil: after })` instance even though `after` is request-scoped.  
  - **Why**: Sharing this context across requests breaks the isolation Next.js expects for edge workers, letting later requests reuse an `after` tied to an earlier request.  
  - **Gains**: Restoring request-local contexts prevents background tasks from failing to flush and keeps resumable streams reliable under concurrent traffic.  
  - **Losses if ignored**: Stream resumption can intermittently fail or leak unfinished async work, degrading reliability and making production incidents hard to trace.

- [x] **Fix `Messages` memoization regression** (`components/messages.tsx#Messages`)  
  - **What**: The comparator always returns `false` and the component subscribes to `useDataStream()` without using its value, so every delta forces a full re-render.  
  - **Why**: The intention was to skip renders when props are unchanged, but the equality check compares different shapes and the unused hook keeps the component “dirty.”  
  - **Gains**: Restoring effective memoization lowers render churn during streaming, reducing jank and CPU usage on long conversations.  
  - **Losses if ignored**: Users experience choppy scroll performance as every token triggers a rerender of the entire message list.

- [x] **Repair `Artifact` memo guard** (`components/artifact.tsx#Artifact`)  
  - **What**: The memo equality compares `prevProps.messages` to `nextProps.messages.length`, guaranteeing inequality and forcing re-renders.  
  - **Why**: This typo eliminates the value of wrapping the artifact pane in `memo`.  
  - **Gains**: Correct comparisons allow heavy artifact UI (animations, editors) to skip redundant reconciliation when stream data is unchanged.  
  - **Losses if ignored**: Artifact view keeps re-rendering during every chat tick, which is expensive and worsens UI responsiveness.

- [x] **Reset accumulated `dataStream` buffer** (`components/chat.tsx#Chat`)  
  - **What**: `setDataStream` appends every `dataPart` to state without ever trimming or resetting after `data-finish`.  
  - **Why**: The array grows indefinitely while `DataStreamHandler` reprocesses larger slices, increasing work per render.  
  - **Gains**: Clearing the buffer after each completion bounds memory usage and keeps per-message processing constant.  
  - **Losses if ignored**: Sessions with many generations will consume more memory and slow down artifact updates due to repeated slicing of large arrays.

## Medium Priority

- [x] **Lazy-load Pyodide tooling** (`app/(chat)/layout.tsx#Layout`)  
  - **What**: Every chat page eagerly loads `https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js` with `beforeInteractive`.  
  - **Why**: Pyodide is ~7 MB; forcing it on initial load delays first paint even when users never open artifact editors that need it.  
  - **Gains**: Deferring to an on-demand loader or dynamic import shrinks the critical bundle and improves TTFB/FCP across devices.  
  - **Losses if ignored**: Mobile and low-bandwidth users pay the Pyodide cost upfront, making the app feel sluggish before any chat appears.

- [x] **Harden fetch error parsing** (`lib/utils.ts#fetcher`, `fetchWithErrorHandlers`)  
  - **What**: Both helpers assume error responses are JSON with `{ code, cause }`; HTML or empty bodies throw `SyntaxError`, masking original HTTP status.  
  - **Why**: Upstream providers or proxies often return plain text or HTML, and the current implementation turns those into unrelated parsing errors.  
  - **Gains**: Defensive parsing keeps the original status / message observable, simplifying debugging and improving DX for API failures.  
  - **Losses if ignored**: Support teams chase red herrings (JSON parse errors) instead of the true upstream failure, slowing incident resolution.
