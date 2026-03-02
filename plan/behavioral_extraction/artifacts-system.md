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
  │       ├── lib/ai/artifact-handlers/{kind}.ts
  │       └── lib/data/artifact.ts
  │
  ├── Data Stream (SSE)
  │   └── artifact-id, artifact-title, artifact-kind, artifact-clear, content-deltas, artifact-finish
  │
  ├── components/stream-bridge.tsx
  │   └── lib/stores/artifact-store.ts               (useSyncExternalStore)
  │
  └── components/artifact-panel.tsx
      └── artifacts/{kind}/client.tsx                (type-specific editor)
```
```

---

## Artifact Types

### Text (`artifacts/text/`)

**Server** (`lib/ai/artifact-handlers/text.ts`):
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

**Server** (`lib/ai/artifact-handlers/code.ts`):
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

**Server** (`lib/ai/artifact-handlers/sheet.ts`):
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

`lib/ai/artifact-handlers/registry.ts` exports `getArtifactHandler`:

> *Handler registry pattern — each `ArtifactKind` maps to an `ArtifactHandler` with `.create()` and `.update()` methods.*

```typescript
function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
  // Registry lookup returns handler with:
  return {
    kind,
    create: async ({ title, dataStream, session, chatId }) => {
      const id = generateUUID();
      dataStream.writeData({ type: "artifact-kind", content: kind });
      dataStream.writeData({ type: "artifact-id", content: id });
      dataStream.writeData({ type: "artifact-title", content: title });
      dataStream.writeData({ type: "artifact-clear", content: null });

      const result = await handler.generate({ id, title, dataStream, session });

      // Persist to DB/cache
      await saveArtifactVersion({ id, title, kind, content: result, userId, chatId });
      dataStream.writeData({ type: "artifact-finish", content: null });
      return { id, title, kind, content: "An artifact was created..." };
    },
    update: async ({ id, description, dataStream, session }) => {
      const artifact = await getArtifactById(id, ctx);
      const latestVersion = artifact.versions.at(-1);
      dataStream.writeData({ type: "artifact-clear", content: null });

      const result = await handler.regenerate({
        artifact: latestVersion, description, dataStream, session
      });

      await saveArtifactVersion({ id, title: latestVersion.title, kind, content: result, userId });
      dataStream.writeData({ type: "artifact-finish", content: null });
      return { id, title, kind, content: "The artifact has been updated..." };
    }
  };
}
```

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
Entire version history stored in single cache key. New versions appended to array.

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
