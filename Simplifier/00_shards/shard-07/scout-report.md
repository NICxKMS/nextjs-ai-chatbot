# Scout Report: Shard 07 - features/input

**Generated:** 2026-02-19
**Shard Scope:** `features/input/**` (all input feature files)

---

## Metrics Summary

| Metric                  | Value |
|-------------------------|-------|
| Files in shard          | 12    |
| Total LOC               | 1945  |
| Exports catalogued      | 55    |
| Cross-shard edges found | 7     |
| Issues flagged          | 9     |
| Critical complexity (>10)| 0    |

---

## File Inventory

### 1. `features/input/index.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 78                                 |
| Classification | Entry point (barrel export)        |
| Complexity     | Low (N/A - re-exports only)        |

**Exports:**
- `AttachmentPreview`, `AttachmentPreviewProps`
- `DEFAULT_SUGGESTED_ACTIONS`, `MultimodalInput`, `MultimodalInputProps`
- `StopButton`, `StopButtonProps`, `SubmitButton`, `SubmitButtonProps`
- `SuggestedActions`, `SuggestedActionsProps`
- `UseFileUploadOptions`, `UseFileUploadReturn`, `UseInputOptions`, `UseInputReturn`
- `useFileUpload`, `useFileValidation`, `useInput`
- `Attachment`, `AttachmentSchema`, `AttachmentStatus`, `AttachmentStatusSchema`
- `AttachmentType`, `AttachmentTypeSchema`, `InputState`, `InputStateSchema`
- `SuggestedAction`, `SuggestedActionSchema`, `UploadConfig`, `UploadConfigSchema`
- `UploadProgress`, `UploadProgressSchema`, `UploadResult`, `UploadResultSchema`
- `validateFileSize`, `validateFileType`, `validateInput`
- `AttachmentError`, `InputAttachment`, `FormatType`, `getAttachmentType`
- `InputActions`, `ToolbarProps`, `DEFAULT_UPLOAD_CONFIG`

**Imports:**
- Internal: `./components`, `./hooks`, `./schemas`, `./types`

---

### 2. `features/input/types.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 285                                |
| Classification | Type definitions                   |
| Complexity     | Low (type definitions + 1 utility) |

**Exports:**
- Types: `AttachmentType`, `AttachmentStatus`, `InputAttachment`, `AttachmentError`
- Types: `UploadConfig`, `InputState`, `InputActions`, `SuggestedAction`
- Types: `SuggestionCategory`, `MultimodalInputProps`, `SubmitButtonProps`
- Types: `AttachmentPreviewProps`, `SuggestedActionsProps`, `ToolbarProps`
- Types: `FormatType`, `UploadResult`, `UploadProgress`
- Constants: `DEFAULT_UPLOAD_CONFIG`
- Functions: `getAttachmentType()`

**Imports:**
- External: None
- Cross-shard: `Attachment` from `@/features/chat/types` (line 9)

---

### 3. `features/input/components/index.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 23                                 |
| Classification | Entry point (barrel export)        |
| Complexity     | Low (N/A)                          |

**Exports:** Re-exports from child components

**Imports:** Internal from child files

---

### 4. `features/input/hooks/index.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 19                                 |
| Classification | Entry point (barrel export)        |
| Complexity     | Low (N/A)                          |

**Exports:** Re-exports from child hooks

**Imports:** Internal from child files

---

### 5. `features/input/schemas/index.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 28                                 |
| Classification | Entry point (barrel export)        |
| Complexity     | Low (N/A)                          |

**Exports:** Re-exports from `./input.schema`

**Imports:** Internal from `./input.schema`

---

### 6. `features/input/components/multimodal-input.tsx`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 462                                |
| Classification | Domain logic (component)           |
| Complexity     | Moderate (~8)                      |

**Exports:**
- `MultimodalInputProps` (interface)
- `MultimodalInput` (component, memoized)

**Imports:**
- External: `@ai-sdk/react`, `ai`, `fast-deep-equal`, `react`, `sonner`, `usehooks-ts`
- Cross-shard: `@/components/ui/button`, `@/components/ui/textarea`
- Cross-shard: `Attachment`, `ChatMessage` from `@/features/chat/types`
- Cross-shard: `@/hooks/use-window-size`
- Cross-shard: `@/lib/utils`
- Internal: `./attachment-preview`, `./submit-button`, `./suggested-actions`

**Notable:**
- Contains inline file upload logic (lines 187-220) duplicating logic from `useFileUpload` hook
- Hardcoded suggested actions (lines 276-301) duplicated from `DEFAULT_SUGGESTED_ACTIONS` in `suggested-actions.tsx`

---

### 7. `features/input/components/attachment-preview.tsx`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 100                                |
| Classification | Domain logic (component)           |
| Complexity     | Low (~3)                           |

**Exports:**
- `AttachmentPreviewProps` (interface)
- `AttachmentPreview` (component)

**Imports:**
- External: `lucide-react`, `next/image`
- Cross-shard: `@/components/ui/button`, `@/lib/utils`
- Internal: `InputAttachment` from `../types`

---

### 8. `features/input/components/submit-button.tsx`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 111                                |
| Classification | Domain logic (component)           |
| Complexity     | Low (~2)                           |

**Exports:**
- `SubmitButtonProps` (interface)
- `SubmitButton` (component)
- `StopButtonProps` (interface)
- `StopButton` (component)

**Imports:**
- External: `lucide-react`
- Cross-shard: `@/components/ui/button`, `@/components/ui/tooltip`, `@/lib/utils`

---

### 9. `features/input/components/suggested-actions.tsx`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 106                                |
| Classification | Domain logic (component)           |
| Complexity     | Low (~3)                           |

**Exports:**
- `SuggestedActionsProps` (interface)
- `DEFAULT_SUGGESTED_ACTIONS` (constant)
- `SuggestedActions` (component, memoized)

**Imports:**
- External: `react`
- Cross-shard: `@/components/ui/button`, `@/lib/motion`, `@/lib/utils`
- Internal: `SuggestedAction` from `../types`

---

### 10. `features/input/hooks/use-input.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 154                                |
| Classification | Domain logic (hook)                |
| Complexity     | Low (~4)                           |

**Exports:**
- `UseInputOptions` (interface)
- `UseInputReturn` (interface)
- `useInput` (hook)

**Imports:**
- External: `react`, `usehooks-ts`
- Internal: `InputAttachment` from `../types`

**Notable:**
- Contains `adjustHeight` and `resetHeight` functions that do the same thing (lines 91-104)

---

### 11. `features/input/hooks/use-file-upload.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 404                                |
| Classification | Domain logic (hook)                |
| Complexity     | Moderate (~10)                     |

**Exports:**
- `UseFileUploadOptions` (interface)
- `UseFileUploadReturn` (interface)
- `useFileUpload` (hook)
- `useFileValidation` (hook)

**Imports:**
- External: `react`, `sonner`
- Internal: `AttachmentError`, `InputAttachment`, `UploadConfig`, `UploadProgress`, `UploadResult` from `../types`
- Internal: `DEFAULT_UPLOAD_CONFIG`, `getAttachmentType` from `../types`

---

### 12. `features/input/schemas/input.schema.ts`
| Property       | Value                              |
|----------------|------------------------------------|
| LOC            | 187                                |
| Classification | Type definitions / validation      |
| Complexity     | Low (~4)                           |

**Exports:**
- Schemas: `AttachmentTypeSchema`, `AttachmentStatusSchema`, `AttachmentSchema`
- Schemas: `UploadConfigSchema`, `UploadResultSchema`, `UploadProgressSchema`
- Schemas: `InputStateSchema`, `SuggestedActionSchema`
- Functions: `validateFileSize()`, `validateFileType()`, `validateInput()`
- Types: `AttachmentType`, `AttachmentStatus`, `Attachment`, `UploadConfig`
- Types: `UploadResult`, `UploadProgress`, `InputState`, `SuggestedAction`

**Imports:**
- External: `zod`

---

## Cross-Shard Dependency Edges

| Source File                                    | Target Module                           | Type       |
|------------------------------------------------|-----------------------------------------|------------|
| `types.ts:9`                                   | `@/features/chat/types`                 | Import     |
| `multimodal-input.tsx:28`                      | `@/features/chat/types`                 | Import     |
| `components/multimodal-input.tsx`              | `@/features/input/components`           | Exported   |
| `components/multimodal-input.tsx:26`           | `@/components/ui/button`                | Import     |
| `components/multimodal-input.tsx:27`           | `@/components/ui/textarea`              | Import     |
| `components/multimodal-input.tsx:29`           | `@/hooks/use-window-size`               | Import     |
| `components/multimodal-input.tsx:30`           | `@/lib/utils`                           | Import     |
| `attachment-preview.tsx:13`                    | `@/components/ui/button`                | Import     |
| `attachment-preview.tsx:14`                    | `@/lib/utils`                           | Import     |
| `submit-button.tsx:12`                         | `@/components/ui/button`                | Import     |
| `submit-button.tsx:13-17`                      | `@/components/ui/tooltip`               | Import     |
| `submit-button.tsx:18`                         | `@/lib/utils`                           | Import     |
| `suggested-actions.tsx:12`                     | `@/components/ui/button`                | Import     |
| `suggested-actions.tsx:13`                     | `@/lib/motion`                          | Import     |
| `suggested-actions.tsx:14`                     | `@/lib/utils`                           | Import     |

**External Consumer (Cross-Shard Import):**
- `features/artifact/components/artifact-panel.tsx:37` imports `MultimodalInput` from `@/features/input`

---

## Intra-Shard Pattern Flags

### 1. ⚠️ DUPLICATE CODE: Suggested Actions Definition
**Severity:** Medium
**Location:**
- `multimodal-input.tsx:276-301` - Hardcoded inline array
- `suggested-actions.tsx:36-61` - `DEFAULT_SUGGESTED_ACTIONS` constant

**Issue:** Identical suggested actions defined in two places. `MultimodalInput` does not use `DEFAULT_SUGGESTED_ACTIONS` from sibling file.

**Recommendation:** Import `DEFAULT_SUGGESTED_ACTIONS` in `multimodal-input.tsx` or pass as prop.

---

### 2. ⚠️ DUPLICATE CODE: File Upload Logic
**Severity:** High
**Location:**
- `multimodal-input.tsx:187-220` - `uploadFile` function
- `use-file-upload.ts:93-138` - `uploadFile` function

**Issue:** Near-identical file upload implementations (70%+ similarity). Both:
- Create FormData with file
- POST to `/api/files/upload`
- Handle AbortController
- Parse response with `{ url, pathname, contentType, filename }`
- Return attachment object

**Recommendation:** `multimodal-input.tsx` should use `useFileUpload` hook instead of inline implementation.

---

### 3. ⚠️ DUPLICATE CODE: File Validation Logic
**Severity:** Medium
**Location:**
- `multimodal-input.tsx:229` - `MAX_CONCURRENT_UPLOADS` batching
- `use-file-upload.ts:202` - `MAX_CONCURRENT_UPLOADS` batching
- `input.schema.ts:115-144` - `validateFileSize`, `validateFileType` functions
- `use-file-upload.ts:353-403` - `useFileValidation` hook

**Issue:** File size/type validation implemented in multiple places with identical logic.

---

### 4. ⚠️ REDUNDANT TYPE DEFINITIONS
**Severity:** Medium
**Location:**
- `types.ts:18-24` - `AttachmentType`, `AttachmentStatus` types
- `input.schema.ts:18-34` - `AttachmentTypeSchema`, `AttachmentStatusSchema` + inferred types

**Issue:** `types.ts` defines `AttachmentType` and `AttachmentStatus` as string literal unions. `input.schema.ts` defines the same via Zod enums with exported inferred types. Both are exported from barrel file.

**Recommendation:** Consolidate - derive types from schemas using `z.infer` only.

---

### 5. ⚠️ REDUNDANT TYPE DEFINITIONS (Props)
**Severity:** Low
**Location:**
- `types.ts:159-216` - Component prop interfaces
- `multimodal-input.tsx:38-61` - `MultimodalInputProps` (different interface!)
- `attachment-preview.tsx:20-29` - `AttachmentPreviewProps`
- `submit-button.tsx:23-34` - `SubmitButtonProps`
- `submit-button.tsx:81-86` - `StopButtonProps`
- `suggested-actions.tsx:20-31` - `SuggestedActionsProps`

**Issue:** Prop interfaces defined in both `types.ts` and individual component files. The `MultimodalInputProps` in `types.ts` differs from the one in `multimodal-input.tsx`:
- `types.ts:159-176`: Has `onSubmit`, `suggestedActions`, `uploadConfig`, `placeholder`, `disabled`, `autoFocus`
- `multimodal-input.tsx:38-61`: Has `input`, `setInput`, `status`, `stop`, `attachments`, `setAttachments`, `messages`, `setMessages`, `sendMessage`

**Recommendation:** Remove prop interfaces from `types.ts` - they belong with components.

---

### 6. ⚠️ IDENTICAL FUNCTIONS: adjustHeight / resetHeight
**Severity:** Low
**Location:**
- `use-input.ts:91-95` - `adjustHeight()`
- `use-input.ts:100-104` - `resetHeight()`
- `multimodal-input.tsx:82-86` - `adjustHeight()`
- `multimodal-input.tsx:94-98` - `resetHeight()`

**Issue:** Both functions set `textareaRef.current.style.height = "44px"` - they are identical.

**Recommendation:** Consolidate into single `resetHeight` function.

---

### 7. ⚠️ NAMING INCONSISTENCY
**Severity:** Low
**Location:**
- `types.ts:28-39` - `InputAttachment` extends `Attachment`
- `schemas/input.schema.ts:39-48` - `AttachmentSchema` with `id`, `status`, `uploadProgress`
- `features/chat/types.ts:123-130` - `Attachment` (base)

**Issue:** Three related types with overlapping but different shapes:
- `Attachment` (chat) - simple `{ name, url, contentType }`
- `Attachment` (schema) - has `id`, `status`, `uploadProgress`, etc.
- `InputAttachment` - extends chat `Attachment` + adds `id`, `type`, `status`

**Recommendation:** Clarify type hierarchy and naming. Schema `Attachment` should perhaps be named `ValidatedAttachment` or similar.

---

### 8. ⚠️ UNUSED EXPORTS
**Severity:** Low
**Location:**
- `types.ts:110-123` - `InputActions` interface
- `types.ts:221-228` - `ToolbarProps` interface
- `types.ts:233` - `FormatType` type

**Issue:** These types are exported from barrel but not used anywhere in the shard. Need cross-shard analysis to confirm if external consumers exist.

---

### 9. ⚠️ UNRELATED COMPONENTS IN SAME FILE
**Severity:** Low
**Location:** `submit-button.tsx`

**Issue:** `SubmitButton` and `StopButton` are unrelated components (different responsibilities). While they share a file for organizational purposes, they could be split.

---

## Summary

| Category                | Count | Details                                    |
|-------------------------|-------|--------------------------------------------|
| Duplicate code blocks   | 3     | Suggested actions, upload logic, validation|
| Redundant types         | 2     | Props in types.ts, AttachmentType duality  |
| Identical functions     | 1     | adjustHeight/resetHeight                   |
| Naming inconsistencies  | 1     | Attachment type hierarchy                  |
| Potential unused exports| 3     | InputActions, ToolbarProps, FormatType     |
| Components per file     | 1     | submit-button.tsx has 2 components         |

---

## Escalation Items

### ⚠️ ESCALATION: Type Architecture Decision Required

The `MultimodalInputProps` interface in `types.ts` is fundamentally different from the actual `MultimodalInputProps` in `multimodal-input.tsx`. This suggests:
1. `types.ts` may contain outdated/unused interface definitions
2. Or there are two different component APIs (planned vs implemented)

**Requires human judgment:** Should `types.ts` props be removed, or is there a wrapper component planned?

### ⚠️ ESCALATION: Hook Integration Decision Required

`multimodal-input.tsx` contains substantial file upload logic that duplicates `useFileUpload` hook. The hook exists but is not used by the main component.

**Requires human judgment:** Should `multimodal-input.tsx` be refactored to use `useFileUpload`? This would simplify the component but may affect current behavior.

---

## Scope Extension Requests

None required. All analysis stayed within `features/input/**` boundary.
