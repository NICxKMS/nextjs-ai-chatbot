# Scout Report: Shard 11 - Auth & API Utilities

```
| Files in shard          | 8 |
| Total LOC               | 3283 |
| Exports catalogued      | 78 |
| Cross-shard edges found | 24 |
| Issues flagged          | 12 |
| Critical complexity (>10)| 0 |
```

---

## File-by-File Inventory

### lib/auth/config.ts
| Property | Value |
|----------|-------|
| **LOC** | 219 |
| **Classification** | config / entry point |
| **Cyclomatic Complexity** | 8 (`authorized` callback has branching logic) |

**Imports:**
- External: `drizzle-orm` (eq), `next-auth` (NextAuthConfig, Credentials), `zod`
- Internal (cross-shard): `@/lib/db/client`, `@/lib/db/schema`

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `authConfig` | const | NextAuth v5 configuration object |
| `ExtendedUser` | type | Extended user interface with id field |
| `NextAuthConfig` | type | Re-export from next-auth |

**Issues:**
- `authorized` callback (lines 145-171) has branching logic for route protection; consider extracting route classification

---

### lib/auth/session.ts
| Property | Value |
|----------|-------|
| **LOC** | 467 |
| **Classification** | domain logic |
| **Cyclomatic Complexity** | 7 |

**Imports:**
- External: `jose` (jwtVerify, SignJWT), `next/headers` (cookies), `server-only`
- Internal (cross-shard): `@/lib/constants` (CACHE_TTL, GUEST_TOKEN_TTL), `@/lib/errors` (UnauthorizedError)
- Internal (intra-shard): `./index` (auth)

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `AppUserType` | type | "guest" \| "regular" |
| `AppSessionUser` | interface | Session user with type info |
| `AppSession` | interface | Application session type |
| `getSession` | function | Main session getter |
| `requireSession` | function | Session getter that throws |
| `isAuthenticated` | function | Boolean check for auth status |
| `getSessionUser` | function | Get user from session |
| `getUserId` | function | Get user ID only |
| `isGuest` | function | Check if session is guest |
| `isGuestId` | function | Check if ID is guest format |
| `getGuestId` | function | Get guest ID from session |
| `getOrCreateGuestSession` | function | Get or create guest session |
| `createSessionContext` | function | Create repo context from session |
| `requireAuthenticatedSession` | function | Require non-guest session |

**Issues:**
- `getGuestSession` (lines 318-377) has 8 conditional branches for token validation
- `createGuestSession` and `getGuestSession` share JWT logic but are separate functions

---

### lib/auth/guards.ts
| Property | Value |
|----------|-------|
| **LOC** | 678 |
| **Classification** | domain logic |
| **Cyclomatic Complexity** | 9 |

**Imports:**
- External: `next/navigation` (redirect)
- Internal (cross-shard): `@/lib/errors` (ForbiddenError, NotFoundError, RateLimitError, UnauthorizedError, ValidationError), `@/lib/rate-limit` (getRateLimiter, types)
- Internal (intra-shard): `./session` (types, functions)

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `GuardOptions` | interface | Options for guard functions |
| `OwnedResource` | interface | Resource with owner ID |
| `ChatResource` | interface | Chat with visibility |
| `requireAuth` | function | Guard for server components |
| `requireAuthAction` | function | Guard for server actions |
| `requireAuthenticatedUser` | function | Require non-guest user |
| `optionalAuth` | function | Optional auth with status |
| `requireOwnership` | function | Verify resource ownership |
| `canAccessChat` | function | Check read permission |
| `canModifyChat` | function | Check write permission |
| `requireChatAccess` | function | Guard for read access |
| `requireChatModification` | function | Guard for write access |
| `isGuestSession` | function | Check if guest session |
| `requireNonGuest` | function | Require non-guest |
| `withAuth` | function | HOF for auth wrapping |
| `withOwnership` | function | HOF for ownership wrapping |
| `requireRateLimit` | function | Enforce rate limiting |
| `requireCustomRateLimit` | function | Custom rate limit config |
| `requireResource` | function | Guard for resource existence |
| `requireResourceWithId` | function | Guard with identifier |
| `parseTimestamp` | function | Parse and validate timestamp |
| `requireQueryParam` | function | Extract required query param |
| `getQueryParam` | function | Extract optional query param |
| `requireAuthWithSession` | function | **DEPRECATED** - duplicates requireAuth |

**Issues:**
- `requireAuthWithSession` (lines 673-678) is deprecated but still exported
- `requireAuthAction` and `requireAuthenticatedUser` have similar logic but different return types
- `isGuestSession` (line 347) duplicates functionality of `isGuest` from session.ts with async wrapper
- `requireRateLimit` and `requireCustomRateLimit` share identical error handling logic (lines 448-468 vs 488-511)
- `parseTimestamp`, `requireQueryParam`, `getQueryParam` are not auth-related; belong in validation module

---

### lib/auth/index.ts
| Property | Value |
|----------|-------|
| **LOC** | 113 |
| **Classification** | barrel export |
| **Cyclomatic Complexity** | 1 |

**Imports:**
- External: `next-auth`
- Internal (intra-shard): `./config`, `./session`, `./guards`

**Exports:**
- Re-exports from config.ts: `handlers`, `auth`, `signIn`, `signOut`, `authConfig`, `ExtendedUser`, `NextAuthConfig`
- Re-exports from session.ts: 14 items
- Re-exports from guards.ts: 21 items
- Type augmentation for next-auth module

---

### lib/api/context.ts
| Property | Value |
|----------|-------|
| **LOC** | 606 |
| **Classification** | utility |
| **Cyclomatic Complexity** | 8 |

**Imports:**
- External: `node:async_hooks` (AsyncLocalStorage), `node:crypto` (randomUUID)

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `RequestContext` | interface | Request-scoped context |
| `ContextOptions` | interface | Options for context creation |
| `ApiContext` | interface | Context with helper methods |
| `generateRequestId` | function | UUID v4 generation |
| `getOrCreateRequestId` | function | Extract or create request ID |
| `getRequestContext` | function | Get current context |
| `getRequestId` | function | Get current request ID |
| `getCurrentUserId` | function | Get current user ID |
| `getRequestDuration` | function | Get elapsed time |
| `runWithRequestContext` | function | Sync context execution |
| `runWithRequestContextAsync` | function | Async context execution |
| `updateRequestContext` | function | Update context fields |
| `setRequestUser` | function | Set user in context |
| `createRequestContext` | function | Create from Request |
| `getApiContext` | function | Create ApiContext with helpers |
| `getClientIp` | function | Extract client IP securely |
| `getSearchParams` | function | Extract search params |
| `validateOrigin` | function | CSRF origin validation |
| `formatRequestContext` | function | Format for logging |
| `withRequestContext` | function | Route handler wrapper |

**Issues:**
- **DUPLICATE CODE**: `runWithRequestContext` (lines 195-225) and `runWithRequestContextAsync` (lines 236-266) have ~95% identical body - only differ in async handling
- `getClientIp` has multiple fallback branches for different proxy headers
- `validateOrigin` has environment-specific branching that could be extracted

---

### lib/api/validation.ts
| Property | Value |
|----------|-------|
| **LOC** | 474 |
| **Classification** | utility |
| **Cyclomatic Complexity** | 6 |

**Imports:**
- External: `zod`
- Internal (cross-shard): `@/lib/errors` (ValidationError)

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `ValidationResult` | type | Success/failure result type |
| `validateBody` | function | Validate request body |
| `validateBodySafe` | function | Non-throwing body validation |
| `validateQuery` | function | Validate URL search params |
| `validateQuerySafe` | function | Non-throwing query validation |
| `validateParams` | function | Validate route params |
| `validateParamsSafe` | function | Non-throwing params validation |
| `validateFormData` | function | Validate form data |
| `uuidSchema` | schema | UUID validation schema |
| `createUUIDSchema` | function | UUID schema factory |
| `createRequiredStringSchema` | function | String schema factory |
| `paginationSchema` | schema | Pagination query schema |
| `visibilitySchema` | schema | Visibility enum schema |
| `voteTypeSchema` | schema | Vote type enum schema |
| `artifactKindSchema` | schema | Artifact kind enum schema |
| `idParamSchema` | schema | ID param schema |
| `chatIdParamSchema` | schema | Chat ID param schema |
| `isValidUUID` | function | UUID validation helper |
| `isValidEmail` | function | Email validation helper |
| `isValidUrl` | function | URL validation helper |

**Issues:**
- **DUPLICATE CODE**: `validateBody`/`validateBodySafe`, `validateQuery`/`validateQuerySafe`, `validateParams`/`validateParamsSafe` - each safe version duplicates logic
- `formatZodErrors` is private but logic is repeated for error formatting across throw-based functions

---

### lib/api/response.ts
| Property | Value |
|----------|-------|
| **LOC** | 599 |
| **Classification** | utility |
| **Cyclomatic Complexity** | 5 |

**Imports:**
- Internal (cross-shard): `@/lib/errors` (isAppError), `@/lib/types` (ApiResponse, ApiError, PaginatedResponse, PaginationMetadata)

**Exports:**
| Name | Kind | Notes |
|------|------|-------|
| `success` | function | Create success response |
| `successNoContent` | function | Create 204 response |
| `error` | function | Create error response |
| `validationError` | function | Create validation error |
| `notFound` | function | Create 404 response |
| `unauthorized` | function | Create 401 response |
| `forbidden` | function | Create 403 response |
| `rateLimit` | function | Create 429 response |
| `paginated` | function | Create paginated response |
| `stream` | function | Create streaming response |
| `json` | function | Create JSON response |
| `redirect` | function | Create redirect response |
| `withRequestId` | function | Add request ID header |

**Issues:**
- **NAMING**: `error` function shadows built-in Error constructor - can cause confusion
- `stream` function has two code paths for function vs stream parameter

---

### lib/api/index.ts
| Property | Value |
|----------|-------|
| **LOC** | 127 |
| **Classification** | barrel export |
| **Cyclomatic Complexity** | 1 |

**Imports:**
- Internal (intra-shard): `./response`, `./validation`, `./context`

**Exports:**
- Re-exports 16 items from response.ts
- Re-exports 20 items from validation.ts
- Re-exports 17 items from context.ts

---

## Cross-Shard Dependency Edges

### Outgoing from lib/auth/*

| Source File | Target Module | Import |
|-------------|---------------|--------|
| config.ts | @/lib/db/client | db |
| config.ts | @/lib/db/schema | user |
| session.ts | @/lib/constants | CACHE_TTL, GUEST_TOKEN_TTL |
| session.ts | @/lib/errors | UnauthorizedError |
| guards.ts | @/lib/errors | ForbiddenError, NotFoundError, RateLimitError, UnauthorizedError, ValidationError |
| guards.ts | @/lib/rate-limit | getRateLimiter, RateLimitConfig, RateLimiterName, RateLimitResult |

### Outgoing from lib/api/*

| Source File | Target Module | Import |
|-------------|---------------|--------|
| validation.ts | @/lib/errors | ValidationError |
| response.ts | @/lib/errors | isAppError |
| response.ts | @/lib/types | ApiError, ApiResponse, PaginatedResponse, PaginationMetadata |

### Incoming to lib/auth/* (from outside shard)

| Consumer File | Import |
|---------------|--------|
| 30+ files | @/lib/auth, @/lib/auth/session, @/lib/auth/guards |
| middleware.ts | auth |
| app/api/auth/callback/route.ts | handlers |
| app/api/auth/[...nextauth]/route.ts | handlers |
| features/auth/actions/*.ts | signIn, signOut |
| features/*/actions/*.ts | requireAuthAction, getSession |
| app/(auth)/layout.tsx | getSession |
| app/(chat)/layout.tsx | getSession |
| app/layout.tsx | getSession |
| lib/ai/chat-completion.ts | AppSession |
| lib/ai/entitlements.ts | AppUserType |
| lib/middleware/auth.ts | auth |

### Incoming to lib/api/* (from outside shard)

| Consumer File | Import |
|---------------|--------|
| app/api/files/upload/route.ts | error, rateLimit, success |
| app/api/chat/route.ts | error, isValidUUID |
| app/api/auth/logout/route.ts | error, success, validateOrigin |
| app/api/votes/route.ts | error, success |
| app/api/suggestions/route.ts | error |
| app/api/history/route.ts | error, isValidUUID, rateLimit, success |
| app/api/artifacts/route.ts | validation utilities |
| app/api/auth/guest/route.ts | validation and response utilities |
| app/api/auth/session/route.ts | success |
| app/api/chat/[id]/messages/route.ts | error, success |
| lib/index.ts | re-exports from ./api |

---

## Intra-Shard Pattern Flags

### Duplicate/Near-Duplicate Functions (>70% similarity)

| File | Function 1 | Function 2 | Similarity |
|------|------------|------------|------------|
| context.ts:195-225 | `runWithRequestContext` | `runWithRequestContextAsync` | ~95% |
| validation.ts:49-71 | `validateBody` | `validateBodySafe` | ~80% |
| validation.ts:139-172 | `validateQuery` | `validateQuerySafe` | ~85% |
| validation.ts:227-239 | `validateParams` | `validateParamsSafe` | ~90% |
| guards.ts:448-468 | `requireRateLimit` | `requireCustomRateLimit` | ~90% |
| guards.ts:78-94 | `requireAuth` | `requireAuthWithSession` | ~95% |

### Redundant Type/Function Overlap

| Location | Issue |
|----------|-------|
| session.ts:253 + guards.ts:347 | `isGuest(session)` vs `isGuestSession()` - same logic, different signatures |
| session.ts:459 + guards.ts:140 | `requireAuthenticatedSession()` vs `requireAuthenticatedUser()` - same check, different returns |
| guards.ts:116 + guards.ts:140 | `requireAuthAction()` vs `requireAuthenticatedUser()` - overlapping auth check |

### Functions with Multiple Responsibilities

| File:Line | Function | Concerns |
|-----------|----------|----------|
| context.ts:195-225 | `runWithRequestContext` | Context creation + execution wrapping |
| config.ts:145-171 | `authorized` callback | Route classification + redirect logic + auth check |
| response.ts:475-533 | `stream` | Function parameter handling + stream creation |

### Naming Inconsistencies

| File:Line | Name | Issue |
|-----------|------|-------|
| response.ts:136 | `error` | Shadows built-in Error constructor |
| guards.ts:673 | `requireAuthWithSession` | Deprecated but still exported |
| validation.ts:452 | `isValidUUID` | Duplicate of same function in lib/constants.ts |

### Dead Code / Deprecated

| File:Line | Item | Status |
|-----------|------|--------|
| guards.ts:673-678 | `requireAuthWithSession` | Marked @deprecated but still exported |

### Misplaced Functionality

| File:Line | Function | Recommendation |
|-----------|----------|----------------|
| guards.ts:592-603 | `parseTimestamp` | Move to validation.ts |
| guards.ts:621-651 | `requireQueryParam`, `getQueryParam` | Move to validation.ts |

---

## Summary

### Strengths
- Well-organized barrel exports with comprehensive type re-exports
- Strong type safety with exported interfaces
- Clear separation between config, session management, and guards
- Consistent error handling patterns using AppError hierarchy

### Concerns
1. **Code Duplication**: 6 function pairs with >70% similarity
2. **Naming**: `error` function shadows built-in
3. **Deprecated Code**: `requireAuthWithSession` still exported
4. **Misplaced Functions**: Query param and timestamp parsing in guards.ts
5. **Utility Overlap**: `isValidUUID` exists in both validation.ts and constants.ts

### Recommendations
1. Consolidate `runWithRequestContext` and `runWithRequestContextAsync` using a single implementation
2. Create internal helper for safe/throw validation pattern to reduce duplication
3. Rename `error` function to `errorResponse` or `apiError`
4. Remove `requireAuthWithSession` deprecated function
5. Move `parseTimestamp`, `requireQueryParam`, `getQueryParam` to validation.ts
6. Consolidate `isValidUUID` to single location (constants.ts preferred)

---

## ⚠️ ESCALATION Items

1. **`isValidUUID` duplication**: Same function exists in `lib/constants.ts:268` and `lib/api/validation.ts:452`. Requires coordination with Shard owner for constants.

2. **Archive code imports**: 15+ import references from `archive/oldapp/` directory - legacy code still references auth/api modules. May need cleanup coordination.

---

## ⚠️ SCOPE EXTENSION Items

None identified. All analysis remained within assigned shard boundaries.
