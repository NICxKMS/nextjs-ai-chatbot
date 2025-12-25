# Phase 01 Issues - Dependencies & Health

## Summary

| ID     | Issue                                  | Priority | Est.  |
| ------ | -------------------------------------- | -------- | ----- |
| P1-001 | Duplicate Zod Versions                 | P3       | 0.5h  |
| P1-002 | Duplicate Zustand Versions             | P3       | 0.5h  |
| P1-003 | Deprecated esno Package                | P4       | 0.25h |
| P1-004 | No API Response Validation             | P1       | 2h    |
| P1-005 | Health Check Missing AI Provider       | P2       | 1h    |
| P1-006 | TODO Error Logger External Integration | P2       | 4h    |

---

## ISSUE-P1-001: Duplicate Zod Versions

**Priority:** P3 - Medium  
**Effort:** 0.5h  
**Category:** Dependencies

### Description

Multiple versions of Zod may be installed due to dependency conflicts.

### Location

- `package.json`
- `pnpm-lock.yaml`

### Fix

```bash
pnpm dedupe zod
pnpm why zod
```

Ensure single version in `pnpm-lock.yaml`.

---

## ISSUE-P1-002: Duplicate Zustand Versions

**Priority:** P3 - Medium  
**Effort:** 0.5h  
**Category:** Dependencies

### Description

Multiple versions of Zustand state management library.

### Location

- `package.json`
- `pnpm-lock.yaml`

### Fix

```bash
pnpm dedupe zustand
pnpm why zustand
```

---

## ISSUE-P1-003: Deprecated esno Package

**Priority:** P4 - Low  
**Effort:** 0.25h  
**Category:** Dependencies

### Description

`esno` is deprecated, should use `tsx` instead.

### Location

- `package.json` scripts

### Fix

```json
// Replace
"dev:script": "esno script.ts"
// With
"dev:script": "tsx script.ts"
```

---

## ISSUE-P1-004: No API Response Validation

**Priority:** P1 - Critical  
**Effort:** 2h  
**Category:** Security

### Description

API routes return unvalidated data. Need Zod schemas for response validation.

### Locations

- `app/api/chat/route.ts`
- `app/api/document/route.ts`
- `app/api/history/route.ts`

### Fix

```typescript
// Add response schemas
const ChatResponseSchema = z.object({
  id: z.string(),
  messages: z.array(MessageSchema),
});

// Validate before return
return NextResponse.json(ChatResponseSchema.parse(data));
```

---

## ISSUE-P1-005: Health Check Missing AI Provider

**Priority:** P2 - High  
**Effort:** 1h  
**Category:** Monitoring

### Description

Health endpoint doesn't verify AI provider connectivity.

### Location

- `app/api/health/route.ts`

### Fix

```typescript
// Add AI provider health check
async function checkAIProvider(): Promise<HealthStatus> {
  try {
    // Lightweight ping to AI provider
    await aiClient.models.list();
    return { status: "healthy", provider: "openai" };
  } catch (error) {
    return { status: "degraded", error: error.message };
  }
}
```

---

## ISSUE-P1-006: TODO Error Logger External Integration

**Priority:** P2 - High  
**Effort:** 4h  
**Category:** Observability

### Description

Error logger has TODO for external service integration (Sentry, DataDog).

### Location

- `lib/errors/error-logger.ts`

### Current Code

```typescript
// TODO: Integrate with external error tracking service
// Options: Sentry, DataDog, LogRocket
```

### Fix

Implement Sentry integration:

```typescript
import * as Sentry from "@sentry/nextjs";

export function logError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
  console.error("[Error]", error.message, context);
}
```
