# Phase P04 — Artifacts Vertical

> Artifact system phase. Implements the complete artifact experience: document handlers,
> editors, panel UI, versioning, diff view, and wires AI tools from P03 stubs to real creation.
>
> **Entry state**: P03 complete — chat works end-to-end, messages stream, DataStreamHandler processes data parts.
> **Exit state**: AI can create/update text, code, sheet artifacts; users can edit them; versions tracked; suggestion flow works.
> **Est. duration**: ~4 days
> **Tasks**: 22
> **Files created**: ~30

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P04-T01 | Define artifact types | IMPLEMENTATION | M | 1 |
| P04-T02 | Create artifact Zod schemas | IMPLEMENTATION | S | 1 |
| P04-T03 | Create artifact hooks | IMPLEMENTATION | L | 2 |
| P04-T04 | Create document handler factory | IMPLEMENTATION | L | 1 |
| P04-T05 | Create text document handler | IMPLEMENTATION | M | 1 |
| P04-T06 | Create code document handler | IMPLEMENTATION | M | 1 |
| P04-T07 | Create sheet document handler | IMPLEMENTATION | M | 1 |
| P04-T08 | Create image document handler | IMPLEMENTATION | S | 1 |
| P04-T09 | Wire createDocument tool | INTEGRATION | L | 1 |
| P04-T10 | Wire updateDocument tool | INTEGRATION | M | 1 |
| P04-T11 | Wire requestSuggestions tool | INTEGRATION | M | 1 |
| P04-T12 | Create text editor | IMPLEMENTATION | L | 1 |
| P04-T13 | Create code editor | IMPLEMENTATION | L | 1 |
| P04-T14 | Create console component | IMPLEMENTATION | M | 1 |
| P04-T15 | Create sheet editor | IMPLEMENTATION | L | 1 |
| P04-T16 | Create image editor | IMPLEMENTATION | S | 1 |
| P04-T17 | Create artifact panel | IMPLEMENTATION | L | 1 |
| P04-T18 | Create artifact supporting components | IMPLEMENTATION | L | 4 |
| P04-T19 | Create document preview + diffview | IMPLEMENTATION | M | 2 |
| P04-T20 | Create artifact API routes | IMPLEMENTATION | M | 2 |
| P04-T21 | Wire artifact panel into chat | INTEGRATION | L | 2 |
| P04-T22 | Verification gate G04 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-009 | createDocument tool → artifact handlers | P04-T09 |
| SEAM-010 | updateDocument tool → artifact handlers | P04-T10 |
| SEAM-011 | requestSuggestions tool → text editor | P04-T11 |
| SEAM-012 | Artifact stream → artifact panel | P04-T17, P04-T21 |
| SEAM-021 | Document version fetch | P04-T20 |
| SEAM-025 | Document data operations (full) | P04-T20 |
| SEAM-032 | Text editor (TipTap + suggestions) | P04-T12 |
| SEAM-033 | Code editor (CodeMirror + Pyodide) | P04-T13, P04-T14 |
| SEAM-034 | Sheet editor (react-data-grid + PapaParse) | P04-T15 |
| SEAM-035 | Image editor | P04-T16 |
| SEAM-037 | Pyodide script loading | P04-T21 |
| SEAM-039 | Version navigation + restore | P04-T18 |
| SEAM-040 | Inline document preview → artifact panel | P04-T19 |

---

## Tasks

---

### TASK: [ID: P04-T01]
Title: Define artifact type definitions
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (ArtifactKind, UIArtifact, ArtifactDefinition, ArtifactActionContext, ArtifactToolbarItem)
Architecture ref: conventions.md (feature types collocation); scaffold/directory-structure.md (features/artifacts/types/)

Action: Create features/artifacts/types/artifact.types.ts — Define all artifact-related types: ArtifactKind literal union ("text" | "code" | "image" | "sheet"), UIArtifact (documentId, title, kind, content, isVisible, status: "idle" | "streaming", boundingBox?), ArtifactDefinition (kind, description, content renderer component, actions array, toolbar items), ArtifactActionContext (artifact, handleVersionChange, currentVersionIndex, isCurrentVersion, mode, metadata, setMetadata), ArtifactToolbarContext, ArtifactToolbarItem (description, icon, onClick). Export initialArtifactData constant (empty UIArtifact with all defaults). Export artifactDefinitions array stub (populated as editors are built). This is the type foundation for all artifact components.

Output files:
- features/artifacts/types/artifact.types.ts

Inputs: lib/types/ai.types.ts (P00-T08 — CustomUIDataTypes), artifacts-system.md
Outputs: Artifact types consumed by all P04 tasks; UIArtifact consumed by useArtifact (P04-T03), artifact panel (P04-T17), DataStreamHandler (P03-T12)

AI layer handling: NEW

Dependencies: P00-T08
Dependents: P04-T02, P04-T03, P04-T04, P04-T12, P04-T13, P04-T15, P04-T16, P04-T17, P04-T18, P04-T19, P04-T21

Success criteria:
- ArtifactKind includes all 4 types
- UIArtifact includes documentId, title, kind, content, isVisible, status
- initialArtifactData exported with sensible defaults
- ArtifactDefinition includes kind, component, actions, toolbar
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T02]
Title: Create artifact validation schemas
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (document CRUD endpoints)
Architecture ref: conventions.md (Zod schemas with Schema suffix)

Action: Create features/artifacts/schemas/artifact.schema.ts — Define Zod schemas: createDocumentSchema (title: string, kind: ArtifactKind enum), updateDocumentSchema (id: string uuid, description: string), getDocumentSchema (id: string uuid), deleteDocumentVersionSchema (id: string uuid, timestamp: string datetime — for version restore DELETE), suggestionResponseSchema (suggestions: array of {originalText, suggestedText, description} max 5). Export inferred TypeScript types for each schema.

Output files:
- features/artifacts/schemas/artifact.schema.ts

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), zod package
Outputs: Schemas consumed by artifact API routes (P04-T20), artifact tools (P04-T09, P04-T10, P04-T11)

AI layer handling: NEW

Dependencies: P04-T01
Dependents: P04-T09, P04-T10, P04-T11, P04-T20

Success criteria:
- createDocumentSchema validates title + kind
- deleteDocumentVersionSchema validates id + timestamp
- suggestionResponseSchema validates array of max 5 suggestions
- All schemas export inferred types
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P04-T03]
Title: Create artifact hooks
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: state-management.md (useArtifact SWR-based state, useArtifactSelector derived slice)
Architecture ref: DEV-007 (SWR for artifact state, no Jotai); ADR-001 (feature hooks collocation)

Action: Create 2 files. (1) features/artifacts/hooks/use-artifact.ts — "use client" hook useArtifact() that manages artifact panel state via SWR. Uses useSWR("artifact", null, { fallbackData: initialArtifactData }). Exposes: artifact (UIArtifact), setArtifact(updater: (prev) => UIArtifact) via SWR optimistic mutate, resetArtifact() to reset to initial state. Handles content accumulation: text deltas append, code/sheet deltas replace. (2) features/artifacts/hooks/use-artifact-selector.ts — "use client" hook useArtifactSelector<T>(selector: (artifact: UIArtifact) => T) that subscribes to a derived slice of artifact state. Prevents re-renders when selected value hasn't changed (uses useSyncExternalStore or React.useMemo with shallow compare). Returns the selected slice.

Output files:
- features/artifacts/hooks/use-artifact.ts
- features/artifacts/hooks/use-artifact-selector.ts

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), swr package
Outputs: Artifact hooks consumed by DataStreamHandler (P03-T12 update), artifact panel (P04-T17), artifact components (P04-T18, P04-T19)

AI layer handling: NEW

Dependencies: P04-T01
Dependents: P04-T17, P04-T18, P04-T19, P04-T21

Success criteria:
- useArtifact returns UIArtifact state from SWR
- setArtifact accepts updater function for optimistic mutation
- useArtifactSelector only re-renders when selected slice changes
- resetArtifact sets state back to initialArtifactData
- Both hooks have "use client" directive
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T04]
Title: Create document handler factory
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (createDocumentHandler factory, handler registration)
Architecture ref: architecture/patterns.md (factory pattern for artifact types); SEAM-009 (tool → handler)

Action: Create features/artifacts/handlers/base.ts — DocumentHandler interface with kind, onCreateDocument({id, title, dataStream, session, chatId}), onUpdateDocument({id, description, dataStream, session}). Export createDocumentHandler<T>({kind, onCreateDocument, onUpdateDocument}) factory function. The factory wraps each handler with standard data stream preamble/postamble: writes data-kind, data-id, data-title, data-clear before handler, writes data-finish after. Persists document to DB/cache via lib/data/document.ts saveDocumentVersion(). Export documentHandlersByArtifactKind map: Record<ArtifactKind, DocumentHandler> (populated as handlers register). Export getDocumentHandler(kind: ArtifactKind) lookup function.

Output files:
- features/artifacts/handlers/base.ts

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), lib/data/document.ts (P01-T09), lib/utils/index.ts (generateUUID)
Outputs: Handler factory consumed by per-kind handlers (P04-T05 through P04-T08); handler map consumed by tools (P04-T09, P04-T10)

AI layer handling: NEW

Dependencies: P04-T01, P01-T09
Dependents: P04-T05, P04-T06, P04-T07, P04-T08, P04-T09, P04-T10

Success criteria:
- createDocumentHandler returns handler with kind + onCreateDocument + onUpdateDocument
- Factory wraps handler with data stream preamble (data-kind, data-id, data-title, data-clear) and postamble (data-finish)
- Factory calls saveDocumentVersion() for persistence after handler completes
- documentHandlersByArtifactKind map is exported and mutable for registration
- getDocumentHandler throws AppError.notFound for unknown kinds
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T05]
Title: Create text document handler
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (text handler: streamText → data-textDelta)
Architecture ref: SEAM-032 (text editor integration)

Action: Create features/artifacts/handlers/text.ts — Build text handler using createDocumentHandler. onCreateDocument: calls AI SDK streamText() with artifact model (DEFAULT_ARTIFACT_MODEL), text-specific system prompt (textPrompt — "write Markdown, no code blocks"), title as user message, streams data-textDelta parts for each text chunk. Returns full text content for persistence. onUpdateDocument: receives existing document content + update description, calls streamText() with existing content in context and description as instruction, streams data-textDelta parts. Register handler in documentHandlersByArtifactKind["text"]. Export textPrompt for testing.

Output files:
- features/artifacts/handlers/text.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04), lib/ai/providers.ts (P03-T02 — getModel), ai SDK (streamText)
Outputs: Text handler registered in handler map; consumed via getDocumentHandler("text")

AI layer handling: NEW

Dependencies: P04-T04, P03-T02
Dependents: P04-T09, P04-T10

Success criteria:
- Handler registered for kind "text"
- onCreateDocument streams data-textDelta parts
- onUpdateDocument receives existing content and description
- Uses DEFAULT_ARTIFACT_MODEL for model resolution
- Content deltas are appendable (not full replacement)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T06]
Title: Create code document handler
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (code handler: streamObject({code}) → data-codeDelta)
Architecture ref: SEAM-033 (code editor integration)

Action: Create features/artifacts/handlers/code.ts — Build code handler using createDocumentHandler. onCreateDocument: calls AI SDK streamObject() with artifact model, Zod schema z.object({ code: z.string() }), code-specific system prompt (codePrompt — "self-contained Python, use print(), max 15 lines"). Streams data-codeDelta parts (full code replacement on each partial). Returns final code string for persistence. onUpdateDocument: receives existing code + description, calls streamObject() with existing code in context. Register handler in documentHandlersByArtifactKind["code"]. Export codePrompt.

Output files:
- features/artifacts/handlers/code.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04), lib/ai/providers.ts (P03-T02), ai SDK (streamObject), zod
Outputs: Code handler registered in handler map; consumed via getDocumentHandler("code")

AI layer handling: NEW

Dependencies: P04-T04, P03-T02
Dependents: P04-T09, P04-T10

Success criteria:
- Handler registered for kind "code"
- Uses streamObject with z.object({ code: z.string() }) schema
- Streams data-codeDelta parts (full replacement, not appending)
- System prompt enforces Python and max 15 lines
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T07]
Title: Create sheet document handler
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (sheet handler: streamObject({csv}) → data-sheetDelta)
Architecture ref: SEAM-034 (sheet editor integration)

Action: Create features/artifacts/handlers/sheet.ts — Build sheet handler using createDocumentHandler. onCreateDocument: calls AI SDK streamObject() with artifact model, Zod schema z.object({ csv: z.string() }), sheet-specific system prompt (sheetPrompt — "generate CSV with headers"). Streams data-sheetDelta parts (full CSV replacement). Returns final CSV string for persistence. onUpdateDocument: receives existing CSV + description, calls streamObject(). Register handler in documentHandlersByArtifactKind["sheet"]. Export sheetPrompt.

Output files:
- features/artifacts/handlers/sheet.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04), lib/ai/providers.ts (P03-T02), ai SDK (streamObject), zod
Outputs: Sheet handler registered in handler map; consumed via getDocumentHandler("sheet")

AI layer handling: NEW

Dependencies: P04-T04, P03-T02
Dependents: P04-T09, P04-T10

Success criteria:
- Handler registered for kind "sheet"
- Uses streamObject with z.object({ csv: z.string() }) schema
- Streams data-sheetDelta parts (full replacement)
- System prompt enforces CSV with headers
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T08]
Title: Create image document handler
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (image: no server AI handler, Pyodide-only creation)
Architecture ref: SEAM-035 (image editor)

Action: Create features/artifacts/handlers/image.ts — Minimal handler. Image artifacts are NOT created via AI generation — they are created by code execution (Pyodide matplotlib output). The handler registers in documentHandlersByArtifactKind["image"] but onCreateDocument simply saves the provided content (base64 data URL) as a document version. onUpdateDocument is a no-op that returns existing content. This handler exists for type completeness and version persistence only.

Output files:
- features/artifacts/handlers/image.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04)
Outputs: Image handler registered in handler map

AI layer handling: NEW

Dependencies: P04-T04
Dependents: P04-T09

Success criteria:
- Handler registered for kind "image"
- onCreateDocument saves content without AI generation
- onUpdateDocument returns existing content
- No AI SDK calls (image generation is client-side via Pyodide)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P04-T09]
Title: Wire createDocument tool to artifact handlers
Phase: 4 — Artifacts Vertical
Type: INTEGRATION

Behavior ref: artifacts-system.md (createDocument tool flow); ai-sdk-usage.md (tool definition)
Architecture ref: SEAM-009 (createDocument → artifact handlers)

Action: Replace the stub in features/chat/lib/tools/create-document.ts (created in P03-T08) with full implementation. The createDocument tool: Zod schema params {title: string, kind: ArtifactKind enum}. Execute function: (1) Look up handler via getDocumentHandler(kind), (2) Call handler.onCreateDocument({id: generateUUID(), title, dataStream, session, chatId}), (3) Return tool result message ("A document was created and is now visible to the user"). The tool uses dataStream from the enclosing stream context to write artifact data parts. Import and wire documentHandlersByArtifactKind from P04-T04.

Output files:
- features/chat/lib/tools/create-document.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04), features/artifacts/handlers/*.ts (P04-T05 through P04-T08), features/artifacts/schemas/artifact.schema.ts (P04-T02)
Outputs: Functional createDocument tool consumed by chat completion (P03-T07)

AI layer handling: NEW

Dependencies: P04-T04, P04-T05, P04-T06, P04-T07, P04-T08, P04-T02
Dependents: P04-T21, P04-T22

Success criteria:
- Tool no longer returns "not yet available" stub
- Tool params validated with Zod (title + kind)
- Handler looked up by kind and called with correct params
- Data stream parts written: data-kind, data-id, data-title, data-clear, content deltas, data-finish
- Tool returns user-facing message about document creation
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T10]
Title: Wire updateDocument tool to artifact handlers
Phase: 4 — Artifacts Vertical
Type: INTEGRATION

Behavior ref: artifacts-system.md (updateDocument tool flow)
Architecture ref: SEAM-010 (updateDocument → artifact handlers)

Action: Replace the stub in features/chat/lib/tools/update-document.ts (created in P03-T08) with full implementation. The updateDocument tool: Zod schema params {id: string uuid, description: string}. Execute function: (1) Fetch existing document via lib/data/document.ts, (2) Determine kind from document, (3) Look up handler via getDocumentHandler(kind), (4) Call handler.onUpdateDocument({id, description, dataStream, session}), (5) Return tool result message ("The document has been updated"). Handler receives existing content and description to generate updated version.

Output files:
- features/chat/lib/tools/update-document.ts

Inputs: features/artifacts/handlers/base.ts (P04-T04), lib/data/document.ts (P01-T09), features/artifacts/schemas/artifact.schema.ts (P04-T02)
Outputs: Functional updateDocument tool consumed by chat completion (P03-T07)

AI layer handling: NEW

Dependencies: P04-T04, P04-T02, P01-T09
Dependents: P04-T21, P04-T22

Success criteria:
- Tool no longer returns "not yet available" stub
- Fetches existing document to get kind and latest content
- Handler called with existing content + update description
- New version created (data-clear, content deltas, data-finish)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T11]
Title: Wire requestSuggestions tool
Phase: 4 — Artifacts Vertical
Type: INTEGRATION

Behavior ref: artifacts-system.md (suggestions flow: streamObject → data-suggestion parts)
Architecture ref: SEAM-011 (requestSuggestions → text editor suggestions)

Action: Replace the stub in features/chat/lib/tools/suggestions.ts (created in P03-T08) with full implementation. The requestSuggestions tool: Zod schema params {documentId: string uuid}. Execute function: (1) Fetch latest document version via lib/data/document.ts, (2) Call AI SDK streamObject() with artifact model and Zod schema z.object({ suggestions: z.array(z.object({ originalText: z.string(), suggestedText: z.string(), description: z.string() })).max(5) }), (3) Stream each suggestion as data-suggestion part to dataStream, (4) For authenticated users: save suggestions to Suggestion table via lib/data (if suggestion data access exists), (5) Return tool result message. The suggestions appear in the text editor via DataStreamHandler → useArtifact.

Output files:
- features/chat/lib/tools/suggestions.ts

Inputs: lib/data/document.ts (P01-T09), features/artifacts/schemas/artifact.schema.ts (P04-T02), lib/ai/providers.ts (P03-T02)
Outputs: Functional requestSuggestions tool; data-suggestion parts consumed by DataStreamHandler and text editor (P04-T12)

AI layer handling: NEW

Dependencies: P04-T02, P03-T02, P01-T09
Dependents: P04-T12, P04-T22

Success criteria:
- Tool no longer returns "not yet available" stub
- Fetches latest document version for context
- Streams up to 5 suggestions as data-suggestion parts
- Each suggestion has originalText, suggestedText, description
- Suggestions persisted for authenticated users
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T12]
Title: Create text editor component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (TipTap editor with suggestions extension); components-02.md (text-editor.tsx details)
Architecture ref: SEAM-032 (TipTap + suggestions extension)

Action: Create features/artifacts/components/editors/text-editor.tsx — "use client" memo component. Props: content (markdown), onSaveContent, status, isCurrentVersion, currentVersionIndex, suggestions[]. Uses TipTap editor with extensions: StarterKit, Markdown, Mathematics (KaTeX), Table extensions, custom SuggestionsExtension. During streaming (status === "streaming"): sets content without emitting save. During idle: content changes emit onSaveContent with debounced markdown output. SuggestionsExtension: inline decorations highlighting originalText spans from suggestions, popup showing suggestedText + description with accept/dismiss actions. Handle streaming vs idle mode switching. Editor should be read-only when viewing non-current version (!isCurrentVersion).

Output files:
- features/artifacts/components/editors/text-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), tiptap packages, oldapp/components/text-editor.tsx (reference)
Outputs: TextEditor consumed by artifact panel (P04-T17) and document preview (P04-T19)

AI layer handling: AI_WRAPPER

Dependencies: P04-T01, P04-T03
Dependents: P04-T17, P04-T19

Success criteria:
- TipTap renders markdown content
- Streaming mode: content updates without save emission
- Idle mode: content changes trigger debounced onSaveContent
- Suggestions extension highlights originalText in document
- Read-only when viewing non-current version
- File under 200 lines
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T13]
Title: Create code editor component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (CodeMirror + Pyodide execution); components-01.md (code-editor.tsx details)
Architecture ref: SEAM-033 (CodeMirror + Pyodide)

Action: Create features/artifacts/components/editors/code-editor.tsx — "use client" memo component. Props: content (Python code), onSaveContent, status, isCurrentVersion, currentVersionIndex, suggestions[]. Uses CodeMirror with lazy-loaded modules (@codemirror/state, @codemirror/view, @codemirror/lang-python, @codemirror/theme-one-dark). Module cache singleton pattern to prevent re-initialization. Streaming content updates via EditorView.dispatch. Run button triggers Pyodide execution: captures stdout/stderr and matplotlib images, outputs to Console component (P04-T14). Read-only when viewing non-current version. Pyodide accessed from global window object (loaded via Script tag in ChatLayoutClient).

Output files:
- features/artifacts/components/editors/code-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), CodeMirror packages, oldapp/components/code-editor.tsx (reference)
Outputs: CodeEditor consumed by artifact panel (P04-T17); works with Console (P04-T14)

AI layer handling: AI_WRAPPER

Dependencies: P04-T01, P04-T03
Dependents: P04-T14, P04-T17, P04-T19

Success criteria:
- CodeMirror renders with Python syntax highlighting
- Modules lazy-loaded with singleton cache
- Streaming content updates via EditorView.dispatch
- Run button executes code via Pyodide
- Captures stdout/stderr and matplotlib images
- Read-only when not current version
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T14]
Title: Create console component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: components-01.md (console.tsx: resizable output with stdout/stderr/images)
Architecture ref: accessibility.md (role="slider" on resize handle, aria-label, keyboard arrows)

Action: Create features/artifacts/components/editors/console.tsx — "use client" component for code execution output. Props: consoleOutputs (array of {type: "stdout" | "stderr" | "image", content: string}), setConsoleOutputs. Resizable panel with drag handle (role="slider", aria-label="Resize console", aria-orientation="vertical", aria-valuemin/max/now). Height state (100-500px) controlled via mouse drag and keyboard arrows (ArrowUp +10px, ArrowDown -10px). Renders output entries: stdout as monospace text, stderr as red text, images as inline img elements. Auto-scrolls on new output. Clears outputs when artifact becomes not visible.

Output files:
- features/artifacts/components/editors/console.tsx

Inputs: components/ui/ (P00-T11), accessibility.md (ARIA patterns)
Outputs: Console consumed by code editor (P04-T13) within artifact panel

AI layer handling: NEW

Dependencies: P00-T11
Dependents: P04-T17

Success criteria:
- Resize handle has correct ARIA attributes (role, label, orientation, valuemin/max/now)
- Keyboard arrows adjust height by 10px
- Mouse drag adjusts height smoothly
- stdout/stderr/images render correctly
- Auto-scroll on new output
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T15]
Title: Create sheet editor component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (react-data-grid + PapaParse CSV); components-02.md (sheet-editor.tsx details)
Architecture ref: SEAM-034 (sheet editor)

Action: Create features/artifacts/components/editors/sheet-editor.tsx — "use client" memo component. Props: content (CSV string), saveContent, status, isCurrentVersion, currentVersionIndex. Uses PapaParse for CSV parsing/unparsing, react-data-grid for grid rendering. Grid configuration: MIN_ROWS=50, MIN_COLS=26 (A-Z columns), frozen row-number column (width 50px), data columns width 120px. Parsing: CSV string → rows/columns on content change or streaming update. Cell editing: on edit → re-serialize to CSV via PapaParse.unparse → saveContent. Empty cell padding to MIN_ROWS/MIN_COLS. Dark mode support (dark:bg-zinc-950, dark:bg-zinc-900). Read-only when not current version.

Output files:
- features/artifacts/components/editors/sheet-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), papaparse, react-data-grid, oldapp/components/sheet-editor.tsx (reference)
Outputs: SheetEditor consumed by artifact panel (P04-T17) and document preview (P04-T19)

AI layer handling: AI_WRAPPER

Dependencies: P04-T01, P04-T03
Dependents: P04-T17, P04-T19

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

### TASK: [ID: P04-T16]
Title: Create image editor component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (image display from base64/URL); components-01.md
Architecture ref: SEAM-035 (image editor)

Action: Create features/artifacts/components/editors/image-editor.tsx — "use client" component. Props: content (base64 data URL or URL string), title, status, isCurrentVersion, isInline? (for document preview). Renders image via next/image or native img element. Handles streaming state (show loader/placeholder). Handles inline vs full display modes (isInline: constrained size; full: fills available space). No AI server handler — images come from Pyodide execution (matplotlib output).

Output files:
- features/artifacts/components/editors/image-editor.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01)
Outputs: ImageEditor consumed by artifact panel (P04-T17) and document preview (P04-T19)

AI layer handling: NEW

Dependencies: P04-T01
Dependents: P04-T17, P04-T19

Success criteria:
- Renders base64 data URL images and regular URLs
- Streaming state shows loader placeholder
- Inline mode constrains size
- Full mode fills container
- No AI generation logic (display only)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P04-T17]
Title: Create artifact panel component
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (panel layout, visibility logic, AnimatePresence); components-01.md (artifact.tsx details)
Architecture ref: SEAM-012 (artifact stream → panel); scaffold/directory-structure.md

Action: Create features/artifacts/components/artifact-panel.tsx — "use client" memo component. The main artifact panel overlay. Props match Chat component's artifact props (chatId, input, setInput, status, stop, attachments, setAttachments, sendMessage, messages, setMessages, regenerate, votes, isReadonly, selectedVisibilityType, selectedModelId, availableModels). Layout: fixed overlay z-50 h-dvh w-dvw. Desktop: 400px ArtifactMessages sidebar + remaining for editor content. Mobile: full-screen (no message sidebar). AnimatePresence for open/close with spring animation. Internal state: mode ("edit" | "diff"), document (fetched via SWR /api/document?id=), currentVersionIndex, isContentDirty, isToolbarVisible. Routes to correct editor by artifact.kind: text → TextEditor, code → CodeEditor + Console, sheet → SheetEditor, image → ImageEditor. Includes: ArtifactCloseButton, ArtifactActions, VersionFooter, Toolbar, ArtifactErrorBoundary wrapping editor content.

Output files:
- features/artifacts/components/artifact-panel.tsx

Inputs: features/artifacts/hooks/ (P04-T03), features/artifacts/components/editors/ (P04-T12 through P04-T16), features/artifacts/types/ (P04-T01), all supporting components (P04-T18)
Outputs: ArtifactPanel consumed by chat component (P04-T21)

AI layer handling: AI_WRAPPER

Dependencies: P04-T01, P04-T03, P04-T12, P04-T13, P04-T14, P04-T15, P04-T16, P04-T18
Dependents: P04-T21

Success criteria:
- Panel renders as fixed overlay when artifact.isVisible is true
- Routes to correct editor based on artifact.kind
- Desktop layout: 400px message sidebar + editor area
- Mobile layout: full-screen editor only
- AnimatePresence open/close animation
- Version navigation tracks currentVersionIndex
- Document fetched via SWR for version data
- ArtifactErrorBoundary wraps editor content
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T18]
Title: Create artifact supporting components
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (actions, close button, error boundary, messages, version footer, toolbar)
Architecture ref: components-01.md (detailed props/behavior); SEAM-039 (version navigation + restore)

Action: Create 4 files. (1) features/artifacts/components/artifact-actions.tsx — Memo component. Props: artifact, handleVersionChange, currentVersionIndex, isCurrentVersion, mode, metadata, setMetadata. Renders per-kind action buttons from artifactDefinitions[kind].actions array. Each action receives ArtifactActionContext and renders as Button + Tooltip. (2) features/artifacts/components/artifact-close.tsx — Memo component (always skips re-render). On click: setArtifact to initial state or hide if streaming. (3) features/artifacts/components/artifact-error-boundary.tsx — Class component React error boundary. Catches editor render errors. Fallback: "Failed to render artifact" message + error display + retry button. (4) features/artifacts/components/version-footer.tsx — Version navigation. Shows "Version {n} of {total}" with prev/next/restore/latest buttons. handleVersionChange("prev"|"next"|"toggle"|"latest"). Restore: DELETE /api/document?id={id}&timestamp={ts} removes later versions. Uses motion for mount animation.

Output files:
- features/artifacts/components/artifact-actions.tsx
- features/artifacts/components/artifact-close.tsx
- features/artifacts/components/artifact-error-boundary.tsx
- features/artifacts/components/version-footer.tsx

Inputs: features/artifacts/types/artifact.types.ts (P04-T01), features/artifacts/hooks/ (P04-T03), components/ui/ (P00-T11)
Outputs: Supporting components consumed by artifact panel (P04-T17)

AI layer handling: NEW

Dependencies: P04-T01, P04-T03, P00-T11
Dependents: P04-T17

Success criteria:
- ArtifactActions renders correct buttons for each artifact kind
- ArtifactCloseButton resets or hides artifact state
- ArtifactErrorBoundary catches editor errors with fallback UI and retry
- VersionFooter shows version info with navigation buttons
- Restore deletes later versions via API
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T19]
Title: Create document preview and diff view components
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (inline preview in messages, diff view); interactions.md (version switching)
Architecture ref: SEAM-040 (inline preview → artifact panel); SEAM-039 (version diff)

Action: Create 2 files. (1) features/artifacts/components/document-preview.tsx — Component rendered inline in chat messages for tool call results. Uses SWR to fetch document data (GET /api/document?id={id}). Shows mini editor preview (read-only) with document title and kind icon. Skeleton loading state. On click: captures bounding box via ref, calls setArtifact({documentId, isVisible: true, boundingBox}) to open full artifact panel with origin animation. (2) features/artifacts/components/diffview.tsx — Component for comparing two document versions side-by-side. Props: oldContent, newContent, kind. Shows additions (green) and deletions (red). Available as action on text artifacts. Uses text-based diff comparison.

Output files:
- features/artifacts/components/document-preview.tsx
- features/artifacts/components/diffview.tsx

Inputs: features/artifacts/hooks/ (P04-T03), features/artifacts/types/ (P04-T01), features/artifacts/components/editors/ (P04-T12 through P04-T16)
Outputs: DocumentPreview consumed by message rendering (P03-T14); DiffView consumed by artifact panel (P04-T17)

AI layer handling: NEW

Dependencies: P04-T01, P04-T03, P04-T12, P04-T13, P04-T15, P04-T16
Dependents: P04-T17, P04-T21

Success criteria:
- DocumentPreview fetches document via SWR and renders mini preview
- Skeleton state shown during loading
- Click opens full artifact panel with bounding box animation origin
- DiffView shows additions/deletions between two versions
- Both components handle all artifact kinds
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T20]
Title: Create artifact API routes
Phase: 4 — Artifacts Vertical
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (GET/POST/DELETE /api/artifact, GET /api/suggestions)
Architecture ref: conventions.md (route handlers); SEAM-021 (document version fetch); SEAM-025 (document data full)

Action: Create 2 route files. (1) app/api/artifact/route.ts — GET: fetch all versions of a document by id query param, auth + ownership check. POST: save a new document version (from manual client-side edits). DELETE: delete versions after a specific timestamp (for version restore). All operations use lib/data/document.ts functions. (2) app/api/suggestions/route.ts — GET: fetch suggestions for a document by documentId query param. Returns persisted suggestions from Suggestion table for authenticated users. Guest users get empty array (suggestions not persisted for guests). Both routes include auth checks, Zod validation, and error handling.

Output files:
- app/api/artifact/route.ts
- app/api/suggestions/route.ts

Inputs: lib/data/document.ts (P01-T09), features/auth/lib/session.ts (P02-T01), features/artifacts/schemas/artifact.schema.ts (P04-T02), lib/api/ (P01-T12)
Outputs: API routes consumed by artifact panel SWR fetches (P04-T17), document preview (P04-T19), suggestion display

AI layer handling: NEW

Dependencies: P04-T02, P02-T01, P01-T09, P01-T12
Dependents: P04-T17, P04-T19, P04-T22

Success criteria:
- GET /api/artifact?id= returns document versions array
- POST /api/artifact saves new version
- DELETE /api/artifact?id=&timestamp= removes versions after timestamp
- GET /api/suggestions?documentId= returns suggestions array
- Auth + ownership checks on all operations
- Error responses use AppError.toResponse()
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P04-T21]
Title: Wire artifact panel into chat and layout
Phase: 4 — Artifacts Vertical
Type: INTEGRATION

Behavior ref: state-management.md (DataStreamHandler → useArtifact → panel); screens.md (Pyodide script in layout)
Architecture ref: SEAM-012 (artifact stream → panel); SEAM-037 (Pyodide script loading)

Action: Update 2 files. (1) features/chat/components/chat.tsx — Import and render ArtifactPanel (dynamic import for code splitting) alongside existing chat components. Pass all required props from useChat and useArtifact. Artifact panel visibility controlled by useArtifactSelector(a => a.isVisible). (2) app/(chat)/chat-layout-client.tsx — Add Script tag for Pyodide (<Script src="https://cdn.jsdelivr.net/pyodide/..." strategy="lazyOnload" />) for code artifact execution. Update DataStreamHandler to process artifact-specific data parts (data-textDelta, data-codeDelta, data-sheetDelta, data-imageDelta) and update useArtifact state accordingly. Ensure DataStreamProvider wraps both chat and artifact contexts.

Output files:
- features/chat/components/chat.tsx (modify)
- app/(chat)/chat-layout-client.tsx (modify)

Inputs: features/artifacts/components/artifact-panel.tsx (P04-T17), features/artifacts/hooks/ (P04-T03), features/chat/components/data-stream-handler.tsx (P03-T12)
Outputs: Complete artifact ↔ chat integration

AI layer handling: NEW

Dependencies: P04-T03, P04-T17, P04-T19, P03-T12, P03-T19
Dependents: P04-T22

Success criteria:
- ArtifactPanel renders when artifact.isVisible is true
- DataStreamHandler updates artifact state for all delta types
- Pyodide Script tag present in chat layout client
- Code splitting: ArtifactPanel loaded via dynamic import
- Chat component passes all required props to ArtifactPanel
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P04-T22]
Title: Verification gate G04
Phase: 4 — Artifacts Vertical
Type: VERIFICATION

Behavior ref: artifacts-system.md (complete artifact flow)
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G04)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) AI can call createDocument tool → artifact panel opens with correct editor, (5) Text artifacts stream data-textDelta and render in TipTap, (6) Code artifacts stream data-codeDelta and render in CodeMirror, (7) Sheet artifacts stream data-sheetDelta and render in react-data-grid, (8) User can edit artifact content directly, (9) Edits create new versions, (10) Version footer shows version info with navigation, (11) AI can call updateDocument → existing content updated, (12) Suggestions stream as data-suggestion and display in text editor, (13) Document preview renders inline in messages, (14) Artifact error boundary catches editor crashes, (15) Code execution via Pyodide works.

Output files: none (validation only)

Inputs: all P04-T01 through P04-T21 outputs
Outputs: Gate G04 passed — P05 (sidebar) can begin

AI layer handling: N/A

Dependencies: P04-T01 through P04-T21
Dependents: P05-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- createDocument tool creates artifacts for all 4 kinds
- updateDocument tool updates existing artifacts
- requestSuggestions streams suggestions to text editor
- Version navigation works (prev/next/restore)
- Artifact panel opens/closes with animation
- Code execution produces console output
- Document preview opens full panel on click

Complexity: S
