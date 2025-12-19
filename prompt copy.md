# Full Application Implementation Following Architectural Overhaul Plan

Implement the complete Next.js 16.1.0 application with Turbopack, strictly adhering to the architectural overhaul plan. This is a **full greenfield implementation** with complete feature parity at the user level.

---

## 🔄 AI AGENT HANDOFF PROTOCOL (CRITICAL FOR CONTINUITY)

> [!CAUTION] > **This section is MANDATORY reading before ANY work begins.** If you are a new AI agent picking up this task, follow this protocol EXACTLY to resume work correctly.

### Quick Orientation Checklist (Do This First)

When picking up this project (whether fresh start or mid-task handoff), complete these steps **IN ORDER**:

1. **[ ] Read Current State Files** (in this order):

   - `MASTER-PROGRESS-TRACKER.md` - Overall project status, current phase, what's being worked on NOW
   - `CURRENT-SESSION-STATE.md` - Most critical: exact point of interruption, in-progress work, immediate next steps
   - `TEST-PROGRESS-TRACKER.md` - Testing status and failures to address

2. **[ ] Check Active Work Context**:

   - Look for any `progress/[XX]-[feature-name]-progress.md` files marked as 🔄 In Progress
   - Review the "Current Step" and "Next Immediate Steps" in those trackers
   - Check for any partially created/modified files that need completion

3. **[ ] Verify Build/Test State**:

   - Run `npm run build` to check for compilation errors
   - Run `npm test` to see current test status
   - Note any failures that need immediate attention

4. **[ ] Resume From Exact Point**:
   - The `CURRENT-SESSION-STATE.md` file tells you EXACTLY where to resume
   - Do NOT restart or redo completed work
   - Continue from the documented interruption point

### CURRENT-SESSION-STATE.md (MANDATORY - Create/Update Continuously)

This file is the **critical handoff document**. Create it at project start and update it **after EVERY significant action**.

**Required Structure:**

```markdown
# Current Session State

**Last Updated:** [YYYY-MM-DD HH:MM:SS timezone]
**Session ID:** [Unique identifier for this work session]
**Agent/Session Info:** [Any identifying info about current agent]

## Immediate Context

**Current Phase:** [Phase 1/2/3]
**Current Feature:** [Feature being implemented OR "N/A" if between features]
**Current Step:** [Exact step number and description from feature tracker]
**Current File:** [Absolute path to file being actively worked on]
**Current Function/Component:** [Specific function or component being implemented]

## Work In Progress (WIP)

### Files Being Modified

| File Path            | Status         | What's Being Done             | % Complete |
| -------------------- | -------------- | ----------------------------- | ---------- |
| `/path/to/file.ts`   | 🔄 In Progress | Implementing login validation | 60%        |
| `/path/to/other.tsx` | ⏸️ Paused      | Waiting for above file        | 0%         |

### Uncommitted Changes

- List of files with uncommitted changes
- What those changes represent
- Whether they are complete or partial

### Partial Implementations

[For any function/component that's partially written:]

- **Location:** `file.ts:functionName` (line XXX)
- **What's Done:** First half of validation logic
- **What's Remaining:** Error handling, return statement, tests
- **Critical Context:** Using zod for validation schema from `shared/validation.ts`

## Exact Resume Point

**Resume At:** [Precise description of what the next agent should do FIRST]

**Example:**
"Resume by completing the `validateLoginCredentials()` function in `src/features/auth/lib/validation.ts` starting at line 45. The function signature and first validation check are complete. Next: add email format validation, then password strength check, then error message generation. After completing this function, write the unit test in `tests/unit/auth/validation.test.ts`."

## Context & Decisions Made This Session

### Decisions Made (And Why)

1. **Decision:** Chose X over Y for authentication
   - **Reason:** Better performance, simpler code
   - **Reference:** Link to oldapp file if applicable
   - **Impact:** Affects how tokens are handled in refresh flow

### Important Discoveries

- [Any surprises found in oldapp/ code]
- [Any edge cases discovered]
- [Any architectural insights]

### Pending Questions/Blockers

- [ ] Need to decide: How to handle session timeout UX
- [ ] Blocker: Missing environment variable for API endpoint
- [x] Resolved: Token format decided (JWT with custom claims)

## Files Referenced This Session from OldApp

| OldApp File            | What Was Extracted                    | Used In                               |
| ---------------------- | ------------------------------------- | ------------------------------------- |
| `oldapp/auth/login.ts` | Validation rules, error messages      | `src/features/auth/lib/validation.ts` |
| `oldapp/lib/jwt.ts`    | Token expiry (30min), claim structure | `src/features/auth/lib/token.ts`      |

## Last 10 Actions Taken (Newest First)

1. [Timestamp] - Created validation schema for login form
2. [Timestamp] - Added email regex from oldapp validation
3. [Timestamp] - Started validateLoginCredentials function
4. [Timestamp] - Reviewed oldapp/auth/login.ts for requirements
5. [Timestamp] - Updated feature tracker with progress
   ...

## Session Continuity Notes

[Any additional context that would help the next agent understand the current state:]

- Current approach/strategy being used
- Gotchas or pitfalls discovered
- Links between files/components being built
- Expected next 5-10 steps in detail
```

**Update Frequency:** After EVERY action that changes state - file creation, function completion, test written, decision made, blocker encountered. **This is your handoff to the next agent - treat it as critical.**

---

## Old Codebase Reference

- The original application code has been moved to the `oldapp/` folder
- **Use as reference ONLY** - to understand business logic, requirements, and existing functionality
- **Extract logic and requirements**, not structure or patterns
- **DO NOT copy architecture or patterns** from the old code
- **ALWAYS implement following the new architectural plan**, even when referencing old code

---

## Core Implementation Principles

### 1. Strict Architecture Adherence

- Follow the `FINAL-ARCHITECTURE-OVERHAUL-PLAN.md` exactly as specified
- Implement the exact directory structure and module organization defined
- Respect all server/client/edge runtime boundaries as designed
- Maintain the dependency graph and separation of concerns as planned

### 2. Full Feature Parity

- **User-facing functionality must be identical** to the original application
- All features, workflows, and user interactions must work exactly as before
- UI/UX should match or improve upon the original
- **Internal implementation can be completely different** - restructure freely as per the optimal design

### 3. Zero-Error Implementation

- Code must be **error-free** - no runtime errors, type errors, or build errors
- All TypeScript types must be correct and strict
- All imports and exports must resolve correctly
- No ESLint/build warnings
- Proper error handling throughout

### 4. Optimal & Simple Code

- Implement the **simplest solution** that meets requirements
- Avoid over-engineering or unnecessary abstractions
- Use Next.js 16 native features over custom solutions
- Keep code clean, readable, and maintainable
- No premature optimization - focus on clarity first

### 5. Comprehensive Testing

- Write tests for all functionality
- Unit tests for business logic and utilities
- Integration tests for features and workflows
- End-to-end tests for critical user journeys
- Test coverage should be comprehensive

### 6. Detailed Progress Tracking (For Agent Continuity)

- Maintain multiple levels of tracking
- Update trackers **in real-time** as work progresses
- Track blockers, dependencies, and completion status
- Enable visibility into implementation progress at all times
- **CRITICAL:** Always update `CURRENT-SESSION-STATE.md` to enable agent handoff

---

## PROGRESS TRACKING SYSTEM (MANDATORY)

### Master Progress Tracker: `MASTER-PROGRESS-TRACKER.md`

This is the **central source of truth** for implementation progress. Update this **continuously**.

**Required Structure:**

```markdown
# Master Progress Tracker

**Last Updated:** [Timestamp]
**Overall Progress:** XX% Complete
**Current Phase:** [Phase 1/2/3]
**Current Focus:** [What you're working on now]
**Current Agent Session:** [Session ID from CURRENT-SESSION-STATE.md]

## Summary Dashboard

- ✅ Completed: X features
- 🔄 In Progress: Y features
- ⏳ Not Started: Z features
- 🚫 Blocked: N features
- ⚠️ Issues: M items

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
- **Current Implementer:** [Session ID actively working on this]
- **Started:** [Date/Time]
- **Completed:** [Date/Time or TBD]
- **Dependencies:** [List any blockers or prerequisites]
- **Issues:** [Any problems encountered]
- **Test Status:** [Not Started/In Progress/Passing/Failed]
- **Notes:** [Brief status update]

## Recent Activity Log

[Last 10-20 updates, most recent first:]

- **[Timestamp]** - [Session ID] - Completed authentication server actions
- **[Timestamp]** - [Session ID] - Started user dashboard client components
- **[Timestamp]** - [Session ID] - Resolved TypeScript errors in data layer

## Blockers & Issues

[Active blockers requiring attention:]

- **[Issue ID]** - [Description] - [Priority: High/Medium/Low] - [Blocking Session]

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
```

**Update Frequency:** After EVERY significant step (file created, component completed, test written, etc.)

---

### Per-Feature Progress Trackers: `progress/[XX]-[feature-name]-progress.md`

Create a detailed tracker for EACH feature/module being implemented.

**Required Structure:**

```markdown
# [Feature Name] Implementation Progress

**Last Updated:** [Timestamp]
**Overall Progress:** XX% Complete
**Status:** [Not Started/In Progress/Testing/Completed/Blocked]
**Started:** [Date/Time]
**Target Completion:** [Date/Time]
**Actual Completion:** [Date/Time or TBD]
**Current Session:** [Session ID actively working on this]

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

- [Timestamp] - [Session ID] - Completed user model with all validations
- [Timestamp] - [Session ID] - Started session model, referencing oldapp/models/session.ts

### Step 2: Business Logic [XX%]

- [ ] Core logic functions
- [ ] Validation logic
- [ ] Transformations
- [ ] Utilities

**Progress Notes:**
[Detailed notes for this step]

### Step 3: Server Components [XX%]

- [ ] Page components (server components)
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

1. **[Timestamp]** - [Session ID] - TypeScript error in session validation
   - **Resolution:** Fixed by updating interface
2. **[Timestamp]** - [Session ID] - Server action not receiving form data
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
```

**Update Frequency:** After EVERY task completion, test result, or issue encountered

---

### Daily Progress Summary: `progress/daily/YYYY-MM-DD-summary.md`

Create a summary at the end of each work session.

**Required Structure:**

```markdown
# Daily Progress Summary - [Date]

**Work Session:** [Start Time] - [End Time]
**Session ID:** [Unique session identifier]
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

## Tomorrow's Plan / Handoff Notes

1. Complete authentication testing
2. Start user dashboard server components
3. Implement email service integration
4. Write integration tests for auth flow

## Session Handoff Information

**Exact Resume Point:** [Precise description for next agent]
**Critical Context:** [Any must-know information]
**Watch Out For:** [Gotchas or potential issues]

## Notes & Learnings

- Next.js 16 Server Actions are cleaner than expected
- Form validation needs careful type checking
- Test coverage tracking is helpful for confidence
```

---

### Testing Progress Tracker: `TEST-PROGRESS-TRACKER.md`

**Required Structure:**

```markdown
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
   - **Assigned:** [Session ID]

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
```

---

## MANDATORY IMPLEMENTATION WORKFLOW

### Phase 1: Setup & Foundation

1. **Initialize tracking system:**

   - Create `CURRENT-SESSION-STATE.md` (FIRST!)
   - Create `MASTER-PROGRESS-TRACKER.md`
   - Create `progress/` directory
   - Create `TEST-PROGRESS-TRACKER.md`
   - **Update session state:** Mark tracking system as initialized

2. **Initialize the project structure:**

   - Create the complete directory structure from the architectural plan
   - Set up Next.js 16.1.0 with Turbopack configuration
   - Configure TypeScript with strict settings
   - Set up linting and formatting
   - **Update session state:** After each setup step

3. **Set up testing infrastructure:**

   - Install and configure testing libraries (Jest/Vitest, React Testing Library)
   - Set up test file structure
   - Configure test coverage reporting
   - Create test utilities and helpers
   - **Update session state and test tracker:** Mark testing setup complete

4. **Implement shared infrastructure first:**

   - Core utilities and helpers
   - Shared types and interfaces
   - Configuration files
   - Environment setup
   - API client setup
   - Authentication infrastructure
   - Error handling utilities
   - Logging and monitoring setup
   - **Update session state:** After each infrastructure component

5. **Create the foundation layer:**

   - Database schemas/models (if applicable)
   - Core data access layer
   - Shared server actions
   - Shared API routes
   - Core middleware
   - **Update session state:** After each foundation piece

6. **Write foundation tests:**

   - Unit tests for utilities
   - Tests for shared functions
   - Integration tests for core infrastructure
   - **Update test tracker:** After each test file

7. **Document foundation setup** in `IMPLEMENTATION-LOG.md`:
   - What has been set up
   - Key configuration decisions
   - Foundation structure created
   - **Update session state:** Mark Phase 1 complete

---

### Phase 2: Feature-by-Feature Implementation

Follow the implementation order from `00-MASTER-TASK-LIST.md`. For **EACH** feature/module:

#### Pre-Implementation

1. **Create feature progress tracker:**

   - Create `progress/[XX]-[feature-name]-progress.md`
   - Initialize with full checklist structure
   - **Update session state:** Add feature to active work

2. **Reference the optimal design:**

   - Open the corresponding `[XX]-[feature-name]-optimal-design.md` file
   - Understand the complete design specification
   - Review dependencies and interfaces
   - **Update feature tracker:** Note design reviewed

3. **Reference old code when needed:**
   - Look at `oldapp/` folder to understand:
     - **Business logic and rules** - what the feature actually does
     - **Data models and structures** - what data is needed
     - **Validation rules** - what constraints exist
     - **Edge cases** - what scenarios were handled
     - **API endpoints** - what external services are called
     - **User workflows** - how users interact with the feature
   - **Extract requirements and logic ONLY**
   - **DO NOT copy patterns, structure, or implementation approach**
   - **Update feature tracker:** Document what was referenced from oldapp

---

#### Implementation Steps (For Each Feature)

##### Step 1: Data Layer Implementation [if applicable]

Tasks:

- [ ] Database models/schemas
- [ ] Data access functions
- [ ] Server-side data fetching
- [ ] API routes or server actions

**For EACH task:**

1. Implement the functionality
2. **Update session state:** Note current file and function
3. **Update feature tracker:** Mark task in progress, then completed
4. **Update master tracker:** Increment feature percentage
5. Reference oldapp/ for data structures, validation rules if needed
6. **Update feature tracker:** Document oldapp references
7. Write unit tests immediately
8. **Update test tracker:** Add new tests and status
9. **Update feature tracker:** Note files created

##### Step 2: Business Logic Layer

Tasks:

- [ ] Core business logic functions
- [ ] Validation logic
- [ ] Data transformation utilities
- [ ] Server-side utilities specific to this feature

**For EACH task:**

1. Implement the functionality
2. **Update session state:** Note current work
3. **Update feature tracker:** Mark in progress → completed
4. **Update master tracker:** Increment percentage
5. Reference oldapp/ for business rules and logic
6. **Update feature tracker:** Document references
7. Write unit tests immediately
8. **Update test tracker:** Add tests and results
9. **Update feature tracker:** Note files created

##### Step 3: Server Components

Tasks:

- [ ] Page components (server components)
- [ ] Server-side layouts
- [ ] Data fetching and passing

**For EACH task:**

1. Implement component
2. **Update session state:** Note current work
3. **Update feature tracker:** Mark progress
4. **Update master tracker:** Update percentage
5. Reference oldapp/ for page structure and data needs
6. **Update feature tracker:** Document references
7. Write integration tests
8. **Update test tracker:** Add tests
9. **Update feature tracker:** Note files created

##### Step 4: Client Components

Tasks:

- [ ] Interactive UI components
- [ ] Client-side state management
- [ ] Event handlers
- [ ] Client-side utilities

**For EACH task:**

1. Implement component
2. **Update session state:** Note current work
3. **Update feature tracker:** Mark progress
4. **Update master tracker:** Update percentage
5. Reference oldapp/ for interactivity requirements
6. **Update feature tracker:** Document references
7. Write unit and integration tests
8. **Update test tracker:** Add tests
9. **Update feature tracker:** Note files created

##### Step 5: Testing & Integration

Tasks:

- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests for critical flows written and passing
- [ ] Feature integrated with rest of app
- [ ] Manual testing completed
- [ ] Feature parity verified against oldapp

**For EACH task:**

1. Complete testing tasks
2. **Update session state:** Note testing progress
3. **Update feature tracker:** Mark test progress
4. **Update test tracker:** Update test results
5. **Update master tracker:** Update feature status
6. Test against oldapp/ for feature parity
7. **Update feature tracker:** Note parity verification

#### Post-Feature Completion

1. **Final feature tracker update:**

   - Mark feature as 100% complete
   - Note completion timestamp
   - Document any issues or learnings
   - Finalize testing status

2. **Update master tracker:**

   - Mark feature as ✅ Completed
   - Update overall project percentage
   - Add to recent activity log
   - Update phase 2 progress

3. **Update implementation log:**

   - Add comprehensive entry for completed feature
   - Document oldapp references used
   - Note any architectural decisions
   - Document test coverage achieved

4. **Update session state:**

   - Mark feature complete
   - Update resume point to next feature

5. **Create daily summary** (if end of work session)

---

### Phase 3: Integration & Polish

**Track ALL steps in session state and master tracker.**

1. **System-wide integration:**

   - [ ] All modules work together seamlessly
   - [ ] Cross-module interactions tested
   - [ ] Authentication flows work across app
   - [ ] Navigation and routing verified
   - [ ] End-to-end workflows tested against oldapp
   - **Update trackers after each item**

2. **Comprehensive test suite completion:**

   - [ ] All unit tests written and passing
   - [ ] All integration tests written and passing
   - [ ] All E2E tests written and passing
   - [ ] Test coverage meets targets (85%+ minimum)
   - [ ] No failing tests
   - [ ] Performance tests pass
   - **Update test tracker continuously**

3. **Performance optimization:**

   - [ ] Bundle sizes meet targets
   - [ ] Page load performance optimized
   - [ ] Code splitting verified
   - [ ] Tree-shaking effectiveness validated
   - [ ] Lighthouse/PageSpeed scores acceptable
   - **Update master tracker after each optimization**

4. **Error handling & edge cases:**

   - [ ] Comprehensive error boundaries
   - [ ] Graceful degradation implemented
   - [ ] Offline behavior (if applicable)
   - [ ] Network error handling
   - [ ] All edge cases from oldapp handled
   - **Update trackers as completed**

5. **Final quality assurance:**

   - [ ] Zero TypeScript errors
   - [ ] Zero console errors or warnings
   - [ ] Zero build warnings
   - [ ] All user workflows functional
   - [ ] Complete feature parity verified against oldapp
   - [ ] All tests passing
   - **Update master tracker with QA results**

6. **Create final documentation** (`IMPLEMENTATION-COMPLETE.md`):
   - Summary of what was built
   - Architecture highlights
   - Key technical decisions
   - Performance metrics
   - Test coverage report
   - How to run/build/deploy
   - Comparison with old architecture
   - Any known limitations or future improvements
   - **Update master tracker: Mark project complete**

---

## Testing Requirements

### Test Coverage Targets

- **Overall:** 85% minimum
- **Business Logic:** 95% minimum
- **Data Layer:** 90% minimum
- **Components:** 80% minimum
- **Utils/Helpers:** 95% minimum

### Required Test Types

1. **Unit Tests** (for every module):

   - All business logic functions
   - All utility functions
   - All data transformations
   - All validators
   - Component logic (non-UI)
   - **Update test tracker:** After writing each test file

2. **Integration Tests** (for every feature):

   - Feature workflows end-to-end
   - Cross-module interactions
   - API endpoint integration
   - Database operations
   - Authentication flows
   - **Update test tracker:** After each integration test

3. **E2E Tests** (for critical paths):
   - Complete user workflows
   - Authentication flow
   - Main application features
   - Error scenarios
   - Edge cases
   - **Update test tracker:** After each E2E test

### Test File Organization

```
__tests__/
├── unit/
│   ├── auth/
│   │   ├── login.test.ts
│   │   ├── session.test.ts
│   │   └── validation.test.ts
│   ├── dashboard/
│   └── ...
├── integration/
│   ├── auth/
│   │   ├── auth-flow.test.ts
│   │   └── token-refresh.test.ts
│   ├── dashboard/
│   └── ...
└── e2e/
    ├── user-journey.test.ts
    ├── auth-flow.test.ts
    └── ...
```

### Test Documentation

- Each test file should have a header comment explaining what's being tested
- Complex test scenarios should be documented
- Edge cases should be explicitly called out
- **Update test tracker:** Document test coverage for each module

---

## How to Reference Old Code Effectively

### DO Reference Old Code For:

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

### DO NOT Copy From Old Code:

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

### Best Practice When Referencing

1. Open relevant files in oldapp/ folder
2. **Read and understand** what the code does and why
3. **Extract the requirements and logic** in your notes
4. **Update feature tracker:** Document what you're referencing
5. **Close the old code**
6. **Implement fresh** following the new architectural design
7. **Update feature tracker:** Note files created and oldapp references used
8. **Test for feature parity** with the old implementation
9. **Update test tracker:** Document test results

### Document Your References

In feature progress tracker and implementation log:

```markdown
## Files Referenced from OldApp

- `oldapp/src/auth/login.tsx` - Extracted login workflow logic
  - **What:** Form validation rules, error messages
  - **Why:** To ensure identical UX
  - **Implemented in:** `src/features/auth/components/login-form.tsx`
- `oldapp/src/lib/auth.ts` - Extracted JWT validation rules
  - **What:** Token expiry (30min), refresh logic
  - **Why:** To maintain session behavior
  - **Implemented in:** `src/features/auth/lib/jwt.ts`
```

---

## Implementation Guidelines

### File Organization

- Follow the exact structure from the architectural plan
- Use clear, descriptive file names
- Separate server and client code into appropriate directories
- Use proper file extensions (.ts, .tsx, .server.ts, .client.ts as appropriate)

### Code Quality

- Write clean, self-documenting code
- Use meaningful variable and function names
- Keep functions small and focused
- Avoid deep nesting (max 3-4 levels)
- Comment complex logic, but prefer clear code over comments
- Use consistent code style throughout

### TypeScript

- Use strict mode
- Avoid any types - use proper typing
- Create shared types in appropriate locations
- Use type inference where appropriate
- Define interfaces for complex objects

### Next.js 16 Best Practices

- Use Server Components by default
- Mark Client Components explicitly with 'use client'
- Use Server Actions for mutations
- Implement proper caching strategies
- Use async/await for data fetching
- Leverage Turbopack optimizations
- Use proper metadata API for SEO

### Component Design

- Keep components small and focused
- Use composition over inheritance
- Implement proper prop types
- Avoid prop drilling - use appropriate state management
- Flatten provider hierarchy
- Minimize client component boundaries

### State Management

- Use Server Components for server state
- Use React hooks for client state
- Implement context only where truly needed
- Keep context providers shallow
- Use URL state for shareable state
- Avoid unnecessary re-renders

### Data Fetching

- Fetch data in Server Components when possible
- Use Server Actions for mutations
- Implement proper loading states
- Handle errors gracefully
- Use appropriate caching strategies
- Avoid waterfalls - fetch in parallel where possible

### Error Handling

- Implement error boundaries at appropriate levels
- Provide helpful error messages
- Log errors appropriately
- Handle network failures gracefully
- Validate user input
- Handle edge cases

### Performance

- Implement code splitting as per the plan
- Use dynamic imports for heavy components
- Optimize images with Next.js Image component
- Minimize client-side JavaScript
- Implement proper caching
- Avoid unnecessary client components

---

## Critical Requirements Checklist

- ✅ **ZERO ERRORS** - No TypeScript, runtime, or build errors
- ✅ **STRICT ARCHITECTURE ADHERENCE** - Follow the plan exactly
- ✅ **FULL FEATURE PARITY** - All user functionality must work identically to oldapp/
- ✅ **COMPREHENSIVE TESTS** - 85%+ coverage with all tests passing
- ✅ **OPTIMAL & SIMPLE** - Clean, maintainable, non-complex code
- ✅ **PROPER RUNTIME BOUNDARIES** - Server/client/edge code correctly separated
- ✅ **SYSTEMATIC APPROACH** - Follow the workflow step by step
- ✅ **REFERENCE WISELY** - Use oldapp/ for requirements, not patterns
- ✅ **CONTINUOUS TRACKING** - Update all trackers in real-time
- ✅ **SESSION STATE CURRENT** - CURRENT-SESSION-STATE.md always reflects reality
- ✅ **DETAILED DOCUMENTATION** - Keep all progress logs current
- ✅ **QUALITY ASSURANCE** - Test thoroughly against oldapp/ behavior
- ✅ **NO SHORTCUTS** - Implement and test properly
- ✅ **CONSISTENCY** - Maintain consistent patterns throughout
- ✅ **NEW ARCHITECTURE ONLY** - Never copy old architectural patterns
- ✅ **HANDOFF READY** - Any agent can continue from current state

---

## Quality Checklist (verify continuously)

### Architecture

- [ ] Directory structure matches the new plan exactly (NOT oldapp structure)
- [ ] Module boundaries are respected
- [ ] Runtime boundaries (server/client/edge) are correct
- [ ] Dependencies match the designed graph
- [ ] Bundle splitting strategy is implemented
- [ ] No old architectural patterns copied

### Code Quality

- [ ] Zero TypeScript errors
- [ ] Zero runtime errors
- [ ] Zero build warnings
- [ ] All imports resolve correctly
- [ ] Code is clean and readable
- [ ] No over-engineering or unnecessary complexity
- [ ] No legacy patterns from oldapp/

### Testing

- [ ] All unit tests written and passing
- [ ] All integration tests written and passing
- [ ] All E2E tests written and passing
- [ ] Test coverage meets targets (85%+ overall)
- [ ] No skipped or disabled tests
- [ ] All edge cases covered
- [ ] Test tracker is up to date

### Functionality

- [ ] All features from oldapp/ are present
- [ ] User workflows match oldapp/ behavior exactly
- [ ] Edge cases from oldapp/ are handled
- [ ] Error scenarios are handled gracefully
- [ ] Loading states are implemented
- [ ] Feature parity verified by testing against oldapp/

### Performance

- [ ] Bundle sizes are optimal
- [ ] Initial load is fast
- [ ] Code splitting is effective
- [ ] Tree-shaking works properly
- [ ] No unnecessary client-side code
- [ ] Performance improved over oldapp/

### User Experience

- [ ] UI matches or improves oldapp/
- [ ] Responsive on all screen sizes
- [ ] Accessible (semantic HTML, ARIA)
- [ ] Smooth interactions
- [ ] Proper feedback for user actions
- [ ] All oldapp/ features work identically

### Tracking & Documentation (For Handoff)

- [ ] CURRENT-SESSION-STATE.md is current and accurate
- [ ] Master progress tracker is current
- [ ] All feature trackers are updated
- [ ] Test tracker reflects actual status
- [ ] Daily summaries are being created
- [ ] Implementation log is comprehensive
- [ ] All oldapp references are documented
- [ ] Any agent could resume from current state

---

## Deliverables

1. **Complete working application** with full feature parity to oldapp/
2. **Comprehensive test suite** with 85%+ coverage, all tests passing
3. **CURRENT-SESSION-STATE.md** - Always-current handoff document (most critical)
4. **MASTER-PROGRESS-TRACKER.md** - Central progress tracking (continuously updated)
5. **progress/[XX]-[feature-name]-progress.md** - Detailed tracker for each feature
6. **progress/daily/YYYY-MM-DD-summary.md** - Daily progress summaries
7. **TEST-PROGRESS-TRACKER.md** - Comprehensive testing progress
8. **IMPLEMENTATION-LOG.md** - Detailed log including oldapp references
9. **IMPLEMENTATION-COMPLETE.md** - Final documentation with comparison
10. **Zero-error codebase** - No TypeScript, runtime, or build errors
11. **Optimized bundle** - Following the planned bundle strategy
12. **Clean, maintainable code** - Following all guidelines and new architecture

---

## Important Reminders

> [!IMPORTANT] > **For AI Agent Continuity:**
>
> - **UPDATE CURRENT-SESSION-STATE.md CONSTANTLY** - This is the handoff document
> - **Be specific in resume points** - Tell the next agent EXACTLY where to pick up
> - **Document decisions and reasoning** - Future agents need context
> - **Track partial work** - If a function is half-written, document what's done and what remains
> - **Log oldapp references** - Future agents may need to review the same files

### General Reminders

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
- **Don't skip documentation** - future you (and other agents) will thank present you
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

### Your Core Mission

Build a production-ready, zero-error application that users cannot distinguish from the original (same features, same UX, same workflows) but that is internally superior in every way (better architecture, cleaner code, higher performance, more maintainable, comprehensively tested).

### Your Implementation Philosophy

1. **Architecture First**: The FINAL-ARCHITECTURE-OVERHAUL-PLAN.md is your bible. Every file, every component, every module must align with this plan. No deviations, no "quick fixes," no "temporary" shortcuts. The plan was designed for optimal outcomes—trust it and follow it exactly.

2. **User Parity, Internal Innovation**: Users experience identical functionality, but you achieve it through completely new, optimal implementations. The oldapp/ folder shows you WHAT to build (requirements, business logic, workflows), but never HOW to build it. Extract intelligence, never copy patterns.

3. **Systematic, Not Random**: Follow the phase-by-phase, feature-by-feature workflow methodically. Don't jump around. Don't skip steps. Don't defer testing. Don't batch updates. Work systematically through the implementation order, completing each piece fully before moving to the next.

4. **Radical Transparency**: Maintain real-time visibility into all progress through comprehensive tracking. Update MASTER-PROGRESS-TRACKER.md after every significant step. **Keep CURRENT-SESSION-STATE.md always current for agent handoff.** Keep feature trackers current. Log everything. Surface blockers immediately. Document decisions. Track test coverage. Create daily summaries. The tracking system is not bureaucracy—it's mission-critical visibility that enables course correction, demonstrates progress, and **allows seamless agent handoff**.

5. **Quality is Non-Negotiable**: Zero errors means ZERO errors—no TypeScript errors, no runtime errors, no build warnings, no failing tests, no broken functionality. Test coverage of 85%+ is mandatory, not aspirational. Every feature must be thoroughly tested with unit, integration, and E2E tests before being marked complete. Quality cannot be "added later"—it must be built in from the start.

6. **Simplicity Through Understanding**: When you encounter complexity in oldapp/, don't replicate it—understand WHY it exists, then implement the simplest solution that satisfies that requirement. Question every abstraction. Challenge every pattern. Avoid over-engineering. The best code is the code that's easy to understand and easy to change.

7. **Context Awareness**: You're building for Next.js 16 with Turbopack in 2024, not maintaining legacy code from years past. Use modern patterns, native features, and optimal approaches. Don't carry forward technical debt. Don't preserve backward compatibility with obsolete approaches. Build fresh for the current ecosystem.

8. **Integration Thinking**: Features don't exist in isolation. Constantly consider how each piece integrates with the whole system. Respect module boundaries. Honor dependency graphs. Test cross-module interactions. Ensure authentication flows work app-wide. Verify navigation and routing holistically. Think system, not just component.

9. **Test-Driven Confidence**: Tests are not an afterthought—they're how you know your implementation is correct. Write tests as you build. Test business logic thoroughly. Test integration points carefully. Test user workflows end-to-end. When tests pass, you have confidence. When coverage is comprehensive, you have protection. When the test suite is green, you can refactor fearlessly.

10. **Continuous Verification**: Constantly verify alignment with the architectural plan, check test coverage, run the test suite, verify build success, check for errors, test against oldapp/ behavior, and update trackers. Verification is continuous, not a phase. Quality is maintained through constant vigilance, not final inspection.

11. **Handoff-Ready at All Times**: **CRITICAL for agent continuity.** At any moment, your work could be interrupted and another agent may need to continue. Keep CURRENT-SESSION-STATE.md meticulously updated so any agent can pick up exactly where you left off. Document decisions, context, partial work, and exact resume points. Treat every update as if you're briefing your replacement.

### Your Success Criteria

- ✅ Application builds without errors or warnings
- ✅ All user features from oldapp/ work identically
- ✅ All workflows and interactions match oldapp/ behavior exactly
- ✅ Test suite is comprehensive (85%+ coverage) and fully green
- ✅ Architecture perfectly matches FINAL-ARCHITECTURE-OVERHAUL-PLAN.md
- ✅ Code is clean, simple, and maintainable
- ✅ Performance meets or exceeds oldapp/ benchmarks
- ✅ Bundle sizes are optimal per the plan
- ✅ Server/client/edge boundaries are correctly implemented
- ✅ CURRENT-SESSION-STATE.md accurately reflects current state (handoff-ready)
- ✅ All trackers are current and reflect actual status
- ✅ Documentation is complete and accurate
- ✅ No technical debt or shortcuts taken
- ✅ Feature parity verified through systematic testing
- ✅ System integration is seamless
- ✅ Edge cases and error scenarios are handled

### Begin Implementation

**Begin with Phase 1: Setup & Foundation**. Initialize the tracking system first—create CURRENT-SESSION-STATE.md (critical for handoff), MASTER-PROGRESS-TRACKER.md, the progress/ directory structure, and TEST-PROGRESS-TRACKER.md. Then proceed methodically through project setup, testing infrastructure, shared infrastructure, foundation layer, and foundation tests. Update trackers continuously. Document everything. Test thoroughly. Build with quality.

Remember: You're not just writing code—you're architecting a superior system while maintaining perfect user experience. Every decision matters. Every shortcut compromises the mission. Every untested feature is a liability. Every undocumented choice is technical debt. **Every incomplete session state update breaks handoff continuity.** Work systematically, build quality in, track everything, and deliver excellence.

**Start now. Initialize tracking (CURRENT-SESSION-STATE.md first!). Begin implementation. Build something remarkable.**
