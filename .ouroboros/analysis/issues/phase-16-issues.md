# Phase 16: Code Readability Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 9            | 0   | 0   | 6   | 3   | 4.85h |

---

### ISSUE-P16-001: Missing JSDoc in Data Layer Functions

**File**: `lib/data/chat.ts`
**Severity**: P3 (Medium)
**Category**: Documentation
**Hours**: 1.5h

**Problem**: Data layer functions lack comprehensive JSDoc annotations.

**Code**:

```typescript
// Current - minimal documentation
export async function getChatById(id: string) {
  // ...
}
```

**Fix**:

```typescript
/**
 * Retrieves a chat by its unique identifier
 * @param id - The UUID of the chat to retrieve
 * @returns The chat object if found, null otherwise
 * @throws {DatabaseError} If database connection fails
 * @example
 * const chat = await getChatById("abc-123");
 * if (chat) console.log(chat.title);
 */
export async function getChatById(id: string): Promise<Chat | null> {
  // ...
}
```

---

### ISSUE-P16-002: Magic Strings in Model Selector

**File**: `features/chat/components/model-selector.tsx`
**Severity**: P3 (Medium)
**Category**: Readability
**Hours**: 0.5h

**Problem**: Model provider names hardcoded as string arrays.

**Code**:

```typescript
const providers = ["openai", "anthropic", "google"];
```

**Fix**:

```typescript
// lib/config/models.ts
export const AI_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
} as const;

export const SUPPORTED_PROVIDERS = Object.values(AI_PROVIDERS);
```

---

### ISSUE-P16-003: Magic Numbers in Chat Input

**File**: `features/chat/components/prompt-input.tsx`
**Severity**: P3 (Medium)
**Category**: Readability
**Hours**: 0.5h

**Problem**: Rate limiting constants hardcoded inline.

**Code**:

```typescript
const MAX_REQUESTS = 20;
const TIME_WINDOW_MS = 30000;
```

**Fix**:

```typescript
// lib/config/rate-limits.ts
export const RATE_LIMITS = {
  chat: {
    maxRequests: 20,
    windowMs: 30_000,
  },
} as const;
```

---

### ISSUE-P16-004: Magic Number in Chat Messages

**File**: `features/chat/components/chat-messages.tsx`
**Severity**: P4 (Low)
**Category**: Readability
**Hours**: 0.25h

**Problem**: Animation values hardcoded.

**Code**:

```typescript
y: 24;
// delay: 0.05
```

**Fix**: Move to `lib/config/ui.ts` as design tokens.

---

### ISSUE-P16-005: Magic Number in API Route

**File**: `app/api/chat/route.ts`
**Severity**: P3 (Medium)
**Category**: Readability
**Hours**: 0.25h

**Problem**: Timeout value hardcoded.

**Code**:

```typescript
maxDuration = 60;
```

**Fix**:

```typescript
// lib/config/timeouts.ts
export const TIMEOUTS = {
  apiChat: 60,
  apiDocument: 30,
} as const;
```

---

### ISSUE-P16-006: Missing JSDoc in Feature Actions

**File**: `features/chat/actions/index.ts`
**Severity**: P3 (Medium)
**Category**: Documentation
**Hours**: 1h

**Problem**: Internal helper functions lack documentation.

**Fix**: Add JSDoc for validation helpers and action functions.

---

### ISSUE-P16-007: Complex Ternary in Message Item

**File**: `features/chat/components/message-item.tsx`
**Severity**: P4 (Low)
**Category**: Readability
**Hours**: 0.25h

**Problem**: Nested ternary for avatar fallback.

**Fix**: Extract to named helper function:

```typescript
function getAvatarSource(user: User | null): string {
  if (!user) return DEFAULT_AVATAR;
  return user.image ?? getInitialsAvatar(user.name);
}
```

---

### ISSUE-P16-008: Poor Variable Name in UUID Generator

**File**: `lib/utils/uuid.ts`
**Severity**: P4 (Low)
**Category**: Readability
**Hours**: 0.1h

**Problem**: Single-letter variable name in callback.

**Code**:

```typescript
.replace(/[xy]/g, (c) => ...
```

**Fix**:

```typescript
.replace(/[xy]/g, (char) => ...
```

---

### ISSUE-P16-009: Missing Type Guard Documentation

**File**: `lib/types/guards.ts`
**Severity**: P3 (Medium)
**Category**: Documentation
**Hours**: 0.5h

**Problem**: Type guard factories need usage examples.

**Fix**: Add @example JSDoc blocks for each guard.

---

## Readability Standards

1. All exported functions have JSDoc with @param, @returns, @throws
2. Magic numbers extracted to config files
3. No complex ternaries (max 1 level)
4. Descriptive variable names (min 3 chars)

## Validation Checklist

- [ ] Data layer fully documented
- [ ] Magic values moved to config
- [ ] Complex expressions simplified
