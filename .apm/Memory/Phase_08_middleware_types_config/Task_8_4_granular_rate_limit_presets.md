---
task_id: "8.4"
task_title: "Add Granular Rate Limit Presets"
phase: "Phase_08_middleware_types_config"
agent: "Agent_Middleware"
status: "Completed"
important_findings: false
compatibility_issues: false
ad_hoc_delegation: false
---

# Task 8.4 - Add Granular Rate Limit Presets

## Summary

Restored missing rate limit configuration presets from the legacy implementation. Added `standard`, `generous`, and `authGuest` presets to the centralized rate limiting configuration, created corresponding limiter instances with convenience functions, and updated middleware to use the guest-specific limiter for `/api/auth/guest`.

## Execution Details

### Subtasks Completed

1. **Added rate limit presets to [`lib/constants.ts`](lib/constants.ts)**:
   - `RATE_LIMITS.standard` (100 requests/60s) - for general API endpoints
   - `RATE_LIMITS.generous` (1000 requests/60s) - for high-volume endpoints like search, autocomplete
   - `RATE_LIMITS.authGuest` (20 requests/60s) - for guest session creation with moderate limits

2. **Created limiter instances in [`lib/rate-limit/limits.ts`](lib/rate-limit/limits.ts)**:
   - `standardLimiter` - general API rate limiting (100 req/min)
   - `generousLimiter` - high-volume endpoints (1000 req/min)
   - `authGuestLimiter` - guest auth with fail-closed mode (20 req/min)

3. **Updated rate limiter registry**:
   - Added new limiters to `rateLimiters` registry object
   - Added convenience functions: `checkStandardLimit`, `checkGenerousLimit`, `checkAuthGuestLimit`

4. **Updated [`lib/rate-limit/index.ts`](lib/rate-limit/index.ts)**:
   - Added exports for new limiters and convenience functions

5. **Updated [`middleware.ts`](middleware.ts)**:
   - Added `authGuestLimiter` to imports
   - Removed unused `guestLimiter` import
   - Changed `/api/auth/guest` route to use `authGuestLimiter` (20 req/min) instead of `guestLimiter` (5 req/min)

### Files Modified

- `lib/constants.ts` - Added 3 new rate limit presets
- `lib/rate-limit/limits.ts` - Added 3 new limiters, registry entries, and convenience functions
- `lib/rate-limit/index.ts` - Added exports for new limiters and functions
- `middleware.ts` - Updated import and route limiter assignment

## Architecture Decisions

### Preset Values Rationale

| Preset | Limit | Window | Purpose |
|--------|-------|--------|---------|
| `strict` | 10 | 60s | Destructive operations (already existed) |
| `standard` | 100 | 60s | General API endpoints (equivalent to `api`) |
| `generous` | 1000 | 60s | High-volume endpoints (search, autocomplete) |
| `authGuest` | 20 | 60s | Guest session creation (moderate, between `guest` and `api`) |

### Key Differences from Legacy

The legacy implementation (`archive/oldapp/lib/middleware/rate-limit-config.ts`) had:
- `STRICT` (10/60s) - matched existing `strict`
- `STANDARD` (100/60s) - added as `standard`
- `GENEROUS` (1000/60s) - added as `generous`
- `AUTH_GUEST` (20/60s) - added as `authGuest`

The new implementation already had:
- `strict` (10/60s) - unchanged
- `api` (100/60s) - equivalent to `standard`, kept both for flexibility
- `guest` (5/60s) - stricter than `authGuest`, kept for other purposes

### Middleware Update

Changed `/api/auth/guest` from `guestLimiter` (5 req/min) to `authGuestLimiter` (20 req/min). This provides a more balanced rate limit for guest session creation while still preventing abuse.

## Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| Format | `pnpm format` | Passed |
| TypeCheck | `pnpm typecheck` | Passed |
| Lint | `pnpm lint` | Passed |

## Self-Validation

- [x] All presets added to `RATE_LIMITS` constant
- [x] All limiters created with correct configuration
- [x] Registry updated with new limiters
- [x] Convenience functions added for new limiters
- [x] Exports added to barrel file
- [x] Middleware updated to use `authGuestLimiter`
- [x] All quality gates passed

## Issues Encountered

None. Implementation proceeded smoothly.

## Related Tasks

- Task 8.1: Request Deduplication (completed)
- Task 8.2: Rate Limiting Algorithms (completed)
- Task 8.3: OpenTelemetry Rate Limiting (completed)
