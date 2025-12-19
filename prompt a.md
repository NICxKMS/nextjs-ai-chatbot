# AI Agent Implementation Framework

## Next.js 16 Architectural Overhaul - Continuity-First Design

---

# CORE PRINCIPLES FOR AI AGENT CONTINUITY

This framework is designed for **stateless AI agents** that may be interrupted at any moment. Any agent should be able to:

1. **Start immediately** by reading a single entry-point file
2. **Load only required context** for the current task
3. **Access historical context** when needed (not by default)
4. **Save state atomically** at every step
5. **Hand off seamlessly** to the next agent

---

# TRACKING SYSTEM ARCHITECTURE

## Directory Structure

```
.track/
├── START.md                          # ⚡ ENTRY POINT - Read this first, always
├── state.json                        # Machine-readable current state
│
├── queue/                            # Task management
│   ├── active.md                     # Currently active task (single file)
│   ├── next.md                       # Next prioritized tasks (top 5)
│   ├── blocked.md                    # Blocked tasks with reasons
│   └── backlog.md                    # Full task backlog
│
├── master/                           # Project-level information
│   ├── overview.md                   # Project summary & goals
│   ├── architecture.md               # Architecture quick reference
│   ├── progress.md                   # Overall progress dashboard
│   ├── dependencies.md               # Task dependency graph
│   └── decisions.md                  # Architectural decisions log
│
├── phases/                           # Phase-level tracking
│   ├── 1-setup/
│   │   ├── _status.md                # Phase status summary
│   │   ├── 1.1-project-init/
│   │   │   ├── task.md               # Task definition
│   │   │   ├── progress.md           # Progress log
│   │   │   └── complete.md           # Completion record (when done)
│   │   ├── 1.2-testing-setup/
│   │   └── ...
│   │
│   ├── 2-features/
│   │   ├── _status.md
│   │   ├── 2.1-auth/
│   │   │   ├── task.md               # Feature task definition
│   │   │   ├── requirements.md       # Extracted requirements
│   │   │   ├── progress.md           # Implementation progress
│   │   │   ├── tests.md              # Test status
│   │   │   ├── oldapp-refs.md        # OldApp references used
│   │   │   └── complete.md           # Completion record
│   │   ├── 2.2-dashboard/
│   │   └── ...
│   │
│   └── 3-integration/
│       ├── _status.md
│       └── ...
│
├── tests/                            # Testing tracking
│   ├── summary.md                    # Test overview dashboard
│   ├── unit.md                       # Unit test status
│   ├── integration.md                # Integration test status
│   └── e2e.md                        # E2E test status
│
├── logs/                             # Historical logs
│   ├── sessions/                     # Per-session logs
│   │   └── YYYY-MM-DD-HHmm.md        # Session log
│   ├── errors.md                     # Error log
│   └── changes.md                    # File change log
│
└── context/                          # Extracted context from oldapp
    ├── index.md                      # Index of extracted context
    ├── business-rules/
    ├── data-models/
    ├── validation/
    └── workflows/
```

---

# CRITICAL FILES - DETAILED SPECIFICATIONS

## 1. START.md (Entry Point)

**Purpose:** Single file any agent reads first. Contains everything needed to continue work immediately.

```markdown
# 🚀 AGENT START HERE

**Last Updated:** 2024-01-15 14:32:00 UTC
**Last Agent Session:** 2024-01-15 14:30:00 - 14:32:00 UTC

## Current Status: 🔄 IN PROGRESS

**Phase:** 2 - Feature Implementation
**Overall Progress:** 34% complete
**Build Status:** ✅ Passing
**Tests Status:** ✅ 47/47 passing

---

## 🎯 ACTIVE TASK

**Task:** Authentication - Server Actions
**Task File:** `.track/phases/2-features/2.1-auth/progress.md`
**Step:** Implementing `loginAction()` server action
**Priority:** P1 - Critical Path

### Quick Context

- Implementing login server action following new architecture
- Using extracted validation rules from oldapp
- JWT approach decided (see `.track/master/decisions.md#DEC-003`)

### Last Action Completed

- ✅ Created `src/features/auth/actions/login.ts` skeleton
- ✅ Implemented input validation with Zod schema

### Next Immediate Action

1. Implement JWT token generation in `loginAction()`
2. Add error handling for invalid credentials
3. Write unit tests for login action

### Files Currently Being Modified

- `src/features/auth/actions/login.ts` (in progress)
- `src/features/auth/lib/jwt.ts` (needs creation)

---

## 📋 HOW TO CONTINUE

1. Read active task details: `.track/phases/2-features/2.1-auth/progress.md`
2. Check requirements if needed: `.track/phases/2-features/2.1-auth/requirements.md`
3. Continue from "Next Immediate Action" above
4. Update this file after EVERY significant step
5. Update `state.json` to match

---

## ⚠️ BLOCKERS (0 active)

None currently.

---

## 📊 QUICK STATS

| Metric            | Value      |
| ----------------- | ---------- |
| Features Complete | 1/8        |
| Current Feature   | Auth (45%) |
| Tests Written     | 47         |
| Test Coverage     | 28%        |
| Files Created     | 34         |
| TypeScript Errors | 0          |
| Build Warnings    | 0          |

---

## 🔗 QUICK LINKS

- **Active Task:** `.track/phases/2-features/2.1-auth/progress.md`
- **Architecture:** `.track/master/architecture.md`
- **Full Progress:** `.track/master/progress.md`
- **Task Queue:** `.track/queue/next.md`
- **Decisions:** `.track/master/decisions.md`

---

## 📝 HANDOFF NOTES

[Any special notes from previous agent session]

- Session ended mid-implementation of login action
- JWT secret should use env variable AUTH_SECRET
- Refer to oldapp/src/lib/auth.ts for token expiry logic (30 min)
```

---

## 2. state.json (Machine-Readable State)

**Purpose:** Programmatically parseable state for quick status checks and automation.

```json
{
  "meta": {
    "lastUpdated": "2024-01-15T14:32:00Z",
    "lastAgentSession": {
      "start": "2024-01-15T14:30:00Z",
      "end": "2024-01-15T14:32:00Z"
    },
    "version": "1.0.0"
  },
  "status": {
    "overall": "in-progress",
    "phase": 2,
    "phaseProgress": 0.15,
    "overallProgress": 0.34,
    "buildPassing": true,
    "testsPassing": true,
    "typeErrorCount": 0,
    "warningCount": 0
  },
  "activeTask": {
    "id": "2.1.3",
    "name": "Auth - Server Actions",
    "phase": 2,
    "feature": "auth",
    "step": "server-actions",
    "file": ".track/phases/2-features/2.1-auth/progress.md",
    "priority": "P1",
    "startedAt": "2024-01-15T13:00:00Z",
    "progress": 0.45
  },
  "lastCompleted": {
    "id": "2.1.2",
    "name": "Auth - Data Layer",
    "completedAt": "2024-01-15T12:45:00Z"
  },
  "blockers": [],
  "tests": {
    "unit": { "passing": 35, "failing": 0, "total": 35 },
    "integration": { "passing": 12, "failing": 0, "total": 12 },
    "e2e": { "passing": 0, "failing": 0, "total": 0 },
    "coverage": 0.28
  },
  "features": {
    "auth": { "status": "in-progress", "progress": 0.45 },
    "dashboard": { "status": "not-started", "progress": 0 },
    "settings": { "status": "not-started", "progress": 0 }
  },
  "phases": {
    "1-setup": { "status": "complete", "progress": 1.0 },
    "2-features": { "status": "in-progress", "progress": 0.15 },
    "3-integration": { "status": "not-started", "progress": 0 }
  }
}
```

---

## 3. Task File Structure (Atomic Task Unit)

**Location:** `.track/phases/{phase}/{task-id}/task.md`

```markdown
# Task: [Task Name]

**ID:** 2.1 (Auth Feature)
**Phase:** 2 - Feature Implementation
**Priority:** P1 - Critical Path
**Status:** 🔄 In Progress

---

## Overview

Brief description of what this task accomplishes.

---

## Prerequisites

| Dependency                | Status      | Notes |
| ------------------------- | ----------- | ----- |
| 1.1 Project Init          | ✅ Complete |       |
| 1.2 Testing Setup         | ✅ Complete |       |
| 1.4 Shared Infrastructure | ✅ Complete |       |

---

## Scope

### In Scope

- User authentication (login/logout)
- Session management
- JWT token handling
- Auth middleware

### Out of Scope

- OAuth/social login (separate task)
- Password reset (separate task)
- User registration (separate task)

---

## Implementation Checklist

### Step 1: Data Layer

- [ ] User model/schema
- [ ] Session model/schema
- [ ] Data access functions
- [ ] Database migrations

### Step 2: Business Logic

- [ ] Authentication logic
- [ ] Token generation/validation
- [ ] Session management
- [ ] Password hashing

### Step 3: Server Actions

- [ ] `loginAction()`
- [ ] `logoutAction()`
- [ ] `refreshTokenAction()`
- [ ] `validateSessionAction()`

### Step 4: Middleware

- [ ] Auth middleware
- [ ] Protected route handling
- [ ] Token refresh logic

### Step 5: Components

- [ ] LoginForm (client)
- [ ] AuthProvider (client)
- [ ] ProtectedRoute wrapper

### Step 6: Testing

- [ ] Unit tests (90%+ coverage)
- [ ] Integration tests
- [ ] E2E login flow test

---

## Files to Create
```

src/features/auth/
├── models/
│ ├── user.ts
│ └── session.ts
├── actions/
│ ├── login.ts
│ ├── logout.ts
│ └── refresh.ts
├── lib/
│ ├── jwt.ts
│ ├── password.ts
│ └── session.ts
├── middleware/
│ └── auth.ts
├── components/
│ ├── login-form.tsx
│ └── auth-provider.tsx
└── **tests**/
├── login.test.ts
├── session.test.ts
└── auth.integration.test.ts

```

---

## OldApp References

Reference these files for business logic extraction:

| OldApp File | Extract |
|------------|---------|
| `oldapp/src/auth/login.tsx` | Form validation rules, error messages |
| `oldapp/src/lib/auth.ts` | JWT config, token expiry (30min) |
| `oldapp/src/lib/session.ts` | Session structure, refresh logic |
| `oldapp/src/middleware.ts` | Protected routes list |

**Detailed extractions:** `.track/phases/2-features/2.1-auth/oldapp-refs.md`

---

## Acceptance Criteria

- [ ] User can log in with valid credentials
- [ ] Invalid credentials show appropriate error
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect unauthenticated users
- [ ] Logout clears session completely
- [ ] Token refresh works transparently
- [ ] All tests passing
- [ ] Feature parity with oldapp verified

---

## Architecture Alignment

**Design Doc:** `FINAL-ARCHITECTURE-OVERHAUL-PLAN.md#authentication`

Key architectural requirements:
- Server Actions for all mutations
- JWT stored in httpOnly cookie
- Session validation on server side
- Minimal client-side auth state
```

---

## 4. Progress File (Per-Task Progress)

**Location:** `.track/phases/{phase}/{task-id}/progress.md`

```markdown
# Auth Feature - Implementation Progress

**Task File:** `./task.md`
**Started:** 2024-01-15 10:00:00 UTC
**Last Updated:** 2024-01-15 14:32:00 UTC
**Progress:** 45% complete

---

## Current Step

**Step 3: Server Actions** - Implementing login action

### Active Work

- File: `src/features/auth/actions/login.ts`
- Function: `loginAction()`
- Sub-step: JWT token generation

### Completed in Current Step

- ✅ Created action file skeleton
- ✅ Implemented Zod validation schema
- ✅ Added form data parsing

### Remaining in Current Step

- ⏳ Implement JWT generation
- ⏳ Add error handling
- ⏳ Implement response formatting
- ⏳ Write unit tests

---

## Step Progress

| Step              | Status         | Progress | Notes                     |
| ----------------- | -------------- | -------- | ------------------------- |
| 1. Data Layer     | ✅ Complete    | 100%     | All models created        |
| 2. Business Logic | ✅ Complete    | 100%     | JWT + password utils done |
| 3. Server Actions | 🔄 In Progress | 40%      | Login in progress         |
| 4. Middleware     | ⏳ Not Started | 0%       |                           |
| 5. Components     | ⏳ Not Started | 0%       |                           |
| 6. Testing        | 🔄 Partial     | 25%      | Unit tests for steps 1-2  |

---

## Files Created

| File                                  | Status         | Tests  |
| ------------------------------------- | -------------- | ------ |
| `src/features/auth/models/user.ts`    | ✅ Complete    | ✅ 5/5 |
| `src/features/auth/models/session.ts` | ✅ Complete    | ✅ 3/3 |
| `src/features/auth/lib/jwt.ts`        | ✅ Complete    | ✅ 4/4 |
| `src/features/auth/lib/password.ts`   | ✅ Complete    | ✅ 3/3 |
| `src/features/auth/actions/login.ts`  | 🔄 In Progress | ⏳ 0/5 |
| `src/features/auth/actions/logout.ts` | ⏳ Not Started | ⏳     |

---

## Activity Log (Recent First)

### 2024-01-15 14:32:00

- Implemented Zod validation schema for login
- Added form data parsing logic
- **Next:** JWT token generation

### 2024-01-15 14:00:00

- Created login action file skeleton
- Set up action structure following architecture plan

### 2024-01-15 13:30:00

- Completed password.ts utility
- All unit tests passing

### 2024-01-15 12:45:00

- Completed jwt.ts with token generation/validation
- Extracted token expiry (30min) from oldapp

[Earlier entries in session log: `.track/logs/sessions/2024-01-15-1000.md`]

---

## Issues Encountered

### ISSUE-001: JWT Library Selection (Resolved)

- **Problem:** jose vs jsonwebtoken for edge runtime
- **Resolution:** Using jose for edge compatibility
- **Decision:** `.track/master/decisions.md#DEC-003`

---

## Dependencies Status

| Dependency            | Status        |
| --------------------- | ------------- |
| Database schema       | ✅ Ready      |
| Environment variables | ✅ Configured |
| Shared utilities      | ✅ Available  |

---

## Handoff Checkpoint

**Safe to interrupt:** ✅ Yes
**Current state is stable:** ✅ Yes

To continue:

1. Open `src/features/auth/actions/login.ts`
2. Implement JWT generation in `loginAction()`
3. Reference `src/features/auth/lib/jwt.ts` for token creation
4. See oldapp token expiry: `.track/phases/2-features/2.1-auth/oldapp-refs.md#jwt-config`
```

---

## 5. Queue Files

### queue/active.md

```markdown
# Active Task

**Updated:** 2024-01-15 14:32:00 UTC

## Current Task

- **ID:** 2.1.3
- **Name:** Auth - Server Actions
- **File:** `.track/phases/2-features/2.1-auth/progress.md`
- **Priority:** P1
- **Progress:** 40%
- **Estimated Remaining:** 2 hours

## Quick Resume

1. Continue implementing `loginAction()` JWT generation
2. File: `src/features/auth/actions/login.ts`
3. Reference: `src/features/auth/lib/jwt.ts`
```

### queue/next.md

```markdown
# Next Tasks Queue

**Updated:** 2024-01-15 14:32:00 UTC

| Priority | ID    | Task                   | Depends On | Est. Hours |
| -------- | ----- | ---------------------- | ---------- | ---------- |
| P1       | 2.1.4 | Auth - Middleware      | 2.1.3      | 2h         |
| P1       | 2.1.5 | Auth - Components      | 2.1.4      | 3h         |
| P1       | 2.1.6 | Auth - Testing         | 2.1.5      | 2h         |
| P2       | 2.2.1 | Dashboard - Data Layer | 2.1        | 4h         |
| P2       | 2.3.1 | Settings - Data Layer  | 2.1        | 3h         |

## After Current Task

When 2.1.3 (Auth - Server Actions) completes:

1. Update `.track/phases/2-features/2.1-auth/progress.md` - mark Step 3 complete
2. Update `.track/queue/active.md` with 2.1.4
3. Update `START.md` with new active task
4. Update `state.json`
5. Begin 2.1.4 (Auth - Middleware)
```

### queue/blocked.md

```markdown
# Blocked Tasks

**Updated:** 2024-01-15 14:32:00 UTC

## Currently Blocked: 0

No tasks currently blocked.

---

## Recently Unblocked

| ID    | Task            | Was Blocked By | Unblocked        | Duration |
| ----- | --------------- | -------------- | ---------------- | -------- |
| 2.1.2 | Auth Data Layer | DB Schema      | 2024-01-15 10:00 | 2 hours  |
```

---

# AGENT WORKFLOW PROCEDURES

## Procedure 1: Starting a New Session

```
1. READ `.track/START.md`
   - Understand current state
   - Identify active task
   - Note any blockers or issues

2. VERIFY state matches reality
   - Run `npm run build` (should pass)
   - Run `npm test` (should match state.json)
   - Check for TypeScript errors

3. LOAD task context
   - Read active task's `progress.md`
   - If needed, read task's `task.md` for full scope
   - If needed, read task's `requirements.md`

4. CONTINUE from documented next action
   - Follow the "Next Immediate Action" in START.md
   - Or continue from where progress.md indicates

5. UPDATE tracking after EVERY significant step
```

## Procedure 2: Updating Tracking (After Every Step)

```
After EACH significant action (file created, function implemented, test written):

1. UPDATE task progress.md
   - Add activity log entry with timestamp
   - Update step progress
   - Update files created table
   - Note any issues

2. UPDATE START.md
   - Update "Last Action Completed"
   - Update "Next Immediate Action"
   - Update timestamp
   - Update quick stats if changed

3. UPDATE state.json
   - Update lastUpdated
   - Update progress percentages
   - Update test counts if changed
   - Update any status changes

4. COMMIT checkpoint (if using git)
   - Commit working state
   - Include tracking files
```

## Procedure 3: Completing a Task

```
1. VERIFY completion criteria
   - All checklist items done
   - All tests passing
   - Feature parity verified against oldapp

2. CREATE completion record
   - Create `complete.md` in task folder
   - Document what was built
   - Note any deviations from plan
   - Record final test coverage

3. UPDATE task progress.md
   - Mark 100% complete
   - Add final activity log entry
   - Note completion timestamp

4. UPDATE phase status
   - Update `.track/phases/{phase}/_status.md`
   - Increment completed task count

5. UPDATE queue
   - Remove from active.md
   - Move next task to active.md
   - Update next.md queue

6. UPDATE master tracking
   - Update `.track/master/progress.md`
   - Update START.md with new active task
   - Update state.json

7. BEGIN next task
   - Load new task's task.md
   - Start progress.md for new task
```

## Procedure 4: Handling Interruption

```
Before stopping work (or if interrupted):

1. SAVE current state immediately
   - Update progress.md with exact stopping point
   - Note the specific line/function being worked on
   - List any uncommitted mental context

2. UPDATE START.md
   - Ensure "Next Immediate Action" is specific
   - Add handoff notes if helpful
   - Update timestamp

3. UPDATE state.json
   - Reflect current progress accurately

4. DOCUMENT any gotchas
   - Note anything the next agent should know
   - Record any temporary workarounds
   - Flag any partial implementations

5. COMMIT if possible
   - Commit stable state
   - Include all tracking updates
```

## Procedure 5: Handling Blockers

```
When encountering a blocker:

1. DOCUMENT the blocker
   - Add to `.track/queue/blocked.md`
   - Note blocker ID, description, impact
   - Identify what would unblock it

2. UPDATE task progress
   - Mark task as blocked
   - Note blocker in activity log

3. CHECK for parallel work
   - Review next.md for unblocked tasks
   - Switch to highest priority unblocked task

4. UPDATE tracking
   - Update active.md with new task (or mark none)
   - Update START.md
   - Update state.json with blocked status
```

---

# FIRST-TIME INITIALIZATION PROCEDURE

When starting with a new project (no tracking exists):

## Phase 0: Initialize Tracking System

### Step 0.1: Create Directory Structure

```bash
mkdir -p .track/{queue,master,phases,tests,logs/sessions,context}
mkdir -p .track/phases/{1-setup,2-features,3-integration}
```

### Step 0.2: Create Initial START.md

```markdown
# 🚀 AGENT START HERE

**Last Updated:** [CURRENT_TIMESTAMP]
**Last Agent Session:** Initial Setup

## Current Status: 🆕 INITIALIZING

**Phase:** 0 - Initialization
**Overall Progress:** 0% complete
**Build Status:** ⏳ Not started
**Tests Status:** ⏳ Not started

---

## 🎯 ACTIVE TASK

**Task:** Initialize Tracking System and Create Task List
**Task File:** `.track/phases/0-init/task.md`
**Step:** Creating tracking infrastructure
**Priority:** P0 - Prerequisite

### Next Immediate Action

1. Complete tracking system initialization
2. Analyze FINAL-ARCHITECTURE-OVERHAUL-PLAN.md
3. Analyze oldapp/ structure
4. Generate complete task list
5. Begin Phase 1 implementation

---

## 📋 HOW TO CONTINUE

This is initial setup. Follow Phase 0 initialization procedure.

---

## 🔗 QUICK LINKS

- **Architecture Plan:** `FINAL-ARCHITECTURE-OVERHAUL-PLAN.md`
- **Old App Reference:** `oldapp/`
- **Design Docs:** `[XX]-*-optimal-design.md`
```

### Step 0.3: Create Initial state.json

```json
{
  "meta": {
    "lastUpdated": "[CURRENT_TIMESTAMP]",
    "lastAgentSession": null,
    "version": "1.0.0"
  },
  "status": {
    "overall": "initializing",
    "phase": 0,
    "phaseProgress": 0,
    "overallProgress": 0,
    "buildPassing": null,
    "testsPassing": null,
    "typeErrorCount": null,
    "warningCount": null
  },
  "activeTask": {
    "id": "0.1",
    "name": "Initialize Tracking & Generate Tasks",
    "phase": 0,
    "feature": null,
    "step": "init",
    "file": ".track/phases/0-init/task.md",
    "priority": "P0",
    "startedAt": "[CURRENT_TIMESTAMP]",
    "progress": 0
  },
  "lastCompleted": null,
  "blockers": [],
  "tests": {
    "unit": { "passing": 0, "failing": 0, "total": 0 },
    "integration": { "passing": 0, "failing": 0, "total": 0 },
    "e2e": { "passing": 0, "failing": 0, "total": 0 },
    "coverage": 0
  },
  "features": {},
  "phases": {
    "0-init": { "status": "in-progress", "progress": 0 },
    "1-setup": { "status": "not-started", "progress": 0 },
    "2-features": { "status": "not-started", "progress": 0 },
    "3-integration": { "status": "not-started", "progress": 0 }
  }
}
```

### Step 0.4: Generate Task List

**Analyze the following sources to generate complete task list:**

1. **FINAL-ARCHITECTURE-OVERHAUL-PLAN.md** - Extract all implementation requirements
2. **oldapp/ directory** - Identify all features needing implementation
3. **Design docs** (`*-optimal-design.md`) - Extract implementation steps

**Create `.track/master/task-list.md`:**

```markdown
# Complete Task List

**Generated:** [TIMESTAMP]
**Source:** Architecture plan + OldApp analysis + Design docs

---

## Phase 1: Setup & Foundation

### 1.1 Project Initialization

- [ ] Create Next.js 16.1.0 project with Turbopack
- [ ] Configure TypeScript (strict mode)
- [ ] Set up ESLint + Prettier
- [ ] Configure path aliases
- [ ] Set up environment variables
- **Est. Time:** 2 hours
- **Dependencies:** None
- **Design Doc:** N/A

### 1.2 Testing Infrastructure

- [ ] Install Jest/Vitest
- [ ] Configure React Testing Library
- [ ] Set up test utilities
- [ ] Configure coverage reporting
- [ ] Create test helpers
- **Est. Time:** 2 hours
- **Dependencies:** 1.1
- **Design Doc:** N/A

### 1.3 Directory Structure

- [ ] Create full directory structure per architecture plan
- [ ] Set up module boundaries
- [ ] Configure barrel exports
- **Est. Time:** 1 hour
- **Dependencies:** 1.1
- **Design Doc:** FINAL-ARCHITECTURE-OVERHAUL-PLAN.md#directory-structure

### 1.4 Shared Infrastructure

- [ ] Core utilities and helpers
- [ ] Shared types and interfaces
- [ ] API client setup
- [ ] Error handling utilities
- [ ] Logging setup
- **Est. Time:** 4 hours
- **Dependencies:** 1.1, 1.3
- **Design Doc:** [Infrastructure design doc if exists]

### 1.5 Database Setup

- [ ] Database schema design
- [ ] Migration setup
- [ ] Seed data
- [ ] Connection configuration
- **Est. Time:** 3 hours
- **Dependencies:** 1.1
- **Design Doc:** [Database design doc if exists]

---

## Phase 2: Feature Implementation

[For each feature identified from oldapp/ and design docs:]

### 2.X [Feature Name]

- **Identified from:** [oldapp path / design doc]
- **Priority:** [P1/P2/P3]
- **Dependencies:** [list]
- **Design Doc:** [XX-feature-optimal-design.md]

#### Sub-tasks:

- [ ] 2.X.1 Data Layer
- [ ] 2.X.2 Business Logic
- [ ] 2.X.3 Server Actions
- [ ] 2.X.4 Server Components
- [ ] 2.X.5 Client Components
- [ ] 2.X.6 Testing

**Est. Time:** X hours

---

## Phase 3: Integration & Polish

### 3.1 System Integration

- [ ] Cross-feature testing
- [ ] End-to-end workflows
- [ ] Performance optimization
- **Est. Time:** X hours

### 3.2 Final Testing

- [ ] Comprehensive E2E tests
- [ ] Coverage goals met
- [ ] Performance tests
- **Est. Time:** X hours

### 3.3 Documentation

- [ ] API documentation
- [ ] Deployment guide
- [ ] IMPLEMENTATION-COMPLETE.md
- **Est. Time:** X hours

---

## Summary

| Phase          | Tasks | Est. Hours |
| -------------- | ----- | ---------- |
| 1. Setup       | X     | Y          |
| 2. Features    | X     | Y          |
| 3. Integration | X     | Y          |
| **Total**      | **X** | **Y**      |
```

### Step 0.5: Create Phase Task Directories

For each task in the task list, create the directory structure:

```bash
# Phase 1
mkdir -p .track/phases/1-setup/{1.1-project-init,1.2-testing-setup,...}

# Phase 2 (for each feature)
mkdir -p .track/phases/2-features/{2.1-auth,2.2-dashboard,...}

# Phase 3
mkdir -p .track/phases/3-integration/{3.1-integration,3.2-testing,...}
```

### Step 0.6: Initialize Queue Files

**Create `.track/queue/active.md`:**

```markdown
# Active Task

**Updated:** [TIMESTAMP]

## Current Task

- **ID:** 1.1
- **Name:** Project Initialization
- **File:** `.track/phases/1-setup/1.1-project-init/progress.md`
- **Priority:** P0
- **Progress:** 0%
```

**Create `.track/queue/next.md`:**

```markdown
# Next Tasks Queue

| Priority | ID  | Task                  | Depends On | Est. Hours |
| -------- | --- | --------------------- | ---------- | ---------- |
| P0       | 1.2 | Testing Setup         | 1.1        | 2h         |
| P0       | 1.3 | Directory Structure   | 1.1        | 1h         |
| P0       | 1.4 | Shared Infrastructure | 1.1, 1.3   | 4h         |

...
```

### Step 0.7: Update Tracking for Phase 1 Start

Update START.md, state.json, and queue files to reflect Phase 1 starting.

---

# IMPLEMENTATION GUIDELINES

## Core Principles

### 1. Architecture Adherence

- Follow `FINAL-ARCHITECTURE-OVERHAUL-PLAN.md` exactly
- Never deviate from planned structure
- Respect all module boundaries
- Maintain server/client/edge separation

### 2. OldApp Reference Rules

**DO Extract:**

- Business logic and rules
- Validation constraints
- Data models and relationships
- Edge cases and error scenarios
- API endpoints and integrations
- User workflows
- Constants and configuration

**DO NOT Copy:**

- Component structure
- File organization
- State management patterns
- Routing patterns
- Provider hierarchies
- Workarounds or legacy code

**Document All References:**

```markdown
# OldApp References - [Feature Name]

## Files Analyzed

### oldapp/src/auth/login.tsx

- **Extracted:** Form validation rules
  - Email: required, valid format
  - Password: required, min 8 chars
- **Extracted:** Error messages
  - "Invalid credentials" for auth failures
  - "Account locked" after 5 attempts
- **Implemented in:** `src/features/auth/components/login-form.tsx`

### oldapp/src/lib/auth.ts

- **Extracted:** JWT configuration
  - Token expiry: 30 minutes
  - Refresh window: 5 minutes before expiry
- **Extracted:** Token payload structure
- **Implemented in:** `src/features/auth/lib/jwt.ts`
```

### 3. Testing Requirements

**Coverage Targets:**

- Overall: 85% minimum
- Business Logic: 95%
- Data Layer: 90%
- Components: 80%
- Utilities: 95%

**Test as you build:**

- Write unit tests immediately after each function
- Write integration tests after completing each step
- Write E2E tests after feature completion

### 4. Code Quality

- Zero TypeScript errors
- Zero build warnings
- Zero runtime errors
- Clean, readable code
- Meaningful names
- Small, focused functions
- Maximum 3-4 levels of nesting
- No `any` types

### 5. Next.js 16 Patterns

- Server Components by default
- Explicit 'use client' only when needed
- Server Actions for mutations
- Proper caching strategies
- Metadata API for SEO
- Proper loading/error states

---

# CONTEXT LOADING RULES

## Minimal Context Loading

**Always load (tiny files):**

- `.track/START.md`
- `.track/state.json`

**Load for current task:**

- Active task's `progress.md`
- Active task's `task.md` (if context needed)

**Load on demand only:**

- `requirements.md` - when implementing feature logic
- `oldapp-refs.md` - when referencing old code
- `tests.md` - when writing/debugging tests
- Architecture plan - when design questions arise
- Master progress - when reporting overall status

**Never load by default:**

- Completed task files
- Other feature's files
- Session logs (unless debugging)
- Full task list (unless planning)

## Context Request Pattern

When needing more context, request specifically:

```
NEED CONTEXT: What are the JWT token expiry rules?
LOAD: .track/phases/2-features/2.1-auth/oldapp-refs.md#jwt-config
```

---

# CHECKPOINT & RECOVERY

## Safe Checkpoints

A checkpoint is safe when:

- Current file compiles without errors
- All existing tests still pass
- Tracking files are updated
- State is consistent

## Recovery Procedure

If state seems inconsistent:

1. Check `state.json` vs reality
2. Run build and tests
3. Check last session log in `.track/logs/sessions/`
4. Reconcile tracking with actual file state
5. Update tracking to match reality
6. Continue from verified state

---

# DELIVERABLES CHECKLIST

## Required Outputs

- [ ] Complete working application
- [ ] Full feature parity with oldapp/
- [ ] Comprehensive test suite (85%+ coverage)
- [ ] All tracking files maintained
- [ ] Zero errors (TypeScript, build, runtime)
- [ ] IMPLEMENTATION-COMPLETE.md

## Quality Gates

Before marking complete:

- [ ] `npm run build` passes
- [ ] `npm test` all passing
- [ ] `npm run lint` no errors
- [ ] Manual feature parity verification
- [ ] Performance meets targets
- [ ] All tracking reflects completion

---

# QUICK REFERENCE COMMANDS

```powershell
# Check build status
npm run build

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Check TypeScript
npm run type-check

# Lint check
npm run lint

# Start development
npm run dev
```

---

# EMERGENCY PROCEDURES

## Build Failing

1. Check TypeScript errors: `npm run type-check`
2. Check last changes in session log
3. Revert to last working state if needed
4. Document issue in `.track/logs/errors.md`

## Tests Failing

1. Identify failing tests
2. Check if related to current changes
3. Fix or document as known issue
4. Update `.track/tests/` status

## Lost Context

1. Re-read `START.md`
2. Check `state.json`
3. Read active task's `progress.md`
4. Check last session log
5. Verify with build/test

---

**Remember: Update tracking after EVERY significant step. The tracking system is how continuity is maintained across agent sessions. Accurate tracking is not optional—it is the primary mechanism for project continuity.**
