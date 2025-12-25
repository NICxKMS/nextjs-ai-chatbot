# Phase 19: Logging & Monitoring Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 8            | 0   | 2   | 4   | 2   | 15h   |

---

### ISSUE-P19-001: console.info Instead of Logger

**File**: `lib/utils/performance.ts`
**Severity**: P3 (Medium)
**Category**: Logging Consistency
**Hours**: 0.25h

**Problem**: Uses `console.info` instead of structured logger.

**Fix**:

```typescript
// Before
console.info("Performance mark:", markName);

// After
logger.debug("Performance mark", { mark: markName });
```

---

### ISSUE-P19-002: Missing Request Context in Logs

**File**: `app/api/chat/route.ts`
**Severity**: P3 (Medium)
**Category**: Logging
**Hours**: 0.5h

**Problem**: Error logs lack request correlation IDs.

**Fix**:

```typescript
const requestId = crypto.randomUUID();
logger.error("Chat request failed", {
  requestId,
  userId,
  error,
});
```

---

### ISSUE-P19-003: No Metrics Collection

**File**: `app/api/**/*.ts`
**Severity**: P2 (High)
**Category**: Monitoring
**Hours**: 6h

**Problem**: No metrics for API latency, error rates, cache hits.

**Fix**: Implement metrics service:

```typescript
// lib/services/metrics.ts
export const metrics = {
    recordLatency: (route: string, ms: number) => {...},
    incrementCounter: (name: string, tags: Tags) => {...},
    recordCacheHit: (key: string, hit: boolean) => {...},
};

// Usage in route
const start = performance.now();
const result = await handler();
metrics.recordLatency("chat", performance.now() - start);
```

---

### ISSUE-P19-004: Inconsistent Log Levels

**File**: `lib/cache/redis.ts`
**Severity**: P4 (Low)
**Category**: Logging
**Hours**: 0.25h

**Problem**: Uses `logger.error` for expected graceful degradation.

**Fix**: Use `logger.warn` for expected fallbacks:

```typescript
// When Redis unavailable but app continues
logger.warn("Redis unavailable, using memory cache", { fallback: true });
```

---

### ISSUE-P19-005: Missing Debug Logging in Chat Flow

**File**: `features/chat/hooks/use-chat.tsx`
**Severity**: P4 (Low)
**Category**: Logging
**Hours**: 1h

**Problem**: No debug logs for message state changes.

**Fix**: Add conditional debug logging:

```typescript
if (process.env.NODE_ENV === "development") {
  logger.debug("Message state changed", {
    messageCount: messages.length,
    status,
  });
}
```

---

### ISSUE-P19-006: No Client-Side Error Reporting

**File**: `app/global-error.tsx`
**Severity**: P2 (High)
**Category**: Monitoring
**Hours**: 4h

**Problem**: No external error reporting integration.

**Fix**: Integrate Sentry or similar:

```typescript
// lib/services/error-reporter.ts
import * as Sentry from "@sentry/nextjs";

export function reportError(error: Error, context?: Context) {
  Sentry.captureException(error, { extra: context });
}
```

---

### ISSUE-P19-007: Missing API Response Time Logging

**File**: `lib/middleware/timing.ts`
**Severity**: P3 (Medium)
**Category**: Monitoring
**Hours**: 2h

**Problem**: API routes don't log response times.

**Fix**: Create timing middleware:

```typescript
export function withTiming(handler: Handler): Handler {
  return async (req, res) => {
    const start = performance.now();
    const result = await handler(req, res);
    const duration = performance.now() - start;

    logger.info("Request completed", {
      path: req.url,
      method: req.method,
      duration,
      status: res.status,
    });

    return result;
  };
}
```

---

### ISSUE-P19-008: No Performance Marks in Critical Paths

**File**: `features/chat/components/chat.tsx`
**Severity**: P3 (Medium)
**Category**: Performance Monitoring
**Hours**: 1h

**Problem**: No Performance API marks for debugging.

**Fix**:

```typescript
performance.mark("chat-render-start");
// ... render
performance.mark("chat-render-end");
performance.measure("chat-render", "chat-render-start", "chat-render-end");
```

---

## Logging Standards

| Level | Use Case                                          |
| ----- | ------------------------------------------------- |
| error | Unexpected failures requiring attention           |
| warn  | Expected degradation, recoverable issues          |
| info  | Significant events (request complete, cache miss) |
| debug | Development troubleshooting                       |

## Validation Checklist

- [ ] All console.\* replaced with logger
- [ ] Request correlation IDs in API logs
- [ ] Metrics service implemented
- [ ] Error reporting integrated
