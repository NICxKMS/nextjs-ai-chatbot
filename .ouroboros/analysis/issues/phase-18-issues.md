# Phase 18: Error Handling Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 8            | 0   | 2   | 5   | 1   | 8h    |

---

### ISSUE-P18-001: Missing Error Boundary for Sidebar

**File**: `features/sidebar/components/sidebar.tsx`
**Severity**: P2 (High)
**Category**: Error Handling
**Hours**: 1.5h

**Problem**: Sidebar lacks error boundary, errors crash entire layout.

**Fix**:

```typescript
// features/sidebar/components/sidebar-error-boundary.tsx
export function SidebarErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary
      fallback={<SidebarErrorFallback />}
      onError={(error) => logger.error("Sidebar error", { error })}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

### ISSUE-P18-002: Unhandled Promise in Model Refresh

**File**: `features/chat/components/model-selector.tsx`
**Severity**: P3 (Medium)
**Category**: Error Handling
**Hours**: 0.5h

**Problem**: `refreshModels()` call without try-catch.

**Fix**:

```typescript
const handleRefresh = async () => {
  try {
    await refreshModels();
    toast.success("Models refreshed");
  } catch (error) {
    toast.error("Failed to refresh models");
    logger.error("Model refresh failed", { error });
  }
};
```

---

### ISSUE-P18-003: Missing Validation in History Hook

**File**: `features/sidebar/hooks/use-history.ts`
**Severity**: P3 (Medium)
**Category**: Error Handling
**Hours**: 1h

**Problem**: API response not validated with schema.

**Fix**:

```typescript
import { z } from "zod";

const historyResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string(),
    createdAt: z.string().datetime(),
  })
);

const validated = historyResponseSchema.parse(response);
```

---

### ISSUE-P18-004: Swallowed Errors in Sidebar Operations

**File**: `features/sidebar/components/sidebar-history.tsx`
**Severity**: P3 (Medium)
**Category**: Error Handling
**Hours**: 1h

**Problem**: Delete/update operations may silently fail.

**Fix**: Add explicit error handling with user feedback:

```typescript
try {
  await deleteChat(chatId);
  toast.success("Chat deleted");
} catch (error) {
  toast.error("Failed to delete chat");
  throw error; // Re-throw for error boundary
}
```

---

### ISSUE-P18-005: Missing Error Boundary for Editor

**File**: `features/artifacts/components/artifact-editor.tsx`
**Severity**: P2 (High)
**Category**: Error Handling
**Hours**: 2h

**Problem**: Editor crashes can break entire chat view.

**Fix**: Wrap editor in dedicated error boundary with recovery option.

---

### ISSUE-P18-006: Missing AbortSignal Handling

**File**: `features/chat/hooks/use-chat.tsx`
**Severity**: P3 (Medium)
**Category**: Error Handling
**Hours**: 0.5h

**Problem**: Abort errors not distinguished from network errors.

**Fix**:

```typescript
catch (error) {
    if (error.name === "AbortError") {
        logger.debug("Request cancelled by user");
        return;
    }
    throw error;
}
```

---

### ISSUE-P18-007: Missing Validation in Sheet Preview

**File**: `components/ai-elements/sheet-preview.tsx`
**Severity**: P3 (Medium)
**Category**: Error Handling
**Hours**: 0.5h

**Problem**: JSON.parse without try-catch.

**Fix**: Wrap in try-catch with fallback UI.

---

### ISSUE-P18-008: Missing Error Boundary for Settings

**File**: `features/settings/components/settings-panel.tsx`
**Severity**: P4 (Low)
**Category**: Error Handling
**Hours**: 1h

**Problem**: Settings panel lacks error boundary.

**Fix**: Add error boundary wrapper.

---

## Error Handling Strategy

1. **Boundaries**: Wrap feature roots in error boundaries
2. **Validation**: Use Zod for all external data
3. **Recovery**: Provide retry/fallback options
4. **Logging**: Always log errors before handling

## Validation Checklist

- [ ] All feature roots have error boundaries
- [ ] API responses validated
- [ ] Abort signals properly handled
- [ ] User-friendly error messages
