# 05. Artifacts Feature Changelog

## Summary

| Metric           | Value                          |
| ---------------- | ------------------------------ |
| **Total Files**  | 28 files                       |
| **Total Lines**  | ~4,820 lines                   |
| **Architecture** | Complete feature-based rewrite |
| **Location**     | `features/artifacts/`          |

---

## 1. Main Components (`features/artifacts/components/`)

| File                                                                                  | Lines | Purpose                          | Key Exports              |
| ------------------------------------------------------------------------------------- | ----- | -------------------------------- | ------------------------ |
| [artifact.tsx](../../../features/artifacts/components/artifact.tsx)                   | 569   | Main artifact panel container    | `Artifact`               |
| [artifact-actions.tsx](../../../features/artifacts/components/artifact-actions.tsx)   | 120   | Action buttons (copy, run, undo) | `ArtifactActions`        |
| [artifact-close.tsx](../../../features/artifacts/components/artifact-close.tsx)       | 34    | Close button component           | `ArtifactClose`          |
| [artifact-error.tsx](../../../features/artifacts/components/artifact-error.tsx)       | 63    | Error boundary for artifacts     | `ArtifactErrorBoundary`  |
| [artifact-messages.tsx](../../../features/artifacts/components/artifact-messages.tsx) | 130   | Messages within artifact context | `ArtifactMessages`       |
| [toolbar.tsx](../../../features/artifacts/components/toolbar.tsx)                     | 489   | Bottom toolbar with AI actions   | `Toolbar`, `Tools`       |
| [version-footer.tsx](../../../features/artifacts/components/version-footer.tsx)       | 115   | Version navigation footer        | `VersionFooter`          |
| [index.ts](../../../features/artifacts/components/index.ts)                           | 18    | Public API exports               | All component re-exports |

**Total: 8 files, ~1,538 lines**

---

## 2. Editor Components (`features/artifacts/components/editors/`)

| File                                                                                | Lines | Purpose                      | Key Exports                             |
| ----------------------------------------------------------------------------------- | ----- | ---------------------------- | --------------------------------------- |
| [code-editor.tsx](../../../features/artifacts/components/editors/code-editor.tsx)   | 204   | CodeMirror-based code editor | `CodeEditor`, `CodeEditorProps`         |
| [text-editor.tsx](../../../features/artifacts/components/editors/text-editor.tsx)   | 239   | TipTap-based markdown editor | `TextEditor`, `TextEditorProps`         |
| [image-editor.tsx](../../../features/artifacts/components/editors/image-editor.tsx) | 94    | Image display/preview        | `ImageEditor`, `ImageEditorProps`       |
| [sheet-editor.tsx](../../../features/artifacts/components/editors/sheet-editor.tsx) | 176   | CSV/spreadsheet grid editor  | `SheetEditor`, `SheetEditorProps`       |
| [console.tsx](../../../features/artifacts/components/editors/console.tsx)           | 273   | Code execution console       | `Console`, `ConsoleProps`               |
| [diff-view.tsx](../../../features/artifacts/components/editors/diff-view.tsx)       | 303   | Side-by-side diff viewer     | `DiffView`, `DiffViewProps`, `DiffType` |
| [index.ts](../../../features/artifacts/components/editors/index.ts)                 | 12    | Public API exports           | All editor re-exports                   |

**Total: 7 files, ~1,301 lines**

---

## 3. Hooks (`features/artifacts/hooks/`)

| File                                                                 | Lines | Purpose                        | Key Exports                                                 |
| -------------------------------------------------------------------- | ----- | ------------------------------ | ----------------------------------------------------------- |
| [use-artifact.ts](../../../features/artifacts/hooks/use-artifact.ts) | 203   | Main artifact state management | `useArtifact`, `useArtifactSelector`, `initialArtifactData` |
| [index.ts](../../../features/artifacts/hooks/index.ts)               | 7     | Public API exports             | Hook re-exports                                             |

**Total: 2 files, ~210 lines**

### State Shape (`UIArtifact`)

```typescript
interface UIArtifact {
  documentId: string; // Unique artifact ID
  title: string; // Display title
  kind: ArtifactKind; // 'text' | 'code' | 'image' | 'sheet'
  content: string; // Raw content
  isVisible: boolean; // Panel visibility
  status: ArtifactStatus; // 'streaming' | 'idle'
  boundingBox: {
    // Position for inline display
    top: number;
    left: number;
    width: number;
    height: number;
  };
}
```

### Hook Return Type

```typescript
interface UseArtifactReturn {
  artifact: UIArtifact;
  setArtifact: (
    updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
  ) => void;
  metadata: unknown; // Artifact-specific metadata
  setMetadata: Dispatch<SetStateAction<unknown>>;
}
```

---

## 4. Types (`features/artifacts/types.ts`)

**File: 265 lines**

### Core Types

| Type                  | Description                                        |
| --------------------- | -------------------------------------------------- |
| `ArtifactKind`        | `'text' \| 'code' \| 'image' \| 'sheet'`           |
| `ArtifactStatus`      | `'streaming' \| 'idle'`                            |
| `ArtifactBoundingBox` | Position interface: `{ top, left, width, height }` |
| `UIArtifact`          | Main artifact state object                         |

### Definition Types

| Type                                   | Description                   |
| -------------------------------------- | ----------------------------- |
| `ArtifactActionContext<TMetadata>`     | Context for action handlers   |
| `ArtifactAction<TMetadata>`            | Action button configuration   |
| `ArtifactToolbarContext`               | Context for toolbar items     |
| `ArtifactToolbarItem`                  | Toolbar button configuration  |
| `ArtifactContentProps<TMetadata>`      | Props for content renderer    |
| `ArtifactInitializeParams<TMetadata>`  | Initialize function params    |
| `ArtifactConfig<TKind, TMetadata>`     | Full artifact configuration   |
| `ArtifactDefinition<TKind, TMetadata>` | Artifact definition interface |

### Stream Types

| Type                                | Description              |
| ----------------------------------- | ------------------------ |
| `ArtifactStreamPartType`            | Stream part type union   |
| `ArtifactStreamPart<TData>`         | Generic stream part      |
| `ArtifactStreamPartArgs<TMetadata>` | Stream handler arguments |

### Console Types

| Type                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `ConsoleOutputContent` | `{ type: 'text' \| 'image', value: string }`                     |
| `ConsoleOutputStatus`  | `'in_progress' \| 'loading_packages' \| 'completed' \| 'failed'` |
| `ConsoleOutput`        | Code execution output entry                                      |

---

## 5. Artifact Kinds Support

### Support Matrix

| Kind    | Editor          | Handler                   | Definition         | Streaming         | Actions                           |
| ------- | --------------- | ------------------------- | ------------------ | ----------------- | --------------------------------- |
| `text`  | TipTap markdown | ✅ `textDocumentHandler`  | ✅ `textArtifact`  | `data-textDelta`  | Copy, Undo, Redo, Request Changes |
| `code`  | CodeMirror      | ✅ `codeDocumentHandler`  | ✅ `codeArtifact`  | `data-codeDelta`  | Run, Copy, Undo, Redo, Add Logs   |
| `image` | Canvas preview  | ❌ (client-only)          | ✅ `imageArtifact` | `data-imageDelta` | Copy, Download, Undo, Redo        |
| `sheet` | react-data-grid | ✅ `sheetDocumentHandler` | ✅ `sheetArtifact` | `data-sheetDelta` | Copy, Download, Undo, Redo, Chart |

### Definitions (`features/artifacts/definitions/`)

| File                                                           | Lines | Kind    | Metadata Type                                    |
| -------------------------------------------------------------- | ----- | ------- | ------------------------------------------------ |
| [base.ts](../../../features/artifacts/definitions/base.ts)     | 114   | Factory | `Artifact` class, `ArtifactRegistry`             |
| [text.tsx](../../../features/artifacts/definitions/text.tsx)   | 160   | `text`  | None                                             |
| [code.tsx](../../../features/artifacts/definitions/code.tsx)   | 332   | `code`  | `{ outputs: ConsoleOutput[] }`                   |
| [image.tsx](../../../features/artifacts/definitions/image.tsx) | 83    | `image` | None                                             |
| [sheet.tsx](../../../features/artifacts/definitions/sheet.tsx) | 144   | `sheet` | None                                             |
| [index.ts](../../../features/artifacts/definitions/index.ts)   | 48    | Index   | `artifactDefinitions`, `getArtifactDefinition()` |

**Total: 6 files, ~881 lines**

### Handlers (`features/artifacts/handlers/`)

| File                                                      | Lines | Kind    | AI Method                          |
| --------------------------------------------------------- | ----- | ------- | ---------------------------------- |
| [base.ts](../../../features/artifacts/handlers/base.ts)   | 125   | Factory | `createDocumentHandler()`          |
| [text.ts](../../../features/artifacts/handlers/text.ts)   | 82    | `text`  | `streamText()` with `smoothStream` |
| [code.ts](../../../features/artifacts/handlers/code.ts)   | 105   | `code`  | `streamObject()` with Zod schema   |
| [sheet.ts](../../../features/artifacts/handlers/sheet.ts) | 105   | `sheet` | `streamObject()` with CSV schema   |
| [index.ts](../../../features/artifacts/handlers/index.ts) | 44    | Index   | Handler registry                   |

**Total: 5 files, ~461 lines**

---

## 6. API Routes (`app/api/document/`)

| File                                             | Lines | Purpose                 |
| ------------------------------------------------ | ----- | ----------------------- |
| [route.ts](../../../app/api/document/route.ts)   | 271   | Document CRUD endpoints |
| [schema.ts](../../../app/api/document/schema.ts) | 30    | Zod validation schemas  |

**Total: 2 files, ~301 lines**

### Endpoints

| Method   | Path                             | Description                     |
| -------- | -------------------------------- | ------------------------------- |
| `GET`    | `/api/document?id=X`             | Fetch all versions of document  |
| `POST`   | `/api/document?id=X`             | Create/update document version  |
| `DELETE` | `/api/document?id=X&timestamp=Y` | Delete versions after timestamp |

### Validation

```typescript
const documentPostSchema = z.object({
  content: z.string().max(1024 * 1024), // 1MB max
  title: z.string().min(1).max(500),
  kind: z.enum(["text", "code", "image", "sheet"]),
});
```

---

## 7. Additional Files

| File                                                                             | Lines | Purpose                           |
| -------------------------------------------------------------------------------- | ----- | --------------------------------- |
| [types.ts](../../../features/artifacts/types.ts)                                 | 265   | All TypeScript types              |
| [constants.ts](../../../features/artifacts/constants.ts)                         | 33    | `ARTIFACT_KINDS`, default content |
| [index.ts](../../../features/artifacts/index.ts)                                 | 94    | Main public API                   |
| [server.ts](../../../features/artifacts/server.ts)                               | 23    | Server-only exports               |
| [actions/index.ts](../../../features/artifacts/actions/index.ts)                 | 86    | `getSuggestions` server action    |
| [utils/stream-handler.tsx](../../../features/artifacts/utils/stream-handler.tsx) | 164   | `DataStreamHandler` component     |

**Total: 6 files, ~665 lines**

---

## 8. OldApp vs NewApp Comparison

### Structure Comparison

| Aspect          | OldApp                              | NewApp                          |
| --------------- | ----------------------------------- | ------------------------------- |
| **Location**    | `oldapp/artifacts/` (scattered)     | `features/artifacts/` (unified) |
| **Pattern**     | Per-kind folders with client/server | Feature-based with definitions  |
| **Types**       | Inline or scattered                 | Centralized `types.ts`          |
| **Hooks**       | `hooks/use-artifact.ts`             | `hooks/use-artifact.ts`         |
| **Handlers**    | Per-kind `server.ts`                | Centralized `handlers/`         |
| **Definitions** | Per-kind `client.tsx`               | Centralized `definitions/`      |
| **Components**  | In `components/elements/`           | In `components/` subdirectory   |

### OldApp File Structure

```
oldapp/artifacts/
├── actions.ts
├── code/
│   ├── client.tsx
│   └── server.ts
├── image/
│   └── client.tsx
├── sheet/
│   ├── client.tsx
│   └── server.ts
└── text/
    ├── client.tsx
    └── server.ts
```

### NewApp File Structure

```
features/artifacts/
├── actions/
│   └── index.ts
├── components/
│   ├── artifact.tsx
│   ├── artifact-actions.tsx
│   ├── artifact-close.tsx
│   ├── artifact-error.tsx
│   ├── artifact-messages.tsx
│   ├── editors/
│   │   ├── code-editor.tsx
│   │   ├── console.tsx
│   │   ├── diff-view.tsx
│   │   ├── image-editor.tsx
│   │   ├── sheet-editor.tsx
│   │   ├── text-editor.tsx
│   │   └── index.ts
│   ├── index.ts
│   ├── toolbar.tsx
│   └── version-footer.tsx
├── constants.ts
├── definitions/
│   ├── base.ts
│   ├── code.tsx
│   ├── image.tsx
│   ├── index.ts
│   ├── sheet.tsx
│   └── text.tsx
├── handlers/
│   ├── base.ts
│   ├── code.ts
│   ├── index.ts
│   ├── sheet.ts
│   └── text.ts
├── hooks/
│   ├── index.ts
│   └── use-artifact.ts
├── index.ts
├── server.ts
├── types.ts
└── utils/
    └── stream-handler.tsx
```

### Key Improvements

| Improvement             | Description                                      |
| ----------------------- | ------------------------------------------------ |
| **Type Safety**         | Full TypeScript with generics for metadata       |
| **Modularity**          | Clear separation: definitions, handlers, editors |
| **Registry Pattern**    | `ArtifactRegistry` for dynamic artifact lookup   |
| **Factory Pattern**     | `createDocumentHandler()` with auto-save         |
| **Centralized Types**   | All 20+ types in single `types.ts`               |
| **Server/Client Split** | Explicit `server.ts` for server-only exports     |
| **Streaming**           | Unified `DataStreamHandler` for all kinds        |

---

## 9. Total Line Count Summary

| Category                                      | Files  | Lines      |
| --------------------------------------------- | ------ | ---------- |
| **Main Components**                           | 8      | ~1,538     |
| **Editor Components**                         | 7      | ~1,301     |
| **Definitions**                               | 6      | ~881       |
| **Handlers**                                  | 5      | ~461       |
| **Hooks**                                     | 2      | ~210       |
| **Types**                                     | 1      | ~265       |
| **Utils**                                     | 1      | ~164       |
| **API Routes**                                | 2      | ~301       |
| **Other** (index, constants, server, actions) | 4      | ~236       |
| **TOTAL**                                     | **28** | **~4,820** |

---

## Key Architecture Decisions

1. **Registry Pattern**: `ArtifactRegistry` singleton for dynamic artifact lookup
2. **Factory Function**: `createDocumentHandler()` wraps streaming with auto-save
3. **SWR State**: Client-side state via SWR cache keys, not React Context
4. **Generic Metadata**: Each artifact kind can define custom metadata shape
5. **Lazy Loading**: Editors use `dynamic()` for code splitting
6. **Stream Protocol**: Matches Vercel AI SDK data stream format

---

_Changelog generated: 2024-12-21_
