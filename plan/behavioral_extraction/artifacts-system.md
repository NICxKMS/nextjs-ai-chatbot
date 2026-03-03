# Artifacts System

> **Updated per redesign audit (2026-03-01)**

## Overview

Artifacts are AI-generated content displayed in a side panel alongside the chat. Four types supported: **text**, **code**, **sheet**, and **image**. Each has a server handler (AI generation) and client component (rendering/editing).

> *All "document" naming is replaced with "artifact" in schema and application layers.*

---

## Architecture

```
AI Tool Call (createArtifact/updateArtifact)
  │
  ├── lib/ai/tools/create-artifact.ts
  │   └── artifactHandler.create(params)
  │       ├── features/artifacts/handlers/{kind}-handler.ts  <!-- Wave 4: AR-10 — corrected path per redesign directory-structure.md -->
  │       └── lib/data/artifact.ts
  │
  ├── Data Stream (SSE)
  │   └── artifact-id, artifact-title, artifact-kind, artifact-clear, content-deltas, artifact-finish
  │
  ├── components/stream-bridge.tsx
  │   └── features/artifacts/lib/artifact-store.ts   (useSyncExternalStore store)
  │
  └── components/artifact-panel.tsx
      └── artifacts/{kind}/client.tsx                (type-specific editor)
```
```

---

## Artifact Types

### Text (`artifacts/text/`)

**Server** (`features/artifacts/handlers/text-handler.ts`): <!-- Wave 4: AR-10 -->
- Uses `streamText()` from AI SDK
- Model: `artifact-model` (resolves to Gemini 2.5 Flash Lite by default)
- System prompt: `textPrompt` — write Markdown, no code blocks
- Streams `artifact-textDelta` parts (appended character-by-character)
- On update: receives existing content + description, generates replacement

**Client** (`client.tsx`):
- Uses **TipTap** rich-text editor
- Features: inline suggestions display, version navigation
- Editor initialized with `content` from artifact state
- Real-time: content updates as deltas stream in
- Suggestion integration: highlights original text, shows suggested replacement

**Actions**:
- Copy content
- Diff view (compare versions)
- Request suggestions
- Polish text (toolbar tool)

### Code (`artifacts/code/`)

**Server** (`features/artifacts/handlers/code-handler.ts`): <!-- Wave 4: AR-10 -->
- Uses `streamObject()` from AI SDK with structured output
- Schema: `z.object({ code: z.string() })`
- Model: `artifact-model`
- System prompt: `codePrompt` — self-contained Python, print() for output, max 15 lines
- Streams `artifact-codeDelta` parts (full replacement each time, not appended)
- On update: receives existing code + description, generates new version

**Client** (`client.tsx`):
- Uses **CodeMirror** editor with Python language support
- **Pyodide** (Python in browser) for execution
- Features: run code, view console output, version navigation
- Console output: captures stdout/stderr + matplotlib images via IOPub
- Execution happens entirely client-side (no server round-trip)

**Actions**:
- Run code (Pyodide execution)
- Copy code
- View console output
- Version navigation (undo/redo)

### Sheet (`artifacts/sheet/`)

**Server** (`features/artifacts/handlers/sheet-handler.ts`): <!-- Wave 4: AR-10 -->
- Uses `streamObject()` from AI SDK with structured output
- Schema: `z.object({ csv: z.string() })`
- Model: `artifact-model`
- System prompt: `sheetPrompt` — CSV with headers
- Streams `artifact-sheetDelta` parts (full CSV replacement)

**Client** (`client.tsx`):
- Uses **react-data-grid** for spreadsheet rendering
- **PapaParse** for CSV parsing
- Features: cell editing, copy selection, version navigation
- CSV content parsed into rows/columns on each update

**Actions**:
- Format data (toolbar tool)
- Analyze data (toolbar tool)
- Copy data
- Version navigation

### Image (`artifacts/image/`)

**Client** (`client.tsx`):
- Renders image from `content` (base64 data URL or URL)
- Simpler than other types — no AI server handler registered in the handler registry
- ImageEditor component for display/manipulation

**Note**: Image artifacts are created via code execution (Pyodide matplotlib) or other means, not via a dedicated AI generation flow.

---

## Artifact Handler Registry

<!-- Wave 4: CONF-003 + CONF-009 — Rewritten to match domain-boundaries.md §3.
     Old factory wrapper pattern removed (preamble/postamble/persistence was in handler wrapper).
     Now: simple Map lookup. Handler returns content string only. Tool owns lifecycle.
     Also fixes: W2-MC-2 (factory wrapper), W2-LC-3 (dataStream→ChatStream), W2-MC-5 (null→''), W2-LC-5 (return type). -->

`lib/ai/artifact-handlers.ts` — Simple Map-based registry with dependency inversion:

> *Handlers register themselves at module load time. Tools look up handlers via the registry. No wrapper — handlers stream content deltas and return a content string. The calling tool owns lifecycle (preamble, persistence, postamble).*

```typescript
const handlers = new Map<ArtifactKind, ArtifactHandler>()

/** Called by features/artifacts/handlers/index.ts at module load */
export function registerArtifactHandler(
  kind: ArtifactKind,
  handler: ArtifactHandler,
): void {
  if (handlers.has(kind)) {
    throw new Error(`Artifact handler already registered for kind: ${kind}`)
  }
  handlers.set(kind, handler)
}

/** Called by features/chat/lib/tools/ during tool execution */
export function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
  const handler = handlers.get(kind)
  if (!handler) {
    throw new Error(`No artifact handler registered for kind: ${kind}`)
  }
  return handler
}
```

**Handler contract:** Each `ArtifactHandler` implements `create(params: CreateArtifactParams): Promise<string>` and `update(params: UpdateArtifactParams): Promise<string>`. Params include `ChatStream: ArtifactStreamWriter` for streaming content deltas. Handlers:
- Stream content deltas via `ChatStream.writeData()` (e.g., `artifact-textDelta`, `artifact-codeDelta`)
- Return the full content string
- Do NOT write preamble (`artifact-kind`, `artifact-id`, `artifact-title`, `artifact-clear`), postamble (`artifact-finish`), or persist via `saveArtifactVersion()` — those are the tool's responsibility

---

## Versioning

### Storage Model
Artifacts use composite PK: `(id, createdAt)`. Each save creates a new row:
```
id="abc123", createdAt="2025-01-01T00:00:00Z", content="v1"
id="abc123", createdAt="2025-01-01T00:05:00Z", content="v2"
id="abc123", createdAt="2025-01-01T00:10:00Z", content="v3"
```

### Version Navigation
- `<VersionFooter>` component shows: "Version {n} of {total}" with prev/next buttons
- `currentVersionIndex` tracked in local state
- Navigating versions loads content from the versions array (client-side, no API call)
- New AI updates always append as latest version

### Cache Versioning
```typescript
type CachedArtifact = {
  id: string;
  userId: string;
  chatId?: string;
  versions: Array<{
    id: string;
    createdAt: string;
    title: string;
    content: string;
    kind: ArtifactKind;
  }>;
};
```
Entire version history stored in single cache key. Version arrays are maintained in `createdAt DESC` order (newest first).

---

## Suggestions

### Flow
1. AI tool `requestSuggestions` called with `{ artifactId }`
2. Fetches latest artifact version
3. Uses `streamObject()` with artifact-model to generate up to 5 suggestions:
   ```typescript
   z.object({
     suggestions: z.array(z.object({
       originalText: z.string(),
       suggestedText: z.string(),
       description: z.string()
     })).max(5)
   })
   ```
4. Each suggestion streamed as `artifact-suggestion` part
5. For authenticated users: saved to `Suggestion` table
6. For guests: available in-session only

### Suggestion Display
- Text editor highlights `originalText` spans
- Inline popup shows `suggestedText` + `description`
- User can accept (replaces text) or dismiss (marks resolved)

---

## Diff View

### Text Artifacts
- `<DiffView>` component compares two versions
- Uses `react-diff-viewer` or similar
- Shows additions (green), deletions (red)
- Available via toolbar action on text artifacts

---

## Toolbar System

Each artifact type has toolbar items defined in its client config:

```typescript
// Text toolbar
{ description: "Add final polish", icon: SparklesIcon } // Sends "polish" prompt
{ description: "Request suggestions", icon: MessageIcon } // Calls requestSuggestions tool

// Sheet toolbar  
{ description: "Format data", icon: FormatIcon }
{ description: "Analyze data", icon: ChartIcon }
```

Toolbar items trigger AI update calls with predefined descriptions.

---

## Artifact Panel UI

### Layout
```
┌──────────────────────────────────────┐
│ [Chat Panel]  │  [Artifact Panel]    │
│               │                      │
│ Messages      │ Title bar + actions  │
│ Input         │ Editor (per type)    │
│               │ Version footer       │
└──────────────────────────────────────┘
```

### Visibility Logic
- Panel hidden by default (`isVisible: false`)
- Opens when `artifact-id` received (isVisible: true)
- Close button sets `isVisible: false`
- Reopens when user clicks artifact reference in chat messages
- `<ArtifactCloseButton>` handles close action

### Error Handling
- `<ArtifactErrorBoundary>` wraps artifact panel
- Catches render errors in editors
- Shows fallback UI with retry button

### Loading States
- During streaming: `status: "streaming"` shows progress indicator
- Content appears incrementally as deltas arrive
- Empty content during initial `artifact-clear` → shows "Generating..." placeholder
