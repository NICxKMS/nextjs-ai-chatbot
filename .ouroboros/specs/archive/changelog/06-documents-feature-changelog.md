# 06. Documents Feature Changelog

## Summary

| Metric              | Value  |
| ------------------- | ------ |
| **Total Files**     | 12     |
| **Total Lines**     | ~1,077 |
| **Main Components** | 4      |
| **Renderers**       | 4      |
| **API Routes**      | 1      |
| **Type Files**      | 1      |
| **Index Files**     | 2      |

---

## 1. Main Components (`features/documents/components/`)

| File                                                                               | Lines | Purpose                                                         | Key Exports                                                                                  |
| ---------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [document-preview.tsx](../../features/documents/components/document-preview.tsx)   | ~370  | Inline document preview in chat with artifact panel integration | `DocumentPreview`, `DocumentPreviewProps`                                                    |
| [document-skeleton.tsx](../../features/documents/components/document-skeleton.tsx) | ~65   | Loading skeletons for document content                          | `DocumentSkeleton`, `InlineDocumentSkeleton`, `DocumentSkeletonProps`                        |
| [document-tool.tsx](../../features/documents/components/document-tool.tsx)         | ~290  | Tool result/call UI for document operations                     | `DocumentToolResult`, `DocumentToolCall`, `DocumentToolResultProps`, `DocumentToolCallProps` |
| [index.ts](../../features/documents/components/index.ts)                           | ~32   | Component barrel exports                                        | All component exports                                                                        |

### Component Details

#### DocumentPreview

- **Purpose**: Renders document previews inline within chat messages
- **Features**:
  - SWR-based document fetching
  - Artifact panel integration via `useArtifact` hook
  - Kind-based rendering (text, code, sheet, image)
  - Streaming support for live document creation
  - Clickable hitbox to open full artifact panel
- **Sub-components**:
  - `LoadingSkeleton` - Loading state
  - `PureHitboxLayer` - Click handler overlay (memoized)
  - `PureDocumentHeader` - Title and icon display (memoized)
  - `DocumentContent` - Kind-specific content rendering

#### DocumentSkeleton

- **Purpose**: Loading states for document UI
- **Variants**:
  - `DocumentSkeleton` - Full-page loading for artifact panel
  - `InlineDocumentSkeleton` - Compact loading for chat inline

#### DocumentToolResult / DocumentToolCall

- **Purpose**: UI for AI tool invocations
- **Operations Supported**:
  - `create` - Creating new documents
  - `update` - Updating existing documents
  - `request-suggestions` - AI suggestions for document

---

## 2. Renderers (`features/documents/components/renderers/`)

| File                                                                                 | Lines | Purpose                               | Key Exports                         |
| ------------------------------------------------------------------------------------ | ----- | ------------------------------------- | ----------------------------------- |
| [text-preview.tsx](../../features/documents/components/renderers/text-preview.tsx)   | ~34   | Text/markdown preview with truncation | `TextPreview`, `TextPreviewProps`   |
| [code-preview.tsx](../../features/documents/components/renderers/code-preview.tsx)   | ~38   | Code snippet preview with line count  | `CodePreview`, `CodePreviewProps`   |
| [sheet-preview.tsx](../../features/documents/components/renderers/sheet-preview.tsx) | ~107  | CSV/JSON table preview                | `SheetPreview`, `SheetPreviewProps` |
| [image-preview.tsx](../../features/documents/components/renderers/image-preview.tsx) | ~35   | Image thumbnail preview               | `ImagePreview`, `ImagePreviewProps` |
| [index.ts](../../features/documents/components/renderers/index.ts)                   | ~13   | Renderer barrel exports               | All renderer exports                |

### Renderer Details

#### TextPreview

- Truncates to `maxLines` (default: 5)
- Whitespace-preserving display
- Prose styling with dark mode

#### CodePreview

- Syntax-styled code block
- Truncates to `maxLines` (default: 8)
- Shows remaining line count
- Dark theme (zinc-900 background)

#### SheetPreview

- Parses JSON or CSV formats
- Table display with headers
- Shows up to 4 columns, `maxRows` (default: 5)
- Displays total row count

#### ImagePreview

- Handles base64 data URIs and HTTP URLs
- Constrained thumbnail (max 200px height)
- Object-fit contain for aspect ratio preservation

---

## 3. API Routes (`app/api/suggestions/`)

| File                                           | Lines | Endpoint           | Method | Purpose                          |
| ---------------------------------------------- | ----- | ------------------ | ------ | -------------------------------- |
| [route.ts](../../app/api/suggestions/route.ts) | ~65   | `/api/suggestions` | GET    | Fetch suggestions for a document |

### Route Details

#### GET `/api/suggestions`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `documentId` | UUID | Yes | Document ID to fetch suggestions for |

**Authentication**: Required (via `requireAuthForRoute`)

**Security Features**:

- UUID format validation via Zod
- IDOR protection (verifies document belongs to user)
- Guest users receive empty array (no persistence)
- Information disclosure prevention (returns empty array for non-existent docs)

**Response**:

```typescript
// Success (200)
Suggestion[]

// With caching
{ 'Cache-Control': 'private, max-age=300' }
```

---

## 4. Integration with Artifacts

### Dependency Chain

```
DocumentPreview
    ├── useArtifact (from @/features/artifacts)
    ├── ArtifactKind (from @/features/artifacts)
    ├── UIArtifact (from @/features/artifacts)
    └── Document (from @/lib/db/schema)

DocumentToolResult / DocumentToolCall
    ├── useArtifact (from @/features/artifacts)
    └── ArtifactKind (from @/features/artifacts)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Message with Tool                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DocumentToolCall (in-progress)                             │
│  - Shows loading spinner                                    │
│  - Displays action type (create/update/suggest)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DocumentToolResult (completed)                             │
│  - Clickable button with document title                     │
│  - Opens artifact panel on click                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DocumentPreview (inline display)                           │
│  - Fetches document via SWR                                 │
│  - Renders with appropriate renderer                        │
│  - Click opens full artifact panel                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Artifact Panel (full view)                                 │
│  - Uses setArtifact from useArtifact hook                   │
│  - Receives documentId, kind, boundingBox                   │
│  - Full document editing/viewing                            │
└─────────────────────────────────────────────────────────────┘
```

### Artifact Integration Points

| Component            | Integration         | Purpose                            |
| -------------------- | ------------------- | ---------------------------------- |
| `DocumentPreview`    | `useArtifact` hook  | Opens artifact panel on click      |
| `DocumentPreview`    | `artifact.status`   | Detects streaming state            |
| `DocumentToolResult` | `setArtifact`       | Opens artifact panel with document |
| `DocumentToolCall`   | `setArtifact`       | Updates artifact visibility        |
| All                  | `ArtifactKind` type | Kind-based rendering decisions     |

---

## 5. Root-Level Files

| File                                          | Lines | Purpose                                           |
| --------------------------------------------- | ----- | ------------------------------------------------- |
| [index.ts](../../features/documents/index.ts) | ~40   | Feature public API - exports types and components |
| [types.ts](../../features/documents/types.ts) | ~68   | Type definitions for documents feature            |

### Type Definitions (`types.ts`)

```typescript
// Re-exported from schema
Document; // Database document type

// Tool Types
DocumentToolResult; // Tool invocation result
DocumentToolArgs; // Tool invocation arguments
DocumentOperationType; // 'create' | 'update' | 'request-suggestions'

// Component Props
DocumentPreviewProps; // Preview component props
DocumentToolProps; // Tool component props
DocumentToolCallProps; // Tool call component props
DocumentSkeletonProps; // Skeleton component props
```

---

## 6. Summary Statistics

### Lines by Category

| Category        | Files | Lines | Percentage |
| --------------- | ----- | ----- | ---------- |
| Main Components | 4     | ~757  | 70.3%      |
| Renderers       | 5     | ~227  | 21.1%      |
| API Routes      | 1     | ~65   | 6.0%       |
| Root Files      | 2     | ~108  | 10.0%      |

### Complexity Distribution

| Complexity | Files | Description                                    |
| ---------- | ----- | ---------------------------------------------- |
| High       | 2     | `document-preview.tsx`, `sheet-preview.tsx`    |
| Medium     | 3     | `document-tool.tsx`, `route.ts`, `types.ts`    |
| Low        | 7     | Remaining files (renderers, indexes, skeleton) |

### Export Summary

| Export Type      | Count |
| ---------------- | ----- |
| Components       | 8     |
| Types            | 8     |
| Props Interfaces | 6     |

---

## 7. Key Architectural Improvements

### 1. **Feature-Based Encapsulation**

- All document-related code isolated in `features/documents/`
- Clean public API via barrel exports
- Internal implementation details hidden

### 2. **Separation of Concerns**

- Renderers isolated by document kind
- Tool UI separated from preview UI
- API route handles only data fetching

### 3. **Performance Optimization**

- Memoized sub-components (`PureHitboxLayer`, `PureDocumentHeader`)
- SWR caching for document fetching
- API response caching (`max-age=300`)

### 4. **Type Safety**

- Comprehensive type definitions
- Zod validation for API inputs
- Strict props interfaces

### 5. **Security Hardening**

- Authentication required for API
- IDOR protection via ownership verification
- Information disclosure prevention
- Guest user handling

---

## Migration Notes

### From OldApp

The Documents feature was migrated from `oldapp/components/` with the following changes:

| OldApp Location                    | NewApp Location                                       | Changes                          |
| ---------------------------------- | ----------------------------------------------------- | -------------------------------- |
| `components/document.tsx`          | `features/documents/components/document-preview.tsx`  | Split into multiple components   |
| `components/document-skeleton.tsx` | `features/documents/components/document-skeleton.tsx` | Minimal changes                  |
| Inline in various files            | `features/documents/components/renderers/`            | Extracted to dedicated renderers |
| `app/api/suggestions/route.ts`     | `app/api/suggestions/route.ts`                        | Enhanced auth + validation       |

### Breaking Changes

- Import paths changed from `@/components/` to `@/features/documents`
- Type imports now from `@/features/documents/types`

---

_Generated: 2025-12-21_
_Feature: Documents_
_Module: `features/documents`_
