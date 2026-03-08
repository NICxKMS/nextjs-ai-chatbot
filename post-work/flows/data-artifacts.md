FLOW: Artifact Data
ENTRY: API route handlers (`app/api/artifact/route.ts`), AI tool calls during streaming, artifact-chat helper
STEPS:

  ## VERSIONING MODEL
  - Artifacts use a **composite PK**: `(id, createdAt)` — same `id` with different `createdAt` = different version
  - Each `saveArtifactVersion` INSERT creates a new row with auto-generated `createdAt` = new version
  - "Latest version" = row with MAX(`createdAt`) for a given `id`

  ## CREATE — New Artifact Version (AI tool call)
  1. `createArtifactTool` / `updateArtifactTool` in `features/chat/lib/tools/` → called by AI model during streaming
  2. `saveArtifactVersion({ id, title, content, kind, userId, chatId })` in `lib/data/artifact.ts`
  3. `db.insert(artifacts).values(data).returning()` → returns the new version row
  4. `requireDatabaseRow(result[0], ...)` → ensures INSERT produced a row or throws `AppError.internal`
  5. No cache invalidation within the tool — artifact reads go through the API route which has no `'use cache'`

  ## READ — Latest Version (single)
  1. `getArtifactById(artifactId)` in `lib/data/artifact.ts`
  2. `db.select().from(artifacts).where(eq(id)).orderBy(desc(createdAt)).limit(1)` → `Artifact | null`
  3. Used by: API GET (latest view), API POST (save ownership check, restore existence check),
     suggestions route (IDOR ownership check)

  ## READ — Specific Version
  1. `getArtifactByIdAndCreatedAt(artifactId, createdAt)` in `lib/data/artifact.ts`
  2. `db.select().from(artifacts).where(eq(id) AND eq(createdAt)).limit(1)` → `Artifact | null`
  3. Used by: suggestions route when `artifactCreatedAt` param is provided

  ## READ — All Versions
  1. `getArtifactVersions(artifactId, limit=100)` in `lib/data/artifact.ts`
  2. `db.select().from(artifacts).where(eq(id)).orderBy(desc(createdAt)).limit(100)` → `Artifact[]`
  3. Used by: `GET /api/artifact?id=X` (default versions view)

  ## READ — Latest Artifact Ref by Chat
  1. `getLatestArtifactByChatId(chatId, userId)` in `lib/data/artifact-chat.ts`
  2. `db.select({ id }).from(artifacts).where(eq(chatId) AND eq(userId)).orderBy(desc(createdAt)).limit(1)`
  3. Returns `{ id: string } | null` — only the artifact ID, not full data
  4. Used by: `app/api/chat/route.ts` for E2E fixture tool — determines if an artifact already exists in this chat

  ## SAVE — Via API POST (manual save)
  1. `POST /api/artifact` with `{ mode: 'save', id, title, content, kind, chatId }`
  2. CSRF check (`validateOrigin`) → auth → Zod validation
  3. `handleSave()`: ownership check via `getArtifactById(id)` → `saveArtifactVersion(data)`
  4. Response: `{ artifact: Artifact }` with `Cache-Control: no-store`
  5. **NOTE**: No `'use cache'` or cache tag is used for artifacts anywhere. All artifact reads are fresh DB queries.

  ## RESTORE — Via API POST
  1. `POST /api/artifact` with `{ mode: 'restore', id, timestamp }`
  2. CSRF check → auth → Zod validation
  3. `handleRestore()`: ownership check → `deleteArtifactVersion(id, afterRestore)`
  4. Deletes all versions with `createdAt >= restorePoint + 1ms`:
     - `db.delete(artifacts).where(eq(id) AND gte(createdAt, afterRestore))`
     - This preserves the restore target version and all prior versions
  5. Response: `{ success: true }` with `Cache-Control: no-store`

  ## DELETE — Version cleanup (restore flow)
  1. `deleteArtifactVersion(artifactId, createdAt)` in `lib/data/artifact.ts`
  2. Uses `gte(createdAt)` — deletes the target AND all subsequent versions
  3. **NOTE**: This makes "restore" destructive — versions after the restore point are permanently deleted

  ## DELETE — Via chat deletion
  1. FK CASCADE: `artifacts.chatId → chats.id ON DELETE CASCADE`
  2. All artifact versions for a chat are deleted when the chat is deleted

BOTTLENECKS:
  - `handleSave()` does TWO sequential DB calls: `getArtifactById` (ownership check) then `saveArtifactVersion`.
    Could be a single INSERT with a WHERE clause, but the ownership check is needed for the error message.
  - `GET /api/artifact` default view fetches ALL versions (`getArtifactVersions(id, 100)`) — for artifacts
    with many saves, this could be a large result set. Client-side pagination is not implemented.
  - All artifact reads are uncached DB queries — no `'use cache'` wrappers exist for artifact data.
    This is likely intentional: artifacts change frequently during active editing, and caching would
    serve stale content. The API routes set `Cache-Control: private, max-age=10` for HTTP-level caching.

WASTE:
  - `GET /api/artifact` (versions view) calls `getArtifactVersions(id)` and if that returns empty,
    falls back to `getArtifactById(id)` — a second DB call. In practice, if `getArtifactVersions` 
    returns empty, `getArtifactById` will also return null (same table, same filters). The fallback 
    is redundant.
  - `getArtifactVersions` returns full Artifact objects (all columns including `content`). For a version
    list UI, only `id`, `createdAt`, `title`, and `kind` are needed. The `content` column could be large.

SIMPLIFICATION OPPORTUNITIES:
  - The redundant fallback in `GET /api/artifact` (versions view) can be removed — if `getArtifactVersions`
    returns [], then `getArtifactById` will also return null.
  - Consider a `getArtifactVersionsMeta()` query that fetches only metadata (id, createdAt, title, kind)
    for the version list, avoiding transferring large `content` blobs.
  - The restore flow uses `afterRestore = restorePoint + 1ms` to exclude the target version from deletion.
    This is fragile — if two versions are saved within 1ms (unlikely but possible), the wrong version 
    could be preserved or deleted. Using `gt` (strict greater than) instead of `gte` would be more robust.

EXIT: Artifact data flows as JSON responses to client-side fetchers (SWR / fetch), or as tool results back to the AI model
