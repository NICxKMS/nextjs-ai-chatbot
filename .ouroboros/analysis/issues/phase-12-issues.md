# Phase 12: Coupling Analysis Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 5            | 0   | 3   | 2   | 0   | 5.5h  |

---

### ISSUE-P12-001: High Efferent Coupling - useChat Hook

**File**: `features/chat/hooks/use-chat.tsx#L1-396`
**Severity**: P2 (High)
**Category**: Coupling
**Hours**: 2h

**Problem**: Hook depends on 9+ external modules, creating high efferent coupling.

**Code**:

```typescript
import { useSettings } from "@/features/settings";
import { useOptimisticChats } from "@/features/sidebar/hooks";
import { DEFAULT_MODEL_ID } from "@/lib/ai/config";
import { getAvailableModels } from "@/lib/ai/models";
import { logger } from "@/lib/utils/logger";
import { fetchWithErrorHandlers } from "@/lib/utils/network";
```

**Fix**: Create dependency injection pattern:

```typescript
interface ChatDependencies {
  settings: SettingsContext;
  chats: ChatsContext;
  models: ModelsProvider;
  logger: Logger;
}

function useChat(deps: ChatDependencies) {
  // Use injected dependencies
}

// Default factory
function useChatWithDefaults() {
  return useChat({
    settings: useSettings(),
    chats: useOptimisticChats(),
    models: defaultModelsProvider,
    logger: defaultLogger,
  });
}
```

---

### ISSUE-P12-002: Feature Boundary Violation - Message Parts

**File**: `features/chat/components/message-parts.tsx#L18-23`
**Severity**: P2 (High)
**Category**: Feature Boundary
**Hours**: 1.5h

**Problem**: Chat feature directly imports components from documents and types from artifacts.

**Code**:

```typescript
import type { ArtifactKind } from "@/features/artifacts";
import {
  DocumentPreview,
  DocumentToolCall,
  DocumentToolResult,
} from "@/features/documents";
```

**Fix**: Use render props or slots pattern:

```typescript
interface MessagePartsProps {
  children?: ReactNode;
  slots?: {
    documentPreview?: ComponentType<DocumentPreviewSlotProps>;
    toolCall?: ComponentType<ToolCallSlotProps>;
  };
}
```

---

### ISSUE-P12-003: Singleton Pattern - Session Manager

**File**: `lib/auth/session.ts#L46-50`
**Severity**: P3 (Medium)
**Category**: Coupling / Testability
**Hours**: 1h

**Problem**: Singleton pattern makes testing difficult and creates hidden global state.

**Code**:

```typescript
static getInstance(): SessionManager {
    if (!SessionManager.instance) {
        SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
}
```

**Fix**: Use dependency injection with factory:

```typescript
// Factory function
export function createSessionManager(deps: SessionDeps): SessionManager {
  return new SessionManager(deps);
}

// For production
export const sessionManager = createSessionManager(prodDeps);

// For testing
const testManager = createSessionManager(mockDeps);
```

---

### ISSUE-P12-004: Singleton Pattern - Database Connection

**File**: `lib/db/index.ts#L12-19`
**Severity**: P4 (Low)
**Category**: Coupling
**Hours**: 0.5h

**Problem**: Global singleton for HMR compatibility.

**Note**: This is an acceptable pattern for database connections in development. Mark as P4-ACCEPTED with documentation.

---

### ISSUE-P12-005: Singleton Pattern - AI Registry

**File**: `lib/ai/registry.ts#L380`
**Severity**: P3 (Medium)
**Category**: Coupling
**Hours**: 0.5h

**Problem**: AI registry uses singleton pattern.

**Fix**: Create factory with reset capability for testing.

---

## Coupling Metrics

| Module             | Afferent (dependents) | Efferent (dependencies) | Instability     |
| ------------------ | --------------------- | ----------------------- | --------------- |
| lib/utils          | High (20+)            | Low (2)                 | 0.1 (stable)    |
| features/chat      | Medium (5)            | High (9)                | 0.64 (unstable) |
| features/artifacts | Medium (6)            | Medium (4)              | 0.4             |

## Validation Checklist

- [ ] High coupling modules refactored
- [ ] Singletons replaced with factories
- [ ] Feature boundaries respected
