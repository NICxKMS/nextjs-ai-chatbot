# Data Flows 2: Files, Artifacts, Documents, Votes

## Flow 6: File Attachment Lifecycle
1. User selects one or more files in prompt input.
2. Client batches uploads (max concurrent batches) to `/api/files/upload`.
3. Server validates:
   - auth and upload rate limit,
   - storage configuration,
   - multipart body + file existence,
   - size and MIME constraints.
4. Server sanitizes filename and uploads to blob storage.
5. Client stores returned metadata (`url`, `contentType`, `filename`) as attachment entries.
6. On message submit, attachments are converted to message file parts.

Failure handling:
- schema-specific failures mapped to explicit file error codes.
- upload abort during unmount is treated as non-error in UI.

## Flow 7: Artifact Creation Through AI Tooling
1. Model decides to invoke `createDocument` tool.
2. Tool allocates `documentId` and emits stream metadata:
   - `data-kind`, `data-id`, `data-title`, `data-clear`.
3. Handler chosen by artifact kind (`text`, `code`, `sheet`):
   - streams content deltas (`data-textDelta`/`data-codeDelta`/`data-sheetDelta`).
4. On completion, tool emits `data-finish`.
5. Artifact server wrapper persists generated content version via `documentData.save`.

UI consequences:
- artifact panel becomes visible based on delta thresholds and status.
- streamed deltas update artifact local content continuously.

## Flow 8: Artifact Update Through AI Tooling
1. Model invokes `updateDocument` with `id` + natural language change description.
2. Tool loads current latest document version.
3. Emits `data-clear`, runs kind-specific update handler, streams deltas, then `data-finish`.
4. Updated full content persisted as a new document version.

Safety rules:
- if document not found, tool returns structured error output.
- kind handler must exist for persisted kind or operation errors.

## Flow 9: Suggestion Generation Lifecycle
1. Model invokes `requestSuggestions` with `documentId`.
2. Tool loads target document content.
3. Uses `streamObject` to generate array elements of suggestion objects.
4. Each element streamed as transient `data-suggestion`.
5. Persistence branch:
   - regular user: suggestion rows inserted in DB with `documentCreatedAt` link.
   - guest user: no persistence, stream-only.
6. Text artifact metadata aggregator appends streamed suggestions for editor UI.

## Flow 10: Document CRUD/Version Flows
### Read document versions
1. GET `/api/document?id=...` with auth/rate-limit/ownership.
2. `documentData.getAll` cache-first:
   - guest cache-only, returns empty when absent.
   - regular fallback DB + cache warm.
3. Returns chronological list of versions.

### Save version via API
1. POST `/api/document?id=...` validates schema/content limits.
2. Requires existing chat context (cannot create free-floating document by API route).
3. For existing documents, enforces ownership and kind immutability.
4. Persists new version through data layer.

### Delete versions after timestamp
1. DELETE `/api/document?id=...&timestamp=...`.
2. Validates ownership and strict rate-limit.
3. Data layer removes later versions:
   - guest cache-only delete.
   - regular DB transaction (including linked suggestions), then cache cleanup.

## Flow 11: Voting Flow
1. User clicks upvote/downvote on assistant message.
2. Client sends PATCH `/api/vote` with `chatId`, `messageId`, `type`.
3. Server validates auth/rate-limit/non-guest/resource ownership.
4. Server confirms message belongs to provided chat.
5. DB upsert writes vote state (`isUpvoted`) for composite key.
6. UI reflects completion and can toggle vote type on subsequent interactions.

## Flow 12: Message Edit/Regenerate Path
1. User edits previous user message.
2. Server action `deleteTrailingMessages` validates chat ownership + timestamp.
3. Messages/votes after timestamp are removed (cache + DB transactional path for regular).
4. Regeneration path sends revised prompt and receives fresh assistant output.

## Flow 13: Data Stream To Artifact State Synchronization
1. `useChat.onData` receives data parts from SSE.
2. Parts optionally copied to `DataStreamProvider` depending on settings (`streamArtifacts`).
3. `DataStreamHandler` processes unhandled deltas incrementally using index tracking.
4. Applies base artifact transitions (`id`, `title`, `kind`, `clear`, `finish`) and forwards to kind-specific processors.
5. Metadata channels (e.g., suggestions) updated independently.

## Behavioral Conclusions
- Artifact/document subsystem is effectively a separate event-sourced mini-workflow layered on top of chat stream transport.
- Versioning semantics are append-only by timestamp, with rollback modeled as "delete newer versions".
- Suggestion and vote persistence are intentionally unavailable to guest mode, reinforcing durability/privilege split.
