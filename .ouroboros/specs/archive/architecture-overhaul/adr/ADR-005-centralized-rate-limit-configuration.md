# ADR-005: Centralized Rate Limit Configuration

## Status

Accepted

## Date

2024-12-23

## Reference

ARCH-001, CLN-003

## Context

Rate limiting logic was **scattered across multiple files**:

1. `middleware.ts` - route-to-limiter mapping inline
2. `lib/middleware/rate-limit.ts` - some limit values hardcoded
3. API routes - occasional inline rate checks
4. Guest overrides - magic numbers in middleware

This caused several problems:

- **Inconsistency**: Different limits in different places
- **Maintenance burden**: Changing limits required editing multiple files
- **No visibility**: Hard to audit what limits exist
- **Testing difficulty**: Limits embedded in implementation

Example of scattered configuration:

```typescript
// middleware.ts (before)
const routeLimiterMap = {
  "/api/auth/login": "auth",
  // ... 15 more routes inline
};

const guestMultiplier = 0.2; // Magic number
```

## Decision

Create a **single source of truth** for all rate limit configuration in `lib/middleware/rate-limit-config.ts`.

### Implementation

```typescript
// lib/middleware/rate-limit-config.ts

/**
 * Rate limit preset configuration
 * All values are in requests per time window
 */
export const RATE_LIMITS = {
  /** Standard API: 100 requests per 60 seconds */
  standard: { requests: 100, window: "60s" as const },

  /** Strict: 10 requests per 60 seconds */
  strict: { requests: 10, window: "60s" as const },

  /** Auth: 20 requests per 60 seconds */
  auth: { requests: 20, window: "60s" as const },

  /** Chat/AI: 50 requests per 60 seconds with burst of 10 */
  chat: { requests: 50, window: "60s" as const, burst: 10 },

  /** Upload: 10 requests per hour */
  upload: { requests: 10, window: "1h" as const },

  /** Guest: 20 requests per 60 seconds */
  guest: { requests: 20, window: "60s" as const },

  /** Search: 1000 requests per 60 seconds */
  search: { requests: 1000, window: "60s" as const },
} as const;

/**
 * Route to limiter type mapping
 */
export const ROUTE_LIMITER_MAP: Record<string, keyof typeof RATE_LIMITS> = {
  "/api/auth/login": "auth",
  "/api/auth/register": "auth",
  "/api/auth/callback": "auth",
  "/api/auth/guest": "strict",
  "/api/chat": "chat",
  "/api/files/upload": "upload",
  "/api/suggestions": "search",
  "/api/document": "standard",
  "/api/vote": "standard",
  "/api/history": "standard",
} as const;

/**
 * Guest limiter overrides
 * Maps authenticated limiter types to their guest equivalents
 */
export const GUEST_LIMITER_OVERRIDES: Partial<
  Record<keyof typeof RATE_LIMITS, keyof typeof RATE_LIMITS>
> = {
  standard: "guest", // 100 → 20 req/min
  chat: "guest", // 50 → 20 req/min
  search: "standard", // 1000 → 100 req/min
} as const;

export type LimiterType = keyof typeof RATE_LIMITS;
```

### Usage in Middleware

```typescript
// middleware.ts
import {
  ROUTE_LIMITER_MAP,
  GUEST_LIMITER_OVERRIDES,
} from "@/lib/middleware/rate-limit-config";

function getLimiterType(
  pathname: string,
  isAuthenticated: boolean
): LimiterType {
  // Find matching route
  let baseLimiterType: LimiterType = "standard";
  for (const [route, type] of Object.entries(ROUTE_LIMITER_MAP)) {
    if (pathname.startsWith(route)) {
      baseLimiterType = type;
    }
  }

  // Apply guest overrides if unauthenticated
  if (!isAuthenticated) {
    return GUEST_LIMITER_OVERRIDES[baseLimiterType] ?? "guest";
  }

  return baseLimiterType;
}
```

## Consequences

### Positive

- **Single source of truth** - all limits in one file
- **Easy auditing** - see all limits at a glance
- **Type safety** - `LimiterType` enforces valid values
- **Documentation** - JSDoc comments explain each limit
- **Testing** - can import and verify limits in tests
- **Change management** - one place to update limits

### Negative

- **Import dependency** - middleware imports from lib/
- **Slightly more indirection** - must look up config file
- **Build impact** - config changes require rebuild (not runtime)

### Neutral

- Same runtime behavior, just better organization
- No performance impact

## Alternatives Considered

### 1. Environment Variables for All Limits

```bash
RATE_LIMIT_STANDARD=100
RATE_LIMIT_AUTH=20
```

- **Rejected**: Too many env vars, lose type safety

### 2. Database-Stored Configuration

- Store limits in database, load at startup
- **Rejected**: Over-engineered, adds latency, DB dependency

### 3. Keep Inline Configuration

- Document limits via comments, leave inline
- **Rejected**: Already proven to cause inconsistency

### 4. YAML/JSON Configuration File

```yaml
rate_limits:
  standard:
    requests: 100
    window: 60s
```

- **Rejected**: Lose TypeScript type checking

## Configuration Summary

| Limiter  | Requests       | Window | Use Case                              |
| -------- | -------------- | ------ | ------------------------------------- |
| standard | 100            | 60s    | General API endpoints                 |
| strict   | 10             | 60s    | Sensitive operations (guest creation) |
| auth     | 20             | 60s    | Authentication endpoints              |
| chat     | 50 (+10 burst) | 60s    | AI chat requests                      |
| upload   | 10             | 1h     | File uploads                          |
| guest    | 20             | 60s    | Unauthenticated users                 |
| search   | 1000           | 60s    | Suggestion/search queries             |

### Guest Limit Mapping

| Auth Limiter   | Guest Override | Effective Change |
| -------------- | -------------- | ---------------- |
| standard (100) | guest (20)     | 80% reduction    |
| chat (50)      | guest (20)     | 60% reduction    |
| search (1000)  | standard (100) | 90% reduction    |

## Related Files

- [lib/middleware/rate-limit-config.ts](../../lib/middleware/rate-limit-config.ts) - Configuration
- [middleware.ts](../../middleware.ts) - Consumer of configuration
- [lib/middleware/rate-limit.ts](../../lib/middleware/rate-limit.ts) - Rate limit implementation
