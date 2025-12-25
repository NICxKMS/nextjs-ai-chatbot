# Phase 26: Cross-Cutting Concerns Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 4            | 1   | 1   | 2   | 0   | 12h   |

---

### ISSUE-P26-001: Silent Catch Blocks in Cache Layer

**File**: `lib/data/cached/*.ts` (40+ occurrences)
**Severity**: P1 (Critical)
**Category**: Cross-Cutting - Error Handling
**Hours**: 4h

**Problem**: Cache operations silently swallow errors with no logging or monitoring.

**Code**:

```typescript
// lib/data/cached/chat.ts
createChatInCache(chatToCachedMeta(chat), false).catch(() => {});

// lib/data/cached/user.ts
updateUserInCache(user).catch(() => {});
```

**Additional Files with Silent Catches**:

- `lib/data/cached/chat.ts` - 15+ occurrences
- `lib/data/cached/user.ts` - 10+ occurrences
- `lib/data/cached/message.ts` - 8+ occurrences
- `lib/data/cached/vote.ts` - 5+ occurrences
- `lib/data/cached/document.ts` - 5+ occurrences

**Fix**:

```typescript
createChatInCache(chatToCachedMeta(chat), false).catch((error) => {
  logger.warn("Cache write failed", {
    operation: "createChat",
    chatId,
    error: error.message,
    // Don't throw - cache is non-critical
  });
});
```

**Impact**: Cache failures are invisible, making debugging production issues extremely difficult.

---

### ISSUE-P26-002: Console.log in Client Components

**File**: Multiple components
**Severity**: P3 (Medium)
**Category**: Cross-Cutting - Logging
**Hours**: 2h

**Problem**: Components use raw `console.log` instead of structured logger.

**Affected Files**:

- `features/chat/components/*.tsx`
- `features/artifacts/components/*.tsx`
- `shared/components/*.tsx`

**Fix**:

```typescript
// Before
console.log("User clicked:", event);

// After
import { logger } from "@/lib/utils/logger";
logger.debug("User interaction", { event: event.type, target: event.target });
```

---

### ISSUE-P26-003: External Error Reporting TODO

**File**: `lib/services/error-logger.ts#L263`
**Severity**: P2 (High)
**Category**: Cross-Cutting - Monitoring
**Hours**: 4h

**Problem**: TODO comment for external error reporting not implemented.

**Code**:

```typescript
// TODO: Integrate with external error reporting service
// Examples:
// - Sentry.captureException(entry.error)
// - DataDog.addError(entry)
```

**Fix**: Integrate Sentry:

```typescript
import * as Sentry from "@sentry/nextjs";

class ErrorLogger {
  private reportToSentry(entry: ErrorEntry): void {
    Sentry.withScope((scope) => {
      scope.setTags({
        component: entry.component,
        level: entry.level,
      });
      scope.setContext("error_details", entry.context);
      Sentry.captureException(entry.error);
    });
  }
}
```

---

### ISSUE-P26-004: Mixed Auth Pattern Usage

**File**: Multiple API routes
**Severity**: P3 (Medium)
**Category**: Cross-Cutting - Authentication
**Hours**: 2h

**Problem**: Inconsistent authentication patterns across routes.

**Current Pattern Mix**:
| Route | Pattern |
|-------|---------|
| `/api/chat/route.ts` | `auth()` |
| `/api/document/route.ts` | `getUser()` |
| `/api/vote/route.ts` | `auth()` |
| `/api/history/route.ts` | `getUser()` |

**Fix**: Standardize on single pattern:

```typescript
// For routes requiring authentication
import { auth } from "@/lib/auth";
const session = await auth();
if (!session?.user) return unauthorized();

// For routes allowing guest access
import { getUser } from "@/lib/auth/utils";
const user = await getUser(); // Returns user or null for guests
```

---

## Cross-Cutting Audit

| Concern        | Status | Issues                |
| -------------- | ------ | --------------------- |
| Error Handling | ❌     | Silent catches        |
| Logging        | ⚠️     | Mixed patterns        |
| Monitoring     | ❌     | No external reporting |
| Authentication | ⚠️     | Inconsistent          |
| Caching        | ✅     | Implemented           |

## Validation Checklist

- [ ] All catch blocks have logging
- [ ] No console.log in production code
- [ ] Error reporting integrated
- [ ] Auth pattern standardized
