# Phase 2: Security Hardening — Detailed Review (Multi-Agent, Chunked)

- Date: 2026-02-18
- Phase: Phase 2: Security Hardening
- Task count: 10
- Chunk files: P2-C1, P2-C2

## Summary

- Status counts: Completed=2, Partial=7, Incorrect=1, Missing=0
- Difference counts: defect=2, partial=6, other-problem=0, improvement=1, no-difference=1

## Task Matrix

| Task | Name | Status | Difference Type | Detail |
|---|---|---|---|---|
| 2.1 | Fix Guest Session JWT Signing | Partial | defect | JWT signing/verification is implemented, but unsigned guest-cookie fallback remains when GUEST_JWT_SECRET is unset, which conflicts with the objective to replace unsigned cookies. Also, token rotation behavior (preserving guest identity across 1h JWT expiry with 7d cookie TTL) is not evidenced in current middleware flow. |
| 2.2 | Fix CSRF Protection in Guest Route | Partial | partial | Origin validation is added to POST and blocks cross-origin requests, but the failure response uses generic FORBIDDEN via forbidden() instead of the required forbidden:auth:csrf error code. |
| 2.3 | Fix Open Redirect Vulnerability | Completed | improvement | Open-redirect protections are implemented (dangerous scheme blocking, protocol-relative blocking, origin checks, relative-path allowlist, path-traversal regex) and applied before redirect. Compared to legacy inline helper, the new implementation improves reuse by extracting validation into lib/utils/validation.ts. |
| 2.4 | Fix Auth Rate Limiting Middleware Bypass | Partial | partial | The critical bypass is fixed (guest/logout are no longer skipped by auth-callback short-circuit and now reach rate limiting). However, plan step requiring guest/logout routing through authLimiter is not fully met because /api/auth/guest is mapped to authGuestLimiter. |
| 2.5 | Add Rate Limiting to Guest Route | Partial | partial | Guest POST route now has IP-based rate limiting, 429 handling, Retry-After, and logging. But it does not match plan/legacy threshold and helper source: current route-level limiter is 5/60 via checkGuestLimit and uses getClientIp from lib/api, while plan specifies 20/60 and import from lib/rate-limit getClientIP. |
| 2.6 | Fix Upload Rate Limit Window | Completed | no-difference | Upload limit is set to 10/hour, `uploadLimiter` consumes the centralized upload config, and middleware routes `/api/files/upload` to `uploadLimiter`, matching plan intent and legacy behavior. |
| 2.7 | Fix Vote User Filter | Partial | partial | User-scoped vote filtering and ownership checks are implemented, but unauthenticated vote fetches do not return an empty array as required; they fail via `requireAuthAction()`. |
| 2.8 | Add Ownership Verification to Votes & Suggestions | Partial | partial | Vote ownership checks are in place. Suggestions perform user-scoped artifact lookup, but unauthorized access is normalized to `[]` instead of explicit 403 behavior from plan guidance, and guard helpers (`requireOwnership`/`requireChatAccess`) are not used. |
| 2.9 | Add Rate Limiting to Artifact/File/History Routes | Partial | partial | Artifacts/history/upload/logout are rate-limited, but middleware still maps `/api/suggestions` to `chatLimiter` instead of `apiLimiter` as specified; `/api/votes` depends on default fallback rather than explicit mapping. |
| 2.10 | Create File Attachment Validation Utilities | Incorrect | defect | A validation module exists and is wired into upload route, but the required task contract is not implemented: missing `validateAttachment`, `ALLOWED_ATTACHMENT_TYPES`, `MAX_ATTACHMENT_SIZE`, `getFileExtension`, and missing magic-byte validation required for content-level verification. |

## Defect Items

### 2.1 — Fix Guest Session JWT Signing (Partial)
- Detail: JWT signing/verification is implemented, but unsigned guest-cookie fallback remains when GUEST_JWT_SECRET is unset, which conflicts with the objective to replace unsigned cookies. Also, token rotation behavior (preserving guest identity across 1h JWT expiry with 7d cookie TTL) is not evidenced in current middleware flow.
- Issues:
  - Unsigned guest-cookie fallback in createGuestSession() re-opens tampering risk when GUEST_JWT_SECRET is missing.
  - No demonstrated token-rotation path preserving guest identity before/at JWT expiry.
- Suggested fixes:
  - Fail closed when GUEST_JWT_SECRET is absent (remove unsigned fallback path).
  - Implement explicit guest JWT rotation (preserve guest ID) in middleware/proxy flow using rotation threshold.
- Evidence (new):
  - lib/auth/session.ts:L80
  - lib/auth/session.ts:L306
  - lib/auth/session.ts:L345
  - lib/auth/session.ts:L349
  - lib/auth/session.ts:L354
  - lib/auth/session.ts:L377
- Evidence (legacy):
  - archive/oldapp/lib/auth/session.ts:L212
  - archive/oldapp/lib/auth/session.ts:L215
  - archive/oldapp/lib/auth/session.ts:L216
  - archive/oldapp/lib/auth/session.ts:L226
- Plan refs:
  - .apm/Implementation_Plan.md:L205-L215
  - .apm/Memory/Phase_02_security_hardening/Task_2_01_guest_session_jwt_signing.md:L33

### 2.10 — Create File Attachment Validation Utilities (Incorrect)
- Detail: A validation module exists and is wired into upload route, but the required task contract is not implemented: missing `validateAttachment`, `ALLOWED_ATTACHMENT_TYPES`, `MAX_ATTACHMENT_SIZE`, `getFileExtension`, and missing magic-byte validation required for content-level verification.
- Issues:
  - Required API/constant contract is absent, risking downstream dependency mismatch (notably tasks depending on 2.10 output).
  - No magic-byte/content signature check is present; MIME-only checks are spoofable.
- Suggested fixes:
  - Add compatibility exports/aliases: `validateAttachment`, `ALLOWED_ATTACHMENT_TYPES`, `MAX_ATTACHMENT_SIZE`, `getFileExtension`.
  - Implement magic-byte validation for supported binary formats and enforce it in upload validation path.
- Evidence (new):
  - lib/utils/file-validation.ts:15-18
  - lib/utils/file-validation.ts:31
  - lib/utils/file-validation.ts:108
  - lib/utils/file-validation.ts:447
  - app/api/files/upload/route.ts:67-68
- Evidence (legacy):
  - archive/oldapp/lib/files.ts:1-3
  - archive/oldapp/lib/files.ts:37-49
- Plan refs:
  - .apm/Implementation_Plan.md:301-311

## Partial Items

### 2.2 — Fix CSRF Protection in Guest Route (Partial)
- Detail: Origin validation is added to POST and blocks cross-origin requests, but the failure response uses generic FORBIDDEN via forbidden() instead of the required forbidden:auth:csrf error code.
- Issues:
  - CSRF rejection code does not match required forbidden:auth:csrf contract.
- Suggested fixes:
  - Return a 403 response with code forbidden:auth:csrf in POST origin-validation failure path.
- Evidence (new):
  - app/api/auth/guest/route.ts:L17
  - app/api/auth/guest/route.ts:L82
  - app/api/auth/guest/route.ts:L85
  - app/api/auth/guest/route.ts:L86
  - lib/api/response.ts:L337
- Evidence (legacy):
  - archive/oldapp/app/api/auth/guest/route.ts:L21
  - archive/oldapp/app/api/auth/guest/route.ts:L23
  - archive/oldapp/app/api/auth/guest/route.ts:L25
- Plan refs:
  - .apm/Implementation_Plan.md:L217-L225
  - .apm/Memory/Phase_02_security_hardening/Task_2_02_csrf_protection.md:L20
  - .apm/Memory/Phase_02_security_hardening/Task_2_02_csrf_protection.md:L33

### 2.4 — Fix Auth Rate Limiting Middleware Bypass (Partial)
- Detail: The critical bypass is fixed (guest/logout are no longer skipped by auth-callback short-circuit and now reach rate limiting). However, plan step requiring guest/logout routing through authLimiter is not fully met because /api/auth/guest is mapped to authGuestLimiter.
- Issues:
  - Guest auth route limiter selection diverges from plan instruction to route through authLimiter.
- Suggested fixes:
  - If strict plan parity is required, route /api/auth/guest to authLimiter (or update plan to explicitly allow authGuestLimiter + route-level limiter design).
- Evidence (new):
  - middleware.ts:L68
  - middleware.ts:L144
  - middleware.ts:L146
  - middleware.ts:L195
  - middleware.ts:L197
  - middleware.ts:L198
- Evidence (legacy):
  - archive/oldapp/proxy.ts:L42
  - archive/oldapp/proxy.ts:L58
  - archive/oldapp/proxy.ts:L130
- Plan refs:
  - .apm/Implementation_Plan.md:L240-L248
  - .apm/Memory/Phase_02_security_hardening/Task_2_04_rate_limiting_bypass_prevention.md:L12

### 2.5 — Add Rate Limiting to Guest Route (Partial)
- Detail: Guest POST route now has IP-based rate limiting, 429 handling, Retry-After, and logging. But it does not match plan/legacy threshold and helper source: current route-level limiter is 5/60 via checkGuestLimit and uses getClientIp from lib/api, while plan specifies 20/60 and import from lib/rate-limit getClientIP.
- Issues:
  - Configured guest route limit is 5/60, not the planned 20/60.
  - Route uses getClientIp from lib/api instead of getClientIP from lib/rate-limit as specified.
- Suggested fixes:
  - Align threshold to 20/60 if Implementation Plan is authoritative, or update plan/task record to reflect intentional 5/60 hardening.
  - Use getClientIP from @/lib/rate-limit in guest POST for consistency with task requirement.
- Evidence (new):
  - app/api/auth/guest/route.ts:L17
  - app/api/auth/guest/route.ts:L47
  - app/api/auth/guest/route.ts:L63
  - app/api/auth/guest/route.ts:L93
  - app/api/auth/guest/route.ts:L99
  - lib/constants.ts:L77
- Evidence (legacy):
  - archive/oldapp/app/api/auth/guest/route.ts:L31
  - archive/oldapp/app/api/auth/guest/route.ts:L33
  - archive/oldapp/app/api/auth/guest/route.ts:L36
  - archive/oldapp/app/api/auth/guest/route.ts:L37
- Plan refs:
  - .apm/Implementation_Plan.md:L250-L258
  - .apm/Memory/Phase_02_security_hardening/Task_2_05_guest_route_rate_limiting.md:L14
  - .apm/Memory/Phase_02_security_hardening/Task_2_05_guest_route_rate_limiting.md:L33

### 2.7 — Fix Vote User Filter (Partial)
- Detail: User-scoped vote filtering and ownership checks are implemented, but unauthenticated vote fetches do not return an empty array as required; they fail via `requireAuthAction()`.
- Issues:
  - Requirement 2.7.3 is unmet: unauthenticated requests return Unauthorized (401 path) rather than `[]`.
  - Phase memory marks this task complete, but one explicit plan bullet remains unimplemented (.apm/Memory/Phase_02_security_hardening/Task_2_07_vote_user_filter.md).
- Suggested fixes:
  - In `GET /api/votes`, use optional session/user lookup; when absent, return `Response.json([])` before auth-only checks.
  - Keep `findByChatIdAndUserId` + ownership verification for authenticated requests.
- Evidence (new):
  - app/api/votes/route.ts:51-80
  - lib/data/repositories/vote.repository.ts:624-633
  - lib/auth/guards.ts:116-121
- Evidence (legacy):
  - archive/oldapp/lib/db/queries.ts:149-160
- Plan refs:
  - .apm/Implementation_Plan.md:269-276

### 2.8 — Add Ownership Verification to Votes & Suggestions (Partial)
- Detail: Vote ownership checks are in place. Suggestions perform user-scoped artifact lookup, but unauthorized access is normalized to `[]` instead of explicit 403 behavior from plan guidance, and guard helpers (`requireOwnership`/`requireChatAccess`) are not used.
- Issues:
  - Requirement 2.8.5 is not fully met on suggestions route: unauthorized artifact access resolves to 200 with empty array instead of 403.
  - Requirement 2.8.4 is not met literally: route logic does not use guard helpers despite availability.
- Suggested fixes:
  - Use guard-based ownership flow (`requireOwnership` or `requireChatAccess`) where non-owner access throws ForbiddenError (403).
  - Separate not-found vs unauthorized handling intentionally, then document if empty-array semantics are still desired for anti-enumeration.
- Evidence (new):
  - app/api/votes/route.ts:67-76
  - app/api/suggestions/route.ts:79-97
  - lib/data/repositories/artifact.repository.ts:503-516
  - lib/auth/guards.ts:199-205
  - lib/auth/guards.ts:298-304
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/suggestions/route.ts:65-73
- Plan refs:
  - .apm/Implementation_Plan.md:278-287

### 2.9 — Add Rate Limiting to Artifact/File/History Routes (Partial)
- Detail: Artifacts/history/upload/logout are rate-limited, but middleware still maps `/api/suggestions` to `chatLimiter` instead of `apiLimiter` as specified; `/api/votes` depends on default fallback rather than explicit mapping.
- Issues:
  - Plan bullet for `/api/suggestions` + `/api/votes` to `apiLimiter` is only partially satisfied; suggestions currently use `chatLimiter`.
  - `/api/votes` has no explicit branch in `getLimiterForRoute`, so behavior relies on catch-all fallback.
- Suggested fixes:
  - Update `getLimiterForRoute()` to explicitly map `/api/suggestions` and `/api/votes` to `apiLimiter`.
  - Keep route-level limiter checks if desired, but align middleware mapping with plan to avoid policy drift.
- Evidence (new):
  - middleware.ts:299-301
  - middleware.ts:313
  - middleware.ts:318-323
  - app/api/artifacts/route.ts:50
  - app/api/artifacts/route.ts:243
  - app/api/history/route.ts:116
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/document/route.ts:45-53
  - archive/oldapp/app/(chat)/api/document/route.ts:191-199
  - archive/oldapp/app/(chat)/api/history/route.ts:42-50
- Plan refs:
  - .apm/Implementation_Plan.md:289-300

## Other-Problem Items

- None

## Improvement Items

### 2.3 — Fix Open Redirect Vulnerability (Completed)
- Detail: Open-redirect protections are implemented (dangerous scheme blocking, protocol-relative blocking, origin checks, relative-path allowlist, path-traversal regex) and applied before redirect. Compared to legacy inline helper, the new implementation improves reuse by extracting validation into lib/utils/validation.ts.
- Evidence (new):
  - lib/utils/validation.ts:L91
  - lib/utils/validation.ts:L97
  - lib/utils/validation.ts:L140
  - lib/utils/validation.ts:L161
  - lib/utils/validation.ts:L174
  - app/api/auth/guest/route.ts:L156
- Evidence (legacy):
  - archive/oldapp/app/api/auth/guest/route.ts:L19
  - archive/oldapp/app/api/auth/guest/route.ts:L113
  - archive/oldapp/app/api/auth/guest/route.ts:L121
  - archive/oldapp/app/api/auth/guest/route.ts:L130
- Plan refs:
  - .apm/Implementation_Plan.md:L227-L238
  - .apm/Memory/Phase_02_security_hardening/Task_2_03_open_redirect_guard.md:L12

## No-Difference Items

### 2.6 — Fix Upload Rate Limit Window (Completed)
- Detail: Upload limit is set to 10/hour, `uploadLimiter` consumes the centralized upload config, and middleware routes `/api/files/upload` to `uploadLimiter`, matching plan intent and legacy behavior.
- Evidence (new):
  - lib/constants.ts:82-85
  - lib/rate-limit/limits.ts:70-72
  - middleware.ts:318-319
- Evidence (legacy):
  - archive/oldapp/lib/middleware/rate-limit-config.ts:90-93
  - archive/oldapp/app/(chat)/api/files/upload/route.ts:54-55
- Plan refs:
  - .apm/Implementation_Plan.md:260-267
