# Data Flow: Artifact → UIArtifact

## Source Definition

**Database Schema** (`lib/db/schema.ts:264-296`)

```typescript
export const artifact = pgTable("Artifact", {
  id: uuid("id").notNull().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  title: text("title").notNull(),
  content: text("content"),
  kind: artifactKindEnum("kind").notNull().default("text"),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id").notNull().references(() => chat.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Artifact = InferSelectModel<typeof artifact>
```

**Key characteristics:**
- Composite primary key: `(id, createdAt)` enables versioning
- `id` is shared across all versions of the same artifact
- `createdAt` differentiates versions
- `kind` uses `artifactKindEnum` = `["text", "code", "image", "sheet"]`

---

## Transformation Chain

### 1. Repository Layer (`lib/data/repositories/artifact.repository.ts`)

**Input/Output:** Direct `Artifact` type (no transformation)

**Key methods:**
- `doFindById()` → Returns latest version via `ORDER BY createdAt DESC LIMIT 1`
- `findAllVersions()` → Returns all versions ordered chronologically
- `findLatestVersion()` → Single latest version
- `saveVersion()` → Creates new version with same `id`, new `createdAt`
- `deleteVersionsAfterTimestamp()` → Rollback support

**No field transformations** - Repository returns raw DB rows.

### 2. Service Layer (`lib/data/services/artifact.service.ts`)

**Input/Output:** `Artifact` type (no transformation at service level)

**Key orchestration:**
- `getArtifact()` → May fetch specific version by timestamp
- `getWithSuggestions()` → Combines artifact + suggestions
- `createArtifact()` → Generates new UUID, passes to repository
- `updateArtifact()` → Fetches current, merges params, creates new version

**No field transformations** - Service orchestrates repository calls.

### 3. Action Layer (`features/artifact/actions/*.ts`)

**Input:** Action-specific params types
**Output:** `Artifact` type from schema

**Key actions:**
| Action | Input Type | Output | Transformation |
|--------|------------|--------|----------------|
| `getArtifact` | `artifactId, version?` | `Artifact \| null` | None |
| `createArtifact` | `CreateArtifactParams` | `Artifact` | Params → Service params |
| `updateArtifact` | `artifactId, UpdateArtifactParams` | `Artifact` | None |
| `getVersionHistory` | `artifactId` | `Artifact[]` | None |
| `getSuggestions` | `artifactId` | `Suggestion[]` | None |

**Action param types duplicate `kind` type:**
```typescript
// create-artifact.action.ts:29
kind: "text" | "code" | "image" | "sheet"
// update-artifact.action.ts:29
kind?: "text" | "code" | "image" | "sheet"
```

### 4. Feature Type Mapping (`features/artifact/types.ts`)

**UIArtifact definition:**
```typescript
export type ArtifactKind = "text" | "code" | "image" | "sheet"

export interface UIArtifact {
  title: string
  documentId: string        // Maps from Artifact.id
  kind: ArtifactKind        // Maps from Artifact.kind
  content: string           // Maps from Artifact.content
  isVisible: boolean        // UI-only state
  status: ArtifactStatus    // UI-only state ("streaming" | "idle")
  boundingBox: ArtifactBoundingBox  // UI-only state
}
```

**Mapping transformations:**
| DB Field (Artifact) | UI Field (UIArtifact) | Transformation |
|---------------------|----------------------|----------------|
| `id` | `documentId` | Renamed |
| `kind` | `kind` | Same type, different source |
| `title` | `title` | Direct |
| `content` | `content` | `null` → `""` handled |
| `createdAt` | — | Not in UIArtifact |
| `updatedAt` | — | Not in UIArtifact |
| `userId` | — | Not in UIArtifact |
| `chatId` | — | Not in UIArtifact |
| — | `isVisible` | UI state only |
| — | `status` | UI state only |
| — | `boundingBox` | UI state only |

### 5. Component Usage (`features/artifact/components/artifact-panel.tsx`)

**Data flow in component:**
1. `useSWR<Artifact[]>()` fetches versions via `getVersionHistory()`
2. `useArtifact()` hook provides `UIArtifact` state via SWR
3. Component maps between `Artifact[]` (versions) and `UIArtifact` (current)

**Key mapping code (lines 308-319):**
```typescript
if (documents && documents.length > 0) {
  const mostRecentDocument = documents.at(-1)
  if (mostRecentDocument) {
    setCurrentDocument(mostRecentDocument)
    setCurrentVersionIndex(documents.length - 1)
    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      content: mostRecentDocument.content ?? "",
    }))
  }
}
```

---

## Field Mapping Table

| DB Field | Repository | Service | Action | UI Field | Transformations |
|----------|------------|---------|--------|----------|-----------------|
| `id` | `Artifact.id` | `Artifact.id` | `Artifact.id` | `documentId` | Renamed for UI |
| `createdAt` | `Artifact.createdAt` | `Artifact.createdAt` | `Artifact.createdAt` | — | Used for versioning, not in UI type |
| `title` | Direct | Direct | Direct | `title` | None |
| `content` | `string \| null` | `string \| null` | `string \| null` | `string` | `null → ""` in component |
| `kind` | `"text" \| "code" \| "image" \| "sheet"` | Same | Same | Same | None |
| `userId` | `Artifact.userId` | `Artifact.userId` | Used for auth | — | Not exposed to UI |
| `chatId` | `Artifact.chatId` | `Artifact.chatId` | `Artifact.chatId` | — | Not in UI type |
| `updatedAt` | `Artifact.updatedAt` | — | — | — | Not used |
| — | — | — | — | `isVisible` | Client state only |
| — | — | — | — | `status` | Client state only |
| — | — | — | — | `boundingBox` | Client state only |

---

## Version History Flow

```
DB (all versions) → Repository.findAllVersions() → Service.getArtifactVersions()
  → Action.getVersionHistory() → SWR cache → Component state (documents array)
```

**Version selection:**
1. All versions fetched chronologically (oldest first)
2. `currentVersionIndex` tracks active version
3. `isCurrentVersion = currentVersionIndex === documents.length - 1`
4. `getDocumentContentById(index)` retrieves specific version content

**Rollback flow:**
```
User action → rollbackToVersion(artifactId, timestamp)
  → Service.rollbackToTimestamp() → Repository.deleteVersionsAfterTimestamp()
  → DELETE versions where createdAt > timestamp
```

---

## Suggestions Flow

```
Suggestion DB table → suggestionRepository.findByArtifactId()
  → artifactService.getSuggestions() → Action.getSuggestions()
  → Component (passed to ArtifactContentProps.suggestions)
```

**Suggestion-Artifact relationship:**
- `suggestion.artifactId` → references `artifact.id`
- `suggestion.artifactCreatedAt` → references specific artifact version
- **Issue:** Suggestions tied to specific version, but UI shows latest

**Apply suggestion flow:**
```
applySuggestion(artifactId, suggestionId)
  → Fetch suggestion → Get artifact content
  → content.replace(originalText, suggestedText)
  → updateArtifact() → Creates new version
```

---

## Issues Found

### 1. ArtifactKind Duplication
**Location:** 
- `lib/db/schema.ts:51-56` - `artifactKindEnum`
- `features/artifact/types.ts:14` - `ArtifactKind` type

**Problem:** Same type defined in two places. Changes must be synchronized manually.

**Risk:** If `artifactKindEnum` values change, `ArtifactKind` type could become out of sync.

### 2. Action Params Duplicate Kind Type
**Locations:**
- `create-artifact.action.ts:29`
- `update-artifact.action.ts:29`
- `versions.ts:34`
- `artifact.repository.ts:45,59,73`
- `artifact.service.ts:46,60`

**Problem:** `"text" | "code" | "image" | "sheet"` hardcoded in 7+ locations.

### 3. `documentId` Naming Inconsistency
**Location:** `UIArtifact.documentId` maps to `Artifact.id`

**Problem:** Field renamed causes cognitive overhead. "Document" is legacy terminology from v5 (Artifact was called Document).

### 4. Missing Type at Action Layer
**Location:** `get-artifact.action.ts:22-37`

**Problem:** `ArtifactWithSuggestions` interface redefines Suggestion type instead of importing from schema.

### 5. Null Content Handling
**Location:** `artifact-panel.tsx:317` and multiple locations

**Problem:** `content: string | null` in DB becomes `string` in UI with `?? ""` scattered throughout code.

### 6. Suggestion Version Coupling
**Location:** `suggestion` table schema

**Problem:** Suggestions reference `artifactCreatedAt`, tying them to a specific version. When artifact is updated (new version), suggestions may become stale.

---

## Simplification Opportunities

### 1. Single ArtifactKind Source of Truth
```typescript
// lib/types/artifact.ts (new file)
export const ARTIFACT_KINDS = ["text", "code", "image", "sheet"] as const
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]
```
Then import everywhere instead of duplicating.

### 2. Unified Content Type
Create a domain type that handles null:
```typescript
// Normalize at repository boundary
type ArtifactWithContent = Omit<Artifact, 'content'> & { content: string }
```

### 3. Rename UIArtifact.documentId → artifactId
Update `UIArtifact` to use `artifactId` for consistency with DB schema.

### 4. Create Mapper Function
```typescript
// features/artifact/mappers.ts
function artifactToUIArtifact(artifact: Artifact, uiState: Partial<UIArtifact>): UIArtifact {
  return {
    documentId: artifact.id,
    title: artifact.title,
    kind: artifact.kind,
    content: artifact.content ?? "",
    isVisible: uiState.isVisible ?? false,
    status: uiState.status ?? "idle",
    boundingBox: uiState.boundingBox ?? { top: 0, left: 0, width: 0, height: 0 },
  }
}
```

### 5. Suggestion Strategy
Consider either:
- Decoupling suggestions from specific versions (attach to artifact ID only)
- Or explicitly documenting the version-bound suggestion behavior

### 6. Remove Unused Fields
- `Artifact.updatedAt` appears unused in the codebase
- Consider removal or document its purpose
