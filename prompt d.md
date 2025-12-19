# AI Agent Implementation Guide

> **For AI agents implementing a Next.js 16 architectural overhaul with seamless handoff support.**

---

## ⚡ CRITICAL: READ THIS FIRST

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  YOU CAN BE INTERRUPTED AT ANY MOMENT WITHOUT WARNING                   │
│                                                                             │
│  • No graceful shutdown. No "wrap up" time. No prior notice.                │
│  • Your session can terminate mid-sentence, mid-function, mid-thought.      │
│  • The ONLY continuity is through your state files.                         │
│  • UPDATE STATE BEFORE ACTIONS, NOT AFTER.                                  │
│  • Treat every state update as your LAST action before termination.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 LAYERED TRACKING SYSTEM

The tracking system uses **small, focused files** organized hierarchically. This allows fast reads without parsing large documents.

### File Structure

```
.tracker/
├── HANDOFF.md              ← READ THIS FIRST (50 lines max)
├── status.json             ← Machine-readable current state
├── progress/
│   ├── OVERVIEW.md         ← High-level progress (1 page max)
│   ├── phase-1.md          ← Phase 1 detailed status
│   ├── phase-2.md          ← Phase 2 detailed status
│   └── phase-3.md          ← Phase 3 detailed status
├── features/
│   ├── auth.md             ← Auth feature progress
│   ├── dashboard.md        ← Dashboard feature progress
│   └── [feature].md        ← One file per feature
├── sessions/
│   ├── current.md          ← Current session details
│   └── history/
│       └── [timestamp].md  ← Past session summaries
└── tests/
    └── status.md           ← Testing progress
```

### Layer 1: Instant Handoff (< 30 seconds to read)

**File: `.tracker/HANDOFF.md`** — Maximum 50 lines

```markdown
# HANDOFF STATE

**Last Updated:** 2024-12-19 00:30:00 UTC
**Status:** INTERRUPTED_MID_TASK | CLEAN_HANDOFF | NEEDS_RECOVERY

## In-Flight Action

**State:** STARTED | COMPLETED | IDLE
**Action:** Writing validateUser() function
**File:** src/features/auth/lib/validate.ts
**Line:** 45
**If STARTED:** Previous agent interrupted. Complete or rollback first.

## Resume Point

1. [If STARTED above] Complete validateUser() - missing error handling
2. Write unit test for validateUser
3. Update feature tracker

## Quick Context

- Phase: 2 (Feature Implementation)
- Feature: Authentication (60% complete)
- Blockers: None
- Build Status: Passing
- Test Status: 12/15 passing
```

**File: `.tracker/status.json`** — Machine-readable state

```json
{
  "lastUpdated": "2024-12-19T00:30:00Z",
  "inFlightAction": {
    "state": "STARTED",
    "action": "Writing validateUser() function",
    "file": "src/features/auth/lib/validate.ts",
    "line": 45,
    "startedAt": "2024-12-19T00:28:00Z"
  },
  "phase": 2,
  "currentFeature": "auth",
  "featureProgress": 60,
  "overallProgress": 35,
  "buildPassing": true,
  "testsPassing": 12,
  "testsFailing": 3,
  "blockers": []
}
```

### Layer 2: Quick Context (< 2 minutes to read)

**File: `.tracker/progress/OVERVIEW.md`** — One page max

```markdown
# Progress Overview

**Overall:** 35% complete
**Phase:** 2 of 3 (Feature Implementation)
**Build:** ✅ Passing
**Tests:** 12/15 passing (80%)

## Phase Summary

| Phase                     | Status      | Progress |
| ------------------------- | ----------- | -------- |
| 1. Setup & Foundation     | ✅ Complete | 100%     |
| 2. Feature Implementation | 🔄 Active   | 45%      |
| 3. Integration & Polish   | ⏳ Pending  | 0%       |

## Active Features

| Feature   | Status     | Progress | Blocker    |
| --------- | ---------- | -------- | ---------- |
| Auth      | 🔄 Active  | 60%      | -          |
| Dashboard | ⏳ Next    | 0%       | Needs Auth |
| Settings  | ⏳ Pending | 0%       | -          |

## Recent Activity (Last 5)

1. [00:28] Started validateUser() function
2. [00:25] Completed loginAction server action
3. [00:20] Fixed TypeScript error in session types
4. [00:15] Added user model with validations
5. [00:10] Created auth feature structure
```

### Layer 3: Feature Details (Read only when working on feature)

**File: `.tracker/features/auth.md`**

```markdown
# Auth Feature Progress

**Status:** 🔄 In Progress (60%)
**Started:** 2024-12-19 00:00:00
**Current Session:** [session-id]

## Checklist

### Data Layer (100%)

- [x] User model
- [x] Session model
- [x] Token model

### Business Logic (60%)

- [x] Password hashing
- [x] Token generation
- [/] User validation ← IN PROGRESS
- [ ] Session management

### Server Components (0%)

- [ ] Login page
- [ ] Register page
- [ ] Logout handler

### Client Components (0%)

- [ ] Login form
- [ ] Register form
- [ ] Auth state provider

### Tests (40%)

- [x] User model tests
- [x] Token tests
- [ ] Validation tests
- [ ] Integration tests

## Files Created

- `src/features/auth/models/user.ts` ✅
- `src/features/auth/models/session.ts` ✅
- `src/features/auth/lib/token.ts` ✅
- `src/features/auth/lib/validate.ts` 🔄 (60%)

## OldApp References Used

- `oldapp/auth/models.ts` → User validation rules
- `oldapp/lib/jwt.ts` → Token expiry (30min)

## Notes

- Using zod for validation schemas
- JWT with custom claims for tokens
```

### Layer 4: Session History (For context on past decisions)

**File: `.tracker/sessions/current.md`**

```markdown
# Current Session

**Session ID:** [unique-id]
**Started:** 2024-12-19 00:00:00
**Agent:** [agent-info]

## Decisions Made

1. **Chose zod over yup for validation**

   - Reason: Better TypeScript inference
   - Impact: All validation uses zod schemas

2. **JWT over session cookies**
   - Reason: Matches oldapp behavior
   - Impact: Need refresh token logic

## Discoveries

- oldapp has undocumented rate limiting in login
- Session timeout is 30min not 60min as docs say

## Action Log

| Time  | Action               | Status    | File        |
| ----- | -------------------- | --------- | ----------- |
| 00:28 | Write validateUser() | STARTED   | validate.ts |
| 00:25 | Write loginAction()  | COMPLETED | login.ts    |
| 00:20 | Fix session types    | COMPLETED | types.ts    |
```

---

## 🔄 HANDOFF PROTOCOL

### For New/Resuming Agents

```
1. READ .tracker/HANDOFF.md (30 seconds)
   ↓
2. If In-Flight Action = "STARTED" → Recovery needed
   │  a. Check the target file
   │  b. Complete or rollback the partial work
   │  c. Update HANDOFF.md to "COMPLETED" or "ROLLED_BACK"
   ↓
3. READ .tracker/progress/OVERVIEW.md (2 minutes)
   ↓
4. READ .tracker/features/[current-feature].md if working on feature
   ↓
5. Verify build: npm run build
   ↓
6. Verify tests: npm test
   ↓
7. UPDATE .tracker/HANDOFF.md with your session info
   ↓
8. BEGIN WORK (following Atomic Update Pattern below)
```

### Atomic Update Pattern (MANDATORY)

**BEFORE every significant action:**

```
1. UPDATE .tracker/HANDOFF.md:
   - In-Flight Action State: "STARTED"
   - Action: [What you're about to do]
   - File: [Target file]

2. UPDATE .tracker/status.json (inFlightAction)

3. PERFORM the action

4. UPDATE .tracker/HANDOFF.md:
   - In-Flight Action State: "COMPLETED"
   - Resume Point: [Next step]

5. UPDATE .tracker/status.json
```

**Why this matters:** If interrupted between steps 1-2 and 4-5, the next agent sees "STARTED" and knows to check for partial work.

### Quick Update Commands

For efficiency, use these patterns:

```bash
# Before action
echo "STARTED: Writing validateUser()" >> .tracker/HANDOFF.md

# After action
echo "COMPLETED: validateUser()" >> .tracker/HANDOFF.md
```

Or maintain a helper script in `.tracker/update.sh`.

---

## 📋 IMPLEMENTATION WORKFLOW

### Phase 1: Setup & Foundation

1. **Initialize Tracking System**

   ```
   mkdir -p .tracker/{progress,features,sessions/history,tests}
   touch .tracker/HANDOFF.md
   touch .tracker/status.json
   touch .tracker/progress/OVERVIEW.md
   ```

2. **Project Structure** — Create directory structure per architectural plan

3. **Infrastructure** — Core utilities, types, config, error handling

4. **Testing Setup** — Jest/Vitest, test utilities, coverage config

5. **Foundation Layer** — Database, data access, shared server actions

### Phase 2: Feature Implementation

For each feature:

1. **Create tracker:** `.tracker/features/[feature].md`
2. **Review design:** `[XX]-[feature]-optimal-design.md`
3. **Reference oldapp:** Extract logic, NOT patterns
4. **Implement in layers:**
   - Data Layer → Business Logic → Server Components → Client Components
5. **Test each layer** before moving to next
6. **Update trackers** continuously

### Phase 3: Integration & Polish

1. **Cross-module integration** — All features work together
2. **Complete test suite** — 85%+ coverage, all passing
3. **Performance optimization** — Bundle sizes, load times
4. **Error handling** — Boundaries, graceful degradation
5. **Final QA** — Zero errors, feature parity with oldapp

---

## 📚 REFERENCE GUIDELINES

### DO Reference oldapp/ For:

- ✅ Business logic and rules
- ✅ Validation constraints
- ✅ Data models and relationships
- ✅ Edge cases and error scenarios
- ✅ User workflows
- ✅ Constants and configuration values

### DO NOT Copy From oldapp/:

- ❌ Component structure
- ❌ File/folder architecture
- ❌ State management patterns
- ❌ Data fetching approaches
- ❌ Workarounds or legacy patterns

### Document References

In feature tracker:

```markdown
## OldApp References

- `oldapp/auth/login.ts` → Validation rules, error messages
- `oldapp/lib/jwt.ts` → Token expiry (30min)
```

---

## ✅ QUALITY REQUIREMENTS

### Zero-Error Policy

- No TypeScript errors
- No runtime errors
- No build warnings
- No failing tests

### Test Coverage

- Overall: 85% minimum
- Business Logic: 95% minimum
- Data Layer: 90% minimum
- Components: 80% minimum

### Architecture

- Follow `FINAL-ARCHITECTURE-OVERHAUL-PLAN.md` exactly
- Respect server/client/edge boundaries
- Maintain dependency graph
- No patterns copied from oldapp

### Feature Parity

- All user-facing features identical to oldapp
- All workflows work exactly as before
- UI/UX matches or improves original

---

## 🎯 SUCCESS CRITERIA

- [ ] Application builds without errors
- [ ] All tests passing (85%+ coverage)
- [ ] All oldapp features working identically
- [ ] Architecture matches plan exactly
- [ ] `.tracker/HANDOFF.md` always current
- [ ] Code is clean, simple, maintainable
- [ ] Any agent can resume from current state

---

## 💡 KEY PRINCIPLES

1. **Update Before Act** — State files updated BEFORE performing actions
2. **Small Files** — Trackers are modular, not monolithic
3. **Layered Reading** — Quick handoff → Context → Details as needed
4. **Assume Interruption** — Every action could be your last
5. **Extract, Don't Copy** — Understand oldapp logic, implement fresh
6. **Test As You Go** — Don't defer testing
7. **Simple Over Clever** — Clarity beats cleverness

---

## 🚀 START HERE

```
1. Create .tracker/ structure
2. Initialize HANDOFF.md and status.json
3. Begin Phase 1: Setup & Foundation
4. Update trackers BEFORE every action
5. Work systematically, feature by feature
```

**Remember:** Your state files are the ONLY continuity between agents. Treat every update as if it's your last action before termination.
