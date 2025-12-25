# Phase 11: Circular Dependencies Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 9            | 0   | 5   | 4   | 0   | 5h    |

---

### ISSUE-P11-001: Cross-Feature Import - Artifacts to Chat Types

**File**: `features/artifacts/types/index.ts#L15`
**Severity**: P2 (High)
**Category**: Circular Dependency
**Hours**: 0.5h

**Problem**: Artifacts feature imports types from chat feature, creating cross-feature coupling.

**Code**:

```typescript
export type { VisibilityType } from "@/features/chat/types";
```

**Fix**: Move `VisibilityType` to shared types:

```typescript
// shared/types/visibility.ts
export type VisibilityType = "public" | "private";

// features/artifacts/types/index.ts
export type { VisibilityType } from "@/shared/types/visibility";
```

---

### ISSUE-P11-002: Cross-Feature Import - Chat to Artifacts/Documents

**File**: `features/chat/components/message-parts.tsx#L18-23`
**Severity**: P2 (High)
**Category**: Circular Dependency
**Hours**: 1h

**Problem**: Chat feature imports from both artifacts and documents features.

**Code**:

```typescript
import type { ArtifactKind } from "@/features/artifacts";
import {
  DocumentPreview,
  DocumentToolCall,
  DocumentToolResult,
} from "@/features/documents";
```

**Fix**: Use composition pattern with slots/render props:

```typescript
// Chat component receives renderers via props
interface MessagePartsProps {
  renderDocumentPreview?: (props: DocumentPreviewProps) => ReactNode;
  renderToolCall?: (props: ToolCallProps) => ReactNode;
}
```

---

### ISSUE-P11-003: Chat to Artifacts Hook Import

**File**: `features/chat/components/chat.tsx#L26-27`
**Severity**: P2 (High)
**Category**: Circular Dependency
**Hours**: 0.5h

**Problem**: Chat imports both types and hooks from artifacts feature.

**Code**:

```typescript
import { useArtifact } from "@/features/artifacts";
import type { ArtifactKind } from "@/features/artifacts";
```

**Fix**: Inject artifact state via context/props instead of direct import.

---

### ISSUE-P11-004: Sidebar to Artifacts/Chat Imports

**File**: `features/sidebar/components/sidebar-history.tsx#L24-25`
**Severity**: P2 (High)
**Category**: Circular Dependency
**Hours**: 1h

**Problem**: Sidebar imports from artifacts feature and chat hooks.

**Code**:

```typescript
import { useArtifact } from "@/features/artifacts";
import { useChatVisibility } from "@/features/sidebar/hooks";
```

**Fix**: Move shared hooks to `shared/hooks/` or inject via context.

---

### ISSUE-P11-005: Documents to Artifacts Import

**File**: `features/documents/components/document-preview.tsx#L9`
**Severity**: P3 (Medium)
**Category**: Circular Dependency
**Hours**: 0.5h

**Problem**: Documents feature imports from artifacts feature.

**Code**:

```typescript
import { ArtifactKind } from "@/features/artifacts";
```

**Fix**: Move `ArtifactKind` to shared types.

---

### ISSUE-P11-006: Documents Using Artifacts Type + Hook

**File**: `features/documents/components/document-toolbar.tsx#L6-7`
**Severity**: P3 (Medium)
**Category**: Circular Dependency
**Hours**: 0.5h

**Problem**: Documents imports both type and hook from artifacts.

**Fix**: Move shared types to `shared/types/`, inject hooks via context.

---

### ISSUE-P11-007: Barrel Wildcard Exports - Artifacts

**File**: `features/artifacts/index.ts#L9-12`
**Severity**: P3 (Medium)
**Category**: Barrel Export Pattern
**Hours**: 0.5h

**Problem**: Wildcard exports can create circular dependency chains.

**Code**:

```typescript
export * from "./components";
export * from "./hooks";
export * from "./types";
export * from "./utils";
```

**Fix**: Use explicit named exports:

```typescript
export { Artifact, ArtifactViewer } from "./components";
export { useArtifact, useArtifactState } from "./hooks";
export type { ArtifactKind, ArtifactProps } from "./types";
```

---

### ISSUE-P11-008: Barrel Wildcard - Editor

**File**: `lib/editor/index.ts#L14`
**Severity**: P3 (Medium)
**Category**: Barrel Export Pattern
**Hours**: 0.5h

**Problem**: Wildcard re-export from editors subdirectory.

**Code**:

```typescript
export * from "./editors";
```

**Fix**: Replace with explicit exports.

---

### ISSUE-P11-009: Barrel Wildcard - UI Components

**File**: `components/ui/index.ts#L10-97`
**Severity**: P3 (Medium)
**Category**: Barrel Export Pattern
**Hours**: 1h

**Problem**: Multiple wildcard re-exports in UI index file.

**Fix**: Convert to explicit exports for better tree-shaking.

---

## Dependency Graph Fix Priority

1. Create `shared/types/` for cross-feature types (VisibilityType, ArtifactKind)
2. Use composition pattern for cross-feature components
3. Replace wildcard exports with explicit named exports

## Validation Checklist

- [ ] No feature imports other features directly
- [ ] Shared types in shared/types/
- [ ] Explicit named exports in barrel files
