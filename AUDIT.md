# Code Audit Opportunities

## First Pass

### High Priority

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

### Medium Priority

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

## Second Pass

### High Priority

- [ ] **Restore upload route logger dependency** (`app/(chat)/api/files/upload/route.ts#POST`)

  - **What**: The route imports `@/lib/logger`, but no such module exists in the repo, causing the file to fail at load time and making every upload request respond with a 500.
  - **Why**: The missing dependency suggests a refactor removed the logger without adjusting consumers, leaving the file upload entrypoint broken.
  - **Gains**: Reintroducing a logger (or swapping to `console`) restores the ability to upload attachments and surfaces storage errors cleanly.
  - **Losses if ignored**: Users cannot attach files; Next.js logs module resolution errors on every cold start, masking real runtime issues.

- [ ] **Handle missing documents in DELETE** (`app/(chat)/api/document/route.ts#DELETE`)

  - **What**: Accesses `document.userId` before verifying that `getDocumentsById` returned any rows, so unknown IDs throw and return a 500 rather than a 404.
  - **Why**: The code assumes documents exist; once records expire or IDs are tampered with, the dereference crashes the handler.
  - **Gains**: Guarding the lookup keeps error contracts accurate (404/403) and avoids noisy exception logs.
  - **Losses if ignored**: Automated cleanup or client retries hit 500s, breaking artifact deletion and complicating monitoring.

- [ ] **Null-guard trailing message deletion** (`app/(chat)/actions.ts#deleteTrailingMessages`)

  - **What**: Takes `[message] = await getMessageById({ id })` and immediately dereferences `message.chatId`; missing rows cause the server action to throw.
  - **Why**: Edited or purged messages leave no DB row, yet the UI still calls this action when users retry; the absence should be treated as a no-op.
  - **Gains**: Adding an early return avoids crashing message edits and keeps the UI responsive after history cleanup.
  - **Losses if ignored**: Message editing intermittently fails with opaque 500s whenever the record has already been deleted.

- [ ] **Cap chat history page size** (`app/(chat)/api/history/route.ts#GET`)

  - **What**: Accepts arbitrary `limit` values, so a single request can stream the entire chat table and repeat the work in loops.
  - **Why**: Without server-side validation, clients can accidentally or maliciously request unbounded pages, stressing Postgres and the edge runtime.
  - **Gains**: Enforcing a sane upper bound (e.g., <=100) keeps queries predictable and protects tail latency.
  - **Losses if ignored**: Large limit values will degrade API latency, increase memory pressure, and risk timeouts under load.

### Medium Priority

- [ ] **Preserve live messages when resuming** (`hooks/use-auto-resume.ts#useAutoResume`)

  - **What**: Uses `setMessages([...initialMessages, message])`, which overwrites any client-side messages added after hydration when streams resume.
  - **Why**: The stale snapshot ignores updates from in-flight renders; the updater should merge with current state instead of cloning the initial array.
  - **Gains**: Switching to the functional setter keeps the UI consistent and prevents dropped assistant messages during reconnects.
  - **Losses if ignored**: Conversations can “rewind” after resume, confusing users and leading to duplicated regeneration attempts.

- [ ] **Surface visibility update failures** (`hooks/use-chat-visibility.ts#useChatVisibility`)

  - **What**: Optimistically updates SWR cache but never awaits `updateChatVisibility`; errors leave the UI showing “public” while the DB stays “private.”
  - **Why**: Fire-and-forget server actions hide authorization or persistence failures; clients continue operating on incorrect assumptions.
  - **Gains**: Handling promise rejection allows a rollback toast and keeps sidebar state aligned with server truth.
  - **Losses if ignored**: Users think visibility toggled, but subsequent sessions revert, eroding trust in sharing controls.
