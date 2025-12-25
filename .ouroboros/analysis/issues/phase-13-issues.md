# Phase 13: Configuration Management Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 7            | 0   | 3   | 3   | 1   | 4.25h |

---

### ISSUE-P13-001: Hardcoded Magic Numbers - Breakpoints

**File**: `shared/hooks/use-media-query.ts#L43-45`
**Severity**: P3 (Medium)
**Category**: Configuration
**Hours**: 0.5h

**Problem**: UI breakpoints hardcoded in hook instead of centralized config.

**Code**:

```typescript
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
```

**Fix**:

```typescript
// lib/config/ui.ts
export const UI_CONFIG = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },
} as const;

// Usage
import { UI_CONFIG } from "@/lib/config/ui";
const MOBILE_BREAKPOINT = UI_CONFIG.breakpoints.mobile;
```

---

### ISSUE-P13-002: Hardcoded Throttle Values

**File**: `shared/hooks/use-media-query.ts#L61, L92-107`
**Severity**: P3 (Medium)
**Category**: Configuration
**Hours**: 0.5h

**Problem**: Performance tuning values hardcoded.

**Code**:

```typescript
const RESIZE_THROTTLE_MS = 100;
// Also found: 50, 150 in various places
```

**Fix**:

```typescript
// lib/config/performance.ts
export const PERF_CONFIG = {
  throttle: {
    resize: 100,
    scroll: 50,
    input: 150,
  },
} as const;
```

---

### ISSUE-P13-003: Non-Null Assertion on DATABASE_URL

**File**: `lib/db/client.ts#L49`
**Severity**: P2 (High)
**Category**: Configuration / Security
**Hours**: 0.5h

**Problem**: Non-null assertion on critical environment variable.

**Code**:

```typescript
const client = postgres(process.env.DATABASE_URL!, getPoolConfig());
```

**Fix**:

```typescript
// lib/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);

// Usage
const client = postgres(env.DATABASE_URL, getPoolConfig());
```

---

### ISSUE-P13-004: Non-Null Assertion on Supabase Config

**File**: `lib/auth/supabase-server.ts#L148-149`
**Severity**: P2 (High)
**Category**: Configuration / Security
**Hours**: 0.5h

**Problem**: Non-null assertions on Supabase environment variables.

**Code**:

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

**Fix**: Validate in centralized env config with Zod.

---

### ISSUE-P13-005: Scattered process.env Access - Redis

**File**: `lib/cache/redis.ts#L18-19`
**Severity**: P3 (Medium)
**Category**: Configuration
**Hours**: 0.5h

**Problem**: Direct process.env access without validation.

**Code**:

```typescript
process.env.UPSTASH_REDIS_REST_URL;
process.env.UPSTASH_REDIS_REST_TOKEN;
```

**Fix**: Access through validated env config.

---

### ISSUE-P13-006: No Validation on AI Model IDs

**File**: `lib/ai/config.ts#L33-62`
**Severity**: P3 (Medium)
**Category**: Configuration / Validation
**Hours**: 1h

**Problem**: Model IDs from environment not validated for format.

**Code**:

```typescript
export const TOOL_MODEL_ID = process.env.TOOL_MODEL_ID ?? "openai:gpt-4o-mini";
```

**Fix**:

```typescript
const modelIdSchema = z.string().regex(/^[a-z]+:[a-z0-9-]+$/);

export const AI_CONFIG = {
  toolModelId: modelIdSchema.parse(
    process.env.TOOL_MODEL_ID ?? "openai:gpt-4o-mini"
  ),
};
```

---

### ISSUE-P13-007: Scattered Email/Redis Config

**File**: `lib/config/env.ts#L32-47`
**Severity**: P4 (Low)
**Category**: Configuration
**Hours**: 0.75h

**Problem**: Multiple env vars accessed in different files.

**Fix**: Consolidate all env access to single validated config module.

---

## Configuration Strategy

1. **Centralize**: All env access through `lib/config/env.ts`
2. **Validate**: Use Zod schemas for all config
3. **Type-Safe**: Export typed config objects
4. **Fail-Fast**: Validate at startup, not runtime

## Validation Checklist

- [ ] All process.env access centralized
- [ ] No non-null assertions on env vars
- [ ] Zod validation for all config
- [ ] Magic numbers moved to config files
