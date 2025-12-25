# Phase 14: Design Pattern Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 10           | 0   | 5   | 5   | 0   | 8.5h  |

---

### ISSUE-P14-001: Silent Error Swallowing - Settings

**File**: `features/settings/hooks/use-settings.ts#L135`
**Severity**: P2 (High)
**Category**: Anti-Pattern
**Hours**: 0.5h

**Problem**: Catch block swallows error and returns default without logging.

**Code**:

```typescript
} catch {
    return config.defaultValue;
}
```

**Fix**:

```typescript
} catch (error) {
    logger.warn("Settings load failed, using default", {
        key: config.key,
        error
    });
    return config.defaultValue;
}
```

---

### ISSUE-P14-002: Silent Error - AuthProvider

**File**: `features/auth/components/auth-provider.tsx#L194`
**Severity**: P2 (High)
**Category**: Anti-Pattern
**Hours**: 0.5h

**Problem**: Silent catch with return, hiding authentication errors.

**Fix**: Log auth failures for debugging.

---

### ISSUE-P14-003: Silent Error - Cache Operations

**File**: `lib/cache/operations.ts#L254, L273`
**Severity**: P3 (Medium)
**Category**: Anti-Pattern
**Hours**: 0.5h

**Problem**: Cache operations silently return false on error.

**Code**:

```typescript
} catch {
    return false;
}
```

**Fix**: Log cache failures with error details.

---

### ISSUE-P14-004: Silent Error - useChat Hook

**File**: `features/chat/hooks/use-chat.tsx#L372, L455`
**Severity**: P2 (High)
**Category**: Anti-Pattern
**Hours**: 1h

**Problem**: Multiple silent catch blocks in chat functionality.

**Fix**: Add structured logging for all chat errors.

---

### ISSUE-P14-005: God Object - Message Parts Component

**File**: `features/chat/components/message-parts.tsx#L1-554`
**Severity**: P2 (High)
**Category**: Anti-Pattern
**Hours**: 3h

**Problem**: 554-line component handling 5+ message part types.

**Fix**: Split into separate components:

```
features/chat/components/message-parts/
├── index.tsx              # Composition
├── text-part.tsx          # Text rendering
├── tool-call-part.tsx     # Tool calls
├── tool-result-part.tsx   # Tool results
├── image-part.tsx         # Images
└── file-part.tsx          # File attachments
```

---

### ISSUE-P14-006: Missing Strategy Pattern - Message Rendering

**File**: `features/chat/components/message-parts.tsx#L500-550`
**Severity**: P3 (Medium)
**Category**: Missing Pattern
**Hours**: 1h

**Problem**: Large switch statement for rendering different part types.

**Code**:

```typescript
switch (part.type) {
    case "text":
        return <TextPartView ... />;
    case "tool-call":
        return <ToolCallPartView ... />;
    case "tool-result":
        return <ToolResultPartView ... />;
    // ...
}
```

**Fix**: Use component registry pattern:

```typescript
const partRenderers: Record<PartType, ComponentType<PartProps>> = {
  text: TextPartView,
  "tool-call": ToolCallPartView,
  "tool-result": ToolResultPartView,
};

const Renderer = partRenderers[part.type];
return <Renderer {...partProps} />;
```

---

### ISSUE-P14-007: Missing Strategy - Code Block Languages

**File**: `components/ai-elements/code-block.tsx#L103`
**Severity**: P3 (Medium)
**Category**: Missing Pattern
**Hours**: 0.5h

**Problem**: Switch on type for language handling.

**Fix**: Use lookup map for language configurations.

---

### ISSUE-P14-008: Type Assertions Anti-Pattern

**File**: `features/chat/components/message-parts.tsx#L218-230`
**Severity**: P3 (Medium)
**Category**: Anti-Pattern
**Hours**: 1h

**Problem**: Unsafe type assertions with `as Record<string, unknown>`.

**Code**:

```typescript
const docArgs =
    toolName === "createDocument"
        ? {
              title: (args as Record<string, unknown>).title as string,
              kind: (args as Record<string, unknown>).kind as ArtifactKind,
          }
```

**Fix**: Define proper types:

```typescript
interface CreateDocumentArgs {
  title: string;
  kind: ArtifactKind;
}

interface UpdateDocumentArgs {
  id: string;
  content: string;
}

type ToolArgs = CreateDocumentArgs | UpdateDocumentArgs;

// Type guard
function isCreateDocumentArgs(args: unknown): args is CreateDocumentArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "title" in args &&
    "kind" in args
  );
}
```

---

### ISSUE-P14-009: Type Assertion - Message Parts

**File**: `features/chat/components/message-parts.tsx#L287`
**Severity**: P3 (Medium)
**Category**: Anti-Pattern
**Hours**: 0.5h

**Problem**: Another unsafe `as` assertion.

**Fix**: Use type guards and proper typing.

---

### ISSUE-P14-010: Missing Null Object Pattern

**File**: Various
**Severity**: P3 (Medium)
**Category**: Missing Pattern
**Hours**: 0.5h

**Problem**: Multiple `?? []` or `?? {}` fallbacks scattered.

**Fix**: Use null object pattern with default constants.

---

## Pattern Recommendations

1. **Registry Pattern**: For type-based component selection
2. **Strategy Pattern**: For algorithm switching
3. **Null Object**: For default values
4. **Factory**: For object creation with dependencies

## Validation Checklist

- [ ] No silent catch blocks
- [ ] Large switch statements converted to registries
- [ ] Type assertions replaced with type guards
- [ ] God objects split into focused components
