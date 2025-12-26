# Requirements: Codebase Refactoring Project

> **Phase**: 2/5 - Requirements  
> **Input**: [research.md](./research.md)  
> **Created**: 2025-12-26  
> **Status**: 🟢 Approved

---

## Introduction

This specification defines requirements for a comprehensive codebase refactoring project targeting a Next.js AI chatbot application. The project addresses **250+ identified issues** across **150+ files** through a structured 10-wave implementation approach.

**Core Goals:**
1. Eliminate code duplication and reduce LOC by ~2,800 lines
2. Enforce single responsibility principle across all API routes
3. Establish consistent patterns for validation, error handling, and configuration

---

## Glossary

| Term | Definition |
|------|------------|
| Wave | A grouped set of related refactoring tasks with shared dependencies |
| LOC | Lines of Code |
| SRP | Single Responsibility Principle |
| EARS | Easy Approach to Requirements Syntax (WHEN/WHILE/IF-THEN/SHALL) |
| Thin Controller | API route handler with minimal logic, delegating to services |

---

## Functional Requirements

### WAVE 1: Foundation (Priority: P1) 🎯

#### REQ-W1-001: UUID Validation Consolidation (Priority: P1) 🎯

**User Story**: As a developer, I want a single source of truth for UUID validation, so that all UUID checks are consistent and bug-free.

**Why P1**: Contains a CRITICAL BUG (wrong regex in auth-service)

**Depends On**: None

**Independent Test**: Call `isValidUUID()` with valid/invalid UUIDs across all formats

**Verified By**: Unit Test

**Acceptance Criteria** (EARS notation):
1. WHEN a UUID is validated anywhere in the codebase, the System SHALL use `lib/utils/uuid.ts`
2. WHEN an invalid UUID format is provided, the System SHALL reject it consistently
3. IF the UUID regex was incorrect (missing version check), THEN the System SHALL use the corrected pattern `[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`

**Files**: 
- CREATE: `lib/utils/uuid.ts`
- MODIFY: `lib/utils/validation.ts`, `lib/api/route-helpers.ts`, `app/api/vote/route.ts`, `app/api/document/route.ts`, `app/api/files/upload/route.ts`, `app/api/history/route.ts`, `lib/auth/session-service.ts`

**Effort**: 2.5h | **LOC Reduction**: ~35

---

#### REQ-W1-002: Parameter Validation Helpers (Priority: P1)

**User Story**: As a developer, I want unified parameter validation helpers, so that API routes have consistent parameter handling.

**Why P1**: Blocks route refactoring in Wave 2

**Depends On**: REQ-W1-001

**Independent Test**: Call `getUUIDParam()` and `getStringParam()` with various inputs

**Verified By**: Unit Test + Integration Test

**Acceptance Criteria**:
1. WHEN an API route needs a UUID parameter, the System SHALL use `getUUIDParam()`
2. WHEN validation fails, the System SHALL return a standardized error response
3. IF parameter is missing, THEN the System SHALL return 400 Bad Request

**Files**:
- MODIFY: `lib/api/route-helpers.ts`

**Effort**: 3h | **LOC Reduction**: ~135

---

#### REQ-W1-003: JSON Body Parsing Enhancement (Priority: P1)

**User Story**: As a developer, I want enhanced JSON body parsing with Zod support, so that request validation is type-safe.

**Why P1**: Blocks route refactoring in Wave 2

**Depends On**: None

**Independent Test**: Parse JSON bodies with Zod schemas, verify error handling

**Verified By**: Unit Test

**Acceptance Criteria**:
1. WHEN parsing a JSON request body, the System SHALL use `parseJsonBody<T>(request, schema)`
2. WHEN Zod validation fails, the System SHALL return formatted validation errors
3. IF JSON parsing fails, THEN the System SHALL return 400 Bad Request

**Files**:
- MODIFY: `lib/api/route-helpers.ts`

**Effort**: 2h | **LOC Reduction**: ~60

---

#### REQ-W1-004: Service Error Handling Utility (Priority: P1)

**User Story**: As a developer, I want a unified service error handler, so that all services handle errors consistently.

**Why P1**: Eliminates 180 LOC of duplicated error handling

**Depends On**: None

**Independent Test**: Wrap service methods with `handleServiceError()`, verify error transformation

**Verified By**: Unit Test

**Acceptance Criteria**:
1. WHEN a service method throws an error, the System SHALL transform it using `handleServiceError()`
2. WHILE executing service methods, the System SHALL log errors before transformation
3. IF an unknown error occurs, THEN the System SHALL wrap it in a ServiceError

**Files**:
- CREATE: `lib/services/error-handler.ts`
- MODIFY: `lib/services/chat-service.ts`, `lib/services/document-service.ts`, `lib/services/vote-service.ts`

**Effort**: 5h | **LOC Reduction**: ~180

---

### WAVE 2: Route Refactoring (Priority: P1)

#### REQ-W2-001: Vote Route Refactoring (Priority: P1)

**User Story**: As a developer, I want the vote route to be a thin controller, so that it's maintainable and testable.

**Why P1**: 123 lines with 9+ concerns is a maintenance burden

**Depends On**: REQ-W1-003, REQ-W1-004

**Independent Test**: Vote API endpoint works identically before and after refactoring

**Verified By**: Integration Test + E2E Test

**Acceptance Criteria**:
1. WHEN the vote route receives a request, the System SHALL delegate to VoteService
2. WHEN validation is needed, the System SHALL use centralized validators
3. IF any step fails, THEN the System SHALL use unified error handling
4. WHILE processing, the route handler SHALL remain under 50 lines

**Files**:
- MODIFY: `app/api/vote/route.ts` (123 → ~28 lines)
- MODIFY: `lib/services/vote-service.ts`

**Effort**: 6h | **LOC Reduction**: ~95

---

#### REQ-W2-002: Document Route Refactoring (Priority: P1)

**User Story**: As a developer, I want the document route to be a thin controller, so that business logic is in the service layer.

**Why P1**: 108 lines with 8+ concerns violates SRP

**Depends On**: REQ-W1-002, REQ-W1-003, REQ-W1-004

**Independent Test**: Document API endpoint works identically before and after

**Verified By**: Integration Test + E2E Test

**Acceptance Criteria**:
1. WHEN the document route receives a request, the System SHALL delegate to DocumentService
2. WHEN ownership verification is needed, the System SHALL use `verifyOwnership()`
3. WHILE processing, the route handler SHALL remain under 50 lines

**Files**:
- MODIFY: `app/api/document/route.ts` (108 → ~25 lines)

**Effort**: 6h | **LOC Reduction**: ~83

---

#### REQ-W2-003: File Upload Route Refactoring (Priority: P1)

**User Story**: As a developer, I want a FileService to handle uploads, so that the route is a thin controller.

**Why P1**: 102 lines mixing validation, auth, file handling

**Depends On**: REQ-W1-004

**Independent Test**: File upload works identically before and after

**Verified By**: Integration Test

**Acceptance Criteria**:
1. WHEN a file is uploaded, the System SHALL delegate to FileService
2. WHEN file validation fails, the System SHALL return appropriate errors
3. WHILE processing, the route handler SHALL remain under 50 lines

**Files**:
- CREATE: `lib/services/file-service.ts`
- MODIFY: `app/api/files/upload/route.ts` (102 → ~35 lines)

**Effort**: 5h | **LOC Reduction**: ~67

---

#### REQ-W2-004: API Error Handler Consolidation (Priority: P1)

**User Story**: As a developer, I want a single API error handler, so that duplicate handlers are eliminated.

**Why P1**: Two overlapping handlers cause confusion

**Depends On**: None

**Independent Test**: All API errors handled consistently

**Verified By**: Unit Test

**Acceptance Criteria**:
1. WHEN an API error occurs, the System SHALL use `handleApiError()` from `lib/api/route-helpers.ts`
2. IF duplicate handlers exist, THEN they SHALL be consolidated

**Files**:
- MODIFY: `lib/api/route-helpers.ts`
- DELETE/MODIFY: `lib/errors/api-error-handler.ts`

**Effort**: 2h | **LOC Reduction**: ~35

---

### WAVE 3: Validation Layer (Priority: P1)

#### REQ-W3-001: Centralized Validation Module (Priority: P1)

**User Story**: As a developer, I want all validation schemas in one place, so that validation is consistent.

**Why P1**: 4 different validation patterns cause inconsistency

**Depends On**: REQ-W1-001, REQ-W1-002, REQ-W1-003

**Independent Test**: Import any schema from `lib/validation/`

**Verified By**: Unit Test

**Acceptance Criteria**:
1. WHEN validation is needed, the System SHALL use schemas from `lib/validation/`
2. WHEN a new schema is created, it SHALL be added to the validation module
3. IF custom validators exist elsewhere, THEN they SHALL be migrated

**Files**:
- CREATE: `lib/validation/index.ts`, `lib/validation/schemas/`
- MODIFY: Multiple files using inline validation

**Effort**: 14h | **LOC Reduction**: ~400

---

#### REQ-W3-002: Business Rules Consolidation (Priority: P1)

**User Story**: As a developer, I want business rules in the service layer, so that routes are thin.

**Why P1**: Business rules scattered across routes

**Depends On**: REQ-W3-001

**Independent Test**: Business logic accessible only via services

**Verified By**: Code Review + Integration Test

**Acceptance Criteria**:
1. WHEN business rules are applied, the System SHALL call service methods
2. IF business rules exist in routes, THEN they SHALL be moved to services

**Files**:
- MODIFY: `lib/services/*.ts`, `app/api/*/route.ts`

**Effort**: 6h | **LOC Reduction**: ~100

---

#### REQ-W3-003: Authentication Entry Point Reduction (Priority: P1)

**User Story**: As a developer, I want 2-3 auth entry points, so that auth flow is predictable.

**Why P1**: 6 different auth entry points cause confusion

**Depends On**: REQ-W3-001

**Independent Test**: All auth flows work via unified API

**Verified By**: Integration Test

**Acceptance Criteria**:
1. WHEN authentication is needed, the System SHALL use `requireAuth()` or `getOptionalAuth()`
2. IF more than 3 auth entry points exist, THEN they SHALL be consolidated

**Files**:
- MODIFY: `lib/auth/index.ts`, multiple API routes

**Effort**: 4h | **LOC Reduction**: ~150

---

### WAVE 4: Dead Code Cleanup (Priority: P2)

#### REQ-W4-001: Deprecated Component Removal (Priority: P2)

**User Story**: As a developer, I want deprecated components removed, so that the codebase is clean.

**Why P2**: Important but not blocking other work

**Depends On**: None

**Independent Test**: Application works without deprecated components

**Verified By**: E2E Test

**Acceptance Criteria**:
1. WHEN DataStreamHandler is used, the System SHALL be migrated to `useDataStreamHandler` hook
2. WHEN SessionManager is used, it SHALL be replaced with direct function calls
3. IF deprecated code remains, THEN it SHALL be marked for removal

**Files**:
- DELETE: `features/chat/components/data-stream-handler.tsx`
- DELETE: `lib/auth/session-manager.ts`
- DELETE: `features/chat/hooks/use-invalidation-handler.ts`
- MODIFY: `lib/utils/date.ts` (remove `toUnixTimestamp`)

**Effort**: 6.5h | **LOC Reduction**: ~174

---

#### REQ-W4-002: Compatibility Layer Removal (Priority: P2)

**User Story**: As a developer, I want the messages.ts compatibility layer removed, so that error messages come from one source.

**Why P2**: Duplicate error message definitions

**Depends On**: None

**Independent Test**: All error messages work via AppError

**Verified By**: Unit Test

**Acceptance Criteria**:
1. WHEN `getFriendlyError()` is needed, the System SHALL use it from `lib/errors/`
2. IF `messages.ts` duplicates functionality, THEN it SHALL be consolidated

**Files**:
- MODIFY: `lib/errors/messages.ts`, `lib/errors/app-error.ts`

**Effort**: 3h | **LOC Reduction**: ~80

---

### WAVE 5: Pattern Standardization (Priority: P2)

#### REQ-W5-001: Unified Result Type (Priority: P2)

**User Story**: As a developer, I want one Result type, so that all operations return consistent shapes.

**Why P2**: 5 different Result types cause confusion

**Depends On**: REQ-W1-004

**Independent Test**: All services return `Result<T, E>`

**Verified By**: TypeScript compilation

**Acceptance Criteria**:
1. WHEN a service returns a result, the System SHALL use `Result<T, E>`
2. IF other result types exist, THEN they SHALL extend or be replaced by Result

**Files**:
- CREATE: `lib/types/result.ts`
- MODIFY: All service files

**Effort**: 6h | **LOC Reduction**: ~80

---

#### REQ-W5-002: Environment Variable Migration (Priority: P2)

**User Story**: As a developer, I want all env access via the env module, so that configuration is validated.

**Why P2**: 265 direct process.env accesses bypass validation

**Depends On**: None

**Independent Test**: No direct `process.env` in codebase (except env module)

**Verified By**: Grep search + Code Review

**Acceptance Criteria**:
1. WHEN environment variables are accessed, the System SHALL use the `env` module
2. IF direct `process.env` access exists, THEN it SHALL be migrated
3. WHILE accessing env vars, the System SHALL benefit from type safety

**Files**:
- MODIFY: 47 files with 265 instances

**Effort**: 12h | **LOC Reduction**: ~200 (changes, not reduction)

---

### WAVE 6: Guards & Authorization (Priority: P2)

#### REQ-W6-001: Guard Standardization (Priority: P2)

**User Story**: As a developer, I want consistent guard usage, so that authorization is predictable.

**Why P2**: Inconsistent guest checks and ownership verification

**Depends On**: None

**Independent Test**: All routes use same guard patterns

**Verified By**: Code Review

**Acceptance Criteria**:
1. WHEN guest restrictions are needed, the System SHALL use `requireRegularUser()`
2. WHEN ownership is verified, the System SHALL use `verifyOwnership()`
3. WHILE processing, guards SHALL be applied in consistent order

**Files**:
- MODIFY: `app/api/vote/route.ts`, `app/api/document/route.ts`, `lib/api/route-helpers.ts`

**Effort**: 7.5h | **LOC Reduction**: ~55

---

### WAVE 7: Code Quality (Priority: P3)

#### REQ-W7-001: Comment Cleanup (Priority: P3)

**User Story**: As a developer, I want meaningful comments only, so that code is self-documenting.

**Why P3**: Nice to have, not critical

**Depends On**: None

**Independent Test**: No redundant comments remain

**Verified By**: Code Review

**Acceptance Criteria**:
1. WHEN a comment repeats code, it SHALL be removed
2. IF a comment adds value, THEN it SHALL be kept

**Files**:
- MODIFY: `app/api/document/route.ts`, `app/api/vote/route.ts`, `lib/ai/prompts.ts`

**Effort**: 1.5h | **LOC Reduction**: ~15

---

#### REQ-W7-002: Naming Consistency (Priority: P3)

**User Story**: As a developer, I want consistent naming conventions, so that code is readable.

**Why P3**: Nice to have

**Depends On**: None

**Independent Test**: Naming follows conventions

**Verified By**: Code Review

**Acceptance Criteria**:
1. WHEN services are named, the System SHALL use PascalCase (e.g., `ErrorService`)
2. WHEN constants are named, the System SHALL use SCREAMING_SNAKE_CASE

**Files**:
- MODIFY: `lib/services/error-logger-service.ts`, `lib/services/chat-service.ts`

**Effort**: 3h | **LOC Reduction**: ~15

---

### WAVE 8: Testing & Configuration (Priority: P3)

#### REQ-W8-001: Test Helper Consolidation (Priority: P3)

**User Story**: As a developer, I want unified test helpers, so that tests are DRY.

**Why P3**: Test code quality

**Depends On**: None

**Independent Test**: All tests use shared helpers

**Verified By**: Test execution

**Acceptance Criteria**:
1. WHEN test helpers are needed, the System SHALL use `tests/utils/`
2. IF duplicate helpers exist, THEN they SHALL be consolidated

**Files**:
- MODIFY: `tests/unit/features/sidebar/swr-wrapper.tsx`, `tests/utils/test-utils.tsx`

**Effort**: 5h | **LOC Reduction**: ~150

---

#### REQ-W8-002: Feature Flag Consolidation (Priority: P3)

**User Story**: As a developer, I want feature flags in one place, so that configuration is centralized.

**Why P3**: Configuration quality

**Depends On**: None

**Independent Test**: Feature flags accessible from single source

**Verified By**: Code Review

**Acceptance Criteria**:
1. WHEN feature flags are defined, they SHALL be in `lib/config/feature-flags.ts`
2. IF duplicate definitions exist, THEN they SHALL be consolidated

**Files**:
- MODIFY: `lib/config/feature-flags.ts`, `lib/config/features.ts`

**Effort**: 3h | **LOC Reduction**: ~30

---

### WAVE 9: Performance Optimization (Priority: P3)

#### REQ-W9-001: Cache Hit Utilization (Priority: P3)

**User Story**: As a developer, I want cache hits to be used, so that performance improves.

**Why P3**: Performance optimization

**Depends On**: None

**Independent Test**: Cache data used when available

**Verified By**: Performance Test

**Acceptance Criteria**:
1. WHEN cache hit occurs, the System SHALL use cached data
2. IF cache miss occurs, THEN the System SHALL query database

**Files**:
- MODIFY: `lib/cache/chat-cache.ts`

**Effort**: 3h | **LOC Reduction**: Performance improvement (~10-15%)

---

#### REQ-W9-002: Database Query Optimization (Priority: P3)

**User Story**: As a developer, I want efficient database queries, so that performance improves.

**Why P3**: Performance optimization

**Depends On**: None

**Independent Test**: Queries execute efficiently

**Verified By**: Performance Test

**Acceptance Criteria**:
1. WHEN counting records, the System SHALL use COUNT instead of SELECT *
2. WHEN related data is needed, the System SHALL use JOINs

**Files**:
- MODIFY: Data layer files

**Effort**: 4h | **LOC Reduction**: Performance improvement (~10-15%)

---

### WAVE 10: Systemic Issues (Priority: P3)

#### REQ-W10-001: Architectural Documentation (Priority: P3)

**User Story**: As a developer, I want documented architecture decisions, so that patterns are clear.

**Why P3**: Documentation quality

**Depends On**: All previous waves

**Independent Test**: Documentation exists and is accurate

**Verified By**: Code Review

**Acceptance Criteria**:
1. WHEN architecture decisions are made, they SHALL be documented
2. IF patterns change, THEN documentation SHALL be updated

**Files**:
- CREATE/MODIFY: Architecture documentation

**Effort**: 4h | **LOC Reduction**: None (documentation)

---

## Requirement Dependencies

`mermaid
graph TD
    subgraph Wave1[Wave 1: Foundation]
        W1-001[REQ-W1-001<br/>UUID Validation]
        W1-002[REQ-W1-002<br/>Param Validation]
        W1-003[REQ-W1-003<br/>JSON Parsing]
        W1-004[REQ-W1-004<br/>Error Handler]
    end
    
    subgraph Wave2[Wave 2: Routes]
        W2-001[REQ-W2-001<br/>Vote Route]
        W2-002[REQ-W2-002<br/>Document Route]
        W2-003[REQ-W2-003<br/>File Route]
        W2-004[REQ-W2-004<br/>API Error]
    end
    
    subgraph Wave3[Wave 3: Validation]
        W3-001[REQ-W3-001<br/>Validation Module]
        W3-002[REQ-W3-002<br/>Business Rules]
        W3-003[REQ-W3-003<br/>Auth Entry Points]
    end
    
    W1-001 --> W1-002
    W1-003 --> W2-001
    W1-004 --> W2-001
    W1-002 --> W2-002
    W1-003 --> W2-002
    W1-004 --> W2-002
    W1-004 --> W2-003
    
    W1-001 --> W3-001
    W1-002 --> W3-001
    W1-003 --> W3-001
    W3-001 --> W3-002
    W3-001 --> W3-003
`

---

## Non-Functional Requirements

### Performance

| ID | Requirement | Metric | Target |
|----|-------------|--------|--------|
| NFR-001 | Build time | Duration | No regression |
| NFR-002 | Test suite | Duration | No regression |
| NFR-003 | API response time | P95 latency | No regression |
| NFR-004 | Bundle size | KB | No regression |

### Maintainability

| ID | Requirement | Metric | Target |
|----|-------------|--------|--------|
| NFR-005 | Route handler size | Lines | ≤50 lines |
| NFR-006 | Test coverage | Percentage | ≥70% |
| NFR-007 | LOC reduction | Lines | ≥2,500 |
| NFR-008 | Lint errors | Count | 0 |

### Compatibility

| ID | Requirement | Metric | Target |
|----|-------------|--------|--------|
| NFR-009 | API contracts | Breaking changes | 0 |
| NFR-010 | TypeScript | Compilation | 0 errors |
| NFR-011 | All tests | Pass rate | 100% |

---

## Edge Cases

| ID | Scenario | Expected Behavior | Related REQ |
|----|----------|-------------------|-------------|
| EC-001 | Invalid UUID format | Consistent rejection across all validators | REQ-W1-001 |
| EC-002 | Empty request body | 400 Bad Request with clear message | REQ-W1-003 |
| EC-003 | Service throws unknown error | Wrapped in ServiceError with logging | REQ-W1-004 |
| EC-004 | Concurrent route refactoring | No merge conflicts if phased properly | REQ-W2-* |
| EC-005 | Deprecated code still referenced | Migration before deletion | REQ-W4-* |
| EC-006 | env var missing at runtime | Clear error message from env module | REQ-W5-002 |

---

## Acceptance Criteria Summary by Wave

| Wave | Primary Criteria | Verification |
|------|------------------|--------------|
| 1 | Single UUID validator, unified error handler | Unit Tests |
| 2 | Route handlers ≤50 lines each | Code Review |
| 3 | All validation via `lib/validation/` | Code Review |
| 4 | No deprecated code in production paths | E2E Tests |
| 5 | No direct `process.env` access | Grep Search |
| 6 | Consistent guard usage | Code Review |
| 7 | No redundant comments | Code Review |
| 8 | Unified test helpers | Test Execution |
| 9 | Cache hits utilized | Performance Tests |
| 10 | Documentation complete | Documentation Review |

---

**Requirements Complete** ✅
