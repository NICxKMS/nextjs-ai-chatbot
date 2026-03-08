FLOW: Artifact Version Navigation
ENTRY: User interacts with version controls (Previous/Next buttons in VersionFooter, or version-related actions)

STEPS:
  1. ArtifactPanel mounts → SWR key computed: `swrKey = artifact.artifactId !== "init" && artifact.status !== "streaming" ? "/api/artifact?id=<id>" : null`
     - Key is `null` during streaming or for un-initialized artifacts → SWR skips fetch
     - When status becomes "idle" and artifactId is valid, SWR activates

  2. `useSWR<Artifact[]>(swrKey, artifactVersionFetcher, { revalidateOnFocus: false, revalidateOnReconnect: false })`:
     - `artifactVersionFetcher(url)` → `fetch(url)` → parses JSON array of versions

  3. **Server**: `GET /api/artifact?id=<id>` (app/api/artifact/route.ts:19):
     - Auth check → `getAppSession()`
     - Validates `id` via `getArtifactSchema.safeParse()`
     - Default `view: "versions"` → `getArtifactVersions(id)` → SELECT all versions ORDER BY createdAt DESC, LIMIT 100
     - Ownership check on latest version
     - Returns `Response.json(versions, { "Cache-Control": "private, max-age=10" })`

  4. **Client**: SWR populates `versions` array (newest-first from server)

  5. `panelVersions = useMemo(() => versions ? [...versions].reverse() : undefined, [versions])`
     - Reverses to chronological order (oldest=0, newest=last) for index-based navigation

  6. Version index sync effect (artifact-panel.tsx ~line 112):
     - When `panelVersions` changes AND content is NOT dirty:
       - Sets `currentVersionIndex` to `panelVersions.length - 1` (latest)
       - Syncs `lastEditedContentRef.current = latestContent`
       - If store content differs from latest version → `setArtifact(prev => ({ ...prev, content: latestContent }))`

  7. Derived state:
     - `isCurrentVersion = currentVersionIndex === panelVersions.length - 1`
     - `currentVersion = panelVersions?.[currentVersionIndex]`
     - `displayContent = isCurrentVersion ? artifact.content : getContentByVersionIndex(currentVersionIndex)`

  8. User clicks "Previous" or "Next" in VersionFooter:
     - `handleVersionChange("prev")` → `setCurrentVersionIndex(i => Math.max(0, i - 1))`
     - `handleVersionChange("next")` → `setCurrentVersionIndex(i => Math.min(panelVersions.length - 1, i + 1))`
     - `handleVersionChange("latest")` → `setCurrentVersionIndex(panelVersions.length - 1)`
     - `handleVersionChange("toggle")` → no-op (diff mode deferred to post-MVP)

  9. When `currentVersionIndex` changes → `displayContent` updates → ArtifactPanelEditor re-renders with new content
     - `isCurrentVersion` updates → editors toggle editable state:
       - TextEditor: `editor.setEditable(isCurrentVersion)` via useEffect
       - CodeEditor: Reconfigures extensions with/without `EditorView.editable` and `readOnly`
       - SheetEditor: Rebuilds columns with/without `renderEditCell`

  10. VersionFooter renders conditionally:
      - `isCurrentVersion === false` → footer visible with prev/next/restore buttons
      - `isCurrentVersion === true` → footer hidden via AnimatePresence exit animation
      - Footer shows: "Version X of Y" + "Restore this version" button + "Back to latest version" button

EXIT: Editor displays the selected version's content in read-only mode, version footer shows navigation controls

BOTTLENECKS:
  - Step 2-3 (initial fetch): SWR doesn't activate until streaming finishes (`status: "idle"`). No version data is available during streaming. After streaming ends, there's a network waterfall to get versions before the footer can show.
  - Step 5 (`[...versions].reverse()`): Creates a copy and reverses on every SWR update. With many versions, this is O(n) allocation per update.
  - Step 9 (editor reconfiguration): Navigating versions in CodeEditor calls `editorRef.current.setState(newState)` which rebuilds the entire editor state including extensions. This is heavier than necessary for a read-only toggle.

WASTE:
  - Step 5: Reversing the array could be avoided if the server returned versions in chronological order. Currently server returns DESC, client reverses to ASC.
  - Step 6: The version sync effect has `artifact.content` in its dependency array, which can cause it to run more often than needed. It guards with `!isContentDirty` but still evaluates the effect body.
  - Step 7: `displayContent` for non-current versions calls `getContentByVersionIndex()` which accesses `panelVersions[index].content` — raw array access with no memoization. Fine for small version counts but could be expensive if content strings are large and React compares props.

SIMPLIFICATION OPPORTUNITIES:
  - The server could accept an `order` query parameter (`asc` / `desc`) to avoid the client-side reverse.
  - Version content could be loaded lazily — fetch only metadata (id, title, createdAt) for the version list, and fetch full content only when a specific version is selected. This would reduce the initial GET payload for artifacts with many versions.
  - The "Back to latest version" button in VersionFooter calls `handleVersionChange("latest")` which is equivalent to navigating to the last index. This could be simplified to a direct `setCurrentVersionIndex(len - 1)` without going through the callback indirection.
