# PHASE 4 — Fragmented Logic Across Files

**Analysis Date:** 2025-01-27  
**Scope:** Complete codebase  
**Method:** Cross-file responsibility analysis, domain mapping, ownership identification

---

## EXECUTIVE SUMMARY

**Total Fragmentation Instances Found:** 9  
**High Priority Consolidations:** 6  
**Estimated Maintainability Improvement:** ~40%  
**Files Affected:** 25+

---

## 1. AUTHENTICATION LOGIC FRAGMENTATION

### Pattern: Authentication Logic Scattered Across 8+ Files

**Violation:** Authentication concerns are split across multiple modules without clear ownership.

#### Fragmentation Map:

| Concern | Files | Lines |
|---------|-------|-------|
| **Session Retrieval** | `lib/auth/session.ts`, `lib/auth/index.ts` | ~200 |
| **JWT Operations** | `lib/auth/jwt.ts` | ~150 |
| **Auth Guards** | `lib/auth/guards.ts` | ~106 |
| **Guest Token Extraction** | `lib/auth/extract-guest.ts` | ~50 |
| **Cookie Management** | `lib/auth/cookies.ts`, `lib/auth/constants.ts` | ~100 |
| **Token Exchange** | `app/api/auth/exchange/route.ts` | ~130 |
| **Client Auth** | `lib/auth/client.ts` | ~50 |
| **Session Caching** | `lib/auth/session-cache.ts` | ~100 |

**Total:** ~886 lines across 8+ files

**Issues:**
1. **No clear entry point** - Multiple ways to get session (`getSession()`, `getSessionCached()`, `requireAuth()`, `requireAuthForRoute()`)
2. **Mixed concerns** - Session retrieval, JWT, cookies, caching all intermingled
3. **Inconsistent patterns** - Some use helpers, some access directly
4. **Hard to test** - Dependencies spread across files

**Canonical Ownership Recommendation:**
- **Primary Module:** `lib/auth/session.ts` - Session retrieval and management
- **Secondary Modules:**
  - `lib/auth/jwt.ts` - JWT operations (already well-separated)
  - `lib/auth/guards.ts` - Authorization guards (already well-separated)
  - `lib/auth/cookies.ts` - Cookie operations (already well-separated)

**Consolidation Strategy:**
1. **Create unified auth API** in `lib/auth/index.ts`:
   ```typescript
   // lib/auth/index.ts (enhanced)
   export {
       // Session (primary)
       getSession,
       getSessionCached,
       createGuestSession,
       getOrCreateSession,
       
       // Guards (authorization)
       requireAuth,
       requireAuthForRoute,
       requireRegularUser,
       
       // JWT (token operations)
       signJwt,
       verifyJwt,
       
       // Cookies (infrastructure)
       getSupabaseCookieName,
       getCookieOptions,
   } from "./session";
   ```
2. **Move session-cache logic** into `session.ts` (internal implementation detail)
3. **Keep extract-guest.ts** separate (utility function)
4. **Document ownership** - Session.ts owns session lifecycle

**Impact:**
- Clearer API surface
- Easier to understand authentication flow
- Better testability
- Reduced cognitive load

---

## 2. VALIDATION LOGIC FRAGMENTATION

### Pattern: Validation Logic Split Across 5+ Layers

**Violation:** Validation logic appears in routes, services, utilities, and form helpers with no clear ownership.

#### Fragmentation Map:

| Validation Type | Files | Purpose |
|-----------------|-------|---------|
| **Chat Input** | `lib/utils/form-helpers.ts:349` | Client-side validation |
| **Chat Request** | `app/api/chat/handlers/validate-request.ts` | API request validation |
| **Form Data** | `lib/utils/form-helpers.ts:270` | Generic form validation |
| **UUID** | 6+ files (see Phase 1) | UUID format validation |
| **Document** | `lib/services/document-service.ts:91-123` | Document validation |
| **Request Body** | Multiple API routes | JSON body validation |
| **Parameters** | Multiple API routes | URL parameter validation |

**Issues:**
1. **No validation layer** - Validation logic embedded in business logic
2. **Inconsistent patterns** - Some use Zod, some use custom validators, some use inline checks
3. **Duplication** - Same validation rules in multiple places (see Phase 1)
4. **Hard to maintain** - Changes require updates in multiple files

**Canonical Ownership Recommendation:**
- **Create `lib/validation/` module** with clear structure:
  ```
  lib/validation/
  ├── index.ts              # Public API
  ├── schemas.ts            # Zod schemas
  ├── api-params.ts         # API parameter validation
  ├── request-body.ts       # Request body validation
  ├── domain/               # Domain-specific validation
  │   ├── chat.ts
  │   ├── document.ts
  │   └── vote.ts
  └── utils.ts              # Validation utilities
  ```

**Consolidation Strategy:**
1. **Extract all Zod schemas** to `lib/validation/schemas.ts`
2. **Create parameter validators** in `lib/validation/api-params.ts`:
   ```typescript
   // lib/validation/api-params.ts
   export async function getUUIDParam(
       request: Request,
       paramName: string
   ): Promise<string> {
       // Centralized UUID parameter validation
   }
   
   export async function getStringParam(
       request: Request,
       paramName: string,
       options?: { required?: boolean; maxLength?: number }
   ): Promise<string | null> {
       // Centralized string parameter validation
   }
   ```
3. **Create request body validators** in `lib/validation/request-body.ts`:
   ```typescript
   // lib/validation/request-body.ts
   export async function parseAndValidateJsonBody<T>(
       request: Request,
       schema: z.ZodSchema<T>
   ): Promise<T> {
       // Centralized request body validation
   }
   ```
4. **Move domain validation** to `lib/validation/domain/`:
   - Chat validation → `domain/chat.ts`
   - Document validation → `domain/document.ts`
   - Vote validation → `domain/vote.ts`
5. **Update all consumers** to use centralized validators

**Impact:**
- Single source of truth for validation rules
- Consistent validation patterns
- Easier to test
- Better error messages

---

## 3. ERROR HANDLING FRAGMENTATION

### Pattern: Error Handling Logic Split Across 6+ Files

**Violation:** Error handling patterns are implemented differently across the codebase.

#### Fragmentation Map:

| Error Handling Concern | Files | Implementation |
|------------------------|-------|----------------|
| **Error Classes** | `lib/errors/app-error.ts`, `lib/errors/api.ts` | Class definitions |
| **Error Factories** | `lib/errors/factories.ts` | Factory functions |
| **Error Messages** | `lib/errors/messages.ts`, `lib/utils/error-messages.ts` | Message catalog |
| **Error Mapping** | `lib/errors/utils.ts`, `lib/errors/mappers/postgres.ts` | Error transformation |
| **API Error Handling** | `lib/api/response.ts:203`, `app/api/chat/handlers/error-response.ts` | API-specific handling |
| **Client Error Handling** | `lib/api/fetch-client.ts:248`, `lib/utils/network.ts:98` | Client-side handling |
| **UI Error Handling** | `shared/components/error-fallback.tsx` | UI error display |

**Issues:**
1. **Multiple error handling patterns** - Some use try-catch, some use Result types, some use AppError
2. **Inconsistent error mapping** - Different ways to map errors to responses
3. **Scattered error messages** - Messages in multiple locations
4. **Duplicate error handling code** - Similar patterns in multiple files

**Canonical Ownership Recommendation:**
- **Primary Module:** `lib/errors/` - Core error infrastructure
- **API Errors:** `lib/api/response.ts` - API-specific error handling
- **Client Errors:** `lib/api/fetch-client.ts` - Client-side error handling
- **UI Errors:** `shared/components/error-fallback.tsx` - UI error display

**Consolidation Strategy:**
1. **Standardize on AppError** - All errors should use AppError or Result types
2. **Create error handler utilities**:
   ```typescript
   // lib/errors/handlers.ts
   export function handleServiceError<T>(
       error: unknown,
       operation: string
   ): ServiceResult<T> {
       // Centralized service error handling
   }
   
   export function handleApiError(
       error: unknown,
       options?: ErrorHandlerOptions
   ): Response {
       // Centralized API error handling
   }
   ```
3. **Consolidate error messages** - Use single source (`lib/utils/error-messages.ts`)
4. **Create error mapping utilities** - Centralize error transformation logic

**Impact:**
- Consistent error handling
- Easier debugging
- Better error messages
- Reduced duplication

---

## 4. BUSINESS RULE FRAGMENTATION

### Pattern: Business Rules Split Across Services and Routes

**Violation:** Business rules for the same domain appear in multiple places.

#### Instance 1: Chat Business Rules

**Fragmentation:**
- **Chat creation rules** - `lib/services/chat-service.ts:95-137`
- **Chat validation** - `app/api/chat/handlers/validate-request.ts:115-150`
- **Chat access rules** - `app/api/chat/handlers/validate-request.ts:130-132` (guest restrictions)
- **Chat title rules** - Multiple locations

**Issues:**
- Guest restrictions in route handler, not service
- Title validation in service, but also checked in route
- Access rules scattered

**Canonical Ownership:**
- **Service Layer** - `lib/services/chat-service.ts` should own all business rules
- **Route Handler** - Should only orchestrate, not enforce business rules

**Consolidation Strategy:**
1. Move guest restrictions to service layer
2. Move all validation to service layer
3. Route handler becomes thin orchestrator

#### Instance 2: Document Business Rules

**Fragmentation:**
- **Document validation** - `lib/services/document-service.ts:91-123`
- **Document kind rules** - `app/api/document/route.ts:161-168`
- **Document size rules** - `lib/services/document-service.ts:129-137`
- **Document context rules** - `app/api/document/route.ts:171-185`

**Issues:**
- Kind validation in route, not service
- Context validation in route, not service
- Service exists but route doesn't use it fully

**Canonical Ownership:**
- **Service Layer** - `lib/services/document-service.ts` should own all business rules

**Consolidation Strategy:**
1. Move all validation to `DocumentService`
2. Update route to use service exclusively
3. Service becomes single source of truth

---

## 5. CACHE INVALIDATION FRAGMENTATION

### Pattern: Cache Invalidation Logic Split Across Files

**Fragmentation:**
- **Invalidation functions** - `lib/cache/invalidation.ts:211-232`
- **Invalidation hooks** - `lib/cache/use-invalidation.ts:40-61`
- **Invalidation scopes** - `lib/cache/invalidation.ts:262-266`
- **Cache tags** - `lib/cache/tags.ts` (implied)

**Issues:**
- Invalidation logic in multiple files
- Hook implementation separate from core logic
- Unclear ownership

**Canonical Ownership:**
- **Primary Module:** `lib/cache/invalidation.ts` - Core invalidation logic
- **React Hook:** `lib/cache/use-invalidation.ts` - React-specific wrapper

**Consolidation Strategy:**
1. Keep core logic in `invalidation.ts`
2. Keep React hook as thin wrapper
3. Document clear separation of concerns

---

## 6. REQUEST PARSING FRAGMENTATION

### Pattern: Request Parsing Logic Duplicated Across Routes

**Violation:** Request parsing (JSON, FormData, parameters) is implemented differently in each route.

**Fragmentation:**
- **JSON parsing** - 4+ different implementations (see Phase 1)
- **Parameter extraction** - 3+ different implementations (see Phase 1)
- **FormData parsing** - `app/api/files/upload/route.ts:114-125`

**Canonical Ownership:**
- **Create `lib/api/request-parsers.ts`** module:
  ```typescript
  // lib/api/request-parsers.ts
  export async function parseJsonBody<T>(
       request: Request
   ): Promise<T> {
       // Centralized JSON parsing
   }
   
   export async function parseFormData(
       request: Request
   ): Promise<FormData> {
       // Centralized FormData parsing
   }
   
   export function getSearchParams(
       request: Request,
       params: ParamConfig[]
   ): Record<string, unknown> {
       // Centralized parameter extraction
   }
   ```

**Consolidation Strategy:**
1. Create centralized request parsers
2. Update all routes to use parsers
3. Remove duplicate parsing logic

---

## SUMMARY STATISTICS

| Category | Files Affected | Fragmentation Level | Priority |
|----------|----------------|---------------------|----------|
| Authentication | 8+ | HIGH | HIGH |
| Validation | 10+ | HIGH | HIGH |
| Error Handling | 7+ | MEDIUM | MEDIUM |
| Business Rules | 5+ | MEDIUM | HIGH |
| Cache Invalidation | 3+ | LOW | LOW |
| Request Parsing | 4+ | MEDIUM | MEDIUM |
| **TOTAL** | **37+** | - | - |

---

## CONSOLIDATION PRIORITY

### High Priority (Immediate Impact)
1. **Validation Logic** - Create validation layer (affects 10+ files)
2. **Business Rules** - Move to service layer (affects 5+ routes)
3. **Request Parsing** - Create parser utilities (affects 4+ routes)

### Medium Priority (Quality Improvement)
4. **Authentication** - Clarify API surface (affects 8+ files)
5. **Error Handling** - Standardize patterns (affects 7+ files)

### Low Priority (Nice to Have)
6. **Cache Invalidation** - Already well-structured, minor improvements

---

## CONSOLIDATION PLAN

### Step 1: Create Validation Layer
- [ ] Create `lib/validation/` directory structure
- [ ] Extract all Zod schemas
- [ ] Create parameter validators
- [ ] Create request body validators
- [ ] Create domain validators
- [ ] Update all consumers

### Step 2: Consolidate Business Rules
- [ ] Move guest restrictions to services
- [ ] Move all validation to services
- [ ] Update routes to use services exclusively
- [ ] Remove business logic from routes

### Step 3: Create Request Parser Utilities
- [ ] Create `lib/api/request-parsers.ts`
- [ ] Extract JSON parsing
- [ ] Extract parameter extraction
- [ ] Extract FormData parsing
- [ ] Update all routes

### Step 4: Standardize Error Handling
- [ ] Create error handler utilities
- [ ] Standardize on AppError/Result types
- [ ] Consolidate error messages
- [ ] Update all error handling

### Step 5: Clarify Authentication API
- [ ] Document ownership in `lib/auth/index.ts`
- [ ] Consolidate session-cache into session.ts
- [ ] Create clear API surface

---

## NEXT STEPS

After Phase 4 completion, proceed to:
- **Phase 5:** Poor Code Ordering & Structural Organization
- Continue sequential analysis as per plan.md

---

**Analysis Complete for Phase 4**


