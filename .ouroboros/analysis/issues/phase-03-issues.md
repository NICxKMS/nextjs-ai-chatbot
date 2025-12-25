# Phase 03 Issues - Type Safety & Code Quality

## Summary

| ID     | Issue                                    | Priority | Est. |
| ------ | ---------------------------------------- | -------- | ---- |
| P3-001 | Type Safety Violations with `as unknown` | P2       | 2h   |
| P3-002 | TODO in chat-context.tsx                 | P3       | 1h   |
| P3-003 | 12 TODO Comments Across Codebase         | P3       | 6h   |
| P3-004 | Verified - Not Orphaned                  | INFO     | -    |

---

## ISSUE-P3-001: Type Safety Violations with `as unknown`

**Priority:** P2 - High  
**Effort:** 2h  
**Category:** Type Safety

### Description

Multiple instances of `as unknown as T` pattern bypassing TypeScript safety.

### Locations

```typescript
// Found in multiple files:
features / chat / components / message.tsx;
lib / ai / stream - helpers.ts;
lib / utils / transform.ts;
```

### Example

```typescript
// UNSAFE
const data = response as unknown as ChatMessage;

// SAFE - Use type guards
function isChatMessage(obj: unknown): obj is ChatMessage {
  return (
    typeof obj === "object" && obj !== null && "id" in obj && "content" in obj
  );
}

const data = response;
if (!isChatMessage(data)) {
  throw new Error("Invalid chat message format");
}
```

### Fix

Replace all `as unknown as T` with proper type guards or Zod validation.

---

## ISSUE-P3-002: TODO in chat-context.tsx

**Priority:** P3 - Medium  
**Effort:** 1h  
**Category:** Incomplete Implementation

### Description

TODO comment indicates incomplete implementation in chat context.

### Location

- `features/chat/context/chat-context.tsx`

### Current Code

```typescript
// TODO: Implement proper message persistence
// TODO: Add optimistic updates for better UX
```

### Fix

Implement the pending functionality:

```typescript
const persistMessage = useCallback(async (message: Message) => {
  // Optimistic update
  setMessages((prev) => [...prev, message]);

  try {
    await chatService.saveMessage(message);
  } catch (error) {
    // Rollback on failure
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    throw error;
  }
}, []);
```

---

## ISSUE-P3-003: 12 TODO Comments Across Codebase

**Priority:** P3 - Medium  
**Effort:** 6h  
**Category:** Technical Debt

### Description

12 TODO comments scattered across the codebase indicating incomplete work.

### Locations

| File                                       | TODO Description     |
| ------------------------------------------ | -------------------- |
| `lib/errors/error-logger.ts`               | External integration |
| `features/chat/context/chat-context.tsx`   | Message persistence  |
| `lib/ai/stream-helpers.ts`                 | Error recovery       |
| `lib/cache/cache-manager.ts`               | TTL configuration    |
| `features/artifacts/hooks/use-artifact.ts` | Cleanup              |
| `app/api/chat/route.ts`                    | Rate limiting        |
| `lib/db/queries.ts`                        | Query optimization   |
| `features/sidebar/components/sidebar.tsx`  | Keyboard nav         |
| `lib/auth/session.ts`                      | Token refresh        |
| `components/ui/dialog.tsx`                 | A11y improvements    |
| `lib/services/chat-service.ts`             | Retry logic          |
| `features/documents/hooks/use-document.ts` | Caching              |

### Fix

Create tickets for each TODO, prioritize, and address systematically.

---

## ISSUE-P3-004: Verified - Not Orphaned

**Priority:** INFO  
**Effort:** N/A  
**Category:** Verification

### Description

Previously flagged files have been verified as correctly used.

### Status

- ✅ All utility files have active imports
- ✅ All components are rendered
- ✅ All hooks are consumed
- ✅ No orphaned code detected

### Action

No action required. This is informational.
