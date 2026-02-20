# Scout Report: Shard 01 - API Routes

**Shard ID:** 01  
**Scope:** `app/api/**`  
**Generated:** 2026-02-19  

---

## Metrics Summary

| Files in shard          | 14 |
| Total LOC               | 3152 |
| Exports catalogued      | 26 |
| Cross-shard edges found | 42 |
| Issues flagged          | 18 |
| Critical complexity (>10)| 3 |

---

## File Inventory

### 1. `app/api/chat/route.ts`
| Property | Value |
|----------|-------|
| LOC | 623 |
| Classification | Entry Point |
| Cyclomatic Complexity | **18** ⚠️ CRITICAL |
| Exports | `maxDuration`, `POST`, `DELETE` |

**Imports (Cross-Shard):**
- `@/features/chat/actions/stream-chat.action` → `createStreamChatMessageStream`, `validateStreamChatPreflight`
- `@/features/chat/schemas` → `ChatRouteRequestSchema`, `ChatRouteRequestInput`
- `@/lib/ai` → `AppUsage`, `ChatSettings`, `generatePlaceholderTitle`, `generateTitleFromUserMessage`
- `@/lib/api` → `error`, `isValidUUID`
- `@/lib/auth/session` → `getSession`
- `@/lib/data/repositories` → `RepositoryContext`
- `@/lib/data/services/chat.service` → `chatService`
- `@/lib/db/schema` → `DBMessage`
- `@/lib/errors` → `ForbiddenError`, `NotFoundError`, `RateLimitError`, `UnauthorizedError`, `ValidationError`
- `@/lib/log` → `logError`, `logInfo`, `logWarn`
- `@/lib/rate-limit` → `checkChatLimit`, `getRetryAfter`

**Issues:**
- **PATTERN-001** (L99-101): `generateUUID()` wrapper is redundant - `crypto.randomUUID()` can be called directly
- **PATTERN-002** (L72-94): `convertToUIMessages` is nearly identical to `messageToUIMessage` in reconnect route
- **COMPLEXITY-001**: POST handler spans 389 lines (L154-543) with multiple responsibilities
- **DUPLICATION-001**: Error response handling duplicated in `createChatErrorResponse` (L112-144)

---

### 2. `app/api/chat/[id]/reconnect/route.ts`
| Property | Value |
|----------|-------|
| LOC | 407 |
| Classification | Entry Point |
| Cyclomatic Complexity | **14** ⚠️ CRITICAL |
| Exports | `maxDuration`, `GET` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`
- `@/lib/auth/guards` → `requireAuthAction`, `requireRateLimit`
- `@/lib/data/repositories` → `RepositoryContext`
- `@/lib/data/services/chat.service` → `chatService`
- `@/lib/db/schema` → `Message`
- `@/lib/errors` → `ForbiddenError`, `NotFoundError`, `RateLimitError`, `ValidationError`
- `@/lib/log` → `logDebug`, `logError`

**Issues:**
- **PATTERN-003** (L90-96): `messageToUIMessage` duplicates logic from chat/route.ts `convertToUIMessages`
- **COMPLEXITY-002**: `collectReplayMessages` function (L106-167) has 6 branches
- **MAGIC-NUMBERS-001**: Multiple magic numbers defined as constants - good pattern, but window values could be configurable

---

### 3. `app/api/chat/[id]/messages/route.ts`
| Property | Value |
|----------|-------|
| LOC | 36 |
| Classification | Entry Point |
| Cyclomatic Complexity | 3 |
| Exports | `GET` |

**Imports (Cross-Shard):**
- `@/features/chat/actions` → `getChatAction`
- `@/lib/api` → `error`, `success`
- `@/lib/auth/guards` → `requireAuthAction`

**Issues:** None - well-structured thin route.

---

### 4. `app/api/files/upload/route.ts`
| Property | Value |
|----------|-------|
| LOC | 120 |
| Classification | Entry Point |
| Cyclomatic Complexity | 7 |
| Exports | `POST` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`, `rateLimit`, `success`
- `@/lib/auth/guards` → `requireAuthAction`
- `@/lib/errors` → `ValidationError`
- `@/lib/rate-limit` → `checkUploadLimit`, `createRateLimitHeaders`, `getRetryAfter`
- `@/lib/utils/file-validation` → `ATTACHMENT_MAX_FILE_SIZE`, `validateAttachment`

**Issues:**
- **PATTERN-004**: Rate limit check pattern (L40-44) duplicated across 6+ routes

---

### 5. `app/api/history/route.ts`
| Property | Value |
|----------|-------|
| LOC | 487 |
| Classification | Entry Point |
| Cyclomatic Complexity | **12** ⚠️ CRITICAL |
| Exports | `GET`, `DELETE` |

**Imports (Cross-Shard):**
- `@/features/chat/actions` → `deleteAllChatsAction`
- `@/lib/api` → `error`, `isValidUUID`, `rateLimit`, `success`
- `@/lib/auth/guards` → `requireAuthAction`
- `@/lib/data` → `applyCursorPagination`, `CursorPaginationParams`, `decodeCursor`, `encodeCursor`
- `@/lib/db` → `chat`, `db`
- `@/lib/db/pagination` → `CursorPaginatedResult`, `createPaginationResponse`
- `@/lib/db/schema` → `Chat`
- `@/lib/errors` → `ValidationError`
- `@/lib/rate-limit` → `checkApiLimit`, `checkStrictLimit`, `createRateLimitHeaders`, `getRetryAfter`

**Issues:**
- **ARCHITECTURE-001**: Direct DB queries bypass service layer - inconsistent with other routes
- **COMPLEXITY-003**: `applyHistoryCursorAdapter` function (L131-231) has 8 branches
- **PATTERN-005**: Cursor resolution logic could be extracted to a shared utility

---

### 6. `app/api/votes/route.ts`
| Property | Value |
|----------|-------|
| LOC | 223 |
| Classification | Entry Point |
| Cyclomatic Complexity | 8 |
| Exports | `GET`, `PATCH` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`, `success`
- `@/lib/auth/guards` → `optionalAuth`, `requireAuthAction`, `requireNonGuest`, `requireRateLimit`
- `@/lib/data/repositories` → `chatRepository`, `voteRepository`
- `@/lib/data/services/chat.service` → `chatService`
- `@/lib/errors` → `ForbiddenError`, `NotFoundError`, `ValidationError`
- `@/lib/log` → `logError`, `logInfo`

**Issues:**
- **PATTERN-006**: Vote schema validation (L31-57) - complex superRefine could be simplified
- **MIXED-ACCESS-001**: Uses both repository and service layer - inconsistent pattern

---

### 7. `app/api/suggestions/route.ts`
| Property | Value |
|----------|-------|
| LOC | 204 |
| Classification | Entry Point |
| Cyclomatic Complexity | 7 |
| Exports | `GET` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`
- `@/lib/auth/guards` → `isGuestSession`, `requireAuthAction`, `requireRateLimit`
- `@/lib/data/repositories` → `artifactRepository`, `suggestionRepository`
- `@/lib/errors` → `ForbiddenError`, `ValidationError`
- `@/lib/log` → `logError`

**Issues:**
- **PATTERN-007**: Complex Zod schema with superRefine (L24-69) - could use transform
- **DUPLICATION-002**: Guest session check pattern (L94-101) duplicated in votes route

---

### 8. `app/api/artifacts/route.ts`
| Property | Value |
|----------|-------|
| LOC | 572 |
| Classification | Entry Point |
| Cyclomatic Complexity | 10 |
| Exports | `GET`, `POST`, `PATCH`, `PUT`, `DELETE` |

**Imports (Cross-Shard):**
- `@/features/artifact/actions` → `createArtifact`, `deleteArtifact`, `getArtifactVersion`, `rollbackToVersion`, `UpdateArtifactParams`, `updateArtifact`
- `@/features/artifact/actions/versions` → `getVersionHistory`
- `@/features/artifact/schemas/artifact.schema` → `ArtifactKind`, `ArtifactUUIDSchema`, `CreateArtifactSchema`, `UpdateArtifactSchema`
- `@/lib/api` → `error`, `isValidUUID`, `notFound`, `rateLimit`, `success`, `validateBody`
- `@/lib/auth/guards` → `requireAuthAction`
- `@/lib/errors` → `ValidationError`
- `@/lib/rate-limit` → `checkApiLimit`, `checkStrictLimit`, `createRateLimitHeaders`, `getRetryAfter`

**Issues:**
- **LARGE-FILE-001**: 5 HTTP handlers in single file - could split by method
- **DUPLICATION-003**: Version timestamp validation duplicated in GET (L156-170), POST (L251-258), PATCH (L396-407)
- **PATTERN-008**: `validateArtifactContentType` helper (L82-117) could be in feature module

---

### 9. `app/api/auth/session/route.ts`
| Property | Value |
|----------|-------|
| LOC | 24 |
| Classification | Entry Point |
| Cyclomatic Complexity | 2 |
| Exports | `GET` |

**Imports (Cross-Shard):**
- `@/lib/api` → `success`
- `@/lib/auth/session` → `getSession`

**Issues:** None - minimal, well-structured route.

---

### 10. `app/api/auth/guest/route.ts`
| Property | Value |
|----------|-------|
| LOC | 209 |
| Classification | Entry Point |
| Cyclomatic Complexity | 8 |
| Exports | `maxDuration`, `POST`, `GET` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`, `getClientIp`, `validateOrigin`
- `@/lib/auth` → `getOrCreateGuestSession`, `getSession`
- `@/lib/errors` → `ForbiddenError`, `RateLimitError`, `ServiceUnavailableError`
- `@/lib/log` → `logInfo`, `logWarn`
- `@/lib/rate-limit` → `checkGuestLimit`
- `@/lib/utils` → `getSafeRedirectUrl`

**Issues:**
- **PATTERN-009**: `createResponseWithRateHeaders` (L38-51) duplicates rate limit header logic from `createRateLimitHeaders` in lib
- **PATTERN-010**: `createRateLimitResponse` (L56-74) creates headers manually instead of using lib utility

---

### 11. `app/api/auth/logout/route.ts`
| Property | Value |
|----------|-------|
| LOC | 44 |
| Classification | Entry Point |
| Cyclomatic Complexity | 3 |
| Exports | `POST` |

**Imports (Cross-Shard):**
- `@/lib/api` → `error`, `success`, `validateOrigin`
- `@/lib/auth` → `signOut`
- `@/lib/errors` → `ForbiddenError`, `InternalServerError`

**Issues:**
- **PATTERN-011**: CSRF validation via `validateOrigin` (L24-26) - pattern duplicated in guest route

---

### 12. `app/api/auth/callback/route.ts`
| Property | Value |
|----------|-------|
| LOC | 17 |
| Classification | Entry Point |
| Cyclomatic Complexity | 1 |
| Exports | `GET` |

**Imports (Cross-Shard):**
- `@/lib/auth` → `handlers`

**Issues:** None - delegate pattern is correct.

---

### 13. `app/api/auth/[...nextauth]/route.ts`
| Property | Value |
|----------|-------|
| LOC | 13 |
| Classification | Entry Point |
| Cyclomatic Complexity | 1 |
| Exports | `GET`, `POST` |

**Imports (Cross-Shard):**
- `@/lib/auth` → `handlers`

**Issues:** None - delegate pattern is correct.

---

### 14. `app/api/health/route.ts`
| Property | Value |
|----------|-------|
| LOC | 173 |
| Classification | Entry Point |
| Cyclomatic Complexity | 5 |
| Exports | `GET` |

**Imports (Cross-Shard):**
- `@/lib/cache` → `getRedisClient`, `isRedisAvailable`
- `@/lib/db` → `db`
- `@/lib/middleware` → `publicMiddleware`

**Issues:**
- **PATTERN-012**: Health check functions could be moved to lib/health module for reuse

---

## Cross-Shard Dependency Edges

### Outbound Dependencies (Source → Target Module)

| Source File | Target Module | Imports |
|-------------|---------------|---------|
| `chat/route.ts` | `features/chat/actions` | `createStreamChatMessageStream`, `validateStreamChatPreflight` |
| `chat/route.ts` | `features/chat/schemas` | `ChatRouteRequestSchema`, `ChatRouteRequestInput` |
| `chat/route.ts` | `lib/ai` | `AppUsage`, `ChatSettings`, `generatePlaceholderTitle`, `generateTitleFromUserMessage` |
| `chat/route.ts` | `lib/api` | `error`, `isValidUUID` |
| `chat/route.ts` | `lib/auth/session` | `getSession` |
| `chat/route.ts` | `lib/data/repositories` | `RepositoryContext` |
| `chat/route.ts` | `lib/data/services` | `chatService` |
| `chat/route.ts` | `lib/db/schema` | `DBMessage` |
| `chat/route.ts` | `lib/errors` | `ForbiddenError`, `NotFoundError`, `RateLimitError`, `UnauthorizedError`, `ValidationError` |
| `chat/route.ts` | `lib/log` | `logError`, `logInfo`, `logWarn` |
| `chat/route.ts` | `lib/rate-limit` | `checkChatLimit`, `getRetryAfter` |
| `files/upload/route.ts` | `lib/api` | `error`, `rateLimit`, `success` |
| `files/upload/route.ts` | `lib/auth/guards` | `requireAuthAction` |
| `files/upload/route.ts` | `lib/errors` | `ValidationError` |
| `files/upload/route.ts` | `lib/rate-limit` | `checkUploadLimit`, `createRateLimitHeaders`, `getRetryAfter` |
| `files/upload/route.ts` | `lib/utils/file-validation` | `ATTACHMENT_MAX_FILE_SIZE`, `validateAttachment` |
| `auth/logout/route.ts` | `lib/api` | `error`, `success`, `validateOrigin` |
| `auth/logout/route.ts` | `lib/auth` | `signOut` |
| `auth/logout/route.ts` | `lib/errors` | `ForbiddenError`, `InternalServerError` |
| `chat/[id]/reconnect/route.ts` | `lib/api` | `error` |
| `chat/[id]/reconnect/route.ts` | `lib/auth/guards` | `requireAuthAction`, `requireRateLimit` |
| `chat/[id]/reconnect/route.ts` | `lib/data/repositories` | `RepositoryContext` |
| `chat/[id]/reconnect/route.ts` | `lib/data/services` | `chatService` |
| `chat/[id]/reconnect/route.ts` | `lib/db/schema` | `Message` |
| `chat/[id]/reconnect/route.ts` | `lib/errors` | `ForbiddenError`, `NotFoundError`, `RateLimitError`, `ValidationError` |
| `chat/[id]/reconnect/route.ts` | `lib/log` | `logDebug`, `logError` |
| `votes/route.ts` | `lib/api` | `error`, `success` |
| `votes/route.ts` | `lib/auth/guards` | `optionalAuth`, `requireAuthAction`, `requireNonGuest`, `requireRateLimit` |
| `votes/route.ts` | `lib/data/repositories` | `chatRepository`, `voteRepository` |
| `votes/route.ts` | `lib/data/services` | `chatService` |
| `votes/route.ts` | `lib/errors` | `ForbiddenError`, `NotFoundError`, `ValidationError` |
| `votes/route.ts` | `lib/log` | `logError`, `logInfo` |
| `suggestions/route.ts` | `lib/api` | `error` |
| `suggestions/route.ts` | `lib/auth/guards` | `isGuestSession`, `requireAuthAction`, `requireRateLimit` |
| `suggestions/route.ts` | `lib/data/repositories` | `artifactRepository`, `suggestionRepository` |
| `suggestions/route.ts` | `lib/errors` | `ForbiddenError`, `ValidationError` |
| `suggestions/route.ts` | `lib/log` | `logError` |
| `history/route.ts` | `features/chat/actions` | `deleteAllChatsAction` |
| `history/route.ts` | `lib/api` | `error`, `isValidUUID`, `rateLimit`, `success` |
| `history/route.ts` | `lib/auth/guards` | `requireAuthAction` |
| `history/route.ts` | `lib/data` | `applyCursorPagination`, `CursorPaginationParams`, `decodeCursor`, `encodeCursor` |
| `history/route.ts` | `lib/db` | `chat`, `db` |
| `history/route.ts` | `lib/db/pagination` | `CursorPaginatedResult`, `createPaginationResponse` |
| `history/route.ts` | `lib/db/schema` | `Chat` |
| `history/route.ts` | `lib/errors` | `ValidationError` |
| `history/route.ts` | `lib/rate-limit` | `checkApiLimit`, `checkStrictLimit`, `createRateLimitHeaders`, `getRetryAfter` |
| `artifacts/route.ts` | `features/artifact/actions` | `createArtifact`, `deleteArtifact`, `getArtifactVersion`, `rollbackToVersion`, `UpdateArtifactParams`, `updateArtifact` |
| `artifacts/route.ts` | `features/artifact/actions/versions` | `getVersionHistory` |
| `artifacts/route.ts` | `features/artifact/schemas` | `ArtifactKind`, `ArtifactUUIDSchema`, `CreateArtifactSchema`, `UpdateArtifactSchema` |
| `artifacts/route.ts` | `lib/api` | `error`, `isValidUUID`, `notFound`, `rateLimit`, `success`, `validateBody` |
| `artifacts/route.ts` | `lib/auth/guards` | `requireAuthAction` |
| `artifacts/route.ts` | `lib/errors` | `ValidationError` |
| `artifacts/route.ts` | `lib/rate-limit` | `checkApiLimit`, `checkStrictLimit`, `createRateLimitHeaders`, `getRetryAfter` |
| `auth/session/route.ts` | `lib/api` | `success` |
| `auth/session/route.ts` | `lib/auth/session` | `getSession` |
| `auth/guest/route.ts` | `lib/api` | `error`, `getClientIp`, `validateOrigin` |
| `auth/guest/route.ts` | `lib/auth` | `getOrCreateGuestSession`, `getSession` |
| `auth/guest/route.ts` | `lib/errors` | `ForbiddenError`, `RateLimitError`, `ServiceUnavailableError` |
| `auth/guest/route.ts` | `lib/log` | `logInfo`, `logWarn` |
| `auth/guest/route.ts` | `lib/rate-limit` | `checkGuestLimit` |
| `auth/guest/route.ts` | `lib/utils` | `getSafeRedirectUrl` |
| `health/route.ts` | `lib/cache` | `getRedisClient`, `isRedisAvailable` |
| `health/route.ts` | `lib/db` | `db` |
| `health/route.ts` | `lib/middleware` | `publicMiddleware` |
| `chat/[id]/messages/route.ts` | `features/chat/actions` | `getChatAction` |
| `chat/[id]/messages/route.ts` | `lib/api` | `error`, `success` |
| `chat/[id]/messages/route.ts` | `lib/auth/guards` | `requireAuthAction` |
| `auth/callback/route.ts` | `lib/auth` | `handlers` |
| `auth/[...nextauth]/route.ts` | `lib/auth` | `handlers` |

---

## Pattern Flags

### Duplicate/Near-Duplicate Code

| ID | Location | Description | Similarity |
|----|----------|-------------|------------|
| DUPE-001 | `chat/route.ts:72-94` | `convertToUIMessages` | ~85% similar to `reconnect/route.ts:90-96` |
| DUPE-002 | `chat/route.ts:99-101` | `generateUUID()` wrapper | 100% replaceable with `crypto.randomUUID` |
| DUPE-003 | Multiple files | Rate limit check pattern | ~80% similar across 6 files |
| DUPE-004 | `artifacts/route.ts` | Version timestamp validation | 100% identical in GET, POST, PATCH |

### Redundant Type Definitions

| ID | Location | Description |
|----|----------|-------------|
| TYPE-001 | `chat/route.ts:73-79` | Inline message type could use `DBMessage` |
| TYPE-002 | `reconnect/route.ts:90` | `messageToUIMessage` return type could be shared |

### Unused Variables / Dead Code

| ID | Location | Description |
|----|----------|-------------|
| DEAD-001 | `chat/route.ts:47` | `maxDuration` exported but only for config |
| DEAD-002 | `reconnect/route.ts:40` | `maxDuration` exported but only for config |

### Naming Inconsistencies

| ID | Location | Description |
|----|----------|-------------|
| NAME-001 | `votes/route.ts:38` | Schema uses `isUpvoted` but handler normalizes to `type` |
| NAME-002 | `history/route.ts` | Uses `starting_after`/`ending_before` but other routes use `cursor` |
| NAME-003 | `artifacts/route.ts` | Route uses `id` param but schema defines `ArtifactUUIDSchema` |

### Functions with Multiple Responsibilities

| ID | Location | Description | Responsibilities |
|----|----------|-------------|------------------|
| SRP-001 | `chat/route.ts:154-543` | `POST` handler | Validation, AI streaming, DB persistence, title generation |
| SRP-002 | `history/route.ts:242-453` | `GET` handler | Auth, pagination, filtering, cursor resolution |
| SRP-003 | `artifacts/route.ts:213-343` | `POST` handler | Version targeting, validation, creation, update |

---

## Architecture Violations

| ID | Location | Violation | Recommendation |
|----|----------|-----------|----------------|
| ARCH-001 | `history/route.ts:307-393` | Direct DB queries bypass service layer | Use `chatService` or create `historyService` |
| ARCH-002 | `votes/route.ts` | Mixed repository and service usage | Standardize on service layer only |
| ARCH-003 | `artifacts/route.ts` | Business logic in route (version resolution) | Move to feature action |

---

## Complexity Hotspots

### ⚠️ CRITICAL: `chat/route.ts` POST Handler
- **Lines:** 154-543 (389 lines)
- **Cyclomatic Complexity:** 18
- **Branches:** 15+ conditional paths
- **Recommendations:**
  1. Extract message preparation to helper
  2. Extract title generation to separate flow
  3. Extract DB persistence to service method
  4. Use early returns to reduce nesting

### ⚠️ CRITICAL: `chat/[id]/reconnect/route.ts` GET Handler
- **Lines:** 190-406 (216 lines)
- **Cyclomatic Complexity:** 14
- **Branches:** 10+ conditional paths
- **Recommendations:**
  1. Extract `collectReplayMessages` to service
  2. Simplify rate limit handling
  3. Use result object pattern for early returns

### ⚠️ CRITICAL: `history/route.ts` GET Handler
- **Lines:** 242-453 (211 lines)
- **Cyclomatic Complexity:** 12
- **Branches:** 12+ conditional paths
- **Recommendations:**
  1. Move cursor logic to data layer
  2. Extract filter building to helper
  3. Use strategy pattern for pagination modes

---

## ⚠️ ESCALATION Items

### ESCALATION-001: Mixed Data Access Patterns
**Files:** `history/route.ts`, `votes/route.ts`, `suggestions/route.ts`

Some routes use direct DB queries (`db.select()`) while others use the service layer. This inconsistency makes:
- Testing harder (need to mock both db and services)
- Business logic potentially scattered
- Future refactoring more difficult

**Requires Human Judgment:** Should all API routes be required to go through the service layer, or is direct DB access acceptable for read-only operations?

---

### ESCALATION-002: Rate Limiting Strategy
**Files:** Multiple

Rate limiting is implemented inconsistently:
- Some routes use `requireRateLimit` from guards
- Some use `checkApiLimit` directly
- Some have custom rate limit response builders

**Requires Human Judgment:** Should there be a standardized rate limiting middleware or wrapper for all routes?

---

### ESCALATION-003: Large Route File Organization
**File:** `artifacts/route.ts` (572 lines, 5 handlers)

**Requires Human Judgment:** Should multi-handler routes be split into separate files (e.g., `artifacts/get.ts`, `artifacts/post.ts`)?

---

## Summary

The API routes shard contains 14 files with 3,152 total lines of code. Three files have critical cyclomatic complexity exceeding 10. The primary issues identified are:

1. **Duplication:** Message transformation logic and rate limit handling are duplicated across files
2. **Complexity:** The `chat/route.ts` POST handler is too large with 18 cyclomatic complexity
3. **Architecture:** Inconsistent use of service layer vs direct DB access
4. **Patterns:** Rate limiting and CSRF validation patterns are implemented differently across routes

**Recommended Priority Actions:**
1. Refactor `chat/route.ts` POST handler to reduce complexity
2. Standardize data access through service layer
3. Extract common rate limit handling to utility
4. Consolidate message transformation utilities
