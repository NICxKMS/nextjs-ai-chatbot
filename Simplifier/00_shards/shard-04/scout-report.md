# Scout Report: Shard 04 - Artifact Feature

**Shard ID:** 04  
**Scope:** `features/artifact/**`  
**Analysis Date:** 2026-02-19

---

## Metrics Summary

| Files in shard          | 35 |
| Total LOC               | 6103 |
| Exports catalogued      | 119 |
| Cross-shard edges found | 31 |
| Issues flagged          | 14 |
| Critical complexity (>10)| 2 |

---

## File Inventory

### Entry Points

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `index.ts` | 128 | entry point | 1 | `createArtifact`, `deleteArtifact`, `getArtifact`, `updateArtifact`, `getArtifactsByChat`, `getArtifactVersion`, `getArtifactWithSuggestions`, `getSuggestions`, `getVersionHistory`, `rollbackToVersion`, `addSuggestion`, `applySuggestion`, `rejectSuggestion`, `ArtifactActions`, `ArtifactClose`, `ArtifactErrorBoundary`, `ArtifactPanel`, `Toolbar`, `useArtifact`, `useArtifactSelector`, `initialArtifactData`, `Artifact`, `artifactKinds` (x2), `clearArtifactRegistry`, `createArtifactDefinition`, `getAllArtifactDefinitions`, `getArtifactDefinition`, `getArtifactIcon`, `getRegisteredArtifactKinds`, `isArtifactRegistered`, `isBuiltInArtifactKind`, `registerArtifact`, `unregisterArtifact`, + 40 type exports |

### Actions (Server Actions)

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `actions/index.ts` | 40 | barrel export | 1 | `createArtifact`, `deleteArtifact`, `getArtifact`, `getArtifactsByChat`, `getArtifactWithSuggestions`, `getSuggestions`, `addSuggestion`, `applySuggestion`, `rejectSuggestion`, `updateArtifact`, `getArtifactVersion`, `getVersionHistory`, `rollbackToVersion` |
| `actions/create-artifact.action.ts` | 88 | domain logic | 3 | `createArtifact`, `CreateArtifactParams` |
| `actions/update-artifact.action.ts` | 80 | domain logic | 3 | `updateArtifact`, `UpdateArtifactParams` |
| `actions/delete-artifact.action.ts` | 61 | domain logic | 3 | `deleteArtifact` |
| `actions/get-artifact.action.ts` | 140 | domain logic | 4 | `getArtifact`, `getArtifactsByChat`, `getArtifactWithSuggestions`, `ArtifactWithSuggestions` |
| `actions/versions.ts` | 158 | domain logic | 4 | `getVersionHistory`, `rollbackToVersion`, `getArtifactVersion`, `VersionInfo` |
| `actions/suggestions.ts` | 219 | domain logic | 6 | `getSuggestions`, `addSuggestion`, `applySuggestion`, `rejectSuggestion`, `AddSuggestionParams` |

### Components

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `components/index.ts` | 42 | barrel export | 1 | `ArtifactActions`, `ArtifactClose`, `ArtifactErrorBoundary`, `ArtifactPanel`, `ArtifactMessages`, `Console`, `CodeEditor`, `ImageEditor`, `SheetEditor`, `TextEditor`, `Toolbar` |
| `components/artifact-panel.tsx` | 900 | **HIGH COMPLEXITY** | **15** | `ArtifactPanel` |
| `components/artifact-actions.tsx` | 227 | domain logic | 5 | `ArtifactActions` |
| `components/artifact-messages.tsx` | 348 | domain logic | 7 | `ArtifactMessages`, `ArtifactMessagesProps` |
| `components/toolbar.tsx` | 224 | domain logic | 5 | `Toolbar`, `ArtifactToolbarProps` |
| `components/console.tsx` | 262 | domain logic | 4 | `Console`, `ConsoleProps`, `ConsoleOutput`, `ConsoleOutputContent` |
| `components/artifact-close.tsx` | 50 | utility | 2 | `ArtifactClose` |
| `components/artifact-error-boundary.tsx` | 74 | utility | 2 | `ArtifactErrorBoundary` |

### Editors

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `components/editors/text-editor.tsx` | 203 | domain logic | 4 | `TextEditor`, `TextEditorProps` |
| `components/editors/code-editor.tsx` | 260 | **HIGH COMPLEXITY** | **11** | `CodeEditor`, `CodeEditorProps` |
| `components/editors/image-editor.tsx` | 118 | domain logic | 2 | `ImageEditor`, `ImageEditorProps` |
| `components/editors/sheet-editor.tsx` | 210 | domain logic | 5 | `SheetEditor`, `SheetEditorProps` |

### Handlers

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `handlers/index.ts` | 89 | barrel export + registry | 3 | `textHandler`, `codeHandler`, `imageHandler`, `sheetHandler`, `artifactHandlersByKind`, `getArtifactHandler`, `supportedArtifactKinds`, `BaseArtifactHandler`, `createArtifactHandler`, `ArtifactHandler`, `ArtifactHandlerConfig`, `CreateDocumentContext`, `UpdateDocumentContext` |
| `handlers/base.handler.ts` | 255 | domain logic | 5 | `BaseArtifactHandler`, `createArtifactHandler`, `ArtifactHandler`, `ArtifactHandlerConfig`, `CreateDocumentContext`, `UpdateDocumentContext` |
| `handlers/text.handler.ts` | 118 | domain logic | 3 | `textHandler` |
| `handlers/code.handler.ts` | 124 | domain logic | 3 | `codeHandler` |
| `handlers/image.handler.ts` | 65 | domain logic | 2 | `imageHandler` |
| `handlers/sheet.handler.ts` | 131 | domain logic | 3 | `sheetHandler` |

### Hooks

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `hooks/index.ts` | 14 | barrel export | 1 | `useArtifact`, `useArtifactSelector`, `initialArtifactData` |
| `hooks/use-artifact.ts` | 140 | domain logic | 4 | `useArtifact`, `useArtifactSelector`, `initialArtifactData` |
| `hooks/use-artifact.test.ts` | 428 | test | 1 | (none - test file) |

### Lib

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `lib/index.ts` | 24 | barrel export | 1 | `Artifact`, `ArtifactConfig`, `artifactKinds`, `clearArtifactRegistry`, `createArtifactDefinition`, `getAllArtifactDefinitions`, `getArtifactDefinition`, `getArtifactIcon`, `getRegisteredArtifactKinds`, `isArtifactRegistered`, `isBuiltInArtifactKind`, `registerArtifact`, `unregisterArtifact` |
| `lib/artifact-class.ts` | 335 | domain logic | 6 | `Artifact`, `artifactKinds`, `isBuiltInArtifactKind`, `getArtifactIcon`, `registerArtifact`, `unregisterArtifact`, `getArtifactDefinition`, `getAllArtifactDefinitions`, `getRegisteredArtifactKinds`, `isArtifactRegistered`, `clearArtifactRegistry`, `createArtifactDefinition`, `ArtifactConfig` |

### Schemas

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `schemas/index.ts` | 56 | barrel export | 1 | 18 schema exports + 17 type exports |
| `schemas/artifact.schema.ts` | 270 | type definitions | 2 | `ArtifactKindSchema`, `ArtifactStatusSchema`, `ArtifactUUIDSchema`, `ArtifactNonEmptyStringSchema`, `ArtifactTitleSchema`, `ArtifactContentSchema`, `CreateArtifactSchema`, `ArtifactIdSchema`, `ChatIdParamSchema`, `UpdateArtifactSchema`, `UpdateArtifactWithIdSchema`, `VersionTimestampSchema`, `VersionIndexSchema`, `VersionInfoSchema`, `AddSuggestionSchema`, `ApplySuggestionSchema`, `RejectSuggestionSchema`, `SuggestionSchema`, `BoundingBoxSchema`, `UIArtifactSchema` |

### Types

| File | LOC | Classification | Complexity | Exports |
|------|-----|----------------|------------|---------|
| `types.ts` | 256 | type definitions | 2 | `ArtifactKind`, `artifactKinds`, `ArtifactStatus`, `ArtifactBoundingBox`, `UIArtifact`, `initialArtifactData`, `ArtifactMetadata`, `ArtifactActionContext`, `ArtifactAction`, `ArtifactToolbarContext`, `ArtifactToolbarItem`, `ArtifactStreamPart`, `ArtifactStreamContext`, `ArtifactInitializeParams`, `ArtifactContentProps`, `ArtifactDefinition`, `ArtifactPanelProps`, `ArtifactActionsProps`, `ArtifactCloseProps`, `ArtifactErrorBoundaryProps` |

---

## Cross-Shard Dependency Edges

### External Dependencies (Outbound)

| Source File | Target Module | Import Type |
|-------------|---------------|-------------|
| `actions/create-artifact.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/create-artifact.action.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/create-artifact.action.ts` | `lib/db/schema` | `Artifact` |
| `actions/update-artifact.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/update-artifact.action.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/update-artifact.action.ts` | `lib/db/schema` | `Artifact` |
| `actions/delete-artifact.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/delete-artifact.action.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/get-artifact.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/get-artifact.action.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/get-artifact.action.ts` | `lib/db/schema` | `Artifact` |
| `actions/versions.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/versions.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/versions.ts` | `lib/db/schema` | `Artifact` |
| `actions/suggestions.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/suggestions.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `actions/suggestions.ts` | `lib/db/schema` | `Artifact`, `Suggestion` |
| `handlers/text.handler.ts` | `lib/ai/prompts` | `textPrompt`, `getTextUpdatePrompt` |
| `handlers/text.handler.ts` | `lib/ai/registry` | `getModel` |
| `handlers/code.handler.ts` | `lib/ai/prompts` | `codePrompt`, `getCodeUpdatePrompt` |
| `handlers/code.handler.ts` | `lib/ai/registry` | `getModel` |
| `handlers/sheet.handler.ts` | `lib/ai/prompts` | `sheetPrompt`, `getSheetUpdatePrompt` |
| `handlers/sheet.handler.ts` | `lib/ai/registry` | `getModel` |
| `components/artifact-panel.tsx` | `components/document/diffview` | `DiffView` |
| `components/artifact-panel.tsx` | `features/chat/types` | `Attachment`, `ChatMessage`, `UserVote` |
| `components/artifact-panel.tsx` | `features/input/components/multimodal-input` | `MultimodalInput` |
| `components/artifact-panel.tsx` | `hooks/use-window-size` | `useWindowSize` |
| `components/artifact-panel.tsx` | `lib/db/schema` | `Artifact` |
| `components/artifact-messages.tsx` | `features/chat/components/message` | `Message`, `ThinkingMessage` |
| `components/artifact-messages.tsx` | `features/chat/types` | `ChatMessage`, `UserVote` |
| `components/artifact-messages.tsx` | `hooks` | `useScrollToBottom` |
| `components/editors/text-editor.tsx` | `lib/editor/suggestions-extension` | `createDecorations`, `projectWithPositions`, `SuggestionLike`, `SuggestionsExtension`, `suggestionsPluginKey` |
| `components/editors/code-editor.tsx` | `lib/db/schema` | `Suggestion` |
| `components/console.tsx` | `features/artifact/hooks/use-artifact` | `useArtifactSelector` |
| `lib/artifact-class.ts` | `components/icons` | `CodeIcon`, `FileIcon`, `ImageIcon`, `MessageIcon` |

---

## Intra-Shard Pattern Flags

### 1. ⚠️ DUPLICATE TYPE DEFINITIONS (High Priority)

**Issue:** `artifactKinds` defined in two locations with slightly different forms:
- `types.ts:19` - `const artifactKinds = ["text", "code", "image", "sheet"] as const`
- `lib/artifact-class.ts:28` - `export const artifactKinds: Record<ArtifactKind, ArtifactKind> = { text: "text", code: "code", image: "image", sheet: "sheet" }`

Both exported from main barrel. The `lib` version shadows `types` version when importing from main index.

**Lines:**
- `types.ts:19`
- `lib/artifact-class.ts:28`
- `index.ts:58` and `index.ts:127`

---

### 2. ⚠️ DUPLICATE TYPE: ArtifactKind

**Issue:** `ArtifactKind` type defined in two locations:
- `types.ts:14` - `type ArtifactKind = "text" | "code" | "image" | "sheet"`
- `schemas/artifact.schema.ts:252` - `export type ArtifactKind = z.infer<typeof ArtifactKindSchema>`

Both are exported. Main index exports from schemas as `ArtifactKindInput` alias but schema index exports as `ArtifactKind`.

**Lines:**
- `types.ts:14`
- `schemas/artifact.schema.ts:252`
- `schemas/index.ts:14`

---

### 3. ⚠️ NEAR-DUPLICATE RENDERER COMPONENTS (Medium Priority)

**Issue:** `defaultArtifactRenderers` in `artifact-panel.tsx` contains 4 nearly identical component implementations. Text, Code, and Sheet renderers are ~90% similar with only the `name` property differing.

**Lines:**
- `artifact-panel.tsx:101-248` - All 4 renderers follow identical patterns for `isLoading` and `mode === "diff"` checks

**Example similarity (text vs code):**
```tsx
// TextRenderer - lines 110-143
// CodeRenderer - lines 147-180
// SheetRenderer - lines 212-247
// All share identical isLoading spinner + diff mode logic
```

---

### 4. ⚠️ NEAR-DUPLICATE HANDLER STREAMING LOGIC (Medium Priority)

**Issue:** `text.handler.ts`, `code.handler.ts`, and `sheet.handler.ts` share ~85% similar code patterns for:
- Streaming iteration
- Delta type checking
- `draftContent` accumulation
- `dataStream.write()` pattern

**Lines:**
- `text.handler.ts:56-70` and `text.handler.ts:99-113`
- `code.handler.ts:64-80` and `code.handler.ts:102-119`
- `sheet.handler.ts:64-80` and `sheet.handler.ts:109-126`

---

### 5. ⚠️ ACTION CONTEXT PATTERN REPETITION

**Issue:** Every action file repeats the same context creation pattern:
```typescript
const userId = await requireAuthAction()
const ctx = { userId, isGuest: false }
```

This appears in 6 files with identical structure.

**Files affected:**
- `create-artifact.action.ts:63-66`
- `update-artifact.action.ts:60-62`
- `delete-artifact.action.ts:39-41`
- `get-artifact.action.ts:68-70, 99-101, 129-131`
- `versions.ts:62-65, 96-100, 147-150`
- `suggestions.ts:57-60, 94-97, 135-138, 199-202`

---

### 6. ⚠️ UNUSED EXPORT: `initialArtifactData` Exported Twice

**Issue:** `initialArtifactData` exported from both `types.ts` and `hooks/use-artifact.ts`. Main barrel re-exports from hooks.

**Lines:**
- `types.ts:53-66`
- `hooks/use-artifact.ts:139`
- `hooks/index.ts:10`

---

### 7. ⚠️ COMPLEXITY: artifact-panel.tsx Exceeds Threshold

**Issue:** `artifact-panel.tsx` at 900 LOC with cyclomatic complexity ~15 (threshold: 10). Contains:
- Multiple state variables (12+ useState calls)
- Complex effect dependencies
- Inline component definitions
- Mix of concerns (versioning, rendering, saving, layout)

**Lines:**
- `artifact-panel.tsx:250-899` - `PureArtifactPanel` function
- `artifact-panel.tsx:101-248` - Inline renderer components

---

### 8. ⚠️ COMPLEXITY: code-editor.tsx Exceeds Threshold

**Issue:** `code-editor.tsx` complexity ~11 due to:
- Dynamic module loading
- Multiple useEffect with complex dependencies
- State synchronization logic

**Lines:**
- `code-editor.tsx:93-212` - `PureCodeEditor` function

---

### 9. ⚠️ NAMING INCONSISTENCY: Handler vs Handler

**Issue:** Handler files use `.handler.ts` suffix but exports use `Handler` suffix. Mixed naming:
- File: `text.handler.ts` → Export: `textHandler`
- File: `base.handler.ts` → Export: `BaseArtifactHandler`

This is consistent but the file naming with dots could cause confusion.

---

### 10. ⚠️ REDUNDANT MEMO COMPARATORS

**Issue:** Custom `areEqual` functions in memo components contain repetitive property comparisons. These could be extracted to a shared utility.

**Files:**
- `artifact-actions.tsx:198-225`
- `artifact-messages.tsx:292-337`
- `text-editor.tsx:167-178`
- `code-editor.tsx:217-235`
- `image-editor.tsx:83-94`
- `sheet-editor.tsx:176-186`

---

### 11. ⚠️ UNUSED PARAMETER: suggestions in CodeEditor

**Issue:** `CodeEditorProps.suggestions` is typed but never used in the component implementation.

**Lines:**
- `code-editor.tsx:87` - Property defined
- `code-editor.tsx:93-212` - Not referenced in implementation

---

### 12. ⚠️ HARDCODED MAGIC VALUES

**Issue:** Several hardcoded values without constants:
- `artifact-panel.tsx:276` - `chatPanelWidth = 400`
- `sheet-editor.tsx:49-50` - `MIN_ROWS = 50`, `MIN_COLS = 26`
- `console.tsx:75-76` - `minHeight = 100`, `maxHeight = 800`

---

### 13. ⚠️ TYPE: ArtifactMetadata Uses `any`

**Issue:** `ArtifactMetadata` typed as `any` with biome-ignore comment. This bypasses type safety for metadata across artifact types.

**Lines:**
- `types.ts:72-73`

---

### 14. ⚠️ SHADOWED EXPORT IN INDEX

**Issue:** Main `index.ts` re-exports `artifactKinds` twice:
- Line 57: From `./lib` as `artifactKinds`
- Line 127: From `./types` as `artifactKinds` aliased to `artifactKindValues`

The second export creates confusion about which value is the primary.

---

## Summary Statistics

### By Classification

| Classification | Count | Total LOC |
|----------------|-------|-----------|
| entry point | 1 | 128 |
| barrel export | 6 | 175 |
| domain logic | 18 | 3,686 |
| type definitions | 2 | 526 |
| utility | 2 | 124 |
| test | 1 | 428 |
| **HIGH COMPLEXITY** | 2 | 1,160 |

### Complexity Distribution

| Complexity Range | Files |
|------------------|-------|
| 1-2 (Low) | 17 |
| 3-5 (Medium) | 14 |
| 6-10 (Elevated) | 2 |
| 11-15 (Critical) | 2 |

---

## ⚠️ ESCALATION Items

1. **artifact-panel.tsx complexity (15)** - Requires human judgment on decomposition strategy. The file handles too many concerns: layout, version management, content saving, rendering selection, and modal state.

2. **Duplicate artifactKinds exports** - Architectural decision needed on canonical source of truth.

---

## ⚠️ SCOPE EXTENSION Items

None identified. All analysis remained within `features/artifact/**` scope.
