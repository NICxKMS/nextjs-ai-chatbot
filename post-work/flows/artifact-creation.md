FLOW: Artifact Creation
ENTRY: AI model invokes `createArtifact` tool during chat streaming (app/api/chat/route.ts)

STEPS:
  1. `app/api/chat/route.ts` → Side-effect import `@/features/artifacts/handlers` at module load registers all 4 handlers into `lib/ai/artifact-handlers.ts` Map → handlers ready
  2. `app/api/chat/route.ts POST` → `createUIMessageStream({ execute })` creates a stream writer → `chatStream: ArtifactStreamWriter` wraps `writer.write` prefixing types with `data-`
  3. `buildChatTools()` (features/chat/lib/chat-route.ts:219) → calls `createArtifactTool({ session, chatStream, chatId })` → returns AI SDK `tool()` instance
  4. AI model decides to call `createArtifact` tool with `{ title, kind }` (kind: "text" | "code" | "sheet")
  5. `createArtifactTool.execute` (features/chat/lib/tools/create-artifact.ts:48) → generates `id` via `generateUUID()`
  6. `writeArtifactCreatePrelude(chatStream, { id, title, kind })` (artifact-tool-utils.ts:85-89) → writes 4 data parts sequentially:
     - `{ type: "artifact-kind", content: kind }`
     - `{ type: "artifact-id", content: id }`
     - `{ type: "artifact-title", content: title }`
     - `{ type: "artifact-clear", content: "" }` (resets content for create)
  7. `getArtifactHandler(kind)` (lib/ai/artifact-handlers.ts:43) → Map lookup → returns handler
  8. `handler.create({ id, title, kind, chatId, session, chatStream })` → delegates to kind-specific handler:
     - **text**: `streamText()` with smoothStream → `collectTextStreamDeltas()` → writes `artifact-textDelta` parts (APPEND: each delta is a word chunk)
     - **code**: `streamObject({ schema: codeSchema })` → `collectReplacingObjectStream()` → writes `artifact-codeDelta` parts (REPLACE: each delta is full code so far)
     - **sheet**: `streamObject({ schema: csvSchema })` → `collectReplacingObjectStream()` → writes `artifact-sheetDelta` parts (REPLACE: each delta is full CSV so far)
  9. Handler returns final `content: string` → `ensureArtifactContent(content, "create")` validates non-empty (throws `ai_error:artifact:empty_output` if empty)
  10. `saveArtifactVersion({ id, title, content, kind, userId, chatId })` (lib/data/artifact.ts:82) → `db.insert(artifacts).values(...).returning()` → new row with composite PK (id + createdAt)
  11. `writeArtifactFinish(chatStream)` → writes `{ type: "artifact-finish", content: "" }`
  12. Tool returns `{ id, title, kind, content: 'Created artifact: "<title>"' }` → AI SDK includes in response

  --- CLIENT-SIDE PIPELINE ---

  13. `useChatSession.onData` (features/chat/hooks/use-chat-session.ts:125) → receives `data-artifact-*` SSE events → strips `data-` prefix → dispatches `DataPart` to `setChatStream()`
  14. `ChatStreamProvider` (features/chat/components/chat-stream-provider.tsx:43) → RAF-batches incoming parts → coalesces ~200 SSE/sec → ~60 React updates/sec → updates `chatStream` state
  15. `StreamBridge` (features/chat/components/stream-bridge.tsx:28) → reads `chatStream` via context → processes unprocessed deltas via `processStreamDelta()`
  16. `processStreamDelta()` (features/chat/lib/process-stream-deltas.ts:40) → pure reducer applies each delta:
     - `artifact-kind` → sets `kind`
     - `artifact-id` → sets `artifactId`, `status: "streaming"`, `isVisible: true`
     - `artifact-title` → sets `title`
     - `artifact-clear` → resets `content: ""`, `suggestions: []`
     - `artifact-textDelta` → APPENDS to `content`
     - `artifact-codeDelta` / `artifact-sheetDelta` → REPLACES `content`
     - `artifact-finish` → sets `status: "idle"`
  17. `StreamBridge.onArtifactDelta` callback → `artifactStore.setState(() => artifact)` → replaces store state wholesale
  18. `artifactStore.emitChange()` → notifies all `useSyncExternalStore` subscribers
  19. `ArtifactPanel` (lazy-loaded via `dynamic()`, SSR=false) → `useArtifact()` re-renders with new state → panel becomes visible (isVisible=true), AnimatePresence animates in
  20. `ArtifactPanelEditor` → switches on `kind` → renders lazy editor (TextEditor / CodeEditor / SheetEditor) via `editors/lazy.ts` dynamic imports
  21. Editor receives `content` + `status: "streaming"` → displays content as it streams in
  22. On `artifact-finish` → `status: "idle"` → SWR key activates (`/api/artifact?id=<id>`) → fetches versions from GET endpoint → syncs version list

EXIT: Artifact visible in panel with streamed content, persisted to DB with version, SWR cache populated with version data

BOTTLENECKS:
  - Step 9-10 (saveArtifactVersion): DB write blocks the stream's execute callback — `artifact-finish` cannot be sent until INSERT completes. All streaming is done, but the final signal and tool return wait on DB.
  - Step 22 (SWR fetch after finish): After streaming completes, an additional GET request fetches versions. This is a waterfall — the panel has the content already from streaming but must wait for the API to confirm the persisted version for the version footer.
  - Step 14 (RAF batching): Batching introduces up to 16ms latency per frame. Under heavy delta throughput (code/sheet REPLACE), each frame delivers one large state update.

WASTE:
  - Step 16-17: `processStreamDelta` creates a new UIArtifact object on EVERY delta (spread operator). For text streaming (many small word chunks), this means hundreds of object allocations. The store then replaces state wholesale each time.
  - Step 22: SWR re-fetch of version data is partially redundant — the client already has the content from the stream. The fetch exists to get `createdAt` timestamps and version count, not content.
  - Step 6: `writeArtifactCreatePrelude` sends 4 separate data parts (kind, id, title, clear) — could be combined into a single "artifact-create" data part to reduce overhead.

SIMPLIFICATION OPPORTUNITIES:
  - Merge the 4 prelude data parts (`kind`, `id`, `title`, `clear`) into a single `artifact-open` event with all metadata. The client-side reducer would handle it atomically, reducing 4 store updates to 1.
  - The SWR re-fetch after streaming finishes could be replaced by optimistic cache seeding — when `artifact-finish` arrives, construct the version object client-side from the streamed data and inject into SWR cache.
  - `processStreamDelta` could avoid allocations for non-artifact events (`chat-title`, `usage`, `error`) since it returns `current` directly — already optimized. But for artifact events, consider batching the state transitions within StreamBridge if multiple deltas arrive in the same RAF frame.
