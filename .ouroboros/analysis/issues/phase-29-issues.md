# Phase 29: Dependency Graph Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 3            | 0   | 2   | 1   | 0   | 17h   |

---

### ISSUE-P29-001: Cross-Feature Coupling (Circular Risk)

**File**: `features/**`
**Severity**: P2 (High)
**Category**: Architecture - Coupling
**Hours**: 5h

**Problem**: Features import from each other, creating circular dependency risks.

**Coupling Matrix**:
| From | To | Risk Level |
|------|-----|-----------|
| features/artifacts | features/chat | HIGH |
| features/chat | features/documents | HIGH |
| features/sidebar | features/artifacts | MEDIUM |
| features/documents | features/artifacts | MEDIUM |

**Evidence**:

```typescript
// features/chat/components/message-parts.tsx
import type { ArtifactKind } from "@/features/artifacts";
import { DocumentPreview } from "@/features/documents";

// features/artifacts/types/index.ts
export type { VisibilityType } from "@/features/chat/types";
```

**Fix**: Create shared types module:

```typescript
// shared/types/index.ts
export type VisibilityType = "public" | "private";
export type { ArtifactKind } from "./artifact-kind";
export type { DocumentKind } from "./document-kind";

// features/chat/components/message-parts.tsx
import type { ArtifactKind } from "@/shared/types";
```

---

### ISSUE-P29-002: Hub Module High Coupling

**File**: `lib/utils/index.ts`
**Severity**: P3 (Medium)
**Category**: Architecture - Coupling
**Hours**: 4h

**Problem**: Utils module has 72 dependents - any change cascades widely.

**Dependents**:

- app/ - 15 imports
- features/ - 35 imports
- lib/ - 22 imports

**High-Risk Utilities**:
| Utility | Dependents |
|---------|------------|
| `cn()` | 50+ |
| `logger` | 30+ |
| `formatDate()` | 20+ |

**Fix**: Consider splitting into domain-specific modules:

```
lib/utils/
├── classnames.ts      # cn() only
├── logger.ts          # Logger (separate)
├── date.ts            # Date utilities
├── string.ts          # String utilities
└── index.ts           # Re-exports
```

---

### ISSUE-P29-003: Service Layer Bypass

**File**: Multiple API routes
**Severity**: P2 (High)
**Category**: Architecture - Missing Edges
**Hours**: 8h

**Problem**: Routes call data layer directly instead of service layer.

**Current Flow (Wrong)**:

```
app/api/chat → lib/data/chat → lib/db
                (bypasses)
              lib/services/chat-service
```

**Expected Flow**:

```
app/api/chat → lib/services/chat-service → lib/data/chat → lib/db
```

**Affected Routes**:
| Route | Current | Should Use |
|-------|---------|------------|
| `/api/chat` | `lib/data/chat` | `lib/services/chat-service` |
| `/api/document` | `lib/data/document` | `lib/services/document-service` |
| `/api/history` | `lib/data/chat` | `lib/services/chat-service` |

**Fix**: Route through service layer:

```typescript
// app/api/chat/route.ts
import { ChatService } from "@/lib/services/chat-service";

export async function POST(request: Request) {
  return ChatService.handleChatRequest(request);
}
```

---

## Dependency Graph Visualization

```
                    ┌─────────────────┐
                    │      app/       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │features/│◄────────│ shared/ │────────►│  lib/   │
    └────┬────┘    ✗    └─────────┘         └────┬────┘
         │  cross-imports                        │
         └───────────────────────────────────────┘

Legend:
✓ Allowed: app/ → features/ → shared/ → lib/
✗ Forbidden: features/ → features/ (direct)
```

## Validation Checklist

- [ ] No cross-feature imports (use shared/)
- [ ] Service layer used by all routes
- [ ] Utils split into focused modules
- [ ] Dependency graph is acyclic
