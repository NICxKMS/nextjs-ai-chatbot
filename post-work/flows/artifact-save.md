FLOW: Artifact Manual Save
ENTRY: User edits artifact content in an editor (text/code/sheet), triggering `onSaveContent` callback

STEPS:
  1. User types in editor → editor-specific change handler fires:
     - **TextEditor**: TipTap `onUpdate({ editor, transaction })` → `editor.getMarkdown()` → calls `onSaveContent(markdown, { debounce: shouldDebounce })`
     - **CodeEditor**: CodeMirror `updateListener` → detects `docChanged` + not `remote` annotation → calls `onSaveContent(newContent, { debounce: true })`
     - **SheetEditor**: `handleRowsChange(newRows)` → `unparse(updatedData)` → calls `onSaveContent(csv, { debounce: false })` (sheet saves are immediate, no debounce)

  2. `saveContent()` callback (artifact-panel.tsx ~line 252) receives `(updatedContent, options?)`:
     - Updates `lastEditedContentRef.current = updatedContent`
     - Compares `updatedContent` against latest version's content (`panelVersions.at(-1).content`)
     - If content matches latest version → cancels any pending debounce/save, resets dirty state → EXITS
     - If content differs → `setIsContentDirty(true)`, `setSaveState("idle")`

  3. Debounce decision (`options?.debounce ?? true`):
     - **If debouncing**: clears existing timeout → sets new `setTimeout(handleSave, SAVE_DEBOUNCE_MS)` (2000ms)
     - **If not debouncing** (e.g., sheet): calls `handleSave(updatedContent)` immediately

  4. `handleSave(updatedContent)` (artifact-panel.tsx ~line 184):
     - Guards: if `artifact.artifactId === "init"` → returns (no artifact to save)
     - Aborts any pending save: `pendingSaveRef.current?.abort()`
     - Creates new `AbortController` for this request
     - `setSaveState("pending")`, `setSaveErrorMessage(null)`

  5. `fetch("/api/artifact", { method: "POST", body: { id, title, content, kind, chatId, mode: "save" }, signal })`:
     - Headers: `Content-Type: application/json`
     - Body validated against `saveArtifactSchema` on server

  6. **Server**: `POST /api/artifact` (app/api/artifact/route.ts):
     - `validateOrigin(request)` — CSRF check
     - `getAppSession()` — auth check
     - `artifactPostBodySchema.safeParse(body)` → discriminated union matches `mode: "save"` → `handleSave()`

  7. `handleSave()` (route.ts ~line 137):
     - `getArtifactById(data.id)` — ownership check: if existing artifact, verify `userId` matches
     - `saveArtifactVersion({ id, title, content, kind, userId, chatId })` → DB INSERT with new `createdAt` → new version row
     - Returns `Response.json({ artifact })` with `Cache-Control: no-store`

  8. **Client** response handling (artifact-panel.tsx ~line 210):
     - If `!res.ok` → `readSaveErrorMessage(res)` → `setSaveState("error")`, `toast.error(message)` → EXITS
     - If `res.ok`:
       - `setIsContentDirty(false)`, `setSaveState("idle")`
       - Parses response: `{ artifact: Artifact }` with new `createdAt`
       - Updates `lastEditedContentRef.current = savedArtifact.content`
       - `mutateVersions(currentVersions => mergeArtifactVersion(currentVersions, savedArtifact), { revalidate: false })`

  9. `mergeArtifactVersion()` (artifact-save-utils.ts:28):
     - Filters out any existing version with same `createdAt` (prevents duplicates)
     - Returns `[nextVersion, ...remainingVersions]` (newest first — SWR stores descending)
     - `{ revalidate: false }` — no additional GET request, optimistic update only

  10. ArtifactPanel re-renders → version count updates in footer, `isContentDirty` cleared → status shows "Updated X ago"

EXIT: New version persisted to DB, SWR cache optimistically updated, UI shows saved state

BOTTLENECKS:
  - Step 5-7 (fetch + DB INSERT): Network round-trip + DB write. During the 2000ms debounce + save latency, user may continue editing. If they do, the AbortController cancels the pending save and a new debounce starts.
  - Step 7 (getArtifactById for ownership check): An extra DB query before the INSERT. For manual saves where the user is already authenticated and the artifact is already loaded, this could potentially be skipped or cached.

WASTE:
  - Step 7: The ownership check (`getArtifactById`) re-fetches the entire artifact row just to compare `userId`. The client already has `artifact.artifactId` from the store — a lighter ownership check (SELECT userId WHERE id = ?) would suffice.
  - Step 2: On every keystroke (for text/code with debounce), `saveContent` compares content against `panelVersions.at(-1).content` via strict equality. This is efficient for string comparison but runs on every change event.
  - Step 9: `mergeArtifactVersion` creates a new array with filter + spread on every save. Since `revalidate: false` is used, this is the only update path — no double work.

SIMPLIFICATION OPPORTUNITIES:
  - The ownership check in `handleSave()` could be skipped for existing artifacts that were already loaded in the same session — the client already verified access when the panel opened.
  - Sheet's `debounce: false` causes immediate saves on every cell change. Consider adding a micro-debounce (100-200ms) for rapid cell edits to reduce API calls.
  - The `readSaveErrorMessage()` utility parses the error response body looking for `message`, `error`, or `errorMessage` fields. This could be standardized — the server always returns `AppError` with a consistent shape.
