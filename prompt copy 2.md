_Full Application Implementation Following Architectural Overhaul Plan_

Implement the complete Next.js 16.1.0 application with Turbopack, strictly adhering to the architectural overhaul plan. This is a _full greenfield implementation_ with complete feature parity at the user level.

_Old Codebase Reference:_

- The original application code has been moved to the oldapp/ folder
- _Use as reference ONLY_ - to understand business logic, requirements, and existing functionality
- _Extract logic and requirements_, not structure or patterns
- _DO NOT copy architecture or patterns_ from the old code
- _ALWAYS implement following the new architectural plan_, even when referencing old code

_Core Implementation Principles:_

1. _Strict Architecture Adherence_

   - Follow the FINAL-ARCHITECTURE-OVERHAUL-PLAN.md exactly as specified
   - Implement the exact directory structure and module organization defined
   - Respect all server/client/edge runtime boundaries as designed
   - Maintain the dependency graph and separation of concerns as planned

2. _Full Feature Parity_

   - _User-facing functionality must be identical_ to the original application
   - All features, workflows, and user interactions must work exactly as before
   - UI/UX should match or improve upon the original
   - _Internal implementation can be completely different_ - restructure freely as per the optimal design

3. _Zero-Error Implementation_

   - Code must be _error-free_ - no runtime errors, type errors, or build errors
   - All TypeScript types must be correct and strict
   - All imports and exports must resolve correctly
   - No ESLint/build warnings
   - Proper error handling throughout

4. _Optimal & Simple Code_

   - Implement the _simplest solution_ that meets requirements
   - Avoid over-engineering or unnecessary abstractions
   - Use Next.js 16 native features over custom solutions
   - Keep code clean, readable, and maintainable
   - No premature optimization - focus on clarity first

5. _Comprehensive Testing_

   - Write tests for all functionality
   - Unit tests for business logic and utilities
   - Integration tests for features and workflows
   - End-to-end tests for critical user journeys
   - Test coverage should be comprehensive

6. _Detailed Progress Tracking_
   - Maintain multiple levels of tracking
   - Update trackers in real-time as work progresses
   - Track blockers, dependencies, and completion status
   - Enable visibility into implementation progress at all times

---

_PROGRESS TRACKING SYSTEM (MANDATORY):_

**Master Progress Tracker: MASTER-PROGRESS-TRACKER.md**

This is the _central source of truth_ for implementation progress. Update this _continuously_.

_Required Structure:_
markdown

# Master Progress Tracker

**Last Updated:** [Timestamp]
**Overall Progress:** XX% Complete
**Current Phase:** [Phase 1/2/3]
**Current Focus:** [What you're working on now]

## Summary Dashboard

- ✅ Completed: X features
- 🔄 In Progress: Y features
- ⏳ Not Started: Z features
- 🚫 Blocked: N features
- ⚠ Issues: M items

## Phase Progress

### Phase 1: Setup & Foundation [XX%]

- ✅ Project structure
- ✅ Shared infrastructure
- 🔄 Foundation layer
- ⏳ Documentation

### Phase 2: Feature Implementation [XX%]

- [List all features with status icons]

### Phase 3: Integration & Polish [XX%]

- [List all integration tasks]

## Detailed Feature Status

[For each feature/module:]

### [Feature Name] - [Status Icon] [XX%]

- **Module File:** `XX-feature-name-optimal-design.md`
- **Progress Tracker:** `progress/XX-feature-name-progress.md`
- **Status:** [Not Started/In Progress/Testing/Completed/Blocked]
- **Progress:** XX% complete
- **Current Step:** [What's being worked on]
- **Started:** [Date/Time]
- **Completed:** [Date/Time or TBD]
- **Dependencies:** [List any blockers or prerequisites]
- **Issues:** [Any problems encountered]
- **Test Status:** [Not Started/In Progress/Passing/Failed]
- **Notes:** [Brief status update]

## Recent Activity Log

[Last 10-20 updates, most recent first:]

- **[Timestamp]** - Completed authentication server actions
- **[Timestamp]** - Started user dashboard client components
- **[Timestamp]** - Resolved TypeScript errors in data layer

## Blockers & Issues

[Active blockers requiring attention:]

- **[Issue ID]** - [Description] - [Priority: High/Medium/Low]

## Next Steps

[Immediate next actions:]

1. [Next task]
2. [Following task]
3. [Upcoming task]

## Testing Progress

- Unit Tests: XXX/YYY passing
- Integration Tests: XXX/YYY passing
- E2E Tests: XXX/YYY passing
- Coverage: XX%

_Update Frequency:_ After EVERY significant step (file created, component completed, test written, etc.)

---

**Per-Feature Progress Trackers: progress/[XX]-[feature-name]-progress.md**

Create a detailed tracker for EACH feature/module being implemented.

_Required Structure:_
markdown

# [Feature Name] Implementation Progress

**Last Updated:** [Timestamp]
**Overall Progress:** XX% Complete
**Status:** [Not Started/In Progress/Testing/Completed/Blocked]
**Started:** [Date/Time]
**Target Completion:** [Date/Time]
**Actual Completion:** [Date/Time or TBD]

## Quick Status

- ✅ Data Layer: 100%
- 🔄 Business Logic: 60%
- ⏳ Server Components: 0%
- ⏳ Client Components: 0%
- ⏳ Testing: 0%

## Implementation Checklist

### Step 1: Data Layer [XX%]

- [ ] Database schemas/models
  - ✅ User model
  - 🔄 Session model
  - ⏳ Token model
- [ ] Data access functions
  - ✅ createUser()
  - ✅ findUserByEmail()
  - ⏳ updateUser()
- [ ] Server actions
  - 🔄 loginAction()
  - ⏳ logoutAction()
- [ ] API routes
  - ✅ /api/auth/login
  - ⏳ /api/auth/refresh

**Progress Notes:**

- [Timestamp] - Completed user model with all validations
- [Timestamp] - Started session model, referencing oldapp/models/session.ts

### Step 2: Business Logic [XX%]

- [ ] Core logic functions
- [ ] Validation logic
- [ ] Transformations
- [ ] Utilities

**Progress Notes:**
[Detailed notes for this step]

### Step 3: Server Components [XX%]

- [ ] Page components
- [ ] Layouts
- [ ] Data fetching

**Progress Notes:**
[Detailed notes]

### Step 4: Client Components [XX%]

- [ ] Interactive components
- [ ] State management
- [ ] Event handlers

**Progress Notes:**
[Detailed notes]

### Step 5: Testing [XX%]

- [ ] Unit tests written
- [ ] Integration tests written
- [ ] E2E tests written
- [ ] All tests passing

**Progress Notes:**
[Detailed notes]

## Files Created

- ✅ `src/features/auth/models/user.ts`
- ✅ `src/features/auth/actions/login.ts`
- 🔄 `src/features/auth/actions/logout.ts`
- ⏳ `src/features/auth/components/login-form.tsx`

## Files Referenced from OldApp

- `oldapp/src/auth/models.ts` - Extracted user validation rules
- `oldapp/src/lib/jwt.ts` - Extracted token expiry logic (30min)
- `oldapp/src/components/LoginForm.tsx` - Extracted form field requirements

## Dependencies & Blockers

- ✅ Requires auth infrastructure (completed)
- 🔄 Waiting for email service setup
- ⏳ Needs database migrations

## Issues Encountered

1. **[Timestamp]** - TypeScript error in session validation
   - **Resolution:** Fixed by updating interface
2. **[Timestamp]** - Server action not receiving form data
   - **Resolution:** Added proper FormData parsing

## Testing Status

- Unit Tests: 5/8 passing
- Integration Tests: 0/3 passing
- E2E Tests: Not started
- Coverage: 65%

**Test Failures:**

- `login.test.ts:45` - Invalid token format
  - **Working on:** Fixing token generation logic

## Next Immediate Steps

1. Complete logout server action
2. Implement token refresh logic
3. Write remaining unit tests
4. Start server components

## Time Tracking

- **Estimated:** 8 hours
- **Actual:** 5.5 hours (so far)
- **Remaining:** ~2.5 hours

## Notes & Observations

- JWT validation more complex than expected
- Using next-auth would simplify but sticking to plan
- Performance looks good in initial tests

_Update Frequency:_ After EVERY task completion, test result, or issue encountered

---

**Daily Progress Summary: progress/daily/YYYY-MM-DD-summary.md**

Create a summary at the end of each work session.

_Required Structure:_
markdown

# Daily Progress Summary - [Date]

**Work Session:** [Start Time] - [End Time]
**Total Hours:** X hours
**Overall Project Progress:** XX% → YY%

## Accomplishments Today

1. ✅ Completed authentication data layer
2. ✅ Implemented login server action
3. ✅ Fixed 12 TypeScript errors
4. ✅ Wrote 8 unit tests (all passing)

## Features Worked On

- **Authentication Module** - 40% → 65% complete
- **User Dashboard** - Started, 0% → 15% complete

## Files Created/Modified

- Created: 8 new files
- Modified: 5 existing files
- Deleted: 2 legacy files

## Tests Written

- Unit Tests: +8 (all passing)
- Integration Tests: +0
- E2E Tests: +0

## Issues Resolved

1. Fixed TypeScript error in user model validation
2. Resolved server action form data parsing issue
3. Corrected import paths in auth utilities

## Issues/Blockers Encountered

1. Email service integration unclear - need to review docs
2. Database migration script needs review

## References from OldApp

- Reviewed `oldapp/auth/` folder for validation rules
- Extracted session timeout constants
- Studied JWT implementation patterns

## Tomorrow's Plan

1. Complete authentication testing
2. Start user dashboard server components
3. Implement email service integration
4. Write integration tests for auth flow

## Notes & Learnings

- Next.js 16 Server Actions are cleaner than expected
- Form validation needs careful type checking
- Test coverage tracking is helpful for confidence

---

**Testing Progress Tracker: TEST-PROGRESS-TRACKER.md**

_Required Structure:_
markdown

# Testing Progress Tracker

**Last Updated:** [Timestamp]
**Overall Test Coverage:** XX%
**Tests Passing:** XXX/YYY (XX%)

## Test Suite Summary

- **Unit Tests:** XXX/YYY passing (XX%)
- **Integration Tests:** XXX/YYY passing (XX%)
- **E2E Tests:** XXX/YYY passing (XX%)

## Test Coverage by Module

### Authentication Module

- **Unit Tests:** 12/12 passing ✅
- **Integration Tests:** 3/5 passing 🔄
- **E2E Tests:** 0/2 passing ⏳
- **Coverage:** 85%
- **Files:**
  - `auth/login.test.ts` - ✅ All passing
  - `auth/session.test.ts` - ✅ All passing
  - `auth/integration.test.ts` - 🔄 3/5 passing

### User Dashboard Module

- **Unit Tests:** 0/8 passing ⏳
- **Integration Tests:** Not started
- **E2E Tests:** Not started
- **Coverage:** 0%

[Continue for all modules...]

## Failing Tests

### High Priority

1. **auth/integration.test.ts:67** - Token refresh fails
   - **Error:** Invalid token signature
   - **Status:** Investigating
   - **Assigned:** Current task

### Medium Priority

[List medium priority failures]

### Low Priority

[List low priority failures]

## Test Writing Progress

- [ ] Authentication - 100% ✅
- [ ] User Dashboard - 40% 🔄
- [ ] Settings - 0% ⏳
      [Continue for all modules...]

## Coverage Goals vs Actual

| Module    | Target | Actual | Status         |
| --------- | ------ | ------ | -------------- |
| Auth      | 90%    | 85%    | 🔄 Close       |
| Dashboard | 85%    | 0%     | ⏳ Not started |
| Settings  | 85%    | 0%     | ⏳ Not started |

## Next Testing Tasks

1. Fix failing token refresh test
2. Write dashboard unit tests
3. Add E2E test for login flow
4. Increase auth coverage to 90%

---

_MANDATORY IMPLEMENTATION WORKFLOW:_

_Phase 1: Setup & Foundation_

1. _Initialize tracking system:_

   - Create MASTER-PROGRESS-TRACKER.md
   - Create progress/ directory
   - Create TEST-PROGRESS-TRACKER.md
   - _Update master tracker:_ Mark tracking system as initialized

2. _Initialize the project structure:_

   - Create the complete directory structure from the architectural plan
   - Set up Next.js 16.1.0 with Turbopack configuration
   - Configure TypeScript with strict settings
   - Set up linting and formatting
   - _Update master tracker:_ After each setup step

3. _Set up testing infrastructure:_

   - Install and configure testing libraries (Jest/Vitest, React Testing Library)
   - Set up test file structure
   - Configure test coverage reporting
   - Create test utilities and helpers
   - _Update master tracker and test tracker:_ Mark testing setup complete

4. _Implement shared infrastructure first:_

   - Core utilities and helpers
   - Shared types and interfaces
   - Configuration files
   - Environment setup
   - API client setup
   - Authentication infrastructure
   - Error handling utilities
   - Logging and monitoring setup
   - _Update master tracker:_ After each infrastructure component

5. _Create the foundation layer:_

   - Database schemas/models (if applicable)
   - Core data access layer
   - Shared server actions
   - Shared API routes
   - Core middleware
   - _Update master tracker:_ After each foundation piece

6. _Write foundation tests:_

   - Unit tests for utilities
   - Tests for shared functions
   - Integration tests for core infrastructure
   - _Update test tracker:_ After each test file

7. _Document foundation setup_ in IMPLEMENTATION-LOG.md:
   - What has been set up
   - Key configuration decisions
   - Foundation structure created
   - _Update master tracker:_ Mark Phase 1 complete

---

_Phase 2: Feature-by-Feature Implementation_

Follow the implementation order from 00-MASTER-TASK-LIST.md. For _EACH_ feature/module:

_Pre-Implementation:_

1. _Create feature progress tracker:_

   - Create progress/[XX]-[feature-name]-progress.md
   - Initialize with full checklist structure
   - _Update master tracker:_ Add feature to tracking list

2. _Reference the optimal design:_

   - Open the corresponding [XX]-[feature-name]-optimal-design.md file
   - Understand the complete design specification
   - Review dependencies and interfaces
   - _Update feature tracker:_ Note design reviewed

3. _Reference old code when needed:_
   - Look at oldapp/ folder to understand:
     - _Business logic and rules_ - what the feature actually does
     - _Data models and structures_ - what data is needed
     - _Validation rules_ - what constraints exist
     - _Edge cases_ - what scenarios were handled
     - _API endpoints_ - what external services are called
     - _User workflows_ - how users interact with the feature
   - _Extract requirements and logic ONLY_
   - _DO NOT copy patterns, structure, or implementation approach_
   - _Update feature tracker:_ Document what was referenced from oldapp

---

_Implementation Steps (For Each Feature):_

_Step 1: Data Layer Implementation [if applicable]_

Tasks:

- [ ] Database models/schemas
- [ ] Data access functions
- [ ] Server-side data fetching
- [ ] API routes or server actions

_For EACH task:_

1. Implement the functionality
2. _Update feature tracker:_ Mark task in progress, then completed
3. _Update master tracker:_ Increment feature percentage
4. Reference oldapp/ for data structures, validation rules if needed
5. _Update feature tracker:_ Document oldapp references
6. Write unit tests immediately
7. _Update test tracker:_ Add new tests and status
8. _Update feature tracker:_ Note files created

_Step 2: Business Logic Layer_

Tasks:

- [ ] Core business logic functions
- [ ] Validation logic
- [ ] Data transformation utilities
- [ ] Server-side utilities specific to this feature

_For EACH task:_

1. Implement the functionality
2. _Update feature tracker:_ Mark in progress → completed
3. _Update master tracker:_ Increment percentage
4. Reference oldapp/ for business rules and logic
5. _Update feature tracker:_ Document references
6. Write unit tests immediately
7. _Update test tracker:_ Add tests and results
8. _Update feature tracker:_ Note files created

_Step 3: Server Components_

Tasks:

- [ ] Page components (server components)
- [ ] Server-side layouts
- [ ] Data fetching and passing

_For EACH task:_

1. Implement component
2. _Update feature tracker:_ Mark progress
3. _Update master tracker:_ Update percentage
4. Reference oldapp/ for page structure and data needs
5. _Update feature tracker:_ Document references
6. Write integration tests
7. _Update test tracker:_ Add tests
8. _Update feature tracker:_ Note files created

_Step 4: Client Components_

Tasks:

- [ ] Interactive UI components
- [ ] Client-side state management
- [ ] Event handlers
- [ ] Client-side utilities

_For EACH task:_

1. Implement component
2. _Update feature tracker:_ Mark progress
3. _Update master tracker:_ Update percentage
4. Reference oldapp/ for interactivity requirements
5. _Update feature tracker:_ Document references
6. Write unit and integration tests
7. _Update test tracker:_ Add tests
8. _Update feature tracker:_ Note files created

_Step 5: Testing & Integration_

Tasks:

- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests for critical flows written and passing
- [ ] Feature integrated with rest of app
- [ ] Manual testing completed
- [ ] Feature parity verified against oldapp

_For EACH task:_

1. Complete testing tasks
2. _Update feature tracker:_ Mark test progress
3. _Update test tracker:_ Update test results
4. _Update master tracker:_ Update feature status
5. Test against oldapp/ for feature parity
6. _Update feature tracker:_ Note parity verification

_Post-Feature Completion:_

1. _Final feature tracker update:_

   - Mark feature as 100% complete
   - Note completion timestamp
   - Document any issues or learnings
   - Finalize testing status

2. _Update master tracker:_

   - Mark feature as ✅ Completed
   - Update overall project percentage
   - Add to recent activity log
   - Update phase 2 progress

3. _Update implementation log:_

   - Add comprehensive entry for completed feature
   - Document oldapp references used
   - Note any architectural decisions
   - Document test coverage achieved

4. _Create daily summary_ (if end of work session)

---

_Phase 3: Integration & Polish_

_Track ALL steps in master tracker and create specific progress trackers as needed._

1. _System-wide integration:_

   - [ ] All modules work together seamlessly
   - [ ] Cross-module interactions tested
   - [ ] Authentication flows work across app
   - [ ] Navigation and routing verified
   - [ ] End-to-end workflows tested against oldapp
   - _Update trackers after each item_

2. _Comprehensive test suite completion:_

   - [ ] All unit tests written and passing
   - [ ] All integration tests written and passing
   - [ ] All E2E tests written and passing
   - [ ] Test coverage meets targets (85%+ minimum)
   - [ ] No failing tests
   - [ ] Performance tests pass
   - _Update test tracker continuously_

3. _Performance optimization:_

   - [ ] Bundle sizes meet targets
   - [ ] Page load performance optimized
   - [ ] Code splitting verified
   - [ ] Tree-shaking effectiveness validated
   - [ ] Lighthouse/PageSpeed scores acceptable
   - _Update master tracker after each optimization_

4. _Error handling & edge cases:_

   - [ ] Comprehensive error boundaries
   - [ ] Graceful degradation implemented
   - [ ] Offline behavior (if applicable)
   - [ ] Network error handling
   - [ ] All edge cases from oldapp handled
   - _Update trackers as completed_

5. _Final quality assurance:_

   - [ ] Zero TypeScript errors
   - [ ] Zero console errors or warnings
   - [ ] Zero build warnings
   - [ ] All user workflows functional
   - [ ] Complete feature parity verified against oldapp
   - [ ] All tests passing
   - _Update master tracker with QA results_

6. _Create final documentation_ (IMPLEMENTATION-COMPLETE.md):
   - Summary of what was built
   - Architecture highlights
   - Key technical decisions
   - Performance metrics
   - Test coverage report
   - How to run/build/deploy
   - Comparison with old architecture
   - Any known limitations or future improvements
   - _Update master tracker: Mark project complete_

---

_Testing Requirements:_

_Test Coverage Targets:_

- _Overall:_ 85% minimum
- _Business Logic:_ 95% minimum
- _Data Layer:_ 90% minimum
- _Components:_ 80% minimum
- _Utils/Helpers:_ 95% minimum

_Required Test Types:_

1. _Unit Tests_ (for every module):

   - All business logic functions
   - All utility functions
   - All data transformations
   - All validators
   - Component logic (non-UI)
   - _Update test tracker:_ After writing each test file

2. _Integration Tests_ (for every feature):

   - Feature workflows end-to-end
   - Cross-module interactions
   - API endpoint integration
   - Database operations
   - Authentication flows
   - _Update test tracker:_ After each integration test

3. _E2E Tests_ (for critical paths):
   - Complete user workflows
   - Authentication flow
   - Main application features
   - Error scenarios
   - Edge cases
   - _Update test tracker:_ After each E2E test

_Test File Organization:_

**tests**/
├── unit/
│ ├── auth/
│ │ ├── login.test.ts
│ │ ├── session.test.ts
│ │ └── validation.test.ts
│ ├── dashboard/
│ └── ...
├── integration/
│ ├── auth/
│ │ ├── auth-flow.test.ts
│ │ └── token-refresh.test.ts
│ ├── dashboard/
│ └── ...
└── e2e/
├── user-journey.test.ts
├── auth-flow.test.ts
└── ...

_Test Documentation:_

- Each test file should have a header comment explaining what's being tested
- Complex test scenarios should be documented
- Edge cases should be explicitly called out
- _Update test tracker:_ Document test coverage for each module

---

_How to Reference Old Code Effectively:_

_DO Reference Old Code For:_

- ✅ Understanding business requirements
- ✅ Extracting business logic and rules
- ✅ Identifying validation constraints
- ✅ Understanding data models and relationships
- ✅ Discovering edge cases and error scenarios
- ✅ Finding API endpoints and integrations
- ✅ Understanding user workflows and interactions
- ✅ Identifying feature completeness criteria
- ✅ Understanding complex calculations or algorithms
- ✅ Finding constants, configuration values, or business rules

_DO NOT Copy From Old Code:_

- ❌ Component structure or organization
- ❌ File/folder architecture
- ❌ State management patterns
- ❌ Data fetching approaches
- ❌ Routing structure
- ❌ Client/server boundaries
- ❌ Provider hierarchies
- ❌ Complex workarounds or legacy patterns
- ❌ Backward compatibility code
- ❌ Over-engineered abstractions

_Best Practice When Referencing:_

1. Open relevant files in oldapp/ folder
2. _Read and understand_ what the code does and why
3. _Extract the requirements and logic_ in your notes
4. _Update feature tracker:_ Document what you're referencing
5. _Close the old code_
6. _Implement fresh_ following the new architectural design
7. _Update feature tracker:_ Note files created and oldapp references used
8. _Test for feature parity_ with the old implementation
9. _Update test tracker:_ Document test results

_Document Your References:_
In feature progress tracker and implementation log:
markdown

## Files Referenced from OldApp

- `oldapp/src/auth/login.tsx` - Extracted login workflow logic
  - **What:** Form validation rules, error messages
  - **Why:** To ensure identical UX
  - **Implemented in:** `src/features/auth/components/login-form.tsx`
- `oldapp/src/lib/auth.ts` - Extracted JWT validation rules
  - **What:** Token expiry (30min), refresh logic
  - **Why:** To maintain session behavior
  - **Implemented in:** `src/features/auth/lib/jwt.ts`

---

_Implementation Guidelines:_

_File Organization:_

- Follow the exact structure from the architectural plan
- Use clear, descriptive file names
- Separate server and client code into appropriate directories
- Use proper file extensions (.ts, .tsx, .server.ts, .client.ts as appropriate)

_Code Quality:_

- Write clean, self-documenting code
- Use meaningful variable and function names
- Keep functions small and focused
- Avoid deep nesting (max 3-4 levels)
- Comment complex logic, but prefer clear code over comments
- Use consistent code style throughout

_TypeScript:_

- Use strict mode
- Avoid any types - use proper typing
- Create shared types in appropriate locations
- Use type inference where appropriate
- Define interfaces for complex objects

_Next.js 16 Best Practices:_

- Use Server Components by default
- Mark Client Components explicitly with 'use client'
- Use Server Actions for mutations
- Implement proper caching strategies
- Use async/await for data fetching
- Leverage Turbopack optimizations
- Use proper metadata API for SEO

_Component Design:_

- Keep components small and focused
- Use composition over inheritance
- Implement proper prop types
- Avoid prop drilling - use appropriate state management
- Flatten provider hierarchy
- Minimize client component boundaries

_State Management:_

- Use Server Components for server state
- Use React hooks for client state
- Implement context only where truly needed
- Keep context providers shallow
- Use URL state for shareable state
- Avoid unnecessary re-renders

_Data Fetching:_

- Fetch data in Server Components when possible
- Use Server Actions for mutations
- Implement proper loading states
- Handle errors gracefully
- Use appropriate caching strategies
- Avoid waterfalls - fetch in parallel where possible

_Error Handling:_

- Implement error boundaries at appropriate levels
- Provide helpful error messages
- Log errors appropriately
- Handle network failures gracefully
- Validate user input
- Handle edge cases

_Performance:_

- Implement code splitting as per the plan
- Use dynamic imports for heavy components
- Optimize images with Next.js Image component
- Minimize client-side JavaScript
- Implement proper caching
- Avoid unnecessary client components

---

_Critical Requirements:_

- ✅ _ZERO ERRORS_ - No TypeScript, runtime, or build errors
- ✅ _STRICT ARCHITECTURE ADHERENCE_ - Follow the plan exactly
- ✅ _FULL FEATURE PARITY_ - All user functionality must work identically to oldapp/
- ✅ _COMPREHENSIVE TESTS_ - 85%+ coverage with all tests passing
- ✅ _OPTIMAL & SIMPLE_ - Clean, maintainable, non-complex code
- ✅ _PROPER RUNTIME BOUNDARIES_ - Server/client/edge code correctly separated
- ✅ _SYSTEMATIC APPROACH_ - Follow the workflow step by step
- ✅ _REFERENCE WISELY_ - Use oldapp/ for requirements, not patterns
- ✅ _CONTINUOUS TRACKING_ - Update all trackers in real-time
- ✅ _DETAILED DOCUMENTATION_ - Keep all progress logs current
- ✅ _QUALITY ASSURANCE_ - Test thoroughly against oldapp/ behavior
- ✅ _NO SHORTCUTS_ - Implement and test properly
- ✅ _CONSISTENCY_ - Maintain consistent patterns throughout
- ✅ _NEW ARCHITECTURE ONLY_ - Never copy old architectural patterns

---

_Quality Checklist (verify continuously):_

_Architecture:_

- [ ] Directory structure matches the new plan exactly (NOT oldapp structure)
- [ ] Module boundaries are respected
- [ ] Runtime boundaries (server/client/edge) are correct
- [ ] Dependencies match the designed graph
- [ ] Bundle splitting strategy is implemented
- [ ] No old architectural patterns copied

_Code Quality:_

- [ ] Zero TypeScript errors
- [ ] Zero runtime errors
- [ ] Zero build warnings
- [ ] All imports resolve correctly
- [ ] Code is clean and readable
- [ ] No over-engineering or unnecessary complexity
- [ ] No legacy patterns from oldapp/

_Testing:_

- [ ] All unit tests written and passing
- [ ] All integration tests written and passing
- [ ] All E2E tests written and passing
- [ ] Test coverage meets targets (85%+ overall)
- [ ] No skipped or disabled tests
- [ ] All edge cases covered
- [ ] Test tracker is up to date

_Functionality:_

- [ ] All features from oldapp/ are present
- [ ] User workflows match oldapp/ behavior exactly
- [ ] Edge cases from oldapp/ are handled
- [ ] Error scenarios are handled gracefully
- [ ] Loading states are implemented
- [ ] Feature parity verified by testing against oldapp/

_Performance:_

- [ ] Bundle sizes are optimal
- [ ] Initial load is fast
- [ ] Code splitting is effective
- [ ] Tree-shaking works properly
- [ ] No unnecessary client-side code
- [ ] Performance improved over oldapp/

_User Experience:_

- [ ] UI matches or improves oldapp/
- [ ] Responsive on all screen sizes
- [ ] Accessible (semantic HTML, ARIA)
- [ ] Smooth interactions
- [ ] Proper feedback for user actions
- [ ] All oldapp/ features work identically

_Tracking & Documentation:_

- [ ] Master progress tracker is current
- [ ] All feature trackers are updated
- [ ] Test tracker reflects actual status
- [ ] Daily summaries are being created
- [ ] Implementation log is comprehensive
- [ ] All oldapp references are documented

---

_Deliverables:_

1. _Complete working application_ with full feature parity to oldapp/
2. _Comprehensive test suite_ with 85%+ coverage, all tests passing
3. **MASTER-PROGRESS-TRACKER.md** - Central progress tracking (continuously updated)
4. **progress/[XX]-[feature-name]-progress.md** - Detailed tracker for each feature
5. **progress/daily/YYYY-MM-DD-summary.md** - Daily progress summaries
6. **TEST-PROGRESS-TRACKER.md** - Comprehensive testing progress
7. **IMPLEMENTATION-LOG.md** - Detailed log including oldapp references
8. **IMPLEMENTATION-COMPLETE.md** - Final documentation with comparison
9. _Zero-error codebase_ - No TypeScript, runtime, or build errors
10. _Optimized bundle_ - Following the planned bundle strategy
11. _Clean, maintainable code_ - Following all guidelines and new architecture

---

## Important Reminders

- **Track EVERYTHING in real-time** - trackers are not optional, they're critical visibility tools
- **Update trackers after EVERY significant step** - don't batch updates, maintain live status
- **oldapp/ is a reference, not a template** - extract logic and requirements, never structure
- **Feature parity is non-negotiable** - users must have identical functionality to oldapp/
- **Test as you go** - don't defer testing to the end, test each piece immediately
- **85%+ test coverage is mandatory** - with all tests passing, no exceptions
- **Internal structure must be completely different** - that's the entire point of the overhaul
- **No errors means NO ERRORS** - test thoroughly and fix everything before moving on
- **Simple is better than clever** - prioritize clarity and maintainability over cleverness
- **Follow the new plan strictly** - never fall back to old patterns, even when tempting
- **Document what you reference** - track oldapp/ usage meticulously in feature trackers
- **Test against oldapp/** - ensure identical user-level behavior through comparative testing
- **Think fresh, implement clean** - approach each feature as if building it for the first time
- **Question old complexity** - if oldapp/ seems overly complex, simplify in the new design
- **Ask "why" not "how"** - understand why oldapp/ does something before implementing
- **Verify continuously** - check architecture alignment, test coverage, and error status constantly
- **Don't skip documentation** - future you (and others) will thank present you
- **Quality over speed** - it's better to implement correctly than quickly
- **Respect boundaries** - server/client/edge runtime boundaries are architectural, not suggestions
- **Trust the plan** - the architectural overhaul was designed for optimal outcomes
- **Measure twice, code once** - plan each feature implementation before diving in
- **Integration matters** - features must work together seamlessly, not just individually
- **User experience is king** - all technical improvements mean nothing if UX regresses
- **Performance is a feature** - the new architecture should be measurably faster
- **Maintainability is value** - code that's easy to change is valuable code
- **Tests are documentation** - they show how the system should behave
- **Progress visibility is respect** - trackers show respect for stakeholders' need to know
- **Completeness beats perfection** - finish implementation with quality, don't endlessly polish
- **Systematic beats chaotic** - follow the workflow, don't jump around randomly
- **Dependencies are real** - respect implementation order, don't skip ahead
- **Blockers need visibility** - surface issues immediately in trackers, don't hide problems

---

## Implementation Mandate

You are implementing a complete Next.js 16.1.0 application following a meticulously designed architectural overhaul plan. This is not a migration, refactor, or upgrade—it is a **full greenfield reimplementation** using optimal modern patterns while maintaining perfect feature parity with the existing application.

**Your Core Mission:** Build a production-ready, zero-error application that users cannot distinguish from the original (same features, same UX, same workflows) but that is internally superior in every way (better architecture, cleaner code, higher performance, more maintainable, comprehensively tested).

**Your Implementation Philosophy:**

1. **Architecture First**: The FINAL-ARCHITECTURE-OVERHAUL-PLAN.md is your bible. Every file, every component, every module must align with this plan. No deviations, no "quick fixes," no "temporary" shortcuts. The plan was designed for optimal outcomes—trust it and follow it exactly.

2. **User Parity, Internal Innovation**: Users experience identical functionality, but you achieve it through completely new, optimal implementations. The oldapp/ folder shows you WHAT to build (requirements, business logic, workflows), but never HOW to build it. Extract intelligence, never copy patterns.

3. **Systematic, Not Random**: Follow the phase-by-phase, feature-by-feature workflow methodically. Don't jump around. Don't skip steps. Don't defer testing. Don't batch updates. Work systematically through the implementation order, completing each piece fully before moving to the next.

4. **Radical Transparency**: Maintain real-time visibility into all progress through comprehensive tracking. Update MASTER-PROGRESS-TRACKER.md after every significant step. Keep feature trackers current. Log everything. Surface blockers immediately. Document decisions. Track test coverage. Create daily summaries. The tracking system is not bureaucracy—it's mission-critical visibility that enables course correction and demonstrates progress.

5. **Quality is Non-Negotiable**: Zero errors means ZERO errors—no TypeScript errors, no runtime errors, no build warnings, no failing tests, no broken functionality. Test coverage of 85%+ is mandatory, not aspirational. Every feature must be thoroughly tested with unit, integration, and E2E tests before being marked complete. Quality cannot be "added later"—it must be built in from the start.

6. **Simplicity Through Understanding**: When you encounter complexity in oldapp/, don't replicate it—understand WHY it exists, then implement the simplest solution that satisfies that requirement. Question every abstraction. Challenge every pattern. Avoid over-engineering. The best code is the code that's easy to understand and easy to change.

7. **Context Awareness**: You're building for Next.js 16 with Turbopack in 2024, not maintaining legacy code from years past. Use modern patterns, native features, and optimal approaches. Don't carry forward technical debt. Don't preserve backward compatibility with obsolete approaches. Build fresh for the current ecosystem.

8. **Integration Thinking**: Features don't exist in isolation. Constantly consider how each piece integrates with the whole system. Respect module boundaries. Honor dependency graphs. Test cross-module interactions. Ensure authentication flows work app-wide. Verify navigation and routing holistically. Think system, not just component.

9. **Test-Driven Confidence**: Tests are not an afterthought—they're how you know your implementation is correct. Write tests as you build. Test business logic thoroughly. Test integration points carefully. Test user workflows end-to-end. When tests pass, you have confidence. When coverage is comprehensive, you have protection. When the test suite is green, you can refactor fearlessly.

10. **Continuous Verification**: Constantly verify alignment with the architectural plan, check test coverage, run the test suite, verify build success, check for errors, test against oldapp/ behavior, and update trackers. Verification is continuous, not a phase. Quality is maintained through constant vigilance, not final inspection.

**Your Success Criteria:**

- ✅ Application builds without errors or warnings
- ✅ All user features from oldapp/ work identically
- ✅ All workflows and interactions match oldapp/ behavior exactly
- ✅ Test suite is comprehensive (85%+ coverage) and fully green
- ✅ Architecture perfectly matches FINAL-ARCHITECTURE-OVERHAUL-PLAN.md
- ✅ Code is clean, simple, and maintainable
- ✅ Performance meets or exceeds oldapp/ benchmarks
- ✅ Bundle sizes are optimal per the plan
- ✅ Server/client/edge boundaries are correctly implemented
- ✅ All trackers are current and reflect actual status
- ✅ Documentation is complete and accurate
- ✅ No technical debt or shortcuts taken
- ✅ Feature parity verified through systematic testing
- ✅ System integration is seamless
- ✅ Edge cases and error scenarios are handled

**Begin with Phase 1: Setup & Foundation**. Initialize the tracking system first—create MASTER-PROGRESS-TRACKER.md, the progress/ directory structure, and TEST-PROGRESS-TRACKER.md. Then proceed methodically through project setup, testing infrastructure, shared infrastructure, foundation layer, and foundation tests. Update trackers continuously. Document everything. Test thoroughly. Build with quality.

Remember: You're not just writing code—you're architecting a superior system while maintaining perfect user experience. Every decision matters. Every shortcut compromises the mission. Every untested feature is a liability. Every undocumented choice is technical debt. Work systematically, build quality in, track everything, and deliver excellence.

**Start now. Initialize tracking. Begin implementation. Build something remarkable.**
