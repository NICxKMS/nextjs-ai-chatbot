FLOW: Artifact Update
ENTRY: AI model invokes `updateArtifact` tool during chat streaming (app/api/chat/route.ts)

STEPS:
  1. `buildChatTools()` (features/chat/lib/chat-route.ts:246) → calls `updateArtifactTool({ session, chatStream })` → returns AI SDK `tool()` instance
  2. AI model calls `updateArtifact` tool with `{ id, description }` — `id` is the artifact UUID, `description` is the change request
  3. `updateArtifactTool.execute` (features/chat/lib/tools/update-artifact.ts:40) → `getArtifactById(id)` → DB query: SELECT latest version (ORDER BY createdAt DESC LIMIT 1)
  4. Ownership check: `artifact.userId !== session.userId` → throws `AppError.forbidden` if mismatch
  5. `createDeferredArtifactClearWriter(chatStream)` (artifact-tool-utils.ts:38) → returns a wrapping `ArtifactStreamWriter` that:
     - Buffers artifact delta events (text/code/sheet/image deltas)
     - For text deltas: accumulates leading whitespace in `bufferedLeadingText`
     - On first non-whitespace delta content, emits `artifact-clear` then flushes buffer + current delta
     - For non-string content: immediately emits `artifact-clear` then forwards
     - Non-delta events pass through to the underlying chatStream unchanged
     - Once `didClear` is true, all subsequent deltas pass through directly

     KEY DESIGN: Deferred clear prevents the panel from flashing empty content. The old content stays visible until the AI produces meaningful output.

  6. `getArtifactHandler(artifact.kind)` → retrieves registered handler for the artifact's kind
  7. `handler.update({ id, title, kind, currentContent, description, session, chatStream: updateStream })` → delegates to kind-specific handler:
     - **text**: `streamText()` with `getUpdateArtifactPrompt(currentContent, "text")` + smoothStream → `collectTextStreamDeltas()` → APPEND semantics via deferred writer
     - **code**: `streamObject({ schema: codeSchema })` with `getUpdateArtifactPrompt(currentContent, "code")` → `collectReplacingObjectStream()` → REPLACE semantics via deferred writer
     - **sheet**: `streamObject({ schema: csvSchema })` with `getUpdateArtifactPrompt(currentContent, kind)` → `collectReplacingObjectStream()` → REPLACE semantics via deferred writer
     - **image**: No-op — returns `params.currentContent` unchanged (image updates not AI-driven)

  NOTE: Unlike creation, there is NO `writeArtifactCreatePrelude()`. The artifact-id, kind, title are NOT re-sent during update — the client already has them from the creation flow. The first signal is the deferred `artifact-clear`.

  8. Handler returns final `updatedContent: string` → `ensureArtifactContent(updatedContent, "update")` validates non-empty
  9. `saveArtifactVersion({ id, title, content, kind, userId, chatId })` → DB INSERT new version row (same id, new createdAt) → versioning via composite PK
  10. `writeArtifactFinish(chatStream)` → writes `{ type: "artifact-finish", content: "" }` (uses ORIGINAL chatStream, not deferred wrapper)
  11. Tool returns `{ id, title, kind, content: "The artifact has been updated successfully." }`

  --- CLIENT-SIDE PIPELINE ---

  12. SSE events arrive as `data-artifact-clear`, `data-artifact-textDelta` / `data-artifact-codeDelta` / `data-artifact-sheetDelta`, then `data-artifact-finish`
  13. `useChatSession.onData` → strips `data-` prefix → dispatches to ChatStreamProvider → RAF batching → StreamBridge
  14. `processStreamDelta()` applies deltas:
      - `artifact-clear` → resets `content: ""`, `suggestions: []` (old content wiped, panel shows empty)
      - `artifact-textDelta` → APPENDS new content character by character
      - `artifact-codeDelta` / `artifact-sheetDelta` → REPLACES content with full new version
      - `artifact-finish` → `status: "idle"`
  15. `artifactStore.setState()` → subscribers notified → ArtifactPanel re-renders with new content
  16. SWR revalidates `/api/artifact?id=<id>` → fetches updated version list including new version

EXIT: Artifact panel shows updated content, new version persisted to DB, version list updated

BOTTLENECKS:
  - Step 3 (getArtifactById): DB query to fetch current content before streaming can begin. This is sequentially blocking — the AI cannot start generating until the current content is loaded.
  - Step 9 (saveArtifactVersion): Same DB INSERT bottleneck as creation — blocks `artifact-finish`.
  - Step 5 (deferred clear logic): For text deltas, whitespace buffering adds latency to the first visible character. The buffer accumulates all leading whitespace and only emits when non-whitespace arrives.
  - Step 16 (SWR revalidation): Same waterfall as creation — redundant fetch for version metadata.

WASTE:
  - Step 10: `writeArtifactFinish` uses the original `chatStream`, not the deferred wrapper. This is correct (not waste) — the finish signal should always pass through. But it means the deferred wrapper is only used for delta events.
  - Step 7 (image handler update): Returns `currentContent` unchanged — effectively a no-op that still goes through the full tool execution pipeline including DB save of identical content as a new version.
  - Step 14: For REPLACE semantics (code/sheet), every delta replaces the entire content in the store. This means N full-content replacements for N partial objects, even though only the last one matters for display.

SIMPLIFICATION OPPORTUNITIES:
  - For code/sheet REPLACE semantics, the client could skip intermediate replacements and only apply the latest delta in each RAF frame — the StreamBridge already batches deltas.
  - The deferred clear pattern could be simplified: instead of buffering text deltas and checking whitespace, use a simple "first delta received" flag. The whitespace check adds complexity for a marginal UX improvement.
  - Consider adding a `NOOP` return from image handler.update to skip the `saveArtifactVersion` call entirely when content is unchanged.
