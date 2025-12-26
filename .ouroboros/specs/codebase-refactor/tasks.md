# Tasks: Codebase Refactoring Project

> **Phase**: 4/5 - Tasks  
> **Input**: [research.md](./research.md), [requirements.md](./requirements.md), [design.md](./design.md)  
> **Created**: 2025-12-26  
> **Status**: ⬜ Not Started

---

## Progress Summary

| Wave | Tasks | Effort | Status |
|------|-------|--------|--------|
| Wave 1: Foundation | 0/12 | 12.5h | ⬜ |
| Wave 2: Route Refactoring | 0/16 | 23h | ⬜ |
| Wave 3: Validation Layer | 0/14 | 28h | ⬜ |
| Wave 4: Dead Code Cleanup | 0/10 | 9.5h | ⬜ |
| Wave 5: Pattern Standardization | 0/16 | 28h | ⬜ |
| Wave 6: Guards & Authorization | 0/8 | 7.5h | ⬜ |
| Wave 7: Code Quality | 0/10 | 5h | ⬜ |
| Wave 8: Testing & Config | 0/12 | 20h | ⬜ |
| Wave 9: Performance | 0/6 | 7h | ⬜ |
| Wave 10: Systemic Issues | 0/10 | 44h | ⬜ |
| **Total** | **0/114** | **~185h** | **0%** |

### Effort Conversion

| Size | Hours | Count | Subtotal |
|------|-------|-------|----------|
| S | 0.5h | 30 | 15h |
| M | 1.5h | 40 | 60h |
| L | 3h | 25 | 75h |
| XL | 6h | 6 | 36h |
| **Total** | - | **101** | **~185h** |

---

## Wave 1: Foundation (Week 1, Days 1-3)

**Purpose**: Core utilities and critical bug fixes  
**Dependencies**: None  
**Effort**: 12.5h

### T001-T003: UUID Validation [REQ-W1-001]

- [ ] **T001** [P] Create UUID utility module
  - File: `lib/utils/uuid.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: `isValidUUID()`, `requireUUID()`, `uuidSchema` exported

- [ ] **T002** Update validation.ts to use centralized UUID
  - File: `lib/utils/validation.ts`
  - Effort: S (0.5h)
  - Depends: T001
  - Done When: Imports from `uuid.ts`, no duplicate regex

- [ ] **T003** Fix auth-service UUID bug
  - File: `lib/auth/session-service.ts`
  - Effort: S (0.5h)
  - Depends: T001
  - Done When: Uses `isValidUUID()` from uuid.ts, bug fixed

🔍 **CHECKPOINT**: UUID validation centralized - run `pnpm test`

### T004-T006: Parameter Validation [REQ-W1-002]

- [ ] **T004** [P] Add getUUIDParam to route-helpers
  - File: `lib/api/route-helpers.ts`
  - Effort: M (1.5h)
  - Depends: T001
  - Done When: `getUUIDParam()` exported and typed

- [ ] **T005** Add getStringParam helper
  - File: `lib/api/route-helpers.ts`
  - Effort: S (0.5h)
  - Depends: T004
  - Done When: `getStringParam()` exported

- [ ] **T006** Add formatZodErrors helper
  - File: `lib/api/route-helpers.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: `formatZodErrors()` exported

🔍 **CHECKPOINT**: Parameter helpers ready - run `pnpm test`

### T007-T008: JSON Body Parsing [REQ-W1-003]

- [ ] **T007** [P] Enhance parseJsonBody with Zod support
  - File: `lib/api/route-helpers.ts`
  - Effort: M (1.5h)
  - Depends: T006
  - Done When: `parseJsonBody<T>(req, schema)` works with Zod

- [ ] **T008** Write unit tests for parseJsonBody
  - File: `tests/unit/lib/api/route-helpers.test.ts`
  - Effort: M (1.5h)
  - Depends: T007
  - Done When: Tests pass, coverage >90%

### T009-T012: Service Error Handler [REQ-W1-004]

- [ ] **T009** [P] Create error-handler.ts module
  - File: `lib/services/error-handler.ts`
  - Effort: L (3h)
  - Depends: None
  - Done When: `handleServiceOperation()`, `withErrorHandling()` exported

- [ ] **T010** Add error logging to handler
  - File: `lib/services/error-handler.ts`
  - Effort: S (0.5h)
  - Depends: T009
  - Done When: Errors logged before transformation

- [ ] **T011** Write unit tests for error handler
  - File: `tests/unit/lib/services/error-handler.test.ts`
  - Effort: M (1.5h)
  - Depends: T009
  - Done When: Tests pass, coverage >95%

- [ ] **T012** Update ChatService to use error handler
  - File: `lib/services/chat-service.ts`
  - Effort: M (1.5h)
  - Depends: T009
  - Done When: All methods use `handleServiceOperation()`

🔍 **CHECKPOINT**: Wave 1 complete - run full test suite

---

## Wave 2: Route Refactoring (Week 1-2)

**Purpose**: Single responsibility compliance  
**Dependencies**: Wave 1  
**Effort**: 23h

### T013-T016: Vote Route [REQ-W2-001]

- [ ] **T013** [P] Extract vote validation schema
  - File: `lib/validation/schemas/vote.ts`
  - Effort: S (0.5h)
  - Depends: T007
  - Done When: `voteSchema`, `getVoteSchema` exported

- [ ] **T014** Update VoteService for new patterns
  - File: `lib/services/vote-service.ts`
  - Effort: M (1.5h)
  - Depends: T009
  - Done When: Uses `handleServiceOperation()`

- [ ] **T015** [P] Refactor vote route to thin controller
  - File: `app/api/vote/route.ts`
  - Effort: L (3h)
  - Depends: T013, T014
  - Done When: Route handler ≤50 lines

- [ ] **T016** Write integration tests for vote API
  - File: `tests/integration/api/vote.test.ts`
  - Effort: M (1.5h)
  - Depends: T015
  - Done When: All vote endpoints tested

🔍 **CHECKPOINT**: Vote route refactored - E2E tests pass

### T017-T020: Document Route [REQ-W2-002]

- [ ] **T017** [P] Extract document validation schema
  - File: `lib/validation/schemas/document.ts`
  - Effort: S (0.5h)
  - Depends: T007
  - Done When: Document schemas exported

- [ ] **T018** Update DocumentService for new patterns
  - File: `lib/services/document-service.ts`
  - Effort: M (1.5h)
  - Depends: T009
  - Done When: Uses `handleServiceOperation()`

- [ ] **T019** [P] Refactor document route to thin controller
  - File: `app/api/document/route.ts`
  - Effort: L (3h)
  - Depends: T017, T018
  - Done When: Route handler ≤50 lines

- [ ] **T020** Write integration tests for document API
  - File: `tests/integration/api/document.test.ts`
  - Effort: M (1.5h)
  - Depends: T019
  - Done When: All document endpoints tested

🔍 **CHECKPOINT**: Document route refactored - E2E tests pass

### T021-T025: File Upload Route [REQ-W2-003]

- [ ] **T021** [P] Create FileService
  - File: `lib/services/file-service.ts`
  - Effort: L (3h)
  - Depends: T009
  - Done When: File upload logic extracted to service

- [ ] **T022** Extract file validation schema
  - File: `lib/validation/schemas/file.ts`
  - Effort: S (0.5h)
  - Depends: T007
  - Done When: File schemas exported

- [ ] **T023** [P] Refactor file upload route
  - File: `app/api/files/upload/route.ts`
  - Effort: M (1.5h)
  - Depends: T021, T022
  - Done When: Route handler ≤50 lines

- [ ] **T024** Write integration tests for file upload
  - File: `tests/integration/api/files.test.ts`
  - Effort: M (1.5h)
  - Depends: T023
  - Done When: Upload endpoints tested

- [ ] **T025** Remove duplicate file validation
  - Files: Various
  - Effort: S (0.5h)
  - Depends: T022
  - Done When: All use centralized schema

### T026-T028: API Error Handler [REQ-W2-004]

- [ ] **T026** [P] Audit existing error handlers
  - Files: `lib/api/route-helpers.ts`, `lib/errors/api-error-handler.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Overlap documented

- [ ] **T027** Consolidate to single handleApiError
  - File: `lib/api/route-helpers.ts`
  - Effort: M (1.5h)
  - Depends: T026
  - Done When: Single error handler

- [ ] **T028** Update all routes to use consolidated handler
  - Files: All API routes
  - Effort: M (1.5h)
  - Depends: T027
  - Done When: No duplicate handlers used

🔍 **CHECKPOINT**: Wave 2 complete - all routes thin controllers

---

## Wave 3: Validation Layer (Week 2)

**Purpose**: Centralized validation  
**Dependencies**: Wave 1, Wave 2  
**Effort**: 28h

### T029-T035: Validation Module [REQ-W3-001]

- [ ] **T029** [P] Create validation module structure
  - Files: `lib/validation/index.ts`, `lib/validation/schemas/`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Folder structure created

- [ ] **T030** [P] Create common schemas
  - File: `lib/validation/schemas/common.ts`
  - Effort: M (1.5h)
  - Depends: T029
  - Done When: UUID, pagination, timestamp schemas exported

- [ ] **T031** Create chat schemas
  - File: `lib/validation/schemas/chat.ts`
  - Effort: M (1.5h)
  - Depends: T030
  - Done When: Chat-related schemas exported

- [ ] **T032** Migrate inline validation to schemas
  - Files: Multiple API routes
  - Effort: XL (6h)
  - Depends: T030, T031
  - Done When: No inline validation in routes

- [ ] **T033** Remove duplicate validators
  - Files: `lib/utils/validation.ts`, `features/documents/schemas.ts`
  - Effort: M (1.5h)
  - Depends: T032
  - Done When: Single source of truth

- [ ] **T034** Write unit tests for all schemas
  - Files: `tests/unit/lib/validation/*.test.ts`
  - Effort: L (3h)
  - Depends: T030, T031
  - Done When: Coverage >95%

- [ ] **T035** Update barrel exports
  - File: `lib/validation/index.ts`
  - Effort: S (0.5h)
  - Depends: T033
  - Done When: All schemas exported

### T036-T038: Business Rules [REQ-W3-002]

- [ ] **T036** [P] Audit business rules in routes
  - Files: All API routes
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Business rules documented

- [ ] **T037** Move business rules to services
  - Files: Services and routes
  - Effort: L (3h)
  - Depends: T036
  - Done When: Routes only call services

- [ ] **T038** Write tests for business rules
  - Files: Service test files
  - Effort: M (1.5h)
  - Depends: T037
  - Done When: Business rules tested in isolation

### T039-T042: Auth Entry Points [REQ-W3-003]

- [ ] **T039** [P] Audit auth entry points
  - Files: `lib/auth/`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: 6 entry points documented

- [ ] **T040** Design unified auth API
  - File: `lib/auth/index.ts`
  - Effort: M (1.5h)
  - Depends: T039
  - Done When: 2-3 entry points defined

- [ ] **T041** [P] Implement unified auth API
  - File: `lib/auth/index.ts`
  - Effort: L (3h)
  - Depends: T040
  - Done When: Unified API working

- [ ] **T042** Migrate routes to unified auth
  - Files: All API routes
  - Effort: L (3h)
  - Depends: T041
  - Done When: All routes use unified auth

🔍 **CHECKPOINT**: Wave 3 complete - validation centralized

---

## Wave 4: Dead Code Cleanup (Week 3)

**Purpose**: Remove deprecated code  
**Dependencies**: None  
**Effort**: 9.5h

### T043-T047: Deprecated Components [REQ-W4-001]

- [ ] **T043** [P] Migrate DataStreamHandler usages
  - Files: `app/(chat)/page.tsx`, `app/(chat)/chat/[id]/page.tsx`
  - Effort: L (3h)
  - Depends: None
  - Done When: Using `useDataStreamHandler` hook

- [ ] **T044** Delete DataStreamHandler component
  - File: `features/chat/components/data-stream-handler.tsx`
  - Effort: S (0.5h)
  - Depends: T043
  - Done When: File deleted, exports removed

- [ ] **T045** Replace SessionManager usages
  - Files: `lib/auth/`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Direct function calls used

- [ ] **T046** Delete SessionManager
  - File: `lib/auth/session-manager.ts`
  - Effort: S (0.5h)
  - Depends: T045
  - Done When: File deleted, exports removed

- [ ] **T047** Delete useInvalidationHandler
  - File: `features/chat/hooks/use-invalidation-handler.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: File deleted, exports removed

### T048-T050: Compatibility Layer [REQ-W4-002]

- [ ] **T048** [P] Audit messages.ts usage
  - Files: `lib/errors/`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Usages documented

- [ ] **T049** Update AppError to use getFriendlyError
  - File: `lib/errors/app-error.ts`
  - Effort: M (1.5h)
  - Depends: T048
  - Done When: Direct usage

- [ ] **T050** Remove toUnixTimestamp
  - File: `lib/utils/date.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Function removed, tests pass

🔍 **CHECKPOINT**: Wave 4 complete - no deprecated code

---

## Wave 5: Pattern Standardization (Week 3)

**Purpose**: Consistent patterns  
**Dependencies**: Wave 1  
**Effort**: 28h

### T051-T055: Result Types [REQ-W5-001]

- [ ] **T051** [P] Create unified Result type
  - File: `lib/types/result.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Result<T,E> exported

- [ ] **T052** Add type guards and helpers
  - File: `lib/types/result.ts`
  - Effort: S (0.5h)
  - Depends: T051
  - Done When: `isSuccess`, `isFailure`, `ok`, `err` exported

- [ ] **T053** Migrate ServiceResult usages
  - Files: All services
  - Effort: L (3h)
  - Depends: T051
  - Done When: Services use unified Result

- [ ] **T054** Migrate StorageResult usages
  - Files: `lib/cache/`
  - Effort: M (1.5h)
  - Depends: T051
  - Done When: Cache uses unified Result

- [ ] **T055** Remove old Result types
  - Files: Various
  - Effort: S (0.5h)
  - Depends: T053, T054
  - Done When: Single Result type

### T056-T060: API Response Types [V2-002]

- [ ] **T056** Audit API response types
  - Files: `lib/types/api.ts`, `lib/api/response.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Duplicates documented

- [ ] **T057** Consolidate to StandardApiResponse
  - File: `lib/types/api.ts`
  - Effort: M (1.5h)
  - Depends: T056
  - Done When: Single type defined

- [ ] **T058** Update consumers
  - Files: API routes
  - Effort: M (1.5h)
  - Depends: T057
  - Done When: All use StandardApiResponse

### T059-T066: Environment Variables [REQ-W5-002]

- [ ] **T059** [P] Audit process.env usages
  - Files: 47 files
  - Effort: M (1.5h)
  - Depends: None
  - Done When: 265 instances documented

- [ ] **T060** Create migration plan by file
  - Doc: Migration tracking document
  - Effort: M (1.5h)
  - Depends: T059
  - Done When: Plan created

- [ ] **T061** Migrate lib/ files
  - Files: `lib/**/*.ts`
  - Effort: L (3h)
  - Depends: T060
  - Done When: lib/ uses env module

- [ ] **T062** Migrate app/ files
  - Files: `app/**/*.ts`
  - Effort: L (3h)
  - Depends: T060
  - Done When: app/ uses env module

- [ ] **T063** Migrate features/ files
  - Files: `features/**/*.ts`
  - Effort: M (1.5h)
  - Depends: T060
  - Done When: features/ uses env module

- [ ] **T064** Migrate config files
  - Files: Config files
  - Effort: M (1.5h)
  - Depends: T060
  - Done When: Configs use env module

- [ ] **T065** Add isDevelopment/isProduction helpers
  - File: `lib/config/env.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Helpers exported

- [ ] **T066** Run grep to verify no direct access
  - Command: `grep -r "process.env"`
  - Effort: S (0.5h)
  - Depends: T061-T064
  - Done When: Only env module uses process.env

🔍 **CHECKPOINT**: Wave 5 complete - patterns standardized

---

## Wave 6: Guards & Authorization (Week 4)

**Purpose**: Consistent guards  
**Dependencies**: None  
**Effort**: 7.5h

### T067-T074: Guard Standardization [REQ-W6-001]

- [ ] **T067** [P] Audit guard usage patterns
  - Files: All API routes
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Patterns documented

- [ ] **T068** Standardize guest checks
  - Files: Routes using guest checks
  - Effort: M (1.5h)
  - Depends: T067
  - Done When: All use `requireRegularUser()`

- [ ] **T069** Standardize ownership checks
  - Files: Routes with ownership
  - Effort: M (1.5h)
  - Depends: T067
  - Done When: All use `verifyOwnership()`

- [ ] **T070** Define guard ordering standard
  - Doc: Guard ordering documentation
  - Effort: S (0.5h)
  - Depends: T068, T069
  - Done When: Standard documented

- [ ] **T071** Apply guard ordering to routes
  - Files: All API routes
  - Effort: M (1.5h)
  - Depends: T070
  - Done When: Consistent ordering

- [ ] **T072** Fix race condition in mutations [V2-012]
  - File: `features/documents/hooks/use-document-mutations.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Uses functional update

- [ ] **T073** Write guard tests
  - File: `tests/unit/lib/api/guards.test.ts`
  - Effort: M (1.5h)
  - Depends: T068, T069
  - Done When: Guards tested

- [ ] **T074** Document guard patterns
  - File: Architecture documentation
  - Effort: S (0.5h)
  - Depends: T070
  - Done When: Documentation updated

🔍 **CHECKPOINT**: Wave 6 complete - guards consistent

---

## Wave 7: Code Quality (Week 4)

**Purpose**: Comments and naming  
**Dependencies**: None  
**Effort**: 5h

### T075-T084: Quality Improvements [REQ-W7-001, REQ-W7-002]

- [ ] **T075** Remove redundant comments
  - Files: `app/api/document/route.ts`, `app/api/vote/route.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Redundant comments removed

- [ ] **T076** Improve low-value comments
  - Files: `lib/ai/prompts.ts`, `next.config.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Comments improved or removed

- [ ] **T077** Rename errorLogger to ErrorService
  - File: `lib/services/error-logger-service.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Renamed, imports updated

- [ ] **T078** Extract magic numbers to constants
  - File: `lib/services/chat-service.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: `MAX_TITLE_PREVIEW_LENGTH` etc defined

- [ ] **T079** Fix Zustand manual field copying [V2-013]
  - File: `features/settings/store.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Uses spread operator

- [ ] **T080** Configure import ordering
  - File: `biome.jsonc`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Auto-sorting configured

- [ ] **T081** Add export section headers
  - File: `lib/utils/index.ts`
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Section comments added

- [ ] **T082** Fix variable naming inconsistencies
  - Files: Various
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Consistent naming

- [ ] **T083** Fix function naming inconsistencies
  - Files: Various
  - Effort: S (0.5h)
  - Depends: None
  - Done When: Consistent naming

- [ ] **T084** Run biome format
  - Command: `pnpm lint:fix`
  - Effort: S (0.5h)
  - Depends: T080
  - Done When: No formatting errors

🔍 **CHECKPOINT**: Wave 7 complete - code quality improved

---

## Wave 8: Testing & Config (Week 4-5)

**Purpose**: Testing and configuration  
**Dependencies**: Waves 1-7  
**Effort**: 20h

### T085-T096: Test & Config Improvements [REQ-W8-001, REQ-W8-002]

- [ ] **T085** [P] Consolidate test helpers
  - Files: `tests/unit/features/sidebar/swr-wrapper.tsx`, `tests/utils/test-utils.tsx`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Single implementation

- [ ] **T086** Extract Redis mock setup [V2-022]
  - Files: Integration tests → `tests/utils/mocks/redis.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Mock reusable

- [ ] **T087** Extract session mock setup [V2-023]
  - Files: API tests → `tests/utils/mocks/session.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Mock reusable

- [ ] **T088** Consolidate feature flags [V2-016]
  - Files: `lib/config/feature-flags.ts`, `lib/config/features.ts`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Single source of truth

- [ ] **T089** Add missing validation tests
  - Files: `tests/unit/lib/validation/`
  - Effort: L (3h)
  - Depends: Wave 3
  - Done When: Coverage >90%

- [ ] **T090** Add missing error handler tests
  - Files: `tests/unit/lib/errors/`
  - Effort: M (1.5h)
  - Depends: Wave 1
  - Done When: Coverage >90%

- [ ] **T091** Add missing cache tests
  - Files: `tests/unit/lib/cache/`
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Coverage >80%

- [ ] **T092** Run full test suite
  - Command: `pnpm test`
  - Effort: S (0.5h)
  - Depends: All previous
  - Done When: All tests pass

- [ ] **T093** Run E2E tests
  - Command: `pnpm test:e2e`
  - Effort: S (0.5h)
  - Depends: T092
  - Done When: All E2E pass

- [ ] **T094** Generate coverage report
  - Command: `pnpm test:coverage`
  - Effort: S (0.5h)
  - Depends: T092
  - Done When: Coverage ≥70%

- [ ] **T095** Update documentation
  - Files: README, architecture docs
  - Effort: L (3h)
  - Depends: All previous
  - Done When: Docs current

- [ ] **T096** Create PR with all changes
  - Git: Feature branch → main
  - Effort: M (1.5h)
  - Depends: T095
  - Done When: PR ready for review

🔍 **CHECKPOINT**: Wave 8 complete - tests pass, docs updated

---

## Wave 9: Performance (Week 5)

**Purpose**: Performance optimization  
**Dependencies**: None  
**Effort**: 7h

### T097-T102: Performance Improvements [REQ-W9-001, REQ-W9-002]

- [ ] **T097** [P] Fix cache hit utilization [V2-011]
  - File: `lib/cache/chat-cache.ts`
  - Effort: L (3h)
  - Depends: None
  - Done When: Cache data used when available

- [ ] **T098** Optimize COUNT queries [V2-014]
  - Files: Data layer files
  - Effort: M (1.5h)
  - Depends: None
  - Done When: COUNT instead of SELECT *

- [ ] **T099** Optimize JOINs
  - Files: Data layer files
  - Effort: M (1.5h)
  - Depends: None
  - Done When: JOINs instead of multiple queries

- [ ] **T100** Add memoization for repeated transforms
  - Files: Cache and service files
  - Effort: M (1.5h)
  - Depends: None
  - Done When: Transforms memoized

- [ ] **T101** Run performance benchmarks
  - Tests: Load tests
  - Effort: M (1.5h)
  - Depends: T097-T100
  - Done When: No regression, improvement documented

- [ ] **T102** Document performance improvements
  - File: Performance documentation
  - Effort: S (0.5h)
  - Depends: T101
  - Done When: Improvements documented

🔍 **CHECKPOINT**: Wave 9 complete - performance optimized

---

## Wave 10: Systemic Issues (Week 6-7)

**Purpose**: Architectural improvements  
**Dependencies**: All previous waves  
**Effort**: 44h

### T103-T112: Systemic Improvements

- [ ] **T103** [P] Enforce layered architecture
  - Files: Routes and services
  - Effort: XL (6h)
  - Depends: Waves 1-3
  - Done When: Routes only call services

- [ ] **T104** Document error handling strategy
  - File: Architecture documentation
  - Effort: L (3h)
  - Depends: Wave 1
  - Done When: Strategy documented

- [ ] **T105** Document configuration strategy
  - File: Architecture documentation
  - Effort: L (3h)
  - Depends: Wave 5
  - Done When: Strategy documented

- [ ] **T106** Add shared utility tests
  - Files: `tests/unit/lib/utils/`
  - Effort: XL (6h)
  - Depends: None
  - Done When: Utils fully tested

- [ ] **T107** Complete JSDoc coverage
  - Files: Public APIs
  - Effort: L (3h)
  - Depends: None
  - Done When: >90% JSDoc coverage

- [ ] **T108** Add cache monitoring
  - File: `lib/cache/monitoring.ts`
  - Effort: L (3h)
  - Depends: None
  - Done When: Hit/miss tracking

- [ ] **T109** State management improvements
  - Files: Zustand stores
  - Effort: XL (6h)
  - Depends: None
  - Done When: SM issues addressed

- [ ] **T110** Bundle optimization
  - Files: Build configuration
  - Effort: L (3h)
  - Depends: None
  - Done When: Tree-shaking optimized

- [ ] **T111** Final architecture review
  - Meeting: Team review
  - Effort: XL (6h)
  - Depends: All previous
  - Done When: Architecture approved

- [ ] **T112** Final documentation pass
  - Files: All documentation
  - Effort: L (3h)
  - Depends: T111
  - Done When: Docs complete and reviewed

🔍 **CHECKPOINT**: Wave 10 complete - project complete

---

## Task Dependencies Graph

`
Wave 1 (Foundation)
├── T001 UUID Module
│   ├── T002 Update validation.ts
│   ├── T003 Fix auth-service bug
│   └── T004 getUUIDParam
│       └── T005 getStringParam
├── T006 formatZodErrors
│   └── T007 parseJsonBody
│       └── T008 Tests
└── T009 Error Handler
    ├── T010 Add logging
    ├── T011 Tests
    └── T012 Update ChatService

Wave 2 (Routes) - Depends on Wave 1
├── T013-T016 Vote Route
├── T017-T020 Document Route
├── T021-T025 File Upload Route
└── T026-T028 API Error Handler

Wave 3 (Validation) - Depends on Wave 1, 2
├── T029-T035 Validation Module
├── T036-T038 Business Rules
└── T039-T042 Auth Entry Points

Wave 4 (Dead Code) - Independent
├── T043-T047 Deprecated Components
└── T048-T050 Compatibility Layer

Wave 5 (Patterns) - Depends on Wave 1
├── T051-T055 Result Types
├── T056-T058 API Response Types
└── T059-T066 Environment Variables

Waves 6-10 - As documented above
`

---

## Risk Mitigation

| Task | Risk | Mitigation |
|------|------|------------|
| T015, T019, T023 | Route changes break API | Integration tests first |
| T043 | DataStreamHandler migration | Gradual rollout |
| T061-T064 | env migration scope | File-by-file migration |
| T097 | Cache changes | Performance benchmarks |

---

## Acceptance Criteria per Wave

| Wave | Primary Criteria | Verification |
|------|------------------|--------------|
| 1 | Foundation utilities working | `pnpm test` passes |
| 2 | Routes ≤50 lines | Code review |
| 3 | All validation via `lib/validation/` | Grep search |
| 4 | No deprecated code | File deletion confirmed |
| 5 | No direct `process.env` | Grep search |
| 6 | Consistent guard usage | Code review |
| 7 | Clean code metrics | Linting passes |
| 8 | Full test coverage | Coverage report |
| 9 | Performance improved | Benchmarks |
| 10 | Architecture documented | Review meeting |

---

**Tasks Complete** ✅
