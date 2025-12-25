# Phase 23: Code Smells Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 5            | 0   | 1   | 1   | 3   | 6h    |

---

### ISSUE-P23-001: Monolithic API Route (God Object)

**File**: `app/api/chat/route.ts`
**Severity**: P2 (High)
**Category**: Code Smell - God Object
**Hours**: 4h
**LOC**: 545 lines

**Problem**: Single file handles too many responsibilities:

- Request validation
- Authentication
- Streaming setup
- Title generation
- Message saving
- Error handling

**Fix**: Split into focused modules:

```
app/api/chat/
├── route.ts              # Entry point only
├── handlers/
│   ├── stream.ts         # Streaming logic
│   ├── title.ts          # Title generation
│   └── save.ts           # Message persistence
├── validation.ts         # Request validation
└── types.ts              # Route-specific types
```

**Implementation**:

```typescript
// route.ts (simplified)
export async function POST(request: Request) {
  const validated = await validateChatRequest(request);
  const auth = await authenticateRequest(request);
  return handleChatStream(validated, auth);
}
```

---

### ISSUE-P23-002: Inline Type Assertion Repetition

**File**: `features/chat/components/message-parts.tsx`
**Severity**: P4 (Low)
**Category**: Code Smell - Duplication
**Hours**: 0.25h

**Problem**: Inline type definition duplicated across component.

**Code**:

```typescript
const filePart = part as {
  type: "file";
  url: string;
  name?: string;
  mediaType: string;
};
```

**Fix**:

```typescript
// features/chat/types/message-parts.ts
export interface FilePart {
  type: "file";
  url: string;
  name?: string;
  mediaType: string;
}

// Usage
const filePart = part as FilePart;
```

---

### ISSUE-P23-003: Deprecated Feature Flag Methods

**File**: `lib/utils/feature-flags.ts`
**Severity**: P3 (Medium)
**Category**: Code Smell - Dead Code
**Hours**: 1h

**Problem**: Deprecated code with module-level state still in codebase.

**Code**:

```typescript
/** @deprecated Module-level userId is not SSR-safe */
let _deprecatedUserId: string | undefined;

export function setUserId(userId: string): void {
  _deprecatedUserId = userId;
}
```

**Fix**: Remove deprecated functions and module-level state:

1. Search for usages of `setUserId` and `_deprecatedUserId`
2. Replace with context-based solution
3. Delete deprecated code

---

### ISSUE-P23-004: Magic Numbers in Health Check

**File**: `app/api/health/route.ts`
**Severity**: P4 (Low)
**Category**: Code Smell - Magic Numbers
**Hours**: 0.25h

**Problem**: Latency thresholds hardcoded.

**Code**:

```typescript
if (latency > 1000) {
  /* degraded */
}
if (latency > 500) {
  /* high cache latency */
}
```

**Fix**:

```typescript
const HEALTH_THRESHOLDS = {
  dbLatency: {
    healthy: 100,
    degraded: 500,
    critical: 1000,
  },
  cacheLatency: {
    healthy: 50,
    degraded: 200,
    critical: 500,
  },
} as const;
```

---

### ISSUE-P23-005: String-Based Error Matching

**File**: `features/chat/hooks/use-chat.tsx`
**Severity**: P4 (Low)
**Category**: Code Smell - Primitive Obsession
**Hours**: 0.5h

**Problem**: Using string matching for error types instead of typed errors.

**Code**:

```typescript
if (error.message.includes("rate limit") || error.message.includes("429")) {
  // Handle rate limit
}
if (
  error.message.includes("API key") ||
  error.message.includes("authentication")
) {
  // Handle auth error
}
```

**Fix**: Use existing AppError types:

```typescript
import { RateLimitError, AuthError } from "@/lib/errors";

if (error instanceof RateLimitError) {
  // Handle rate limit
}
if (error instanceof AuthError) {
  // Handle auth error
}
```

---

## Code Smell Indicators

| Smell               | Indicator                          |
| ------------------- | ---------------------------------- |
| God Object          | >500 LOC, >5 responsibilities      |
| Duplication         | Same code in 2+ places             |
| Dead Code           | @deprecated still in use           |
| Magic Numbers       | Hardcoded values without constants |
| Primitive Obsession | Strings for typed concepts         |

## Validation Checklist

- [ ] Chat route split into modules
- [ ] Inline types extracted to type files
- [ ] Deprecated code removed
- [ ] Magic numbers replaced with constants
