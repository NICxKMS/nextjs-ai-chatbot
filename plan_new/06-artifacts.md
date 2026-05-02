# Artifacts

Artifacts are versioned, editable side-panel assets created from chat tool calls or saved user edits. The whole domain uses `artifact` terminology in files, types, database, stream parts, prompts, tools, routes, and cache tags.

## Supported Kinds

| Kind | Generation | Editor | Stream delta |
|---|---|---|---|
| `text` | `streamText` | TipTap rich text and markdown | `artifact-textDelta`, append |
| `code` | `streamObject` with `{ code }` | CodeMirror Python editor plus Pyodide execution | `artifact-codeDelta`, replace |
| `sheet` | `streamObject` with `{ csv }` | react-data-grid plus PapaParse CSV | `artifact-sheetDelta`, replace |
| `image` | Displayed artifact content, often from code output | Image editor/display | `artifact-imageDelta`, replace |

The handler registry registers text, code, and sheet handlers. Image has no required AI generation handler.

## Lifecycle

```text
AI decides to create or update artifact
  -> createArtifact or updateArtifact tool runs
  -> tool writes artifact-kind, artifact-id, artifact-title, artifact-clear
  -> tool resolves handler from lib/ai/artifact-handlers.ts
  -> handler streams content deltas and returns full content
  -> tool saves artifact version
  -> tool writes artifact-finish
  -> client StreamBridge updates artifactStore
  -> ArtifactPanel opens and renders the matching editor
```

## Handler Registry

`lib/ai/artifact-handlers.ts` owns the registry and shared lookup functions.

```typescript
type ArtifactHandler = {
  create(params: CreateArtifactParams): Promise<string>
  update(params: UpdateArtifactParams): Promise<string>
}

type ArtifactStreamWriter = {
  writeData(part: { type: string; content: unknown }): void
}

type CreateArtifactParams = {
  id: string
  title: string
  kind: ArtifactKind
  ChatStream: ArtifactStreamWriter
  session: { userId: string; isGuest: boolean }
  chatId: string
}

type UpdateArtifactParams = {
  id: string
  description: string
  currentContent: string
  kind: ArtifactKind
  title: string
  ChatStream: ArtifactStreamWriter
  session: { userId: string; isGuest: boolean }
}
```

Handlers stream only content deltas and return the full content string. Tools own preamble events, postamble events, and persistence.

## Artifact Store

The artifact UI state is a module-level `useSyncExternalStore` store. It replaces synthetic SWR state.

```typescript
type UIArtifact = {
  artifactId: string
  title: string
  kind: 'text' | 'code' | 'sheet' | 'image'
  content: string
  isVisible: boolean
  status: 'idle' | 'streaming'
  suggestions?: ArtifactSuggestion[]
}
```

Selectors avoid re-rendering toolbar, close button, version footer, and previews for every content token. `ArtifactPanel` can subscribe to the full artifact because it must update content while streaming.

## Stream Processing

`StreamBridge` is a null-render client component. It reads new data parts from `ChatStreamProvider`, calls the pure `processStreamDelta(delta, currentArtifact)` function, and writes the result to `artifactStore`.

```typescript
function processStreamDelta(delta: DataPart, current: UIArtifact): UIArtifact {
  switch (delta.type) {
    case 'artifact-id':
      return { ...current, artifactId: delta.content, isVisible: true, status: 'streaming' }
    case 'artifact-textDelta':
      return { ...current, content: current.content + delta.content }
    case 'artifact-codeDelta':
    case 'artifact-sheetDelta':
    case 'artifact-imageDelta':
      return { ...current, content: delta.content }
    case 'artifact-finish':
      return { ...current, status: 'idle' }
    default:
      return current
  }
}
```

The real function also handles title, kind, clear, and suggestions.

## Persistence And Versioning

Artifacts are stored in the `Artifact` table. Each save creates a new row with the same artifact ID and a new `createdAt` timestamp. The composite identity is `(id, createdAt)`.

```text
Artifact abc
  2026-01-01T10:00:00Z  version 1
  2026-01-01T10:05:00Z  version 2
  2026-01-01T10:10:00Z  version 3
```

`GET /api/artifact?id=...` returns versions newest first. `POST /api/artifact` save mode creates a new version. Restore mode truncates newer versions after a selected timestamp and refreshes `artifact:{id}`.

## Editors

### Text Editor

Uses TipTap with markdown support and inline suggestion decorations. During streaming, content updates without triggering save. During idle edits, content is debounced and saved through `/api/artifact`.

### Code Editor

Uses CodeMirror with Python support. Pyodide runs code in the browser. Execution captures stdout, stderr, and possible image outputs. Server execution is not required for normal code artifact runs.

### Sheet Editor

Uses PapaParse to parse CSV and react-data-grid to edit rows and columns. Generated deltas replace the full CSV frame.

### Image Editor

Displays base64 data URLs or URLs. It supports loading and streaming states but does not require a server-side AI image handler.

## Suggestions

`requestSuggestions` generates up to five suggestions for a text artifact. Each suggestion has:

```typescript
type ArtifactSuggestion = {
  originalText: string
  suggestedText: string
  description: string
}
```

Suggestions stream as `artifact-suggestion`. Authenticated users can persist suggestions in the `Suggestion` table. Guests can see suggestions in the active session.

## Panel Behavior

| Trigger | Result |
|---|---|
| Receive `artifact-id` | Open panel, set status streaming |
| Receive content delta | Update editor content |
| Receive `artifact-finish` | Set status idle |
| Click close | Set `isVisible` false, preserve content until chat reset |
| Click inline `ArtifactPreview` | Reopen panel for that artifact |
| Navigate to another chat | Reset store and close panel |

The artifact panel is full-screen on mobile. On desktop it renders as a side panel beside the chat. `ArtifactErrorBoundary` catches editor crashes and renders a recovery UI.

## Removed Artifact Concepts

Do not rebuild `Document` naming, `/api/document`, `createDocument`, `updateDocument`, credit usage panels, gateway activation behavior, or document-specific cache keys.
