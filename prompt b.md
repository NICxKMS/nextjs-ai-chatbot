# AI Agent Implementation System

**Version:** 2.0  
**Purpose:** Enable AI agents to implement a Next.js 16.1.0 application with full continuity, hierarchical tracking, and optimal context management

---

## Core Principles

### 1. Agent Continuity First

Any AI agent can be interrupted at any time and replaced by another agent who can immediately continue from the exact same point without loss of context or direction.

### 2. Hierarchical Context

Information is organized in layers. Agents load only what they need for their current task, with deeper context available on demand.

### 3. State-Based Recovery

The system maintains explicit state that answers: "Where am I? What was I doing? What do I do next?"

### 4. Atomic Progress Units

Every completable unit of work has its own tracking file, enabling granular progress and easy resumption.

### 5. Self-Documenting System

The tracking structure itself guides agents through the implementation without requiring external knowledge.

---

## Quick Start Protocol

When you first start or are resuming work:

### Step 1: Read Current State (30 seconds)

```bash
📍 READ: tracking/00-STATE.json
```

This single file tells you:

- Current phase (Setup/Implementation/Integration)
- Current feature being worked on
- Current task within that feature
- Last action taken
- Next action required
- Any blockers or context needed

### Step 2: Load Feature Context (60 seconds)

```bash
📍 READ: tracking/features/{current-feature}/STATUS.json
📍 READ: tracking/features/{current-feature}/PROGRESS.md
```

This gives you:

- Feature status (Not Started/In Progress/Testing/Blocked/Complete)
- Completed tasks
- Current task details
- Dependencies and blockers

### Step 3: Load Task Details (30 seconds)

```bash
📍 READ: tracking/features/{current-feature}/tasks/task-{current}.md
```

This provides:

- Specific task requirements
- Implementation guidance
- Files to create/modify
- Test requirements
- Definition of done

### Step 4: Execute + Update

Do the work, then update all three files above with progress.

**Total context load time: ~2 minutes to full productivity**

---

## Tracking Structure

```
tracking/
├── 00-STATE.json                 # 🔴 CRITICAL: Current system state (read first)
├── 01-OVERVIEW.md                # High-level dashboard
├── 02-TASK-GENERATOR.md          # How to bootstrap task lists
│
├── phases/
│   ├── phase-1-foundation/
│   │   ├── STATUS.md             # Phase-level status
│   │   ├── PLAN.md               # What this phase accomplishes
│   │   └── tasks/
│   │       ├── task-001-init-tracking.md
│   │       ├── task-002-setup-nextjs.md
│   │       └── ...
│   ├── phase-2-features/
│   │   └── STATUS.md
│   └── phase-3-integration/
│       └── STATUS.md
│
├── features/                     # 🟢 Feature-level tracking
│   ├── 01-auth/
│   │   ├── STATUS.json           # Machine-readable state
│   │   ├── PROGRESS.md           # Human-readable progress
│   │   ├── CONTEXT.md            # Feature-specific context notes
│   │   ├── tasks/
│   │   │   ├── task-001-data-layer.md
│   │   │   ├── task-002-business-logic.md
│   │   │   ├── task-003-server-components.md
│   │   │   ├── task-004-client-components.md
│   │   │   └── task-005-testing.md
│   │   └── logs/
│   │       ├── CHANGELOG.md      # Feature-specific changes
│   │       └── oldapp-refs.md    # What was referenced from old code
│   │
│   ├── 02-dashboard/
│   │   └── [same structure]
│   │
│   └── README.md                 # Feature directory guide
│
├── tests/
│   ├── STATUS.json               # Test execution state
│   ├── COVERAGE.md               # Coverage tracking
│   └── failures/
│       ├── current.md            # Active test failures
│       └── resolved.md           # Resolved failures log
│
├── daily/
│   ├── 2025-01-20.md
│   ├── 2025-01-21.md
│   └── current -> 2025-01-21.md  # Symlink to today
│
├── history/
│   ├── decisions.md              # Architectural decisions log
│   ├── blockers.md               # Blocker resolution history
│   └── milestones.md             # Major milestones achieved
│
└── reference/
    ├── architecture-summary.md   # Quick reference to arch plan
    ├── oldapp-mapping.md         # Map oldapp -> newapp structure
    └── conventions.md            # Coding conventions in use
```

---

## File Specifications

### 00-STATE.json (Critical State File)

**Purpose:** Single source of truth for current execution state  
**Update:** After every meaningful action  
**Size:** < 2KB, fast to read

```json
{
  "version": "2.0",
  "lastUpdated": "2025-01-21T14:35:22Z",
  "lastAgent": "claude-sonnet-4",
  "sessionId": "session-abc-123",

  "currentPhase": {
    "number": 2,
    "name": "features",
    "status": "in-progress",
    "progress": "35%"
  },

  "currentFeature": {
    "id": "01-auth",
    "name": "Authentication",
    "status": "in-progress",
    "progress": "60%",
    "path": "tracking/features/01-auth"
  },

  "currentTask": {
    "id": "task-003",
    "name": "Implement server components",
    "status": "in-progress",
    "progress": "40%",
    "path": "tracking/features/01-auth/tasks/task-003-server-components.md",
    "startedAt": "2025-01-21T13:45:00Z"
  },

  "lastAction": {
    "timestamp": "2025-01-21T14:35:22Z",
    "type": "file-created",
    "description": "Created src/features/auth/components/login-page.tsx",
    "filesModified": ["src/features/auth/components/login-page.tsx"]
  },

  "nextAction": {
    "type": "implement",
    "description": "Create logout-button.tsx client component",
    "context": "Need to implement logout functionality with loading state",
    "files": ["src/features/auth/components/logout-button.tsx"]
  },

  "blockers": [],

  "statistics": {
    "filesCreated": 147,
    "testsWritten": 89,
    "testsPassing": 85,
    "testsFailing": 4,
    "testCoverage": "78%",
    "featuresComplete": 1,
    "featuresInProgress": 1,
    "totalFeatures": 8
  },

  "contextPaths": {
    "overview": "tracking/01-OVERVIEW.md",
    "currentPhaseStatus": "tracking/phases/phase-2-features/STATUS.md",
    "currentFeatureStatus": "tracking/features/01-auth/STATUS.json",
    "currentFeatureProgress": "tracking/features/01-auth/PROGRESS.md",
    "currentTaskDetails": "tracking/features/01-auth/tasks/task-003-server-components.md"
  }
}
```

**Update Protocol:**

1. Read current state
2. Perform action
3. Update state with new information
4. Save state atomically

---

### 01-OVERVIEW.md (Dashboard)

**Purpose:** Human-readable high-level view  
**Update:** After completing any task/feature  
**Read When:** Need to understand overall progress

```markdown
# Implementation Overview

**Last Updated:** 2025-01-21 14:35:22 UTC  
**Overall Progress:** 35% Complete  
**Status:** Phase 2 - Feature Implementation

## Quick Stats

- ✅ Completed: 1 feature, 12 tasks
- 🔄 In Progress: 1 feature, 1 task
- ⏳ Not Started: 6 features, 47 tasks
- 🚫 Blocked: 0 features, 0 tasks
- ⚠️ Issues: 4 failing tests

## Current Focus

**Feature:** Authentication (01-auth) - 60% complete  
**Task:** Implement server components (task-003) - 40% complete  
**Action:** Creating logout-button.tsx component

## Phase Status

### Phase 1: Foundation ✅ 100%

- ✅ Tracking system initialized
- ✅ Next.js project configured
- ✅ Testing infrastructure ready
- ✅ Shared infrastructure complete

### Phase 2: Features 🔄 35%

- ✅ Authentication (completed)
- 🔄 User Dashboard (in progress)
- ⏳ Settings (not started)
- ⏳ [... other features]

### Phase 3: Integration ⏳ 0%

- ⏳ System integration
- ⏳ Testing completion
- ⏳ Performance optimization

## Recent Activity

- **14:35** - Created login-page.tsx component
- **14:22** - Implemented login form validation
- **14:15** - Added auth server actions
- **13:45** - Started server components task

## Next Steps

1. Complete logout-button.tsx component
2. Implement session management UI
3. Write integration tests for auth flow
4. Begin user dashboard feature

## Health Indicators

- 🟢 Build: Passing
- 🟡 Tests: 85/89 passing (4 failures)
- 🟢 Type Safety: No errors
- 🟢 Architecture: Compliant
```

---

### Feature STATUS.json

**Purpose:** Machine-readable feature state  
**Location:** tracking/features/{feature-id}/STATUS.json

```json
{
  "featureId": "01-auth",
  "featureName": "Authentication",
  "status": "in-progress",
  "progress": 60,
  "priority": "high",

  "timestamps": {
    "created": "2025-01-20T09:00:00Z",
    "started": "2025-01-20T09:30:00Z",
    "completed": null
  },

  "tasks": {
    "total": 5,
    "completed": 2,
    "inProgress": 1,
    "notStarted": 2,
    "blocked": 0
  },

  "currentTask": {
    "id": "task-003",
    "name": "Implement server components",
    "status": "in-progress",
    "progress": 40
  },

  "dependencies": {
    "requiredFeatures": [],
    "requiredTasks": ["task-001", "task-002"],
    "blockingFeatures": []
  },

  "tests": {
    "unit": { "total": 15, "passing": 15, "failing": 0 },
    "integration": { "total": 5, "passing": 3, "failing": 2 },
    "e2e": { "total": 2, "passing": 0, "failing": 0 }
  },

  "files": {
    "created": 12,
    "modified": 3,
    "deleted": 0
  },

  "oldappReferences": ["oldapp/src/auth/login.tsx", "oldapp/src/lib/jwt.ts"],

  "blockers": [],

  "notes": "Login flow working, need to complete logout and session refresh"
}
```

---

### Feature PROGRESS.md

**Purpose:** Human-readable detailed progress  
**Location:** tracking/features/{feature-id}/PROGRESS.md

```markdown
# Authentication Feature - Implementation Progress

**Feature ID:** 01-auth  
**Status:** 🔄 In Progress (60%)  
**Started:** 2025-01-20 09:30 UTC  
**Target Completion:** 2025-01-22 17:00 UTC

## Task Breakdown

### ✅ Task 001: Data Layer (100%)

- **Status:** Complete
- **Completed:** 2025-01-20 15:00 UTC
- **Files:** 8 created
- **Tests:** 15/15 passing
- **Notes:** All database models and server actions working

### ✅ Task 002: Business Logic (100%)

- **Status:** Complete
- **Completed:** 2025-01-21 11:30 UTC
- **Files:** 4 created
- **Tests:** 8/8 passing
- **Notes:** JWT validation and session management complete

### 🔄 Task 003: Server Components (40%)

- **Status:** In Progress
- **Started:** 2025-01-21 13:45 UTC
- **Progress:**
  - ✅ Created login-page.tsx
  - ✅ Implemented login form
  - 🔄 Creating logout-button.tsx (CURRENT)
  - ⏳ Session display component
  - ⏳ Protected route wrapper
- **Files:** 2/5 complete
- **Tests:** 0/5 written

### ⏳ Task 004: Client Components (0%)

- **Status:** Not Started
- **Dependencies:** Task 003 complete

### ⏳ Task 005: Testing & Integration (0%)

- **Status:** Not Started
- **Dependencies:** Tasks 003, 004 complete

## Implementation Details

### Files Created (12 total)

**Data Layer:**

- `src/features/auth/models/user.ts`
- `src/features/auth/models/session.ts`
- `src/features/auth/actions/login.ts`
- `src/features/auth/actions/logout.ts`
- `src/features/auth/actions/refresh.ts`
- [... 3 more]

**Business Logic:**

- `src/features/auth/lib/jwt.ts`
- `src/features/auth/lib/validation.ts`
- [... 2 more]

**Components:**

- `src/features/auth/components/login-page.tsx`
- `src/features/auth/components/login-form.tsx`

### Test Status

**Unit Tests:** 23/23 passing ✅

- Data layer: 15/15
- Business logic: 8/8

**Integration Tests:** 3/5 passing 🟡

- ✅ Login flow
- ✅ Token validation
- ✅ Session creation
- ❌ Token refresh (failing - investigating)
- ❌ Logout flow (not implemented yet)

**E2E Tests:** 0/2 written ⏳

- Login workflow (not started)
- Session expiry (not started)

### Test Failures

**1. Token Refresh Integration Test**

- **File:** `tests/integration/auth/token-refresh.test.ts:45`
- **Error:** `Expected valid token, received expired token`
- **Status:** Investigating
- **Context:** Refresh token not extending expiry correctly

## References from oldapp/

### Files Consulted

1. **oldapp/src/auth/login.tsx**

   - Extracted: Form validation rules, error messages
   - Used in: `src/features/auth/components/login-form.tsx`

2. **oldapp/src/lib/jwt.ts**

   - Extracted: Token expiry (30min), refresh logic
   - Used in: `src/features/auth/lib/jwt.ts`

3. **oldapp/src/models/user.ts**
   - Extracted: User schema, validation constraints
   - Used in: `src/features/auth/models/user.ts`

### Logic Extracted (Not Copied)

- JWT token expiry: 30 minutes
- Refresh token expiry: 7 days
- Password requirements: min 8 chars, 1 number, 1 special
- Session timeout: 2 hours of inactivity
- Max concurrent sessions: 3 per user

## Next Steps

1. **Immediate:** Complete logout-button.tsx component
2. **Today:** Finish task 003 server components
3. **Tomorrow:** Start task 004 client components
4. **This Week:** Complete auth feature including all tests

## Blockers & Issues

**Current:** None

**Resolved:**

1. **2025-01-21 10:15** - TypeScript error in session model
   - Fixed by updating interface definition
```

---

### Task File Template

**Location:** tracking/features/{feature-id}/tasks/task-{num}-{name}.md

````markdown
# Task 003: Implement Server Components

**Feature:** Authentication (01-auth)  
**Task ID:** task-003  
**Status:** 🔄 In Progress (40%)  
**Priority:** High

**Started:** 2025-01-21 13:45 UTC  
**Target:** 2025-01-21 18:00 UTC  
**Estimated Duration:** 4 hours

## Objective

Create all server-side components for the authentication feature, including login page, logout button, session display, and protected route wrappers.

## Prerequisites

✅ Task 001: Data layer complete  
✅ Task 002: Business logic complete  
⏳ Task 004: Blocked until this completes

## Components to Create

### 1. Login Page (Server Component) ✅

- **File:** `src/features/auth/components/login-page.tsx`
- **Status:** Complete
- **Description:** Main login page with form
- **Tests Required:** Integration test for page rendering

### 2. Login Form (Client Component) ✅

- **File:** `src/features/auth/components/login-form.tsx`
- **Status:** Complete
- **Description:** Interactive login form with validation
- **Tests Required:** Unit tests for validation, integration test for submission

### 3. Logout Button (Client Component) 🔄 CURRENT

- **File:** `src/features/auth/components/logout-button.tsx`
- **Status:** In Progress
- **Description:** Button that triggers logout action
- **Requirements:**
  - Call logout server action
  - Show loading state during logout
  - Handle errors gracefully
  - Redirect to login page on success
- **Tests Required:**
  - Unit test: Button renders correctly
  - Unit test: Loading state works
  - Integration test: Logout action called
  - Integration test: Redirect after logout

### 4. Session Display (Server Component) ⏳

- **File:** `src/features/auth/components/session-display.tsx`
- **Status:** Not Started
- **Description:** Shows current user session info
- **Requirements:**
  - Display username
  - Show session expiry countdown
  - Link to refresh session
- **Tests Required:** Integration test with mock session

### 5. Protected Route Wrapper (Server Component) ⏳

- **File:** `src/features/auth/components/protected-route.tsx`
- **Status:** Not Started
- **Description:** HOC that requires authentication
- **Requirements:**
  - Check for valid session
  - Redirect to login if not authenticated
  - Pass user data to children
- **Tests Required:** Integration test for auth check, redirect behavior

## Implementation Guidance

### Current Task: Logout Button

**Reference from oldapp:**

- `oldapp/src/components/LogoutButton.tsx` - See how logout was triggered
- Extract: Loading state pattern, error handling approach
- DO NOT copy: Component structure, state management

**Implementation Steps:**

1. Create file: `src/features/auth/components/logout-button.tsx`
2. Mark as client component with 'use client'
3. Import logout action from `@/features/auth/actions/logout`
4. Implement with:
   ```typescript
   - useState for loading/error state
   - Handle onClick -> call logout action
   - Show spinner during loading
   - Handle errors with toast/message
   - Redirect to /login on success
   ```
````

5. Add proper TypeScript types
6. Write unit tests immediately
7. Update this task file with progress

**Definition of Done:**

- [ ] Component file created
- [ ] Loading state works
- [ ] Error handling implemented
- [ ] Redirect works
- [ ] Unit tests written
- [ ] Tests passing
- [ ] No TypeScript errors

## Test Requirements

**Unit Tests (5):**

1. Logout button renders correctly
2. Loading state shows during logout
3. Error message displays on failure
4. Button disabled during loading
5. Success callback triggered on completion

**Integration Tests (3):**

1. Logout action called with correct params
2. Session cleared after logout
3. Redirect to login page works

**Acceptance Criteria:**

- All 8 tests passing
- Test coverage > 85% for created files
- No console errors or warnings

## Files to Create/Modify

**Create:**

- `src/features/auth/components/logout-button.tsx`
- `src/features/auth/components/session-display.tsx`
- `src/features/auth/components/protected-route.tsx`

**Modify:**

- None (new components)

**Test Files:**

- `tests/unit/auth/components/logout-button.test.tsx`
- `tests/unit/auth/components/session-display.test.tsx`
- `tests/integration/auth/protected-route.test.tsx`

## Progress Tracking

Update after each component completion:

- [x] login-page.tsx - ✅ Complete (2025-01-21 14:20)
- [x] login-form.tsx - ✅ Complete (2025-01-21 14:30)
- [ ] logout-button.tsx - 🔄 In Progress (started 14:35)
  - [x] File created
  - [x] Basic structure
  - [ ] Loading state (CURRENT WORK)
  - [ ] Error handling
  - [ ] Tests
- [ ] session-display.tsx - ⏳ Not Started
- [ ] protected-route.tsx - ⏳ Not Started

## Context for Next Agent

**What I'm doing right now:**
Implementing the loading state for the logout button. The component skeleton is created, now adding useState for loading status and disabled state for the button.

**What's already done:**
Login page and form are complete and tested. They're working correctly with the server actions from task 002.

**What's next:**
After finishing the loading state, need to add error handling with a toast notification, then write the 5 unit tests.

**Known issues:**
None currently - previous components integrated smoothly.

**Tips:**

- The logout action returns a redirect(), handle it properly
- Use React.useTransition() for better loading state
- Match the UX patterns from login form for consistency

## Time Tracking

- **Estimated:** 4 hours
- **Spent:** 1.5 hours
- **Remaining:** ~2.5 hours
- **On Track:** Yes

## Update Log

- **14:35** - Started logout-button.tsx component
- **14:30** - Completed login-form.tsx with all tests passing
- **14:20** - Completed login-page.tsx component
- **13:45** - Task started

````

---

## Agent Workflow

### When Starting Fresh

```bash
# 1. Read state (30 sec)
READ: tracking/00-STATE.json

# 2. Load current context (60 sec)
READ: tracking/features/{currentFeature}/STATUS.json
READ: tracking/features/{currentFeature}/PROGRESS.md

# 3. Load current task (30 sec)
READ: tracking/features/{currentFeature}/tasks/task-{current}.md

# 4. Check for any blockers
CHECK: STATUS.json → blockers array
CHECK: task file → blockers section

# 5. Begin work
EXECUTE: Follow task implementation guidance
````

### When Resuming After Interruption

```bash
# 1. Read state FIRST
READ: tracking/00-STATE.json

# This tells you:
# - What feature you were working on
# - What task within that feature
# - What specific action was last taken
# - What the next action should be
# - Any context needed to continue

# 2. Read the "Context for Next Agent" section
READ: tracking/features/{currentFeature}/tasks/task-{current}.md
FIND: "Context for Next Agent" section

# This gives you:
# - What was being worked on right now
# - What's already completed
# - What's next to do
# - Any gotchas or tips

# 3. Continue seamlessly
EXECUTE: Next action from STATE.json
```

### During Work

```bash
# After each meaningful action:

# 1. Update task progress
EDIT: tracking/features/{feature}/tasks/task-{num}.md
  - Check off completed items
  - Update progress percentage
  - Add timestamp to update log
  - Update "Context for Next Agent"

# 2. Update feature status
EDIT: tracking/features/{feature}/STATUS.json
  - Update task progress
  - Update file counts
  - Add any new oldapp references

# 3. Update system state
EDIT: tracking/00-STATE.json
  - Update lastAction
  - Update nextAction
  - Update currentTask progress
  - Update statistics
  - Update timestamp

# 4. If task complete, update feature progress
EDIT: tracking/features/{feature}/PROGRESS.md
  - Mark task as complete
  - Update overall feature progress
  - Log completion in update log

# 5. If feature complete, update overview
EDIT: tracking/01-OVERVIEW.md
  - Update feature status
  - Update phase progress
  - Update overall percentage
  - Log in recent activity
```

### When Blocked

```bash
# 1. Document blocker immediately
EDIT: tracking/00-STATE.json
  - Add to blockers array with details

# 2. Update task file
EDIT: tracking/features/{feature}/tasks/task-{num}.md
  - Add to "Blockers & Issues" section
  - Update status to "blocked"

# 3. Update feature status
EDIT: tracking/features/{feature}/STATUS.json
  - Set status to "blocked"
  - Add to blockers array

# 4. Surface in overview
EDIT: tracking/01-OVERVIEW.md
  - Add to blockers section
  - Update health indicators

# 5. Pivot to unblocked work
READ: tracking/01-OVERVIEW.md
FIND: Next available unblocked task
UPDATE: 00-STATE.json with new current task
```

---

## Task Generation System

### Initial Bootstrap

When starting the implementation for the first time, generate the complete task list:

**Step 1: Read Architecture Plan**

```bash
READ: FINAL-ARCHITECTURE-OVERHAUL-PLAN.md
READ: 00-MASTER-TASK-LIST.md (if exists)
READ: Each feature optimal design file
```

**Step 2: Generate Phase 1 Tasks**

```bash
CREATE: tracking/phases/phase-1-foundation/tasks/

Tasks to generate:
- task-001-init-tracking-system.md
- task-002-setup-nextjs-project.md
- task-003-configure-typescript.md
- task-004-setup-testing-framework.md
- task-005-create-shared-types.md
- task-006-implement-shared-utilities.md
- task-007-setup-database-schema.md
- task-008-implement-auth-infrastructure.md
- [... continue based on architecture plan]
```

**Step 3: Generate Feature Tasks**

For each feature in the architecture plan:

```bash
CREATE: tracking/features/{feature-id}/

Generate standard tasks:
- task-001-data-layer.md
- task-002-business-logic.md
- task-003-server-components.md
- task-004-client-components.md
- task-005-testing-integration.md

Customize based on feature complexity:
- Add extra tasks for complex features
- Merge tasks for simple features
- Add feature-specific tasks as needed
```

**Step 4: Create Task Templates**

Use this template for each task:

```markdown
# Task {num}: {Name}

**Feature:** {Feature Name} ({feature-id})  
**Task ID:** task-{num}  
**Status:** ⏳ Not Started  
**Priority:** [High/Medium/Low]

## Objective

[Clear description of what this task accomplishes]

## Prerequisites

[List required completed tasks]

## Checklist

- [ ] [Specific item 1]
- [ ] [Specific item 2]
- [ ] [... items from architecture plan]

## Implementation Guidance

[Extracted from optimal design file]

## Files to Create/Modify

**Create:**

- [List files to create]

**Modify:**

- [List files to modify]

## Test Requirements

- Unit tests: [Number] tests
- Integration tests: [Number] tests
- Test coverage target: [XX]%

## Definition of Done

- [ ] All checklist items complete
- [ ] All tests written and passing
- [ ] No TypeScript errors
- [ ] Files created/modified as planned
- [ ] Documented in changelog

## Context for Next Agent

[Leave blank initially, fill during implementation]

## Time Estimate

**Estimated:** [X] hours
```

**Step 5: Create Feature STATUS.json Templates**

```bash
FOR EACH feature:
  CREATE: tracking/features/{feature-id}/STATUS.json

  Initialize with:
  - Feature metadata
  - Task list (total count from generated tasks)
  - All tasks marked "not-started"
  - Empty dependencies array
  - Empty blockers array
```

**Step 6: Initialize System State**

```bash
CREATE: tracking/00-STATE.json

Initialize with:
- currentPhase: phase-1-foundation
- currentFeature: null (starting with foundation)
- currentTask: task-001-init-tracking-system
- lastAction: "System initialized"
- nextAction: "Initialize tracking system"
- All statistics at zero
```

### Task Generator Script

Create `tracking/02-TASK-GENERATOR.md` with instructions:

````markdown
# Task Generator Instructions

When you need to generate tasks for a feature:

## 1. Read the Feature Design

```bash
READ: docs/features/{feature-id}-optimal-design.md
```
````

Extract:

- Components to build
- Server/client boundaries
- Data requirements
- Business logic
- Testing requirements

## 2. Identify Task Breakdown

Standard breakdown:

1. **Data Layer** - Models, schemas, database access
2. **Business Logic** - Core logic, validations, transformations
3. **Server Components** - Pages, layouts, server-side UI
4. **Client Components** - Interactive UI, client state
5. **Testing** - Unit, integration, E2E tests

Adjust based on complexity:

- Simple feature: Merge tasks 1-2, 3-4
- Complex feature: Split tasks further
- API-heavy: Add dedicated API task

## 3. Create Task Files

For each identified task:

```bash
CREATE: tracking/features/{feature-id}/tasks/task-{num}-{name}.md
```

Use template from above, fill in:

- Objective from design doc
- Prerequisites from dependency graph
- Checklist from component list
- Files from architecture plan
- Tests from coverage requirements

## 4. Update Feature Status

```bash
EDIT: tracking/features/{feature-id}/STATUS.json
```

Set total task count to match generated tasks.

## 5. Link in Overview

```bash
EDIT: tracking/01-OVERVIEW.md
```

Add feature to appropriate phase section.

## Example: Generating Dashboard Feature Tasks

1. Read `docs/features/02-dashboard-optimal-design.md`
2. Identify components:
   - Dashboard page (server)
   - Stats widgets (server)
   - Activity feed (client)
   - Quick actions (client)
3. Create tasks:
   - task-001-dashboard-data-layer.md
   - task-002-dashboard-business-logic.md
   - task-003-dashboard-server-components.md
   - task-004-dashboard-client-components.md
   - task-005-dashboard-testing.md
4. Update STATUS.json with 5 tasks
5. Add to overview under phase 2

````

---

## Optimization Strategies

### Minimize Context Loading

**Principle:** Only read what you need for your current work

```bash
# For current task execution:
READ: 00-STATE.json (required)
READ: features/{current}/tasks/task-{current}.md (required)
READ: features/{current}/STATUS.json (required)

# Skip unless needed:
SKIP: 01-OVERVIEW.md (only for orientation)
SKIP: Other feature directories (unless dependency)
SKIP: History files (unless researching past decisions)
SKIP: Daily logs (unless need context)
````

### Efficient Updates

**Principle:** Batch related updates together

```bash
# After completing a component:
UPDATE: [
  tracking/features/{feature}/tasks/task-{current}.md,
  tracking/features/{feature}/STATUS.json,
  tracking/00-STATE.json
]

# After completing a task:
UPDATE: [
  tracking/features/{feature}/tasks/task-{current}.md,
  tracking/features/{feature}/PROGRESS.md,
  tracking/features/{feature}/STATUS.json,
  tracking/00-STATE.json,
  tracking/01-OVERVIEW.md
]
```

### Context Caching

**Principle:** Keep frequently accessed files in memory

```bash
CACHE: tracking/00-STATE.json (re-read every 10 minutes)
CACHE: tracking/features/{current}/STATUS.json (re-read every 5 minutes)
CACHE: Current task file (re-read on every update)

INVALIDATE: On explicit updates
```

---

## Reference from oldapp/

### When to Reference

✅ **DO Reference For:**

- Business rules and logic
- Validation constraints
- Data models and relationships
- User workflows
- API integrations
- Edge case handling
- Error messages
- Configuration values

❌ **DO NOT Copy:**

- Component architecture
- File structure
- State management patterns
- Routing approach
- Complex abstractions
- Legacy workarounds

### How to Reference

```bash
# 1. Understand what you're building
READ: tracking/features/{feature}/tasks/task-{current}.md

# 2. Find relevant oldapp files
FIND: oldapp/ files related to current component

# 3. Extract requirements
READ: oldapp file
EXTRACT: What it does, not how it does it
DOCUMENT: In task file under "oldapp References"

# 4. Close old file, implement fresh
CLOSE: oldapp file
IMPLEMENT: Using new architecture patterns

# 5. Verify parity
TEST: New implementation against old behavior
VERIFY: User experience is identical
```

### Documentation Template

In task file:

```markdown
## References from oldapp/

### oldapp/src/auth/login.tsx

**What was extracted:**

- Form validation rules (email regex, password min length)
- Error messages for invalid credentials
- Loading state behavior during submission
- Redirect path after successful login

**Why needed:**
To ensure identical UX and validation behavior

**Applied in:**

- `src/features/auth/components/login-form.tsx` (validation)
- `src/features/auth/lib/validation.ts` (rules)

**Implementation approach:**
Extracted rules into separate validation module, applied in form with new React Hook Form pattern (old used Formik)
```

In feature changelog:

```markdown
## oldapp References Log

### 2025-01-21 14:30

- **File:** `oldapp/src/auth/login.tsx`
- **Extracted:** Form validation logic
- **Applied in:** `login-form.tsx`
- **Agent:** claude-sonnet-4

### 2025-01-21 13:50

- **File:** `oldapp/src/lib/jwt.ts`
- **Extracted:** Token expiry constants (30min access, 7d refresh)
- **Applied in:** `auth/lib/jwt.ts`
- **Agent:** claude-sonnet-4
```

---

## Testing Integration

### Test State Tracking

**File:** tracking/tests/STATUS.json

```json
{
  "lastUpdated": "2025-01-21T14:35:22Z",
  "overall": {
    "total": 152,
    "passing": 145,
    "failing": 7,
    "skipped": 0,
    "coverage": "78%"
  },
  "byType": {
    "unit": {"total": 98, "passing": 95, "failing": 3},
    "integration": {"total": 42, "passing": 40, "failing": 2},
    "e2e": {"total": 12, "passing": 10, "failing": 2}
  },
  "byFeature": {
    "auth": {
      "unit": {"total": 23, "passing": 23, "failing": 0},
      "integration": {"total": 8, "passing": 6, "failing": 2},
      "e2e": {"total": 2, "passing": 2, "failing": 0},
      "coverage": "92%"
    },
    "dashboard": {
      "unit": {"total": 0, "passing": 0, "failing": 0},
      "integration": {"total": 0, "passing": 0, "failing": 0},
      "e2e": {"total": 0, "passing": 0, "failing": 0},
      "coverage": "0%"
    }
  },
  "failures": {
    "critical": [
      {
        "id": "fail-001",
        "test": "auth/token-refresh.test.ts:45",
        "error": "Expected valid token, received expired",
        "feature": "auth",
        "type": "integration",
        "since": "2025-01-21T13:00:00Z",
        "assignedTo": "current"
      }
    ],
    "nonCritical": [...]
  },
  "targets": {
    "overallCoverage": "85%",
    "featureCoverage": "90%",
    "passingRate": "100%"
  }
}
```

### Test Workflow

```bash
# After writing a test:
1. Run test suite
2. UPDATE: tracking/tests/STATUS.json
   - Increment total count
   - Update passing/failing
   - Update coverage
3. UPDATE: tracking/features/{feature}/STATUS.json
   - Update test counts for feature
4. UPDATE: tracking/features/{feature}/PROGRESS.md
   - Log test creation in task section

# When test fails:
1. DOCUMENT: In tracking/tests/failures/current.md
2. ADD: To STATUS.json failures array
3. UPDATE: Task file with failure info
4. SET: Feature status to "testing" not "complete"

# When fixing a test:
1. MOVE: From failures/current.md to failures/resolved.md
2. REMOVE: From STATUS.json failures array
3. UPDATE: Test counts (failing → passing)
4. LOG: Resolution in feature progress
```

---

## Daily Workflow

### Morning Routine

```bash
# 1. Check where you left off (1 min)
READ: tracking/00-STATE.json

# 2. Review yesterday's progress (2 min)
READ: tracking/daily/{yesterday}.md

# 3. Check for any blockers (1 min)
CHECK: 00-STATE.json → blockers array

# 4. Load current context (2 min)
READ: Current feature STATUS.json
READ: Current task file

# 5. Begin work (6 min total to full speed)
```

### During Work

```bash
# Update after each meaningful action:
UPDATE: 00-STATE.json (30 sec)
UPDATE: Task file (1 min)

# Update after each completed component:
UPDATE: Feature PROGRESS.md (2 min)
UPDATE: Feature STATUS.json (1 min)
```

### End of Day

```bash
# 1. Create daily summary (10 min)
CREATE: tracking/daily/YYYY-MM-DD.md

Include:
- Work session duration
- Features/tasks worked on
- Components created/modified
- Tests written/fixed
- Blockers encountered/resolved
- Tomorrow's plan
- Progress metrics

# 2. Final state update
UPDATE: tracking/00-STATE.json
  - Set nextAction for tomorrow
  - Update context for next agent
  - Document any open issues

# 3. Commit tracking changes
COMMIT: All tracking files
MESSAGE: "EOD: {Summary of day's progress}"
```

---

## Architecture Compliance

### Verification Checklist

After each file creation:

```bash
CHECK: File location matches architecture plan
CHECK: Server/client directive is correct
CHECK: Imports respect module boundaries
CHECK: No circular dependencies
CHECK: Correct runtime (server/client/edge)
CHECK: TypeScript types are strict
CHECK: Tests are colocated appropriately
```

### Compliance Tracking

**File:** tracking/history/architecture-compliance.md

```markdown
# Architecture Compliance Log

## Verified Modules

### auth (01-auth)

- ✅ Module boundary respected
- ✅ Server/client split correct
- ✅ No circular dependencies
- ✅ All types properly exported
- ✅ Tests properly structured

**Verification Date:** 2025-01-21  
**Verified By:** claude-sonnet-4

## Non-Compliance Issues

### Resolved

1. **Issue:** Circular dependency between auth/actions and auth/lib
   - **Detected:** 2025-01-21 10:30
   - **Resolved:** 2025-01-21 10:45
   - **Solution:** Moved shared types to auth/types

### Active

None

## Next Verification

**Module:** dashboard (02-dashboard)  
**Scheduled:** After task-005 complete
```

---

## Error Recovery

### When Build Fails

```bash
# 1. Document the error
CREATE: tracking/history/errors/error-YYYY-MM-DD-HHMM.md
INCLUDE: Full error message, stack trace, context

# 2. Mark as blocker
UPDATE: tracking/00-STATE.json
  ADD: To blockers array
  SET: nextAction = "Fix build error"

# 3. Investigate
IDENTIFY: Which file/change caused error
REVIEW: Recent commits/changes
CHECK: Similar errors in history

# 4. Fix
IMPLEMENT: Fix for the error
TEST: Build succeeds
VERIFY: Tests still pass

# 5. Document resolution
UPDATE: error file with resolution
MOVE: To tracking/history/errors/resolved/
UPDATE: 00-STATE.json (remove from blockers)
LOG: In daily summary
```

### When Tests Fail

```bash
# 1. Document failure
UPDATE: tracking/tests/failures/current.md
ADD: To tracking/tests/STATUS.json failures array

# 2. Triage
CLASSIFY: Critical or non-critical
ASSIGN: Priority (high/medium/low)
IDENTIFY: Root cause

# 3. Fix or defer
IF critical: Fix immediately before proceeding
IF non-critical: Document, continue, fix in testing phase

# 4. Track resolution
WHEN fixed:
  MOVE: To failures/resolved.md
  UPDATE: STATUS.json
  LOG: Resolution approach
```

---

## Best Practices

### State Updates

✅ **DO:**

- Update 00-STATE.json after every meaningful action
- Keep nextAction clear and specific
- Include context for next agent
- Update timestamps accurately
- Keep blockers array current

❌ **DON'T:**

- Batch updates at end of day
- Leave stale nextAction
- Forget to remove resolved blockers
- Update without timestamps

### Task Files

✅ **DO:**

- Update "Context for Next Agent" constantly
- Check off items as you complete them
- Log updates with timestamps
- Keep definition of done clear
- Document blockers immediately

❌ **DON'T:**

- Leave context section empty
- Mark complete without all items done
- Skip timestamp logging
- Assume next agent knows context

### Testing

✅ **DO:**

- Write tests immediately after code
- Update test status in real-time
- Document failures with full context
- Track coverage per feature
- Fix critical failures before proceeding

❌ **DON'T:**

- Defer testing to later
- Skip test status updates
- Leave failing tests undocumented
- Continue with critical failures

### oldapp References

✅ **DO:**

- Document every reference made
- Extract logic, not patterns
- Verify feature parity
- Log what was extracted and why
- Keep reference log updated

❌ **DON'T:**

- Copy architecture or structure
- Forget to document references
- Assume parity without testing
- Reference without understanding

---

## Success Metrics

### Agent Continuity

- ✅ New agent can resume work in < 3 minutes
- ✅ No information loss between agent switches
- ✅ Clear next actions at all times
- ✅ Complete context available when needed

### Progress Visibility

- ✅ Current state readable in < 1 minute
- ✅ Feature progress clear without digging
- ✅ Blockers surfaced immediately
- ✅ Test status always current

### Code Quality

- ✅ Zero TypeScript errors
- ✅ Zero build errors
- ✅ 85%+ test coverage
- ✅ All critical tests passing
- ✅ Architecture compliant

### Implementation Velocity

- ✅ Clear task breakdown enables steady progress
- ✅ Minimal context switching overhead
- ✅ Efficient updates don't slow work
- ✅ Blockers resolved quickly

### Feature Parity

- ✅ All oldapp features present
- ✅ User workflows identical
- ✅ Edge cases handled
- ✅ Parity verified through testing

---

## Getting Started

### For First Agent

```bash
# 1. Initialize tracking system (30 min)
CREATE: tracking/ directory structure
CREATE: 00-STATE.json (initial state)
CREATE: 01-OVERVIEW.md (empty dashboard)
CREATE: 02-TASK-GENERATOR.md (from above)

# 2. Generate initial tasks (2-3 hours)
READ: FINAL-ARCHITECTURE-OVERHAUL-PLAN.md
READ: All feature optimal design files
GENERATE: Phase 1 tasks
GENERATE: Feature task structures
CREATE: All task files with templates

# 3. Initialize state (15 min)
UPDATE: 00-STATE.json with first task
UPDATE: 01-OVERVIEW.md with structure
CREATE: phases/phase-1/STATUS.md

# 4. Begin implementation
START: Phase 1, Task 001
FOLLOW: Workflow above
```

### For Subsequent Agents

```bash
# 1. Read current state (30 sec)
READ: tracking/00-STATE.json

# 2. Load context (2 min)
READ: Current feature STATUS.json
READ: Current task file

# 3. Continue work (3 min to full speed)
EXECUTE: nextAction from STATE.json
UPDATE: As you progress
```

---

## Appendix: File Templates

### Quick Reference: What to Update When

**After creating a file:**

- 00-STATE.json → lastAction, nextAction, statistics
- Task file → progress checklist, context section
- Feature STATUS.json → files created count

**After completing a component:**

- Task file → check off item, update progress %
- Feature PROGRESS.md → log completion
- 00-STATE.json → update statistics

**After completing a task:**

- Task file → mark complete, final timestamp
- Feature STATUS.json → increment completed tasks
- Feature PROGRESS.md → mark task complete
- 00-STATE.json → move to next task
- 01-OVERVIEW.md → update recent activity

**After completing a feature:**

- Feature STATUS.json → status = "complete"
- Feature PROGRESS.md → mark 100%, completion time
- 01-OVERVIEW.md → feature to completed section
- 00-STATE.json → move to next feature
- Daily summary → log feature completion

**When blocked:**

- 00-STATE.json → add to blockers
- Task file → document in blockers section
- Feature STATUS.json → add to blockers
- 01-OVERVIEW.md → surface in dashboard

**When test fails:**

- tracking/tests/STATUS.json → add to failures
- tracking/tests/failures/current.md → document
- Task file → note failure
- Feature PROGRESS.md → log in test section

---

## Summary

This system enables perfect AI agent continuity through:

1. **Hierarchical State** - Load only what you need, always know where you are
2. **Atomic Progress** - Every task is self-contained and resumable
3. **Explicit Next Actions** - Never wonder what to do next
4. **Context Preservation** - All information available but not overwhelming
5. **Real-time Tracking** - Always current, always accurate

**Core Files:**

- `00-STATE.json` - Where am I? What's next?
- `features/{id}/STATUS.json` - Feature state machine
- `features/{id}/tasks/task-{num}.md` - Current work details

**Update Frequency:**

- After every meaningful action (00-STATE.json)
- After every component (task file)
- After every task (feature + overview)
- End of day (daily summary)

**Read Frequency:**

- On start/resume (STATE.json always)
- Current task (constantly)
- Feature status (frequently)
- Overview (occasionally)

Follow this system and any agent can pick up exactly where any other left off, with full context and clear direction.

---

**Ready to implement? Read `tracking/00-STATE.json` and begin.**
