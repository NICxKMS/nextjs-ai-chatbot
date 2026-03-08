FLOW: Editor Loading
ENTRY: ArtifactPanelEditor renders and switches on `kind` to select the appropriate editor

STEPS:
  --- LAZY LOADING LAYER ---

  1. `editors/lazy.ts` (features/artifacts/components/editors/lazy.ts) defines 4 dynamic imports:
     - `TextEditor = dynamic(() => import("...text-editor").then(m => ({ default: m.TextEditor })), { ssr: false })`
     - `CodeEditor = dynamic(() => import("...code-editor").then(m => ({ default: m.CodeEditor })), { ssr: false })`
     - `SheetEditor = dynamic(() => import("...sheet-editor").then(m => ({ default: m.SheetEditor })), { ssr: false })`
     - `ImageEditor = dynamic(() => import("...image-editor").then(m => ({ default: m.ImageEditor })), { ssr: false })`
     - All use `{ ssr: false }` — not rendered during SSR, only on client
     - Consumers: `ArtifactPanelEditor` (panel) and `ArtifactPreview` (inline chat preview)

  2. When `ArtifactPanelEditor` renders:
     - Receives `{ kind, content, status, isCurrentVersion, currentVersionIndex, onSaveContent, suggestions, title }`
     - `switch (kind)` → selects editor component
     - Each editor wrapped in `<ArtifactErrorBoundary>` — catches editor render/runtime errors

  3. Next.js `dynamic()` activates:
     - First render: shows nothing (no loading fallback specified) while JS chunk loads
     - After chunk loads: editor component mounts and receives props
     - Subsequent renders: chunk is cached, editor mounts immediately

  --- TEXT EDITOR (TipTap) ---

  4. `TextEditor` (editors/text-editor.tsx):
     - Dependencies: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/markdown`, `@tiptap/extension-mathematics`, `@tiptap/extension-table*`
     - `useEditor()` creates ProseMirror editor with extensions:
       - `Mathematics` (KaTeX rendering), `StarterKit` (basic formatting), `Markdown` (markdown parser/serializer)
       - `Table`, `TableRow`, `TableHeader`, `TableCell`
       - `SuggestionsExtension` — custom ProseMirror plugin for inline suggestions
     - `content` prop → `contentType: "markdown"` — parsed as markdown
     - `immediatelyRender: false` — defers first render (SSR compat)
     - `editorProps.attributes.class: "prose dark:prose-invert"` — Tailwind typography styling
     - `onCreate`: `migrateMathStrings(editor)` — converts legacy math notation
     - `onUpdate`: if not programmatic update (`isUpdatingRef`) and no `no-save` meta → calls `onSaveContent(markdown, { debounce })`

  5. Content sync effects (TextEditor):
     - Streaming mode (`status === "streaming"`): `editor.commands.setContent(content, { emitUpdate: false, contentType: "markdown" })` — replaces editor content without triggering save
     - External content change: same `setContent` call if markdown differs from current
     - Read-only toggle: `editor.setEditable(isCurrentVersion)` via effect

  --- CODE EDITOR (CodeMirror) ---

  6. `CodeEditor` (editors/code-editor.tsx):
     - Two-phase initialization:
       a. `loadCodeMirrorModules()` — singleton Promise, imports: `@codemirror/state`, `@codemirror/view`, `codemirror`, `@codemirror/lang-python`, `@codemirror/theme-one-dark`
       b. After modules load → `useEffect` creates `EditorView` with `EditorState.create({ doc: content, extensions })`:
          - `basicSetup` (line numbers, bracket matching, etc.), `python()` (syntax highlighting), `oneDark` (theme)
          - If not current version: `EditorView.editable.of(false)` + `EditorState.readOnly.of(true)`
     - `onSaveContent` wired via `EditorView.updateListener.of(update => ...)` — checks `docChanged` and non-remote transaction
     - Extensions reconfigured on `onSaveContent` or `isCurrentVersion` change — full `editor.setState(newState)` with preserved selection

  7. Content sync (CodeEditor):
     - `editor.state.update({ changes: { from: 0, to: length, insert: content }, annotations: [Transaction.remote.of(true)] })` — replaces full document, marked as remote to skip save callback
     - Fires for streaming AND external content changes

  8. Pyodide execution (CodeEditor-specific):
     - "Run" button → `handleRunCode()`:
       a. `loadPyodideScript()` — lazy CDN load of Pyodide WASM runtime
       b. `window.loadPyodide({ indexURL })` → gets Pyodide instance
       c. `setStdout` captures output → pushed to `consoleOutputs` state
       d. `loadPackagesFromImports(code)` — auto-installs needed Python packages
       e. If matplotlib detected → injects `MATPLOTLIB_SETUP` script for PNG output
       f. `runPythonAsync(code)` → executes user code
       g. Output displayed in resizable `Console` overlay (image + text)

  --- SHEET EDITOR (react-data-grid) ---

  9. `SheetEditor` (editors/sheet-editor.tsx):
     - Dependencies: `react-data-grid`, `papaparse`
     - Initialization:
       a. `parseCSV(content)` → PapaParse to 2D array, padded to `MIN_ROWS=50` × `MIN_COLS=26`
       b. `buildColumns(readOnly)` → row number column (frozen) + 26 data columns (A-Z)
       c. `toRows(data, dataColumns)` → converts to `RowData[]` with `id` and `rowNumber`
     - `DataGrid` renders with `enableVirtualization` — only visible rows/cells in DOM
     - `onRowsChange` → `handleRowsChange(newRows)` → `unparse(updatedData)` → `onSaveContent(csv, { debounce: false })`
     - Theme: `resolvedTheme === "dark" ? "rdg-dark" : "rdg-light"` — resolved after mount to prevent hydration mismatch

  --- IMAGE EDITOR ---

  10. `ImageEditor` (editors/image-editor.tsx):
      - Minimal: `<img>` element with `src={content}` (data URL or regular URL)
      - States: loading skeleton, error state, loaded image
      - No editing capability — read-only display
      - `isInline` prop controls sizing (preview vs full panel)
      - Streaming: shows `ImagePlaceholder` with pulsing icon until content arrives

  --- ERROR BOUNDARY ---

  11. `ArtifactErrorBoundary` (artifact-error-boundary.tsx):
      - Class component (required for `getDerivedStateFromError`)
      - Catches errors only in the editor area — panel chrome (header, footer, close button) stays functional
      - Shows: error message, error code (if available), "Retry" button
      - Retry: `setState({ hasError: false })` → React re-mounts the editor

EXIT: Selected editor mounted with content displayed, save callback wired, ready for user interaction or streaming updates

BOTTLENECKS:
  - Step 3 (chunk loading): First-time editor load requires JS chunk download. TextEditor chunks include TipTap + all extensions (~100KB+). CodeEditor chunks include full CodeMirror (~150KB+). SheetEditor includes react-data-grid + PapaParse.
  - Step 6a (CodeMirror module loading): Singleton promise loads 5 separate packages via `Promise.all()`. Until all resolve, the editor shows nothing.
  - Step 8a (Pyodide loading): On-demand CDN load of Pyodide WASM (~15MB) — severe latency on first code execution. Subsequent runs use cached instance.
  - Step 6b (full state recreation on extension change): When `onSaveContent` reference changes, CodeEditor rebuilds the entire `EditorState`. This destroys and recreates extensions, losing undo history.

WASTE:
  - Step 6b: `onSaveContent` changes frequently because it depends on `panelVersions` (via `saveContent` callback). Each change triggers full editor state recreation. The save callback could be stored in a ref to avoid this.
  - Step 9a: `parseCSV` and `toRows` re-run on every content change during streaming. For REPLACE semantics with large CSVs, this means re-parsing the entire CSV on every delta.
  - Step 3 (no loading indicator): Dynamic imports have no `loading` fallback — the editor area is blank during chunk load. A skeleton or spinner would improve perceived performance.
  - Step 4 (TextEditor memo comparator): Custom `areEqual` returns `false` when both `status === "streaming"` — forces re-render on every streaming update even if content hasn't changed (because content is compared separately).

SIMPLIFICATION OPPORTUNITIES:
  - Add `loading` components to the `dynamic()` calls in lazy.ts for better UX during chunk download.
  - CodeEditor's extension reconfiguration could use CodeMirror's compartment system (`Compartment.reconfigure()`) instead of full `setState()` — this preserves undo history and is the recommended pattern.
  - Save callback stabilization: wrap `onSaveContent` in a ref inside each editor to prevent extension/state recreation on callback identity change.
  - SheetEditor could debounce CSV parsing during streaming to avoid re-parsing identical intermediate content.
