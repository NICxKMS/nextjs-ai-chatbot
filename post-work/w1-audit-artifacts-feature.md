# Wave 1 — Static Audit: features/artifacts/

**Auditor:** Thoth  
**Date:** 2026-03-07  
**Scope:** 26 files in `features/artifacts/` + supporting files  
**Reference Flows:** artifact-creation, artifact-update, artifact-save, artifact-restore, artifact-version-nav, artifact-suggestions, artifact-handler-registry, artifact-store, artifact-editor-loading, artifact-panel-lifecycle

---

## Executive Summary

The artifacts feature is architecturally solid — feature-sliced, well-typed, and follows the project's conventions consistently. However, it contains **4 CRITICAL** and **8 HIGH** severity findings centered on:

1. **O(n²) streaming for code/sheet** — the single biggest performance issue in the module
2. **Store emission flooding** — N emissions per RAF frame during streaming
3. **CodeEditor full-state rebuild** — destroys undo history on save-callback identity changes
4. **Eager loading of ArtifactPanel chunk** — downloaded on every page visit even without artifacts

The remaining findings are MEDIUM/LOW optimizations around dead code, memo gaps, and minor type safety improvements.

---

## CRITICAL Findings

### C1 — O(n²) Streaming Bandwidth for Code/Sheet (B6)

```
FLOW: artifact-creation | STEP: 8
FLOW: artifact-update | STEP: 7
SEVERITY: [CRITICAL]
FILE: features/artifacts/handlers/stream-artifact-deltas.ts:41-60
FINDING: `collectReplacingObjectStream()` writes the FULL content string to SSE on every 
`object` part from `streamObject()`. As the AI generates a 500-line code artifact, each 
successive delta contains the full content-so-far. With N streaming parts, total bytes 
transmitted ≈ O(n²) — e.g., a 10KB final artifact from 100 parts transmits ~500KB over 
SSE. This is then received by the client, deserialized, passed through RAF batching, 
processed by StreamBridge, and written to the artifact store — all N times with increasing 
payload size.

The text handler uses APPEND semantics (each delta is just the new word), so it's O(n). 
Only code (codeDelta) and sheet (sheetDelta) suffer from REPLACE semantics.

RECOMMENDATION: Two options, in order of impact:
1. **Server-side diff**: Instead of sending full content, compute a diff against the 
   previous emission and send only the patch. The client applies patches incrementally.
   This converts O(n²) to O(n) bandwidth but requires a diff library.
2. **Client-side skip**: In StreamBridge, when multiple REPLACE deltas arrive in the 
   same RAF frame, only process the LAST one (others are intermediate and will be 
   overwritten anyway). This doesn't reduce SSE bandwidth but eliminates redundant 
   store updates and re-renders. This is the simpler option and should be done regardless.
```

### C2 — Store Emission Flooding During Streaming

```
FLOW: artifact-store | STEP: 4-6
FLOW: artifact-creation | STEP: 17-18
SEVERITY: [CRITICAL]
FILE: features/artifacts/lib/artifact-store.ts:51-55
FILE: features/chat/components/stream-bridge.tsx:35-40
FINDING: StreamBridge processes every new delta in a loop and calls `onArtifactDelta(artifact)` 
→ `artifactStore.setState()` for EACH one. If 10 deltas arrive in a single RAF frame, 
that's 10 `setState` calls → 10 `emitChange()` calls → 10 synchronous listener iterations.

React batches the resulting re-renders into a single frame, so the visual output is fine. 
But the store still iterates all listeners 10× unnecessarily. With 8+ selectors 
subscribed (ArtifactPreview has 5, ArtifactActions has 2, VersionFooter has 1), that's 
80+ listener invocations per frame, each running a selector function.

RECOMMENDATION: Accumulate deltas in StreamBridge before emitting. The loop already 
processes all new deltas — capture the final `artifactRef.current` after the loop and 
emit ONCE:

```ts
// Current (N emissions per frame):
for (const delta of newDeltas) {
  const artifact = processStreamDelta(delta, artifactRef.current)
  artifactRef.current = artifact
  onArtifactDelta(artifact)  // ← emits each time
}

// Proposed (1 emission per frame):
for (const delta of newDeltas) {
  artifactRef.current = processStreamDelta(delta, artifactRef.current)
}
onArtifactDelta(artifactRef.current)  // ← emit once with final state
```

Note: This is safe because the RAF batching in ChatStreamProvider already coalesces 
SSE events into frames. The only consumer that might care about intermediate states 
is the streaming content preview — but it always displays the latest state anyway.
```

### C3 — CodeEditor Full State Rebuild on Save Callback Change

```
FLOW: artifact-editor-loading | STEP: 6b
SEVERITY: [CRITICAL]
FILE: features/artifacts/components/editors/code-editor.tsx:367-400
FINDING: The CodeEditor has an effect that rebuilds the entire CodeMirror `EditorState` 
whenever `onSaveContent` or `isCurrentVersion` changes:

```ts
useEffect(() => {
  // ... rebuilds all extensions
  const newState = CMState.create({
    doc: editorRef.current.state.doc,
    extensions,
    selection: currentSelection,
  })
  editorRef.current.setState(newState)
}, [modules, onSaveContent, isCurrentVersion])
```

The `onSaveContent` callback is the `saveContent` function from ArtifactPanel, which 
has `[panelVersions, handleSave]` in its dependency array. Every time SWR fetches 
new version data (which happens after EVERY save), `panelVersions` changes → 
`saveContent` gets a new identity → CodeEditor rebuilds its entire state.

This destroys: undo history, cursor position precision (selection is saved but 
extension state is lost), any in-progress compositions, and CodeMirror transaction 
history.

RECOMMENDATION: Store `onSaveContent` in a ref inside CodeEditor and use 
the ref in the update listener closure. This decouples the callback identity 
from the editor's extension configuration:

```ts
const onSaveRef = useRef(onSaveContent)
onSaveRef.current = onSaveContent

// In the extension setup (only runs once + on isCurrentVersion change):
const updateListener = CMView.updateListener.of((update) => {
  if (update.docChanged) {
    const userTx = update.transactions.find(tr => !tr.annotation(CMTx.remote))
    if (userTx) onSaveRef.current(update.state.doc.toString(), { debounce: true })
  }
})
```

This removes `onSaveContent` from the effect deps entirely. The extension 
only rebuilds when `isCurrentVersion` changes (read-only toggle), which is 
the only time a full rebuild is justified.

Alternatively, use CodeMirror's `Compartment.reconfigure()` API for the 
editable/readOnly facets, preserving all other state.
```

### C4 — Eager ArtifactPanel Chunk Load

```
FLOW: artifact-panel-lifecycle | STEP: 1
SEVERITY: [CRITICAL]
FILE: features/chat/components/chat-shell.tsx (consumer)
FILE: features/artifacts/components/artifact-panel.tsx
FINDING: `ChatShell` unconditionally renders `<ArtifactPanel chatId={id} />`, and 
ArtifactPanel is loaded via `dynamic()` with `ssr: false`. While `ssr: false` prevents 
server rendering, the chunk still downloads eagerly when ChatShell mounts — which happens 
on EVERY chat page load. The ArtifactPanel chunk includes:
- framer-motion (AnimatePresence, motion)
- swr
- date-fns (formatDistance)
- All panel sub-components

Most chat sessions never open an artifact. This is wasted bandwidth and parse time 
for the majority of page loads.

RECOMMENDATION: Gate the `<ArtifactPanel />` render behind a store check:

```tsx
function ArtifactPanelGate({ chatId }: { chatId: string }) {
  const isVisible = useArtifactSelector(s => s.isVisible)
  if (!isVisible) return null
  return <ArtifactPanel chatId={chatId} />
}
```

This makes the dynamic import truly lazy — the chunk only downloads when 
`isVisible` first becomes `true`. The 16ms cost of the first open (while 
the chunk downloads) can be mitigated with a loading skeleton in the 
`dynamic()` options.
```

---

## HIGH Findings

### H1 — TextEditor Memo Leaks All Streaming Updates

```
FLOW: artifact-editor-loading | STEP: 4
SEVERITY: [HIGH]
FILE: features/artifacts/components/editors/text-editor.tsx:141-149
FINDING: The custom `areEqual` comparator returns `false` when BOTH prev and next 
have `status === "streaming"`:

```ts
if (prevProps.status === "streaming" && nextProps.status === "streaming") return false
```

This means during streaming, the TextEditor re-renders on EVERY parent render 
even if `content` hasn't changed. The memo is effectively disabled during streaming.
The content comparison on the next line (`prevProps.content !== nextProps.content`) 
would already catch actual content changes.

RECOMMENDATION: Remove the streaming bypass. Let the content/suggestions comparisons 
handle re-render decisions:

```ts
function areEqual(prevProps: TextEditorProps, nextProps: TextEditorProps): boolean {
  if (prevProps.suggestions !== nextProps.suggestions) return false
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) return false
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false
  if (prevProps.content !== nextProps.content) return false
  if (prevProps.status !== nextProps.status) return false
  if (prevProps.onSaveContent !== nextProps.onSaveContent) return false
  return true
}
```
```

### H2 — SheetEditor Memo Has Same Streaming Bypass Issue

```
FLOW: artifact-editor-loading | STEP: 9
SEVERITY: [HIGH]
FILE: features/artifacts/components/editors/sheet-editor.tsx:160-168
FINDING: Identical issue to H1. The `arePropsEqual` function has:

```ts
!(prev.status === "streaming" && next.status === "streaming")
```

This evaluates to `false` when both are streaming (inverted logic: double streaming 
→ `!(true)` → `false` → the AND chain short-circuits → returns `false` → re-render). 
During streaming, memo is bypassed on every render.

RECOMMENDATION: Same fix as H1 — remove the streaming bypass, let content comparison 
handle it. Additionally, SheetEditor runs `parseCSV(content)` in a useMemo — during 
streaming with REPLACE semantics, this means CSV re-parsing on every re-render that 
gets through.
```

### H3 — SheetEditor No Debounce on Cell Changes

```
FLOW: artifact-save | STEP: 1
SEVERITY: [HIGH]
FILE: features/artifacts/components/editors/sheet-editor.tsx:136-140
FINDING: Sheet editor calls `onSaveContent(csv, { debounce: false })` on every 
`onRowsChange`. With `debounce: false`, this triggers an immediate `handleSave()` 
which fires a POST to `/api/artifact` for every single cell edit.

If a user types values into 10 cells in quick succession, that's 10 immediate 
API calls + 10 DB INSERTs creating 10 separate versions.

RECOMMENDATION: Either:
1. Change to `{ debounce: true }` to use the standard 2000ms debounce, or
2. Add a micro-debounce (200-300ms) specific to sheet edits to batch rapid cell edits
   while still being more responsive than the 2s text debounce.
```

### H4 — Suggestions Decorations Rebuilt From Scratch on Each New Suggestion

```
FLOW: artifact-suggestions | STEP: 11
SEVERITY: [HIGH]
FILE: features/artifacts/components/editors/text-editor.tsx:116-127
FILE: features/artifacts/lib/suggestions-extension.tsx:85-100
FINDING: When a new suggestion arrives via streaming, the `suggestions` array gets a 
new reference (spread in processStreamDelta), which triggers the TextEditor effect:

```ts
useEffect(() => {
  const projected = projectWithPositions(editor.state.doc, suggestions)
  const decorations = createDecorations(projected, editor.view)
  // ...dispatches full replacement
}, [suggestions, editor])
```

This re-projects ALL suggestions (not just the new one), creates ALL decorations 
from scratch, and dispatches a full decoration replacement. For 5 suggestions 
streaming in sequentially, positions are recalculated 5 times for all accumulated 
suggestions (5+4+3+2+1 = 15 position resolutions instead of 5).

RECOMMENDATION: Memoize the projected positions and only process new suggestions 
incrementally. Track the last processed suggestion count and only project the delta.
```

### H5 — ArtifactPreview Uses Both useArtifact AND useArtifactSelector

```
FLOW: artifact-store | STEP: 10-11
SEVERITY: [HIGH]
FILE: features/artifacts/components/artifact-preview.tsx:285-303
FINDING: `PureArtifactPreview` subscribes to the store in TWO ways:

1. Five `useArtifactSelector` calls for `isVisible`, `status`, `content`, `title`, `kind`
2. `useArtifact()` for `setArtifact`

The `useArtifact()` call subscribes to the FULL store state via `useSyncExternalStore`, 
meaning this component re-renders on ANY store change — negating the benefit of the 
5 granular selectors. The selectors are effectively redundant.

Additionally, `HitboxLayer` (rendered inside PureArtifactPreview) also calls 
`useArtifact()`, adding another full-state subscription.

RECOMMENDATION: Replace `useArtifact()` with a direct import of 
`artifactStore.setState` (like ArtifactCloseButton does). The component only needs 
the write method, not the read subscription:

```ts
// Instead of:
const { setArtifact } = useArtifact()

// Use:
import { artifactStore } from "../lib/artifact-store"
const setArtifact = artifactStore.setState
```

This preserves the selector granularity for reads and eliminates the redundant 
full-state subscription.
```

### H6 — Version Array Reversed on Every SWR Update

```
FLOW: artifact-version-nav | STEP: 5
SEVERITY: [HIGH]
FILE: features/artifacts/components/artifact-panel.tsx:98-101
FINDING: `panelVersions` is computed via:

```ts
const panelVersions = useMemo(
  () => (versions ? [...versions].reverse() : undefined),
  [versions],
)
```

The server returns versions in DESC order (newest first). The client reverses to 
ASC (oldest first) for index-based navigation. This creates a copy + reverses it 
on every SWR update.

While the `useMemo` prevents unnecessary recalculations when `versions` hasn't 
changed, the fundamental issue is the server/client sort order mismatch.

RECOMMENDATION: Accept an `order` query parameter in `GET /api/artifact` to 
return ASC order directly. Or simply have the server always return ASC (the only 
consumer that needs DESC is the "latest version" check, which can use 
`versions.at(-1)` on an ASC array). This eliminates the copy+reverse entirely.
```

### H7 — Ownership Check Re-fetches Full Artifact Row on Save

```
FLOW: artifact-save | STEP: 7
SEVERITY: [HIGH]
FILE: app/api/artifact/route.ts:137-140
FINDING: The `handleSave()` function calls `getArtifactById(data.id)` which does a 
full `SELECT *` on the artifact table just to compare `userId`. For large artifacts 
(e.g., code with 1000+ lines), this loads the entire `content` column unnecessarily.

This happens on EVERY manual save — with the 2s debounce, a user typing continuously 
triggers this every 2 seconds.

RECOMMENDATION: Create a lightweight `getArtifactOwner(id)` query that only selects 
`userId`:

```ts
export async function getArtifactOwner(artifactId: string): Promise<string | null> {
  const result = await db
    .select({ userId: artifacts.userId })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)
  return result[0]?.userId ?? null
}
```
```

### H8 — Restore Uses Fragile +1ms Timestamp Offset

```
FLOW: artifact-restore | STEP: 5-6
SEVERITY: [HIGH]
FILE: app/api/artifact/route.ts:162-165
FINDING: The restore logic computes `afterRestore = new Date(restorePoint.getTime() + 1)` 
and uses `gte(createdAt, afterRestore)` to delete versions after the restore point. 
This +1ms offset is fragile:

1. If two versions share a millisecond timestamp (rapid saves), behavior is ambiguous
2. The intent is `>` (greater than) but the implementation is `>= (target + 1ms)`, 
   which is mathematically equivalent only for integer millisecond timestamps
3. Database timestamp precision may differ from JS Date precision

RECOMMENDATION: Use Drizzle's `gt()` operator directly:

```ts
import { gt } from "drizzle-orm"
await db.delete(artifacts).where(
  and(eq(artifacts.id, artifactId), gt(artifacts.createdAt, restorePoint))
)
```

This is clearer, more robust, and eliminates the timestamp arithmetic.
```

---

## MEDIUM Findings

### M1 — No Loading Fallback for Lazy Editors

```
FLOW: artifact-editor-loading | STEP: 3
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/editors/lazy.ts:10-36
FINDING: All four `dynamic()` calls omit the `loading` option. During first-time 
chunk download (TextEditor: ~100KB TipTap bundle, CodeEditor: ~150KB CodeMirror 
bundle, SheetEditor: react-data-grid + papaparse), the editor area shows nothing — 
a blank white void.

The CodeEditor manually shows a skeleton after mount while waiting for 
`loadCodeMirrorModules()`, but the Next.js dynamic() loading gap (before the 
component code even downloads) has no visual indicator.

RECOMMENDATION: Add `loading` fallbacks to each dynamic import:

```ts
export const TextEditor = dynamic(
  () => import("...text-editor").then(m => ({ default: m.TextEditor })),
  { ssr: false, loading: () => <EditorSkeleton /> },
)
```
```

### M2 — Image Handler Exists for Type Completeness But Wastes Resources

```
FLOW: artifact-handler-registry | STEP: 3
SEVERITY: [MEDIUM]
FILE: features/artifacts/handlers/image-handler.ts:1-27
FINDING: The image handler's `create()` returns `""` and `update()` returns 
`currentContent` unchanged. On update, the calling tool still:
1. Fetches the full artifact from DB (`getArtifactById`)
2. Runs through the deferred clear writer setup
3. Calls `saveArtifactVersion()` — creating a duplicate version with identical content
4. Writes `artifact-finish`

This wastes a DB write on every image "update" that produces an identical version.

RECOMMENDATION: Add an early return in the update tool for image kind:

```ts
if (artifact.kind === "image") {
  // Image updates are handled by code execution, not AI generation
  return { id, title, kind, content: "Image artifacts cannot be updated via AI." }
}
```

Or have the handler signal a NOOP so the tool skips persistence.
```

### M3 — ArtifactPanel Version Sync Effect Has Too Many Dependencies

```
FLOW: artifact-version-nav | STEP: 6
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/artifact-panel.tsx:107-125
FINDING: The version sync effect has 5 dependencies:

```ts
useEffect(() => { ... }, [artifact.content, currentVersionIndex, isContentDirty, panelVersions, setArtifact])
```

Including `artifact.content` causes this effect to run on every streaming delta 
(content changes 60× per second during streaming). The effect guards with 
`!isContentDirty` but still evaluates the effect body before the early return.

During streaming, `panelVersions` is `undefined` (SWR key is null), so the effect 
bails at `panelVersions && panelVersions.length > 0`. But it still runs the function 
body to get to that check.

RECOMMENDATION: Split the effect or add streaming guard at the top level. Since 
`artifact.status` is available, add:

```ts
useEffect(() => {
  if (artifact.status === "streaming") return
  if (!isContentDirty && panelVersions && panelVersions.length > 0) { ... }
}, [artifact.content, artifact.status, currentVersionIndex, ...])
```

Or better: remove `artifact.content` from deps and use a ref for the content 
comparison.
```

### M4 — Duplicate SWR Fetcher Definitions

```
FLOW: artifact-version-nav | STEP: 2
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/artifact-save-utils.ts:16-19
FILE: features/artifacts/components/artifact-preview.tsx:56-59
FINDING: Two nearly identical fetcher functions exist:

```ts
// artifact-save-utils.ts
export async function artifactVersionFetcher(url: string): Promise<Artifact[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
  return res.json()
}

// artifact-preview.tsx
async function artifactFetcher(url: string): Promise<ArtifactVersionData[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
  return res.json()
}
```

Same logic, different names, different types (Artifact vs ArtifactVersionData — 
which are structurally identical).

RECOMMENDATION: Use the shared `artifactVersionFetcher` from `artifact-save-utils.ts` 
in both locations. Delete the local `artifactFetcher` in artifact-preview.tsx.
```

### M5 — Suggestion Widget Creates Separate React Roots

```
FLOW: artifact-suggestions | STEP: 13
SEVERITY: [MEDIUM]
FILE: features/artifacts/lib/suggestions-extension.tsx:170-190
FINDING: Each suggestion widget creates its own React root via `createRoot(dom)`. 
For 5 suggestions, that's 5 independent React roots, each with their own reconciler 
instance. These roots are outside React's normal tree, so:
1. They don't participate in Suspense boundaries
2. They don't share context providers
3. Each root has scheduler overhead

Clean-up uses `setTimeout(() => root.unmount(), 0)` which defers to the next 
microtask — there's a brief window where the root exists detached.

RECOMMENDATION: This is an inherent limitation of ProseMirror's widget decoration 
API — React portals can't be used for inline decorations. The current approach is 
the standard pattern. However, consider:
1. Add a max suggestion limit (e.g., 3 instead of 5) to reduce root count
2. If widget count becomes a problem, investigate a single-root approach using 
   `flushSync` and MutationObserver to render all widgets into a single tree
```

### M6 — KIND_ACTIONS Object Is Empty / Dead Code Path

```
FLOW: artifact-panel-lifecycle | STEP: 7
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/artifact-panel.tsx:39-44
FINDING: The `KIND_ACTIONS` constant maps all kinds to empty arrays:

```ts
const KIND_ACTIONS: Record<string, ArtifactAction[]> = {
  text: [], code: [], sheet: [], image: [],
}
```

Since all actions arrays are empty, `ArtifactActions` always returns `null` 
(line 45 of artifact-actions.tsx: `if (actions.length === 0) return null`). 
The entire action system — `ArtifactActions` component, action context 
construction, the `metadata`/`setMetadata` state — is wired up but produces 
no output.

This is intentionally deferred (comment says "wired per handler in future tasks"), 
but the metadata state, setMetadata, and action context are still allocated on 
every render.

RECOMMENDATION: Accept as-is if actions are planned for near-term. If not 
near-term, simplify to a comment placeholder and remove the metadata state 
allocation until actions are actually implemented.
```

### M7 — ArtifactPreview Bounding Box Effect Runs Without Condition

```
FLOW: artifact-store | STEP: 7 (bounding box effect)
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/artifact-preview.tsx:309-327
FINDING: The bounding box update effect runs on every render cycle (dependencies: 
`[artifactId, setArtifact]`). It calls `getBoundingClientRect()` and does a 
shallow comparison before writing. However:

1. It runs even when the panel is not visible (wasteful getBoundingClientRect calls)
2. It runs even for previews whose `artifactId` doesn't match the store's current artifact
3. The shallow comparison prevents unnecessary store writes, but the effect body 
   still executes

RECOMMENDATION: Guard with visibility check and ID match:

```ts
useEffect(() => {
  if (!artifactIsVisible) return  // No panel open, no need to update bbox
  // ... rest of effect
}, [artifactId, setArtifact, artifactIsVisible])
```
```

### M8 — CompactToolResult Clears Content on Click

```
FLOW: artifact-panel-lifecycle | STEP: 3c
SEVERITY: [MEDIUM]
FILE: features/artifacts/components/artifact-preview.tsx:444-449
FINDING: When clicking a CompactToolResult to reopen the panel, it sets 
`content: ""` in the store:

```ts
setArtifact(prev => prev.status === "streaming"
  ? { ...prev, isVisible: true }
  : { ...prev, artifactId, kind, title, content: "", isVisible: true, boundingBox })
```

This clears the cached content even though the panel will immediately fetch 
it from SWR. During the brief gap between panel open and SWR data arrival, 
the editor shows empty content, which flashes before the actual content loads.

RECOMMENDATION: Don't clear content if the artifactId matches the current store 
value (content is still cached):

```ts
setArtifact(prev => {
  if (prev.status === "streaming") return { ...prev, isVisible: true }
  const keepContent = prev.artifactId === artifactId
  return { ...prev, artifactId, kind, title, 
    content: keepContent ? prev.content : "", isVisible: true, boundingBox }
})
```
```

---

## LOW Findings

### L1 — Handler Registry Could Use Record Instead of Map

```
FLOW: artifact-handler-registry | STEP: 4
SEVERITY: [LOW]
FILE: lib/ai/artifact-handlers.ts:22
FINDING: The registry uses `Map<ArtifactKind, ArtifactHandler>` with runtime 
duplicate-registration guards. Since `ArtifactKind` is a known finite union 
("text" | "code" | "sheet" | "image"), a `Record<ArtifactKind, ArtifactHandler>` 
would provide compile-time completeness checks, eliminating the need for runtime 
guards and the "handler not found" error path.

RECOMMENDATION: Low priority. The Map works correctly and the runtime guard catches 
real programming errors. Only worth changing if the handler system is refactored for 
other reasons.
```

### L2 — Pyodide CDN Version Pinned to v0.23.4

```
FLOW: artifact-editor-loading | STEP: 8
SEVERITY: [LOW]
FILE: features/artifacts/components/editors/code-editor.tsx:55-56
FINDING: Pyodide is pinned to v0.23.4 (released ~2023). As of March 2026, this 
is significantly outdated. Newer versions have better performance, more packages, 
and security fixes.

RECOMMENDATION: Update to latest stable Pyodide version during a maintenance pass. 
Not urgent — it works, but it's tech debt.
```

### L3 — CodeEditor Only Supports Python

```
FLOW: artifact-editor-loading | STEP: 6
SEVERITY: [LOW]
FILE: features/artifacts/components/editors/code-editor.tsx:33-44
FINDING: `loadCodeMirrorModules()` only imports `@codemirror/lang-python`. The 
code handler's AI prompt (CODE_PROMPT) generates Python code. Language detection 
and multi-language support are not implemented. If the AI generates JavaScript 
or TypeScript in a code artifact, it renders with Python syntax highlighting.

RECOMMENDATION: Accept as-is for current scope. If multi-language support is 
needed, add `kind` metadata to code artifacts and dynamic language extension loading.
```

### L4 — `currentVersionIndex` Initialized to -1

```
FLOW: artifact-version-nav | STEP: 6
SEVERITY: [LOW]
FILE: features/artifacts/components/artifact-panel.tsx:105
FINDING: `currentVersionIndex` starts at `-1`, which means `panelVersions?.[-1]` 
returns `undefined`. The sync effect corrects this to `panelVersions.length - 1` 
once versions load. During the gap, `currentVersion` is `null` and 
`isCurrentVersion` defaults to `true` (because `panelVersions` is undefined, 
the ternary falls to the `true` branch).

This works but is semantically confusing — an index of -1 means "no version 
selected" but `isCurrentVersion` returns `true`.

RECOMMENDATION: Initialize to `0` and handle the empty-versions case explicitly. 
Or use `null` to represent "not yet synced".
```

### L5 — Console Resize Handlers Not Cleaned Up Properly

```
FLOW: artifact-editor-loading | STEP: 8
SEVERITY: [LOW]
FILE: features/artifacts/components/editors/code-editor.tsx:208-215
FINDING: The Console component adds `mousemove` and `mouseup` to `window` in an 
effect that depends on `[resize, stopResizing]`. Since `resize` is a `useCallback` 
with `[isResizing]` dependency, it gets a new identity when `isResizing` changes. 
This causes the effect to re-run, removing old listeners and adding new ones — 
which works but is wasteful.

RECOMMENDATION: Use refs for the resize callbacks to avoid effect re-runs, 
or use a single `useEffect` with the isResizing check inside the callback.
```

### L6 — Error Boundary Does Not Report Errors Externally

```
FLOW: artifact-editor-loading | STEP: 11
SEVERITY: [LOW]
FILE: features/artifacts/components/artifact-error-boundary.tsx:37-39
FINDING: `componentDidCatch` only calls `console.error`. There is no external 
error reporting (Sentry, LogRocket, etc.) or telemetry. Editor crashes are 
silently swallowed.

RECOMMENDATION: If error reporting is set up elsewhere in the project, pipe 
errors through it here. If not, this is fine as-is — but it means production 
editor crashes are invisible to the team.
```

### L7 — `ArtifactPanelEditor.kind` Typed as `string` Instead of `ArtifactKind`

```
FLOW: artifact-editor-loading | STEP: 2
SEVERITY: [LOW]
FILE: features/artifacts/components/artifact-panel-editor.tsx:12
FINDING: The `kind` prop is typed as `string` instead of `ArtifactKind`. This 
means the `switch (kind)` has a `default` branch that shows "Unsupported artifact 
kind" — which is good defensive coding but indicates the type isn't constraining 
the input properly.

RECOMMENDATION: Type as `ArtifactKind` and remove the default branch (or keep it 
as an exhaustive check with `never`).
```

### L8 — `mergeArtifactVersion` Returns Newest-First (DESC) Order

```
FLOW: artifact-save | STEP: 9
SEVERITY: [LOW]
FILE: features/artifacts/components/artifact-save-utils.ts:27-33
FINDING: `mergeArtifactVersion` returns `[nextVersion, ...remainingVersions]` — 
newest first. But `panelVersions` reverses to ASC order. After the optimistic 
update, SWR has DESC order but \`panelVersions\` re-reverses it. This works but 
is a data flow clarity issue — the merge function's output format differs from 
the panel's expected format.

RECOMMENDATION: Document the expected sort order or make `mergeArtifactVersion` 
sort-order-aware.
```

---

## Naming Consistency Audit

| Element | Convention Used | Expected | Status |
|---------|---------------|----------|--------|
| Files/dirs | kebab-case | kebab-case | ✅ |
| Components | PascalCase | PascalCase | ✅ |
| Hooks | camelCase + `use` prefix | camelCase + `use` prefix | ✅ |
| Functions | camelCase | camelCase | ✅ |
| Constants | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | ✅ |
| Types | PascalCase | PascalCase | ✅ |
| Zod schemas | camelCase + `Schema` suffix | camelCase + `Schema` suffix | ✅ |
| Handlers | `<kind>Handler` pattern | N/A (consistent) | ✅ |

**No naming violations found.** The artifacts feature follows all project conventions.

---

## Dead Code Inventory

| Item | Location | Status |
|------|----------|--------|
| `KIND_ACTIONS` empty arrays | artifact-panel.tsx:39-44 | Scaffolded, not dead — placeholder for planned feature |
| `metadata` / `setMetadata` state | artifact-panel.tsx:109 | Allocated but unused — part of KIND_ACTIONS scaffolding |
| `mode: "edit" | "diff"` in ArtifactActions | artifact-actions.tsx:22 | "diff" mode unused — deferred to Wave 4 |
| `handleVersionChange("toggle")` | artifact-panel.tsx:168 | No-op — diff mode deferred |
| `_isCurrentVersion` in ImageEditor | image-editor.tsx:50 | Prefixed as unused — acceptable |
| `ArtifactVersionData` local type | artifact-preview.tsx:39-45 | Duplicates `Artifact` from models.types — not dead but redundant |

---

## Memory Leak Assessment

| Component | Leak Risk | Mitigation Present |
|-----------|-----------|-------------------|
| TextEditor (TipTap) | LOW | `useEditor` handles cleanup automatically |
| CodeEditor (CodeMirror) | LOW | `editorRef.current.destroy()` in effect cleanup ✅ |
| SheetEditor | NONE | Pure React state, no external resources |
| ImageEditor | NONE | Native img element, no cleanup needed |
| SuggestionWidget roots | LOW | `setTimeout(() => root.unmount(), 0)` ✅ — brief window exists |
| Console event listeners | LOW | Cleaned up in effect return ✅ |
| Debounce timer | NONE | Cleared on unmount ✅ |
| Pending save AbortController | NONE | Aborted on unmount ✅ |
| SWR subscription | NONE | Auto-cleaned by SWR ✅ |
| Store listeners | NONE | `useSyncExternalStore` unsubscribes on unmount ✅ |
| Pyodide instance | MEDIUM | Loaded globally, never freed — intentional singleton |

**No active memory leaks found.** The Pyodide global singleton is intentional (avoids re-downloading 15MB WASM).

---

## Error Boundary Coverage

| Area | Coverage | Caught Errors |
|------|----------|---------------|
| Editor rendering | ✅ Per-editor `ArtifactErrorBoundary` | Render crashes, runtime errors in editors |
| Panel chrome | ❌ Not covered | Header/footer/close button errors crash the panel |
| Panel animation | ❌ Not covered | Framer-motion errors crash the panel |
| SSE streaming | ❌ Not covered (handled by chat layer) | StreamBridge errors handled by ChatStreamProvider |
| API calls | ✅ try/catch in handleSave, restore | Network errors, JSON parse errors |
| SWR fetcher | ✅ throws on !res.ok | Fetch errors surfaced via SWR error state |

**Gap:** No boundary wrapping the entire ArtifactPanel. If the header, footer, or animation layer throws, the user loses the ability to close the panel (the close button is outside the per-editor boundary). Consider wrapping the entire panel contents in an additional boundary.

---

## Type Safety Assessment

| Area | Status | Notes |
|------|--------|-------|
| Artifact store | ✅ Fully typed | `UIArtifact` enforced throughout |
| Zod schemas | ✅ Comprehensive | All API inputs validated; discriminated union for POST |
| Handler interface | ✅ Type-safe | `ArtifactHandler` contract enforced |
| Editor props | ⚠️ Minor gap | `kind` as `string` in ArtifactPanelEditor (L7) |
| Delta types | ✅ Exhaustive | processStreamDelta covers all artifact delta types |
| Stream writer | ✅ Typed | `ArtifactStreamWriter` abstraction |
| API route | ✅ Validated | Both GET and POST use Zod parsing |

**No `any` types found.** No implicit typing issues. One minor gap (L7).

---

## Summary Table

| ID | Severity | Category | File | One-line Summary |
|----|----------|----------|------|-----------------|
| C1 | CRITICAL | Streaming O(n²) | stream-artifact-deltas.ts | REPLACE semantics sends full content on every delta |
| C2 | CRITICAL | Store batching | artifact-store.ts / stream-bridge.tsx | N store emissions per RAF frame during streaming |
| C3 | CRITICAL | Editor stability | code-editor.tsx | Full state rebuild on save callback identity change |
| C4 | CRITICAL | Bundle size | artifact-panel.tsx / chat-shell.tsx | Panel chunk downloads eagerly on every page load |
| H1 | HIGH | Memo | text-editor.tsx | Streaming bypass in areEqual defeats memoization |
| H2 | HIGH | Memo | sheet-editor.tsx | Same streaming bypass issue as H1 |
| H3 | HIGH | Network | sheet-editor.tsx | No debounce on cell changes → immediate API call per edit |
| H4 | HIGH | Performance | text-editor.tsx + suggestions-extension.tsx | All decorations rebuilt from scratch per new suggestion |
| H5 | HIGH | Store | artifact-preview.tsx | useArtifact() negates useArtifactSelector granularity |
| H6 | HIGH | Data flow | artifact-panel.tsx | Version array reversed on every SWR update |
| H7 | HIGH | DB | api/artifact/route.ts | Full SELECT * for userId ownership check |
| H8 | HIGH | Correctness | api/artifact/route.ts | +1ms timestamp offset for restore is fragile |
| M1 | MEDIUM | UX | editors/lazy.ts | No loading fallback during chunk download |
| M2 | MEDIUM | Waste | image-handler.ts | Image update creates duplicate version |
| M3 | MEDIUM | Performance | artifact-panel.tsx | Version sync effect runs on every streaming delta |
| M4 | MEDIUM | DRY | artifact-preview.tsx | Duplicate SWR fetcher function |
| M5 | MEDIUM | Architecture | suggestions-extension.tsx | Separate React root per suggestion widget |
| M6 | MEDIUM | Dead code | artifact-panel.tsx | KIND_ACTIONS + metadata state fully empty |
| M7 | MEDIUM | Performance | artifact-preview.tsx | Bounding box effect runs unconditionally |
| M8 | MEDIUM | UX | artifact-preview.tsx | CompactToolResult clears cached content |
| L1 | LOW | Architecture | lib/ai/artifact-handlers.ts | Map vs Record for finite kind union |
| L2 | LOW | Maintenance | code-editor.tsx | Pyodide v0.23.4 outdated |
| L3 | LOW | Feature gap | code-editor.tsx | Only Python syntax highlighting |
| L4 | LOW | Clarity | artifact-panel.tsx | currentVersionIndex starts at -1 |
| L5 | LOW | Performance | code-editor.tsx | Console resize listeners re-bound |
| L6 | LOW | Observability | artifact-error-boundary.tsx | console.error only, no external reporting |
| L7 | LOW | Type safety | artifact-panel-editor.tsx | kind typed as string not ArtifactKind |
| L8 | LOW | Clarity | artifact-save-utils.ts | mergeArtifactVersion sort order undocumented |

---

## Confidence: HIGH

All findings are based on direct source code reading with line-level references, cross-referenced against traced flow maps. No speculation — every claim is verifiable.
