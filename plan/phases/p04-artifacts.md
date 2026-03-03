# Phase P4 — Artifacts Vertical

> **Updated per redesign audit (2026-03-01)**

> Artifact system phase. Implements the complete artifact experience: artifact handlers,
> editors, panel UI, versioning, and wires AI tools from P3 stubs to real creation.
>
> **Entry state**: P3 complete — chat works end-to-end, messages stream, StreamBridge processes artifact parts.
> **Exit state**: AI can create/update text, code, sheet artifacts; users can edit them; versions tracked; suggestion flow works.
> **Est. duration**: ~4.25 days
> **Tasks**: 18
> **Files created**: ~29

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P4-T01 | Create artifact types + schemas | IMPL | M | 2 |
| P4-T02 | Create artifact store | IMPL | L | 1 |
| P4-T03 | Create artifact hook aliases | IMPL | S | 2 |
| P4-T04 | Create text + code handlers | IMPL | M | 2 |
| P4-T05 | Create sheet + image handlers | IMPL | M | 2 |
| P4-T06 | Create handler registration | IMPL | S | 1 |
| P4-T07 | Create text editor | IMPL | L | 1 |
| P4-T08 | Create code editor | IMPL | L | 1 |
| P4-T09 | Create sheet editor | IMPL | L | 1 |
| P4-T10 | Create image editor | IMPL | S | 1 |
| P4-T11 | Create artifact panel | IMPL | L | 1 |
| P4-T12 | Create artifact support components | IMPL | M | 4 |
| P4-T13 | Create artifact error boundary | IMPL | S | 1 |
| P4-T14 | Create artifact preview | IMPL | M | 1 |
| P4-T15 | Create artifact API route | IMPL | M | 1 |
| P4-T16 | Create suggestions API route | IMPL | M | 1 |
| P4-T17 | Wire artifact panel into ChatShell | INTEG | M | 2 |
| P4-T18 | Verification gate G04 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-009 | createArtifact tool → artifact handlers | P4-T04, P4-T06 |
| SEAM-010 | updateArtifact tool → artifact handlers | P4-T04, P4-T06 |
| SEAM-011 | requestSuggestions tool → text editor | P4-T07, P4-T16 |
| SEAM-012 | Artifact stream → artifact panel | P4-T11, P4-T17 |
| SEAM-021 | Artifact version fetch | P4-T15 |
| SEAM-025 | Artifact data operations (full) | P4-T15 |
| SEAM-032 | Text editor (TipTap + suggestions) | P4-T07 |
| SEAM-033 | Code editor (CodeMirror + Pyodide) | P4-T08 |
| SEAM-034 | Sheet editor (react-data-grid + PapaParse) | P4-T09 |
| SEAM-035 | Image editor | P4-T10 |
| SEAM-037 | Pyodide script loading | P4-T08, P4-T17 |
| SEAM-039 | Version navigation + restore | P4-T12 |
| SEAM-040 | Inline artifact preview → artifact panel | P4-T14 |

---

## Tasks

---

### TASK: [ID: P4-T01]
Title: Create artifact types and schemas
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (ArtifactKind, UIArtifact, ArtifactHandler)
Architecture ref: conventions.md (feature types collocation, Zod schemas with Schema suffix); scaffold/directory-structure.md (features/artifacts/types/, features/artifacts/schemas/)

Action: Create 2 files. (1) features/artifacts/types/artifact.types.ts — Define feature-local artifact view helpers (e.g., `ArtifactActionContext`, `ArtifactToolbarItem`, `initialArtifactData`) while importing shared core types (`ArtifactKind`, `UIArtifact`, `ArtifactHandler`) from `@/lib/types/artifact.types` and `@/lib/types/artifact-handler.types`. (2) features/artifacts/schemas/artifact.schema.ts — Define Zod schemas: createArtifactSchema (title: string, kind: "text" | "code" | "sheet"), updateArtifactSchema (id: string uuid, description: string), getArtifactSchema (id: string uuid), deleteArtifactVersionSchema (id: string uuid, timestamp: string datetime), suggestionResponseSchema (suggestions: array of {originalText, suggestedText, description} max 5). Export inferred TypeScript types for each schema. <!-- C2-W4: C2-A1 fix -->

Output files:
- features/artifacts/types/artifact.types.ts
- features/artifacts/schemas/artifact.schema.ts

Inputs: lib/types/artifact.types.ts (P0-T06), zod package
Outputs: Artifact types and schemas consumed by all P4 tasks

AI layer handling: NEW

Dependencies: P0-T06
Dependents: P4-T02, P4-T03, P4-T04, P4-T05, P4-T07..T16

Success criteria:
- ArtifactKind includes all 4 types
- UIArtifact includes artifactId (NOT documentId), title, kind, content, isVisible, status
- initialArtifactData exported with sensible defaults
- ArtifactHandler interface defines `create(params)` and `update(params)` methods (no `kind` property — kind is the registry Map key) <!-- Wave 4: AR-4 / SC-1 / DA-1 — aligned to redesign naming-conventions.md §2. Was `onCreateArtifact`/`onUpdateArtifact`. -->
- createArtifactSchema validates title + kind (`kind` constrained to `"text" | "code" | "sheet"`; image creation stays in separate flow) <!-- C2-W4: C2-A1 fix -->
- deleteArtifactVersionSchema validates id + timestamp
- suggestionResponseSchema validates array of max 5 suggestions
- All schemas export inferred types
- Zero "document" identifiers in any file
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T02]
Title: Create artifact store with useSyncExternalStore
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: state-management.md (artifact state via useSyncExternalStore)
Architecture ref: redesign (useSyncExternalStore, NOT SWR synthetic key)

Action: Create features/artifacts/lib/artifact-store.ts — Artifact state store using `useSyncExternalStore`. Implements a module-level store with: getSnapshot() returns current UIArtifact state, subscribe(callback) registers listeners notified on state change, setState(updater: (prev) => UIArtifact) updates state and notifies all subscribers, reset() returns to initialArtifactData. This pattern enables fine-grained subscriptions via selectors without SWR overhead. The store is a singleton module — all consumers share the same state instance. Content accumulation logic: text deltas append, code/sheet deltas replace.

Output files:
- features/artifacts/lib/artifact-store.ts

Inputs: features/artifacts/types/artifact.types.ts (P4-T01)
Outputs: Artifact store consumed by hook aliases (P4-T03), StreamBridge (P3-T20), artifact panel (P4-T11)

AI layer handling: NEW

Dependencies: P4-T01
Dependents: P4-T03, P4-T11, P4-T17

Success criteria:
- Store uses `useSyncExternalStore` pattern (NOT SWR synthetic key)
- getSnapshot() returns current UIArtifact
- getServerSnapshot() returns `INITIAL_ARTIFACT` (SSR-safe fallback for useSyncExternalStore) <!-- Wave 4: AR-5 — useSyncExternalStore requires getServerSnapshot for SSR. -->
- subscribe() registers listener, returns unsubscribe
- setState() accepts updater function, notifies subscribers
- reset() returns to initialArtifactData
- Content accumulation: text APPEND, code/sheet REPLACE
- Module-level singleton (no React context needed for store itself)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P4-T03]
Title: Create artifact hook aliases
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: state-management.md (useArtifact, useArtifactSelector)
Architecture ref: redesign (re-exports from useSyncExternalStore store)

Action: Create 2 files. (1) features/artifacts/hooks/use-artifact.ts — "use client" hook useArtifact() that wraps `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)`. Exposes: artifact (UIArtifact), setArtifact(updater), resetArtifact(). Thin re-export from artifact-store.ts. (2) features/artifacts/hooks/use-artifact-selector.ts — "use client" hook useArtifactSelector<T>(selector: (artifact: UIArtifact) => T) that subscribes to a derived slice of artifact state. Uses `useSyncExternalStore` with a selector-based getSnapshot that only triggers re-render when the selected value changes. Passes `getServerSnapshot` with selector applied to `INITIAL_ARTIFACT` for SSR safety. Prevents unnecessary re-renders. <!-- Wave 4: AR-6 — server snapshot selector added for SSR-safe useArtifactSelector. -->

Output files:
- features/artifacts/hooks/use-artifact.ts
- features/artifacts/hooks/use-artifact-selector.ts

Inputs: features/artifacts/lib/artifact-store.ts (P4-T02)
Outputs: Artifact hooks consumed by artifact panel (P4-T11), artifact components (P4-T12, P4-T14), StreamBridge (P4-T17)

AI layer handling: NEW

Dependencies: P4-T02
Dependents: P4-T11, P4-T12, P4-T14, P4-T17

Success criteria:
- useArtifact returns UIArtifact state from useSyncExternalStore
- setArtifact accepts updater function
- useArtifactSelector(s => s.isVisible) re-renders ONLY on visibility change
- resetArtifact sets state back to initialArtifactData
- Both hooks have "use client" directive
- No SWR dependency
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P4-T04]
Title: Create text and code artifact handlers
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (text handler: streamText → artifact-textDelta; code handler: streamObject → artifact-codeDelta)
Architecture ref: SEAM-009, SEAM-010 (createArtifact/updateArtifact → handlers); redesign (ArtifactHandler type, handler registration)

Action: Create 2 files. (1) features/artifacts/handlers/text-handler.ts — Implements ArtifactHandler for kind "text". `create(params)`: calls AI SDK streamText() with artifact model, text-specific system prompt ("write Markdown, no code blocks"), title as user message, streams `artifact-textDelta` parts (APPEND delta). Returns full text content for persistence. `update(params)`: receives existing content + update description, calls streamText() with context, streams `artifact-textDelta` parts. (2) features/artifacts/handlers/code-handler.ts — Implements ArtifactHandler for kind "code". `create(params)`: calls AI SDK streamObject() with Zod schema z.object({ code: z.string() }), code-specific system prompt ("self-contained Python, use print(), max 15 lines"), streams `artifact-codeDelta` parts (REPLACE delta). `update(params)`: receives existing code + description, calls streamObject(). Handlers stream content deltas only and return the full content string. Lifecycle (preamble, persistence, postamble) is owned by the calling tool per domain-boundaries.md §3. <!-- Wave 4: AR-4 — handler methods named `create`/`update` per redesign. --> <!-- Wave 4: CONF-003 — preamble/postamble/persistence removed from handlers. Tool owns lifecycle. -->

Output files:
- features/artifacts/handlers/text-handler.ts
- features/artifacts/handlers/code-handler.ts

Inputs: lib/types/artifact-handler.types.ts (P0-T06), lib/ai/artifact-handlers.ts (P3-T04 — registry), lib/ai/provider.ts (P1-T12), lib/data/artifact.ts (P1-T08)
Outputs: Text and code handlers registered in handler registry; consumed via getArtifactHandler("text"|"code")

AI layer handling: NEW

Dependencies: P3-T04, P1-T12, P1-T08
Dependents: P4-T06

Success criteria:
- Text handler streams `artifact-textDelta` parts (APPEND, not replacement)
- Code handler streams `artifact-codeDelta` parts (REPLACE, not appending)
- Handlers stream content deltas ONLY — no preamble/postamble/persistence (tool owns lifecycle per domain-boundaries.md §3) <!-- Wave 4: CONF-003 -->
- Text handler returns full content string for persistence by calling tool
- Code handler returns full content string for persistence by calling tool
- Code handler uses streamObject with z.object({ code: z.string() })
- Zero "document" identifiers
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T05]
Title: Create sheet and image artifact handlers
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (sheet handler: streamObject → artifact-sheetDelta; image: no AI generation)
Architecture ref: SEAM-034, SEAM-035; redesign (ArtifactHandler type)

Action: Create 2 files. (1) features/artifacts/handlers/sheet-handler.ts — Implements ArtifactHandler for kind "sheet". `create(params)`: calls AI SDK streamObject() with Zod schema z.object({ csv: z.string() }), sheet-specific system prompt ("generate CSV with headers"), streams `artifact-sheetDelta` parts (REPLACE delta). `update(params)`: receives existing CSV + description, calls streamObject(). Sheet handler streams content deltas only and returns the full content string. Lifecycle (preamble, persistence, postamble) is owned by the calling tool per domain-boundaries.md §3. <!-- Wave 4: CONF-003 --> (2) features/artifacts/handlers/image-handler.ts — Minimal handler for kind "image". Image artifacts are NOT created via AI generation — they are created by code execution (Pyodide matplotlib output). `create(params)` saves provided content (base64 data URL). `update(params)` is a no-op returning existing content. Exists for type completeness and version persistence only. <!-- Wave 4: AR-4 — handler methods named `create`/`update` per redesign. -->

Output files:
- features/artifacts/handlers/sheet-handler.ts
- features/artifacts/handlers/image-handler.ts

Inputs: lib/types/artifact-handler.types.ts (P0-T06), lib/ai/artifact-handlers.ts (P3-T04), lib/data/artifact.ts (P1-T08)
Outputs: Sheet and image handlers registered in handler registry; consumed via getArtifactHandler("sheet"|"image")

AI layer handling: NEW

Dependencies: P3-T04, P1-T08, P1-T12
Dependents: P4-T06

Success criteria:
- Sheet handler streams `artifact-sheetDelta` parts (REPLACE)
- Sheet handler uses streamObject with z.object({ csv: z.string() })
- Image handler saves content without AI generation
- Image handler `update(params)` returns existing content (no-op) <!-- Wave 4: AR-4 — was `onUpdateArtifact`. -->
- Handlers stream content deltas ONLY — no preamble/postamble/persistence (tool owns lifecycle per domain-boundaries.md §3) <!-- Wave 4: CONF-003 -->
- Sheet handler returns full content string for persistence by calling tool
- Zero "document" identifiers
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T06]
Title: Create handler registration via side-effect import
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (handler registration pattern)
Architecture ref: redesign (side-effect: registers all handlers into lib/ai/artifact-handlers.ts on import)

Action: Create features/artifacts/handlers/index.ts — Side-effect module that imports all 4 handlers (text, code, sheet, image) and registers them into the handler registry at `lib/ai/artifact-handlers.ts` via `registerArtifactHandler()`. This file is imported by the chat API route to ensure all handlers are available before tool execution. The registration happens at module evaluation time (side-effect import pattern). This enables dependency inversion: tools depend on the registry interface, handlers register themselves. The registry uses `getArtifactHandler(kind)` for lookup. Note: all 4 handlers are registered (text, code, sheet, image) for update/persistence support; the `createArtifact` tool's kind enum exposes only 3 kinds (text, code, sheet) since image artifacts are created via code execution, not AI generation. <!-- Wave 4: AR-7 — clarified 4-handler registration vs 3-kind tool enum. -->

Output files:
- features/artifacts/handlers/index.ts

Inputs: features/artifacts/handlers/text-handler.ts (P4-T04), features/artifacts/handlers/code-handler.ts (P4-T04), features/artifacts/handlers/sheet-handler.ts (P4-T05), features/artifacts/handlers/image-handler.ts (P4-T05), lib/ai/artifact-handlers.ts (P3-T04)
Outputs: All handlers registered in registry; consumed by chat API route (P3-T23) via side-effect import

AI layer handling: NEW

Dependencies: P4-T04, P4-T05, P3-T04
Dependents: P4-T17, P4-T18

Success criteria:
- All 4 handlers register via side-effect import
- Registry uses registerArtifactHandler() / getArtifactHandler(kind) pattern
- Dependency inversion: tools call registry, handlers register into registry
- Importing this file makes all handlers available
- getArtifactHandler throws AppError.notFound for unknown kinds
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P4-T07]
Title: Create text editor component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (TipTap editor with suggestions extension)
Architecture ref: SEAM-032 (TipTap + suggestions extension)

Action: Create features/artifacts/components/editors/text-editor.tsx — "use client" memo component. Props: content (markdown), onSaveContent, status, isCurrentVersion, currentVersionIndex, suggestions[]. Uses TipTap editor with extensions: StarterKit, Markdown, Mathematics (KaTeX), Table extensions, custom SuggestionsExtension. During streaming (status === "streaming"): sets content without emitting save. During idle: content changes emit onSaveContent with debounced markdown output. SuggestionsExtension: inline decorations highlighting originalText spans from suggestions, popup showing suggestedText + description with accept/dismiss actions. Editor should be read-only when viewing non-current version (!isCurrentVersion).

Output files:
- features/artifacts/components/editors/text-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P4-T01), tiptap packages, oldapp/components/text-editor.tsx (reference)
Outputs: TextEditor consumed by artifact panel (P4-T11) and artifact preview (P4-T14)

AI layer handling: AI_WRAPPER

Dependencies: P4-T01
Dependents: P4-T11, P4-T14

Success criteria:
- TipTap renders markdown content
- Streaming mode: content updates without save emission
- Idle mode: content changes trigger debounced onSaveContent
- Suggestions extension highlights originalText in artifact
- Read-only when viewing non-current version
- File under 200 lines
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P4-T08]
Title: Create code editor component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (CodeMirror + Pyodide execution)
Architecture ref: SEAM-033 (CodeMirror + Pyodide)

> **AI Element Copy**: Copy `oldapp/components/elements/code-block.tsx` → `components/ai-elements/code-block.tsx` (182 LOC, 4 exports — code block with syntax highlighting).
> Wrapper imports from `@/components/ai-elements/code-block`.

Action: Create features/artifacts/components/editors/code-editor.tsx — "use client" memo component. Props: content (Python code), onSaveContent, status, isCurrentVersion, currentVersionIndex, suggestions[]. Uses CodeMirror with lazy-loaded modules (@codemirror/state, @codemirror/view, @codemirror/lang-python, @codemirror/theme-one-dark). Module cache singleton pattern to prevent re-initialization. Streaming content updates via EditorView.dispatch. Run button triggers Pyodide execution: captures stdout/stderr and matplotlib images, outputs to Console component. Read-only when viewing non-current version. Pyodide accessed from global window object (loaded via Script tag in chat layout). Includes integrated console component with resizable panel (role="slider", aria-label="Resize console", keyboard arrows ±10px).

Output files:
- features/artifacts/components/editors/code-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P4-T01), CodeMirror packages, oldapp/components/code-editor.tsx (reference)
Outputs: CodeEditor consumed by artifact panel (P4-T11)

AI layer handling: AI_WRAPPER

Dependencies: P4-T01, P0-T11
Dependents: P4-T11, P4-T14

Success criteria:
- CodeMirror renders with Python syntax highlighting
- Modules lazy-loaded with singleton cache
- Streaming content updates via EditorView.dispatch
- Run button executes code via Pyodide
- Captures stdout/stderr and matplotlib images
- Console resize handle has correct ARIA attributes
- Read-only when not current version
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P4-T09]
Title: Create sheet editor component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (react-data-grid + PapaParse CSV)
Architecture ref: SEAM-034 (sheet editor)

Action: Create features/artifacts/components/editors/sheet-editor.tsx — "use client" memo component. Props: content (CSV string), saveContent, status, isCurrentVersion, currentVersionIndex. Uses PapaParse for CSV parsing/unparsing, react-data-grid for grid rendering. Grid configuration: MIN_ROWS=50, MIN_COLS=26 (A-Z columns), frozen row-number column (width 50px), data columns width 120px. Parsing: CSV string → rows/columns on content change or streaming update. Cell editing: on edit → re-serialize to CSV via PapaParse.unparse → saveContent. Empty cell padding to MIN_ROWS/MIN_COLS. Dark mode support. Read-only when not current version.

Output files:
- features/artifacts/components/editors/sheet-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P4-T01), papaparse, react-data-grid, oldapp/components/sheet-editor.tsx (reference)
Outputs: SheetEditor consumed by artifact panel (P4-T11) and artifact preview (P4-T14)

AI layer handling: AI_WRAPPER

Dependencies: P4-T01
Dependents: P4-T11, P4-T14

Success criteria:
- CSV parsed into grid rows/columns via PapaParse
- Grid renders with Min 50 rows, 26 columns (A-Z)
- Frozen row-number column (width 50px)
- Cell editing triggers save via CSV re-serialization
- Empty cell padding applied
- Dark mode classes present
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P4-T10]
Title: Create image editor component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (image display from base64/URL)
Architecture ref: SEAM-035 (image editor)

> **AI Element Copy**: Copy `oldapp/components/elements/image.tsx` → `components/ai-elements/image.tsx` (107 LOC, 2 exports — image component).
> Wrapper imports from `@/components/ai-elements/image`.

Action: Create features/artifacts/components/editors/image-editor.tsx — "use client" component. Props: content (base64 data URL or URL string), title, status, isCurrentVersion, isInline? (for artifact preview). Renders image via next/image or native img element. Handles streaming state (show loader/placeholder). Handles inline vs full display modes (isInline: constrained size; full: fills available space). No AI server handler — images come from Pyodide execution (matplotlib output).

Output files:
- features/artifacts/components/editors/image-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P4-T01)
Outputs: ImageEditor consumed by artifact panel (P4-T11) and artifact preview (P4-T14)

AI layer handling: NEW

Dependencies: P4-T01
Dependents: P4-T11, P4-T14

Success criteria:
- Renders base64 data URL images and regular URLs
- Streaming state shows loader placeholder
- Inline mode constrains size
- Full mode fills container
- No AI generation logic (display only)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P4-T11]
Title: Create artifact panel component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (panel layout, visibility logic, AnimatePresence)
Architecture ref: SEAM-012 (artifact stream → panel); redesign (ArtifactPanel naming)

> **AI Element Copy**: Copy `oldapp/components/elements/artifact.tsx` → `components/ai-elements/artifact.tsx` (128 LOC, 16 exports — artifact, header, close, title, description, actions, content).
> Wrapper imports from `@/components/ai-elements/artifact`.

Action: Create features/artifacts/components/artifact-panel.tsx — "use client" memo component. The main artifact panel overlay. Layout: fixed overlay z-50 h-dvh w-dvw. Full-width editor content on all screen sizes (no separate message sidebar). AnimatePresence for open/close with spring animation. Internal state: mode ("edit"), artifact (fetched versions), currentVersionIndex, isContentDirty. Routes to correct editor by artifact.kind: text → TextEditor, code → CodeEditor, sheet → SheetEditor, image → ImageEditor. Includes: ArtifactCloseButton, ArtifactActions, VersionFooter, ArtifactErrorBoundary wrapping editor content. Uses `useArtifactSelector` for visibility-driven rendering. Version data fetched via SWR (`useSWR`) keyed on artifact ID for client-side caching and revalidation. <!-- Wave 4: AR-1 (CRITICAL) removed ArtifactMessages sidebar — redesign explicitly removed the 400px message sidebar. AR-2 removed standalone Toolbar — consolidated into ArtifactActions (P4-T12). AR-3 removed vestigial `isToolbarVisible` state. AR-8 removed dead "diff" mode — not implemented this phase; deferred to post-MVP. AR-9 specified SWR as version-fetching mechanism. -->

Output files:
- features/artifacts/components/artifact-panel.tsx

Inputs: features/artifacts/hooks/ (P4-T03), features/artifacts/components/editors/ (P4-T07..T10), features/artifacts/types/ (P4-T01), supporting components (P4-T12)
Outputs: ArtifactPanel consumed by ChatShell (P4-T17)

AI layer handling: AI_WRAPPER

Dependencies: P4-T01, P4-T03, P4-T07, P4-T08, P4-T09, P4-T10, P4-T12, P4-T13, P0-T11
Dependents: P4-T17

Success criteria:
- Panel renders as fixed overlay when artifact.isVisible is true
- Routes to correct editor based on artifact.kind
- Full-width editor content, no ArtifactMessages sidebar <!-- Wave 4: AR-1 -->
- AnimatePresence open/close animation
- Version navigation tracks currentVersionIndex
- Artifact versions fetched via SWR (`useSWR`) keyed on artifact ID <!-- Wave 4: AR-9 -->
- ArtifactErrorBoundary wraps editor content
- Uses useArtifactSelector (not SWR) for artifact state; SWR used only for version data fetching
- No standalone Toolbar component — actions consolidated into ArtifactActions <!-- Wave 4: AR-2 -->
- No `isToolbarVisible` internal state <!-- Wave 4: AR-3 -->
- Mode state is `"edit"` only (diff deferred to post-MVP) <!-- Wave 4: AR-8 -->
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P4-T12]
Title: Create artifact support components
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (actions, close button, version footer)
Architecture ref: SEAM-039 (version navigation + restore); redesign (useArtifactSelector)

Action: Create 4 files. (1) features/artifacts/components/artifact-actions.tsx — Memo component. Renders per-kind action buttons. Each action receives ArtifactActionContext and renders as Button + Tooltip. Uses `useArtifactSelector` for state access. (2) features/artifacts/components/artifact-close-button.tsx — Memo component (always skips re-render). On click: sets `isVisible: false` on artifact state via store (pure visibility toggle; reset handled by chat lifecycle events per state-management/streaming specs). Uses `useArtifactSelector`. (3) features/artifacts/components/version-footer.tsx — Version navigation. Shows "Version {n} of {total}" with prev/next/restore/latest buttons. handleVersionChange("prev"|"next"|"toggle"|"latest"). Restore uses `POST /api/artifact` restore mode payload (`{ id, timestamp, mode: "restore" }`) to remove later versions. Uses motion for mount animation. (4) features/artifacts/components/artifact-tool-result.tsx — Memo component. Renders tool call result cards for artifact creation/update in the message stream. Exports `ArtifactToolResult` (memo) and `ArtifactToolCall`. Shows clickable card ("Created artifact: {title}") with artifact kind icon and mini preview via ArtifactPreview. On click opens full artifact panel. Consumed by message.tsx for tool invocation rendering. <!-- Wave 4: CONF-010 — missing component added per W2-AO-1. -->

Output files:
- features/artifacts/components/artifact-actions.tsx
- features/artifacts/components/artifact-close-button.tsx
- features/artifacts/components/version-footer.tsx
- features/artifacts/components/artifact-tool-result.tsx

Inputs: features/artifacts/types/artifact.types.ts (P4-T01), features/artifacts/hooks/ (P4-T03), components/ui/ (P0-T11)
Outputs: Supporting components consumed by artifact panel (P4-T11)

AI layer handling: NEW

Dependencies: P4-T01, P4-T03, P0-T11
Dependents: P4-T11

Success criteria:
- ArtifactActions renders correct buttons for each artifact kind
- ArtifactCloseButton toggles artifact panel visibility only (sets `isVisible: false` on close; reset handled by chat lifecycle events per state-management/streaming specs)
- VersionFooter shows version info with navigation buttons
- Restore deletes later versions via API using artifactId (NOT documentId)
- ArtifactToolResult renders tool call result cards for artifact creation/update in message stream <!-- Wave 4: CONF-010 -->
- ArtifactToolResult wraps ArtifactPreview for inline preview <!-- Wave 4: CONF-010 -->
- All components use useArtifactSelector for state
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T13]
Title: Create artifact error boundary
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (editor crash boundary)
Architecture ref: SEAM-027 (error boundaries — artifact level)

Action: Create features/artifacts/components/artifact-error-boundary.tsx — Class component React error boundary with getDerivedStateFromError + componentDidCatch. Fallback UI: "Failed to render artifact" message + error code + "Retry" button that resets error state. The boundary wraps only the editor content area inside the artifact panel — the panel chrome (close button, actions, version footer) remains functional outside the boundary. Error logging via console.error.

Output files:
- features/artifacts/components/artifact-error-boundary.tsx

Inputs: lib/errors/app-error.ts (P0-T08)
Outputs: ArtifactErrorBoundary consumed by artifact panel (P4-T11)

AI layer handling: NEW

Dependencies: P0-T08
Dependents: P4-T11

Success criteria:
- Class component with getDerivedStateFromError
- Fallback shows error message and retry button
- Retry resets error state
- Panel chrome (close, actions, footer) remains functional outside boundary
- Error logged to console
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P4-T14]
Title: Create artifact preview component
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: artifacts-system.md (inline preview in messages)
Architecture ref: SEAM-040 (inline artifact preview → artifact panel); redesign (artifact-preview.tsx, NOT document-preview.tsx)

Action: Create features/artifacts/components/artifact-preview.tsx — Component rendered inline in chat messages for tool call results. Fetches artifact data for preview display. Shows mini editor preview (read-only) with artifact title and kind icon. Skeleton loading state. On click: captures bounding box via ref, calls setArtifact({artifactId, isVisible: true, boundingBox}) to open full artifact panel with origin animation. Uses `useArtifactSelector` for state interaction. File is named artifact-preview.tsx (NOT document-preview.tsx).

Output files:
- features/artifacts/components/artifact-preview.tsx

Inputs: features/artifacts/hooks/ (P4-T03), features/artifacts/types/ (P4-T01), features/artifacts/components/editors/ (P4-T07..T10)
Outputs: ArtifactPreview consumed by message rendering (P3-T15)

AI layer handling: NEW

Dependencies: P4-T01, P4-T03, P4-T07, P4-T08, P4-T09, P4-T10, P0-T11
Dependents: P4-T18

Success criteria:
- Artifact preview fetches artifact data and renders mini preview
- Skeleton state shown during loading
- Click opens full artifact panel with bounding box animation origin
- Uses artifactId parameter (NOT documentId)
- File named artifact-preview.tsx (NOT document-preview.tsx)
- Uses useArtifactSelector for state
- Handles all artifact kinds
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T15]
Title: Create artifact API route
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: api-contracts.md (GET + POST /api/artifact) <!-- W4-CYCLE1: CONFLICT-006 fix — GET added for version reads per seam-inventory.md, contracts.md, final_plan/phase-04-plan.md, redesign data-flow.md. Previous CONF-023 (POST-only) overridden. -->
Architecture ref: SEAM-021 (artifact version fetch); SEAM-025 (artifact data full); redesign (revalidateTag on save)

Action: Create app/api/artifact/route.ts — GET + POST exports. **GET**: return all versions of an artifact by id (query param `?id=`), auth + ownership check. Enables SWR GET dedup pattern for version reads. **POST**: two modes via `mode` field in request body: (1) `save` mode: persist a new artifact version (from manual client-side edits) and call `revalidateTag('artifact:{id}', 'max')`. (2) `restore` mode: accept `{ id, timestamp, mode: "restore" }` and truncate later versions, then revalidate the artifact tag. All operations use lib/data/artifact.ts functions. Auth checks, Zod validation, and error handling included. <!-- W4-CYCLE1: CONFLICT-006 fix — GET added for version reads. POST retains save/restore modes. Previous CONF-023 (POST-only) overridden by 4 authoritative sources requiring GET. -->

Output files:
- app/api/artifact/route.ts

Inputs: lib/data/artifact.ts (P1-T08), lib/auth/session.ts (P2-T01), features/artifacts/schemas/artifact.schema.ts (P4-T01), lib/cache/revalidate.ts (P1-T03)
Outputs: API route consumed by artifact panel version fetches (P4-T11), artifact preview (P4-T14)

AI layer handling: NEW

Dependencies: P4-T01, P2-T01, P1-T08, P1-T03, P0-T08
Dependents: P4-T11, P4-T14, P4-T18

Success criteria:
- GET /api/artifact?id= returns artifact versions array (enables SWR GET dedup) <!-- W4-CYCLE1: CONFLICT-006 fix -->
- POST /api/artifact in save mode (`mode: "save"`) saves new version + calls revalidateTag('artifact:{id}', 'max') + returns `{ artifact: Artifact }` <!-- C2-W4: C2X-003 fix -->
- POST /api/artifact in restore mode accepts `{ id, timestamp, mode: "restore" }`, removes versions after timestamp, and returns `{ success: true }` <!-- C2-W4: C2-A4 fix -->
- Auth + ownership checks on all operations
- Uses artifactId (NOT documentId) throughout
- Error responses use AppError.toResponse()
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T16]
Title: Create suggestions API route
Phase: 4 — Artifacts Vertical
Type: IMPL

Behavior ref: api-contracts.md (GET /api/suggestions)
Architecture ref: redesign (artifactId parameter)

Action: Create app/api/suggestions/route.ts — GET: fetch suggestions for an artifact by artifactId query param. Returns persisted suggestions from Suggestion table for authenticated users. Guest users get empty array (suggestions not persisted for guests). Auth check, Zod validation, error handling included.

Output files:
- app/api/suggestions/route.ts

Inputs: lib/data/suggestion.ts (P1-T10), lib/auth/session.ts (P2-T01)
Outputs: Suggestions API consumed by text editor suggestion display

AI layer handling: NEW

Dependencies: P1-T10, P2-T01, P0-T08
Dependents: P4-T18

Success criteria:
- GET /api/suggestions?artifactId= returns suggestions array
- Uses artifactId parameter (NOT documentId)
- Auth check present
- Guest users get empty array
- Error handling present
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T17]
Title: Wire artifact panel into ChatShell
Phase: 4 — Artifacts Vertical
Type: INTEG

Behavior ref: state-management.md (StreamBridge → artifactStore → panel)
Architecture ref: SEAM-012 (artifact stream → panel); SEAM-037 (Pyodide script); redesign (ChatShell orchestrator, StreamBridge → artifactStore)

Action: Update 2 files. (1) features/chat/components/chat-shell.tsx — Conditionally render ArtifactPanel when artifact is visible. ArtifactPanel loaded via dynamic import for code splitting. Visibility controlled by `useArtifactSelector(a => a.isVisible)`. (2) Wire StreamBridge's `onArtifactDelta` callback (output interface from P3-T20) to `artifactStore.setState()`. This is the task that connects StreamBridge's typed callback to the real artifact store — P3-T20 only defines the callback interface with a no-op default; P4-T17 provides the real implementation. StreamBridge is a thin bridge (~20 lines) that calls `processStreamDelta()` → `artifactStore.setState()`. ChatStreamProvider carries stream-state only (artifact state remains in `artifactStore`, not provider context). <!-- Wave 4: SC-4 — clarified that P4-T17 (not P3-T20) wires `onArtifactDelta` to `artifactStore.setState`. Removes overlap with P3-T20 which only outputs deltas via typed callback. -->

Output files:
- features/chat/components/chat-shell.tsx (modify)
- features/chat/components/stream-bridge.tsx (modify if needed)

Inputs: features/artifacts/components/artifact-panel.tsx (P4-T11), features/artifacts/lib/artifact-store.ts (P4-T02), features/chat/components/stream-bridge.tsx (P3-T20)
Outputs: Complete artifact ↔ chat integration via ChatShell

AI layer handling: NEW

Dependencies: P4-T02, P4-T03, P4-T11, P3-T20
Dependents: P4-T18

Success criteria:
- ArtifactPanel renders when artifact.isVisible is true (via useArtifactSelector)
- P4-T17 wires StreamBridge's `onArtifactDelta` callback to `artifactStore.setState` — this is where the cross-phase connection happens <!-- Wave 4: SC-4 -->
- StreamBridge processes all artifact-* delta types into artifactStore
- Code splitting: ArtifactPanel loaded via dynamic import
- ChatStreamProvider remains stream-state only; artifact state lives in artifactStore
- StreamBridge is thin (~20 lines) — logic in processStreamDelta()
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P4-T18]
Title: Verification gate G04
Phase: 4 — Artifacts Vertical
Type: VERIFY

Behavior ref: artifacts-system.md (complete artifact flow)
Architecture ref: AGENTS.md (post-implementation validation); redesign (P4 exit criteria)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) AI can call createArtifact tool → artifact panel opens with correct editor, (5) Text artifacts stream artifact-textDelta and render in TipTap, (6) Code artifacts stream artifact-codeDelta and render in CodeMirror, (7) Sheet artifacts stream artifact-sheetDelta and render in react-data-grid, (8) User can edit artifact content directly, (9) Edits create new versions, (10) Version footer shows version info with navigation, (11) AI can call updateArtifact → existing content updated, (12) Suggestions stream and display in text editor, (13) Artifact preview renders inline in messages, (14) Artifact error boundary catches editor crashes, (15) Code execution via Pyodide works.

Output files: none (validation only)

Inputs: all P4-T01 through P4-T17 outputs
Outputs: Gate G04 passed — artifacts vertical complete; P5 may continue in parallel with P4 completion per phase-order strategy

AI layer handling: N/A

Dependencies: P4-T01 through P4-T17
Dependents: P6 (enhancements phase dependency)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- `artifactStore` uses `useSyncExternalStore` (NOT SWR synthetic key)
- `useArtifactSelector(s => s.isVisible)` re-renders ONLY on visibility change
- All 4 handlers register via side-effect import in `handlers/index.ts`
- Handler registry uses `getArtifactHandler(kind)` pattern (dependency inversion)
- Text handler uses APPEND delta, code/sheet use REPLACE delta
- Artifact API route calls `revalidateTag('artifact:{id}', 'max')` on save
- Suggestions API uses `artifactId` parameter (NOT documentId)
- All files/types use "artifact" naming (zero "document")
- createArtifact tool creates artifacts for 3 kinds (`text`, `code`, `sheet`); image generation is a separate flow <!-- C2-W4: C2-A1 fix -->
- updateArtifact tool updates existing artifacts
- Version navigation works (prev/next/restore)
- Artifact panel opens/closes with animation
- Artifact preview opens full panel on click

Complexity: S
