# Ultimate Multi-Agent Implementation System

## Complete Greenfield Next.js 16 Application with Unbreakable Continuity

**Version:** 4.0 - Layered State Architecture
**Design Principle:** Hierarchical state files - read only what you need, drill down as required

---

# PART 1: THE STATE ARCHITECTURE

## Overview: Layered State System

```
.state/
├── CURRENT.md              ← Layer 0: 10 lines, read in 30 seconds
├── SESSION.md              ← Layer 1: Current session details
├── PROJECT.md              ← Layer 2: Overall project status
├── DECISIONS.md            ← Layer 3: All architectural decisions
├── TESTS.md                ← Layer 4: Testing status
│
├── features/               ← Layer 5: Per-feature tracking
│   ├── 01-auth/
│   │   ├── STATUS.md       ← Feature quick status
│   │   ├── PROGRESS.md     ← Detailed progress
│   │   ├── FILES.md        ← File inventory
│   │   └── OLDAPP.md       ← OldApp references
│   ├── 02-dashboard/
│   └── ...
│
├── sessions/               ← Historical session logs
│   ├── 2024-01-15-session-001.md
│   └── ...
│
└── issues/                 ← Active issues/blockers
    ├── ACTIVE.md
    └── RESOLVED.md
```

**Key Principle:** Each layer is self-contained. Start at Layer 0, drill down only as needed.

---

## Layer 0: CURRENT.md (Read First - Always)

**Purpose:** 30-second orientation. Tells you exactly where things stand and what to do.

```markdown
# CURRENT STATE

**Updated:** 2024-01-15T14:32:45Z

## RIGHT NOW

**Status:** WORKING | PAUSED | BLOCKED
**Operation:** Creating LoginForm component
**File:** `src/features/auth/components/login-form.tsx`
**Line:** 56 of ~80
**Next Action:** Complete email input JSX, add password field

## QUICK STATS

**Project:** 42% complete
**Phase:** 2 of 3 (Features)
**Feature:** Auth (75% done)
**Build:** ✅ Pass
**Tests:** 23/25 passing

## IF RESUMING

1. Open `src/features/auth/components/login-form.tsx`
2. Go to line 56
3. Continue with password input field
4. See SESSION.md for full context

## BLOCKERS

None currently

## NEXT IN QUEUE

1. Complete login-form.tsx
2. Write LoginForm tests
3. Create register-form.tsx
```

**Update Frequency:** Before and after every operation
**Max Length:** 40 lines

---

## Layer 1: SESSION.md (Current Session Details)

**Purpose:** Full context for current work session. Everything needed to continue current operation.

```markdown
# CURRENT SESSION

**Session ID:** S-2024-0115-1400
**Started:** 2024-01-15T14:00:00Z
**Last Update:** 2024-01-15T14:32:45Z

---

## CURRENT OPERATION

**ID:** OP-143245
**Started:** 14:32:45
**Status:** IN_PROGRESS

### Intent

Creating LoginForm client component with:

- Email input with validation
- Password input with validation
- Remember me checkbox
- Submit button with loading state
- Error display
- Form submission to loginAction

### Target File

`src/features/auth/components/login-form.tsx`
Expected: ~80 lines

### Progress Checkpoints
```

[14:32:45] Started file
[14:33:12] ✓ Lines 1-15: Imports and interfaces
[14:34:08] ✓ Lines 16-35: Component shell, useState hooks
[14:35:22] ✓ Lines 36-55: Validation logic, handleSubmit
[14:36:45] → Lines 56-70: Form JSX (IN PROGRESS)
Remaining: password field, checkbox, button, errors

````

### Current Code Checkpoint
```typescript
// Lines 1-55 COMPLETE. Current state at line 56:
return (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        // CONTINUE FROM HERE: add placeholder, disabled state
````

### Resume Instructions

1. Open file at line 56
2. Complete email Input: add `placeholder="you@example.com"` and `disabled={isLoading}`
3. Add password field (lines ~65-75) following same pattern
4. Add remember checkbox (lines ~76-80)
5. Add submit button (lines ~81-85)
6. Add error display (lines ~86-92)
7. Close form and component

---

## SESSION WORK LOG

| Time  | Operation                 | Status        |
| ----- | ------------------------- | ------------- |
| 14:00 | Session start             | ✓             |
| 14:05 | Completed auth-layout.tsx | ✓             |
| 14:15 | Completed login-page.tsx  | ✓             |
| 14:32 | Started login-form.tsx    | → In Progress |

---

## SESSION CONTEXT

### Decisions Made

1. Using shadcn/ui components (Input, Label, Button)
2. Local useState for form state (simple enough, no need for RHF)
3. Inline validation on submit, not on blur

### OldApp Files Referenced

- `oldapp/components/LoginForm.tsx` → Field order: email, password, remember, submit
- `oldapp/lib/validation.ts` → Error messages copied exactly for UX parity

### Dependencies Used

- `@/components/ui/input` - shadcn Input
- `@/components/ui/label` - shadcn Label
- `@/components/ui/button` - shadcn Button
- `@/features/auth/actions/login` - loginAction server action

---

## VERIFICATION STATUS

**Last Build:** 14:30:00 ✅
**Last Test:** 14:30:00 (23 pass, 2 fail)
**Known Failures:** See .state/TESTS.md

---

## NEXT OPERATIONS QUEUE

1. **Next:** Complete login-form.tsx (current)
2. Write login-form.test.tsx (5 test cases)
3. Update login-page.tsx to use LoginForm
4. Create register-form.tsx
5. Create auth-provider.tsx

````

**Update Frequency:** Every checkpoint (~10 lines or logical block)
**Max Length:** 150 lines

---

## Layer 2: PROJECT.md (Overall Progress)

**Purpose:** Bird's eye view of entire project. Where are we in the big picture?

```markdown
# PROJECT STATUS

**Last Updated:** 2024-01-15T14:32:00Z

---

## COMPLETION OVERVIEW

````

Overall Progress: ████████░░░░░░░░░░░░ 42%

PHASE 1 - Foundation ████████████████████ 100% ✅
PHASE 2 - Features ████████░░░░░░░░░░░░ 38% 🔄
PHASE 3 - Integration ░░░░░░░░░░░░░░░░░░░░ 0% ⏳

```

---

## PHASE STATUS

### Phase 1: Foundation ✅ COMPLETE
- [x] Project structure
- [x] TypeScript configuration
- [x] Turbopack setup
- [x] Testing infrastructure
- [x] Shared utilities
- [x] Database setup
- [x] Base components

### Phase 2: Features 🔄 IN PROGRESS

| Feature | Status | Progress | Blocked By |
|---------|--------|----------|------------|
| Auth | 🔄 | 75% | - |
| Dashboard | ⏳ | 0% | Auth |
| Settings | ⏳ | 0% | Auth, Dashboard |
| Profile | ⏳ | 0% | Auth |
| Notifications | ⏳ | 0% | Auth |

**Current Focus:** Auth Module

### Phase 3: Integration ⏳ NOT STARTED
- [ ] E2E test suite
- [ ] Performance optimization
- [ ] Final QA
- [ ] Documentation

---

## FEATURE DEPENDENCY GRAPH

```

Foundation ✅
│
└─► Auth Module 🔄 75%
│
├─► Dashboard ⏳ (needs Auth 100%)
│ │
│ └─► Settings ⏳ (needs Dashboard 50%)
│
├─► Profile ⏳ (needs Auth 100%)
│
└─► Notifications ⏳ (needs Auth 100%)

```

---

## BUILD & TEST STATUS

**Build:** ✅ Passing
**Tests:** 23/25 (92%)
**Coverage:** 67%

See `.state/TESTS.md` for details.

---

## ENVIRONMENT

```

Node: 20.11.0
Next.js: 16.1.0
TypeScript: 5.3.3
Database: PostgreSQL 15

```

---

## KEY METRICS

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | 67% | 85% |
| Build Time | 4.2s | <10s |
| Bundle Size | 142KB | <200KB |
| Type Errors | 0 | 0 |
| Lint Errors | 0 | 0 |
```

**Update Frequency:** After each feature step completes
**Max Length:** 100 lines

---

## Layer 3: DECISIONS.md (Architecture Decisions)

**Purpose:** Record all decisions that affect future work. Critical for consistency.

````markdown
# ARCHITECTURAL DECISIONS

**Purpose:** Every decision that future agents must follow

---

## ACTIVE DECISIONS

### D-001: Form Library Choice

**Date:** 2024-01-15
**Decision:** Use native React useState for simple forms, React Hook Form for complex
**Reasoning:**

- LoginForm: 3 fields, simple validation → useState
- Multi-step forms: Use RHF
  **Affects:** All form components
  **Pattern:**

```typescript
// Simple form (≤4 fields)
const [email, setEmail] = useState("");

// Complex form (>4 fields or multi-step)
const form = useForm<FormSchema>({ resolver: zodResolver(schema) });
```
````

---

### D-002: State Management

**Date:** 2024-01-14
**Decision:** Server Components + URL state + minimal React Context
**Reasoning:** Next.js 16 best practices, avoid client-side complexity
**Affects:** All components
**Pattern:**

- Server state: Server Components with fetch
- URL state: useSearchParams for filters/pagination
- Client state: useState for UI-only state
- Shared client state: Context only for auth/theme

---

### D-003: Authentication Flow

**Date:** 2024-01-14
**Decision:** JWT in httpOnly cookies, 30min access / 7day refresh
**Reasoning:** Security best practice, matches oldapp behavior
**Affects:** Auth module, all protected routes
**Implementation:**

- Access token: 30 minutes, in cookie
- Refresh token: 7 days, in cookie
- Server actions verify token
- Middleware handles refresh

---

### D-004: Component Library

**Date:** 2024-01-14
**Decision:** shadcn/ui
**Reasoning:** Customizable, accessible, works with Server Components
**Affects:** All UI components
**Usage:** Import from `@/components/ui/*`

---

### D-005: Validation

**Date:** 2024-01-14
**Decision:** Zod for all validation
**Reasoning:** TypeScript inference, works with RHF and server actions
**Affects:** All forms, API routes, server actions
**Pattern:**

```typescript
const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;
```

---

### D-006: File Naming

**Date:** 2024-01-14
**Decision:** kebab-case for files, PascalCase for components
**Affects:** All files
**Examples:**

- `login-form.tsx` exports `LoginForm`
- `use-auth.ts` exports `useAuth`
- `auth-layout.tsx` exports `AuthLayout`

---

### D-007: Server vs Client Components

**Date:** 2024-01-14
**Decision:** Server by default, Client only when needed
**Affects:** All components
**Client Component Triggers:**

- useState, useEffect, useContext
- Event handlers (onClick, onChange)
- Browser APIs
- Third-party client libraries

---

## DECISION TEMPLATE

When adding new decision:

```markdown
### D-XXX: [Title]

**Date:** YYYY-MM-DD
**Decision:** [What was decided]
**Reasoning:** [Why this choice]
**Affects:** [What code/features this impacts]
**Pattern:** [Code example if applicable]
```

````

**Update Frequency:** When any architectural decision is made
**Max Length:** Unlimited (append only)

---

## Layer 4: TESTS.md (Test Status)

**Purpose:** Complete testing status. What passes, what fails, what's missing.

```markdown
# TEST STATUS

**Last Run:** 2024-01-15T14:30:00Z
**Command:** `npm test`

---

## SUMMARY

````

Suites: 9 total, 8 passed, 1 failed
Tests: 25 total, 23 passed, 2 failed
Coverage: 67%
Time: 4.532s

```

---

## BY MODULE

| Module | Unit | Integration | E2E | Coverage |
|--------|------|-------------|-----|----------|
| auth/models | 8/8 ✅ | - | - | 100% |
| auth/actions | 6/6 ✅ | 3/5 🔄 | - | 88% |
| auth/lib | 5/5 ✅ | - | - | 92% |
| auth/components | 0/8 ⏳ | - | - | 0% |
| shared/utils | 4/4 ✅ | - | - | 100% |

---

## FAILING TESTS

### 1. auth/integration.test.ts:67
```

Test: "Token refresh should extend session by 30 minutes"
Expected: 1800000
Received: 1799998

```
**Cause:** Timing precision
**Fix:** Use `toBeCloseTo(1800000, -2)` instead of `toBe()`
**Priority:** Low (test issue, not code issue)

### 2. auth/integration.test.ts:89
```

Test: "Session persists across requests"  
Error: Session not found

```
**Cause:** Cookies not mocked in test environment
**Fix:** Add cookie mock to test setup
**Priority:** Medium (blocking integration test completion)

---

## TEST INVENTORY

### Completed
- `tests/unit/auth/user-model.test.ts` (8 tests)
- `tests/unit/auth/session-model.test.ts` (4 tests)
- `tests/unit/auth/login-action.test.ts` (6 tests)
- `tests/unit/auth/jwt.test.ts` (5 tests)
- `tests/unit/shared/utils.test.ts` (4 tests)
- `tests/integration/auth/flow.test.ts` (5 tests, 2 failing)

### Pending
- `tests/unit/auth/login-form.test.tsx` (0/5)
- `tests/unit/auth/register-form.test.tsx` (0/5)
- `tests/unit/auth/auth-provider.test.tsx` (0/4)
- `tests/e2e/auth-journey.test.ts` (0/3)

---

## COVERAGE DETAILS

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| models/user.ts | 100% | 100% | 100% | 100% |
| models/session.ts | 95% | 90% | 100% | 95% |
| actions/login.ts | 88% | 75% | 100% | 88% |
| actions/logout.ts | 100% | 100% | 100% | 100% |
| lib/jwt.ts | 92% | 85% | 100% | 92% |
| lib/validation.ts | 100% | 100% | 100% | 100% |

---

## NEXT TESTING TASKS

1. [ ] Fix 2 failing integration tests
2. [ ] Write login-form.test.tsx when component done
3. [ ] Increase auth coverage to 90%
4. [ ] Write E2E test for login flow
```

**Update Frequency:** After every test run
**Max Length:** 150 lines

---

## Layer 5: Feature Tracking (Per-Feature Folder)

### .state/features/01-auth/STATUS.md (Quick Status)

```markdown
# AUTH MODULE STATUS

**Progress:** 75%
**Status:** 🔄 In Progress
**Current:** Client Components (60%)

## STEP STATUS

| Step              | Status | Progress |
| ----------------- | ------ | -------- |
| Data Layer        | ✅     | 100%     |
| Business Logic    | ✅     | 100%     |
| Server Components | ✅     | 100%     |
| Client Components | 🔄     | 60%      |
| Testing           | 🔄     | 55%      |

## CURRENT WORK

File: `src/features/auth/components/login-form.tsx`
Status: 70% complete (lines 1-55 done)

## BLOCKERS

None

## NEXT STEPS

1. Complete login-form.tsx
2. Write login-form tests
3. Create register-form.tsx
4. Create auth-provider.tsx
5. Complete testing
```

**Max Length:** 40 lines

---

### .state/features/01-auth/PROGRESS.md (Detailed Progress)

```markdown
# AUTH MODULE DETAILED PROGRESS

**Started:** 2024-01-15T10:00:00Z
**Target:** 2024-01-16T18:00:00Z

---

## STEP 1: DATA LAYER ✅ COMPLETE

### Tasks

- [x] User model (`models/user.ts` - 45 lines)
- [x] Session model (`models/session.ts` - 38 lines)
- [x] Token model (`models/token.ts` - 29 lines)
- [x] createUser action (`actions/users.ts`)
- [x] findUserByEmail action (`actions/users.ts`)
- [x] createSession action (`actions/sessions.ts`)
- [x] invalidateSession action (`actions/sessions.ts`)

### Completion

**Completed:** 2024-01-15T12:00:00Z
**Tests:** 12/12 passing
**Coverage:** 98%

---

## STEP 2: BUSINESS LOGIC ✅ COMPLETE

### Tasks

- [x] Password validation (`lib/validation.ts`)
- [x] Email validation (`lib/validation.ts`)
- [x] JWT generation (`lib/jwt.ts`)
- [x] JWT verification (`lib/jwt.ts`)
- [x] Session management (`lib/session.ts`)

### Completion

**Completed:** 2024-01-15T13:30:00Z
**Tests:** 5/5 passing
**Coverage:** 95%

---

## STEP 3: SERVER COMPONENTS ✅ COMPLETE

### Tasks

- [x] AuthLayout (`layouts/auth-layout.tsx` - 35 lines)
- [x] LoginPage (`pages/login-page.tsx` - 48 lines)
- [x] RegisterPage (`pages/register-page.tsx` - 52 lines)

### Completion

**Completed:** 2024-01-15T14:15:00Z
**Tests:** 3/3 passing

---

## STEP 4: CLIENT COMPONENTS 🔄 IN PROGRESS

### Tasks

- [x] Created component files structure
- [🔄] LoginForm (`components/login-form.tsx` - 55/80 lines)
- [ ] RegisterForm (`components/register-form.tsx`)
- [ ] AuthProvider (`components/auth-provider.tsx`)
- [ ] LogoutButton (`components/logout-button.tsx`)

### Current

**File:** login-form.tsx
**Progress:** Lines 1-55 complete, working on form JSX
**Details:** See SESSION.md for exact position

---

## STEP 5: TESTING 🔄 IN PROGRESS

### Status

- [x] Unit tests for models (12/12)
- [x] Unit tests for lib (5/5)
- [x] Unit tests for actions (6/6)
- [🔄] Integration tests (3/5 - 2 failing)
- [ ] Unit tests for components (0/8)
- [ ] E2E tests (0/3)

### Pending Items

1. Fix 2 failing integration tests
2. Write component tests after components done
3. Write E2E after all unit/integration pass
```

**Max Length:** 150 lines

---

### .state/features/01-auth/FILES.md (File Inventory)

```markdown
# AUTH MODULE FILES

## COMPLETE FILES

| File                      | Lines | Purpose                | Tests       |
| ------------------------- | ----- | ---------------------- | ----------- |
| `models/user.ts`          | 45    | User type & validation | ✅ 8/8      |
| `models/session.ts`       | 38    | Session type & expiry  | ✅ 4/4      |
| `models/token.ts`         | 29    | Token types            | ✅ included |
| `actions/login.ts`        | 67    | Login server action    | ✅ 6/6      |
| `actions/logout.ts`       | 34    | Logout server action   | ✅ 2/2      |
| `actions/refresh.ts`      | 52    | Token refresh          | ✅ included |
| `lib/jwt.ts`              | 78    | JWT utilities          | ✅ 5/5      |
| `lib/validation.ts`       | 56    | Validation rules       | ✅ 3/3      |
| `lib/session.ts`          | 43    | Session utilities      | ✅ included |
| `layouts/auth-layout.tsx` | 35    | Auth page layout       | ✅ 1/1      |
| `pages/login-page.tsx`    | 48    | Login page             | ✅ 1/1      |
| `pages/register-page.tsx` | 52    | Register page          | ✅ 1/1      |

## IN PROGRESS FILES

| File                        | Lines | Status | Remaining               |
| --------------------------- | ----- | ------ | ----------------------- |
| `components/login-form.tsx` | 55/80 | 70%    | Form JSX, submit button |

## PENDING FILES

| File                           | Est. Lines | Purpose           | Depends On         |
| ------------------------------ | ---------- | ----------------- | ------------------ |
| `components/register-form.tsx` | ~90        | Registration form | login-form pattern |
| `components/auth-provider.tsx` | ~60        | Auth context      | forms complete     |
| `components/logout-button.tsx` | ~25        | Logout UI         | auth-provider      |

## FILE TREE
```

src/features/auth/
├── models/
│ ├── user.ts ✅
│ ├── session.ts ✅
│ └── token.ts ✅
├── actions/
│ ├── login.ts ✅
│ ├── logout.ts ✅
│ └── refresh.ts ✅
├── lib/
│ ├── jwt.ts ✅
│ ├── validation.ts ✅
│ └── session.ts ✅
├── layouts/
│ └── auth-layout.tsx ✅
├── pages/
│ ├── login-page.tsx ✅
│ └── register-page.tsx ✅
└── components/
├── login-form.tsx 🔄 70%
├── register-form.tsx ⏳
├── auth-provider.tsx ⏳
└── logout-button.tsx ⏳

```

```

**Max Length:** 100 lines

---

### .state/features/01-auth/OLDAPP.md (OldApp References)

```markdown
# AUTH MODULE - OLDAPP REFERENCES

**Purpose:** Track what was extracted from oldapp/ and where it's used

---

## EXTRACTED REFERENCES

### User Model

**Source:** `oldapp/models/user.ts`
**Extracted:**

- Field definitions: id, email, passwordHash, name, createdAt, updatedAt
- Email validation: must be valid format, max 255 chars
- Password: stored as bcrypt hash
  **Used In:** `src/features/auth/models/user.ts`
  **Adaptation:** Converted from class to TypeScript interface + Zod schema

---

### Session Model

**Source:** `oldapp/models/session.ts`, `oldapp/lib/session.ts`
**Extracted:**

- Session fields: id, userId, token, expiresAt, userAgent, ipAddress
- Access token expiry: 30 minutes
- Refresh token expiry: 7 days
- Max sessions per user: 5
  **Used In:** `src/features/auth/models/session.ts`, `src/features/auth/lib/session.ts`
  **Adaptation:** Simplified from ORM class to plain functions

---

### Password Validation

**Source:** `oldapp/lib/validation.ts:12-45`
**Extracted:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&\*)
  **Used In:** `src/features/auth/lib/validation.ts`
  **Adaptation:** Converted to Zod schema with .refine()

---

### Login Form UI

**Source:** `oldapp/components/LoginForm.tsx`
**Extracted:**

- Field order: email, password, remember me, submit
- Error display: below each field, red text
- Loading state: button disabled, shows spinner
- Success: redirect to /dashboard
  **Used In:** `src/features/auth/components/login-form.tsx`
  **Adaptation:** Rebuilt with shadcn/ui components

---

### Error Messages

**Source:** `oldapp/lib/validation.ts`, `oldapp/components/LoginForm.tsx`
**Extracted (exact text for UX parity):**

- "Email is required"
- "Please enter a valid email address"
- "Password is required"
- "Password must be at least 8 characters"
- "Invalid email or password"
- "Too many attempts. Please try again later."
  **Used In:** `src/features/auth/lib/validation.ts`, `src/features/auth/components/login-form.tsx`

---

### JWT Configuration

**Source:** `oldapp/lib/jwt.ts`
**Extracted:**

- Algorithm: HS256
- Access token expiry: 30 minutes (1800 seconds)
- Refresh token expiry: 7 days (604800 seconds)
- Token payload: { userId, email, sessionId, type }
  **Used In:** `src/features/auth/lib/jwt.ts`
  **Adaptation:** Same logic, cleaner TypeScript types

---

## NOT COPIED (Explicitly Avoided)

| OldApp Pattern           | Why Avoided            | New Approach                   |
| ------------------------ | ---------------------- | ------------------------------ |
| Class-based models       | Over-engineered        | Plain interfaces + functions   |
| Redux for auth state     | Unnecessary complexity | React Context                  |
| HOC for protected routes | Outdated pattern       | Middleware + Server Components |
| Custom form library      | Reinventing wheel      | Native React / shadcn          |
| Prop drilling auth       | Hard to maintain       | Context at app level           |

---

## REFERENCE LOG

| Date  | Session | OldApp File              | What Extracted             |
| ----- | ------- | ------------------------ | -------------------------- |
| 01-15 | S-001   | models/user.ts           | Field definitions          |
| 01-15 | S-001   | lib/jwt.ts               | Token expiry times         |
| 01-15 | S-002   | lib/validation.ts        | Password rules             |
| 01-15 | S-003   | components/LoginForm.tsx | Form field order, error UX |
```

**Max Length:** 150 lines

---

# PART 2: THE WORKFLOW

## Startup Protocol (Every New Session)

```
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT STARTUP SEQUENCE                       │
│                     (Execute in exact order)                     │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Read CURRENT.md (30 seconds)
        ↓
        Understand: What's happening? What's next?
        ↓
STEP 2: Check operation status
        ├─► If "WORKING": Read SESSION.md, continue operation
        └─► If "PAUSED": Read SESSION.md, resume from instructions
        ↓
STEP 3: Verify environment
        $ npm run build    (must pass)
        $ npm test         (note status)
        ↓
STEP 4: Update CURRENT.md
        Status: WORKING
        Add session start note
        ↓
STEP 5: Begin/continue work
        (Always update CURRENT.md before each operation)
```

### Startup Checklist

```markdown
## Session Start Checklist

- [ ] Read .state/CURRENT.md
- [ ] Read .state/SESSION.md if operation in progress
- [ ] Run `npm run build` - Status: \_\_\_
- [ ] Run `npm test` - Result: **_/_**
- [ ] Update CURRENT.md with session start
- [ ] Ready to proceed

**Session ID:** S-[DATE]-[TIME]
**Starting:** [What I'm about to do]
```

---

## Operation Protocol (Every Task)

### Before Starting Any Operation

```markdown
## Update CURRENT.md:

**Status:** WORKING
**Operation:** [What you're about to do]
**File:** [Target file]
**Line:** [Starting line or "new file"]
**Next Action:** [First thing you'll type]
```

### During Operation (Every ~10 Lines)

```markdown
## Update SESSION.md Progress:

[HH:MM:SS] ✓ Lines X-Y complete (description)
[HH:MM:SS] → Lines Y-Z in progress

## Update Current Code Checkpoint:

// Last verified complete line
// CONTINUE FROM HERE: [next code to write]
```

### After Completing Operation

```markdown
## Update CURRENT.md:

**Status:** WORKING
**Operation:** [Next operation from queue]
...

## Update SESSION.md:

Move completed operation to SESSION WORK LOG
Start new CURRENT OPERATION section

## Update feature STATUS.md:

Increment progress percentage
Mark task complete in step list
```

---

## Operation Templates

### Template: Creating New File

**Before starting, write to SESSION.md:**

```markdown
## CURRENT OPERATION

**ID:** OP-[HHMMSS]
**Started:** [Timestamp]
**Status:** IN_PROGRESS

### Intent

Creating: `src/features/[feature]/[folder]/[file].tsx`
Purpose: [What this file does]
Estimated: ~[N] lines

### Checklist

- [ ] Create file with imports
- [ ] Define types/interfaces
- [ ] Implement main logic
- [ ] Add exports
- [ ] Verify build passes

### If Interrupted

1. Check if file exists
2. Find last complete function/component
3. Continue from next checklist item

### Progress

[Will be updated as work proceeds]
```

---

### Template: Modifying Existing File

**Before starting, write to SESSION.md:**

````markdown
## CURRENT OPERATION

**ID:** OP-[HHMMSS]
**Started:** [Timestamp]
**Status:** IN_PROGRESS

### Intent

Modifying: `[file path]`
Change: [Description of change]
Location: Lines [X-Y]

### Before State

```[language]
// Current code at lines X-Y
[paste existing code]
```
````

### After State (Goal)

```[language]
// What it should look like
[paste target code]
```

### If Interrupted

Compare current file to Before/After states
Apply remaining changes

### Progress

[Will be updated as work proceeds]

````

---

### Template: Writing Tests

**Before starting, write to SESSION.md:**

```markdown
## CURRENT OPERATION

**ID:** OP-[HHMMSS]
**Started:** [Timestamp]
**Status:** IN_PROGRESS

### Intent
Testing: `[component/function being tested]`
File: `tests/[path]/[name].test.ts`

### Test Cases
1. [ ] [Test case 1 description]
2. [ ] [Test case 2 description]
3. [ ] [Test case 3 description]
4. [ ] [Test case 4 description]
5. [ ] [Test case 5 description]

### If Interrupted
Check which test cases exist in file
Continue from next unchecked

### Progress
[Will be updated as work proceeds]
````

---

## Completion Protocol (End of Session)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION END SEQUENCE                          │
│               (Execute before stopping work)                     │
└─────────────────────────────────────────────────────────────────┘

IF possible (have time for clean stop):
        ↓
STEP 1: Complete current atomic unit
        (finish the function, close the tag, complete the test)
        ↓
STEP 2: Verify
        $ npm run build
        $ npm test
        ↓
STEP 3: Update all state files
        - CURRENT.md: Status → PAUSED, clear next action
        - SESSION.md: Add completion checkpoint
        - Feature STATUS.md: Update percentage
        - TESTS.md: If tests changed
        ↓
STEP 4: Write resume instructions
        In SESSION.md, ensure "If Interrupted" is current

IF interrupted suddenly (no time):
        ↓
Minimum viable state is already in files because
you've been updating CURRENT.md and SESSION.md
throughout the operation (you have been doing that, right?)
```

---

## Emergency State (Mid-Keystroke Interruption)

Because CURRENT.md and SESSION.md are updated BEFORE and DURING work:

1. **CURRENT.md** always shows what operation is active
2. **SESSION.md** always shows progress checkpoints and code state
3. **Next agent** can:
   - Read CURRENT.md (30 sec) → Know what's happening
   - Read SESSION.md (2 min) → Know exact position
   - Check actual file → Compare to checkpoint
   - Continue from last checkpoint

**This is why real-time updates are mandatory, not optional.**

---

# PART 3: THE IMPLEMENTATION SPEC

## Project Overview

**What:** Complete greenfield implementation of Next.js 16 application
**How:** Following architectural overhaul plan exactly
**Reference:** oldapp/ folder for requirements and logic (NOT patterns)
**Goal:** Full feature parity with optimal new architecture

## Core Principles

### 1. Architecture Adherence

- Follow FINAL-ARCHITECTURE-OVERHAUL-PLAN.md exactly
- Respect all runtime boundaries (server/client/edge)
- Maintain designed dependency graph
- No deviations or "temporary" shortcuts

### 2. Feature Parity

- All user-facing functionality identical to oldapp/
- Same workflows, same UX, same behavior
- Internal implementation completely new
- Extract requirements from oldapp/, never patterns

### 3. Zero Errors

- No TypeScript errors
- No build errors or warnings
- No runtime errors
- No failing tests (except documented known issues)

### 4. Simplicity

- Simplest solution that meets requirements
- No over-engineering
- No premature optimization
- Clean, readable, maintainable code

### 5. Comprehensive Testing

- 85%+ coverage target
- Unit tests for all logic
- Integration tests for features
- E2E tests for critical paths

---

## Implementation Phases

### Phase 1: Foundation ✅

```
1.1 Project Structure
    - Create directory structure per architecture plan
    - Configure Next.js 16 with Turbopack
    - TypeScript strict mode
    - ESLint + Prettier

1.2 Shared Infrastructure
    - Core utilities
    - Shared types
    - Configuration
    - Database setup
    - Error handling

1.3 Testing Infrastructure
    - Vitest configuration
    - React Testing Library
    - Test utilities
    - Coverage reporting

1.4 State Tracking
    - Create .state/ directory
    - Initialize all state files
    - Establish update patterns
```

### Phase 2: Features 🔄

For each feature, follow this sequence:

```
STEP 1: Data Layer
        ├── Database models/schemas
        ├── Data access functions
        ├── Server actions
        └── Unit tests

STEP 2: Business Logic
        ├── Core logic functions
        ├── Validation
        ├── Transformations
        └── Unit tests

STEP 3: Server Components
        ├── Page components
        ├── Layouts
        ├── Data fetching
        └── Integration tests

STEP 4: Client Components
        ├── Interactive components
        ├── Event handlers
        ├── Client state
        └── Unit tests

STEP 5: Feature Testing
        ├── Complete unit coverage
        ├── Integration tests
        ├── Feature parity verification
        └── Update all trackers
```

### Phase 3: Integration ⏳

```
3.1 System Integration
    - Cross-module interactions
    - Authentication flows
    - Navigation verification

3.2 E2E Testing
    - Critical user journeys
    - Error scenarios
    - Edge cases

3.3 Optimization
    - Bundle analysis
    - Performance tuning
    - Code splitting verification

3.4 Final QA
    - Full feature parity check
    - Zero error verification
    - Documentation completion
```

---

## OldApp Reference Guide

### DO Extract From OldApp

✅ Business requirements and rules
✅ Data models and field definitions
✅ Validation constraints and error messages
✅ User workflows and interactions
✅ API contracts and endpoints
✅ Edge cases and error scenarios
✅ Constants and configuration values

### DO NOT Copy From OldApp

❌ Component structure
❌ File organization
❌ State management patterns
❌ Data fetching approaches
❌ Routing patterns
❌ Provider hierarchies
❌ Over-engineered abstractions

### Reference Process

1. **Identify need:** What requirement am I implementing?
2. **Find source:** Where in oldapp/ is this handled?
3. **Extract logic:** Understand WHAT and WHY, not HOW
4. **Document:** Log reference in feature's OLDAPP.md
5. **Implement fresh:** Use new patterns per architecture plan
6. **Verify parity:** Test that behavior matches

---

## Quality Standards

### Code Quality Checklist

```markdown
Before marking any file complete:

- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Follows naming conventions (D-006)
- [ ] Follows component patterns (D-007)
- [ ] Has appropriate tests
- [ ] Build still passes
- [ ] Documented in FILES.md
```

### Feature Quality Checklist

```markdown
Before marking any feature complete:

- [ ] All steps complete (Data → Logic → Server → Client → Tests)
- [ ] All files documented in FILES.md
- [ ] OldApp references logged in OLDAPP.md
- [ ] Unit test coverage ≥ 85%
- [ ] Integration tests passing
- [ ] Feature parity verified against oldapp/
- [ ] STATUS.md shows 100%
- [ ] PROGRESS.md fully updated
- [ ] No blocking issues
```

### Project Quality Checklist

```markdown
Before marking project complete:

- [ ] All features complete
- [ ] All tests passing
- [ ] Coverage ≥ 85%
- [ ] Build clean (no warnings)
- [ ] Zero TypeScript errors
- [ ] All state files current
- [ ] Full feature parity verified
- [ ] Documentation complete
```

---

# PART 4: STATE FILE TEMPLATES

## Initial Setup: Create These Files

When starting fresh, create all state files with these templates:

### .state/CURRENT.md

```markdown
# CURRENT STATE

**Updated:** [NOW]

## RIGHT NOW

**Status:** STARTING
**Operation:** Initialize project
**File:** N/A
**Line:** N/A
**Next Action:** Create project structure per architecture plan

## QUICK STATS

**Project:** 0% complete
**Phase:** 1 of 3 (Foundation)
**Feature:** N/A
**Build:** Not yet configured
**Tests:** Not yet configured

## IF RESUMING

1. Check if package.json exists
2. If not, run project initialization
3. If yes, continue from where left off

## BLOCKERS

None

## NEXT IN QUEUE

1. Initialize Next.js project
2. Configure TypeScript
3. Set up testing
4. Create shared utilities
```

### .state/SESSION.md

```markdown
# CURRENT SESSION

**Session ID:** S-[DATE]-[TIME]
**Started:** [NOW]
**Last Update:** [NOW]

---

## CURRENT OPERATION

**ID:** OP-[HHMMSS]
**Started:** [TIME]
**Status:** NOT_STARTED

### Intent

[Will be filled when operation starts]

### Progress

[Will be updated during operation]

### Resume Instructions

[Will be maintained throughout]

---

## SESSION WORK LOG

[Empty - will be populated as work completes]

---

## SESSION CONTEXT

### Decisions Made

[None yet]

### OldApp Files Referenced

[None yet]

### Dependencies Added

[None yet]

---

## VERIFICATION STATUS

**Build:** Not configured
**Tests:** Not configured
```

### .state/PROJECT.md

```markdown
# PROJECT STATUS

**Last Updated:** [NOW]

---

## COMPLETION OVERVIEW
```

Overall Progress: ░░░░░░░░░░░░░░░░░░░░ 0%

PHASE 1 - Foundation ░░░░░░░░░░░░░░░░░░░░ 0% 🔄
PHASE 2 - Features ░░░░░░░░░░░░░░░░░░░░ 0% ⏳
PHASE 3 - Integration ░░░░░░░░░░░░░░░░░░░░ 0% ⏳

```

---

## PHASE STATUS

### Phase 1: Foundation 🔄 IN PROGRESS
- [ ] Project structure
- [ ] TypeScript configuration
- [ ] Turbopack setup
- [ ] Testing infrastructure
- [ ] Shared utilities
- [ ] Database setup
- [ ] State tracking system

### Phase 2: Features ⏳ NOT STARTED
[Features will be listed per architecture plan]

### Phase 3: Integration ⏳ NOT STARTED
[Integration tasks per plan]

---

## BUILD & TEST STATUS

**Build:** Not configured
**Tests:** Not configured
**Coverage:** N/A
```

### .state/DECISIONS.md

```markdown
# ARCHITECTURAL DECISIONS

**Purpose:** Every decision that future agents must follow

---

## ACTIVE DECISIONS

[Will be populated as decisions are made]

---

## DECISION TEMPLATE

### D-XXX: [Title]

**Date:** YYYY-MM-DD
**Decision:** [What was decided]
**Reasoning:** [Why this choice]
**Affects:** [What code/features this impacts]
**Pattern:** [Code example if applicable]
```

### .state/TESTS.md

```markdown
# TEST STATUS

**Last Run:** Not yet run
**Command:** `npm test`

---

## SUMMARY
```

Tests not yet configured

```

---

## BY MODULE

[Will be populated as tests are written]

---

## FAILING TESTS

[None - tests not configured]

---

## TEST INVENTORY

### Completed
[None]

### Pending
[All - per feature requirements]
```

### .state/features/ Directory

Create when starting each feature:

```
.state/features/
└── 01-auth/
    ├── STATUS.md    (use STATUS.md template)
    ├── PROGRESS.md  (use PROGRESS.md template)
    ├── FILES.md     (use FILES.md template)
    └── OLDAPP.md    (use OLDAPP.md template)
```

### .state/issues/ACTIVE.md

```markdown
# ACTIVE ISSUES

**Last Updated:** [NOW]

---

## BLOCKERS (Stopping Progress)

[None currently]

---

## HIGH PRIORITY

[None currently]

---

## MEDIUM PRIORITY

[None currently]

---

## LOW PRIORITY

[None currently]

---

## ISSUE TEMPLATE

### I-XXX: [Title]

**Reported:** [Timestamp]
**Priority:** BLOCKER | HIGH | MEDIUM | LOW
**Affects:** [What's impacted]
**Description:** [Details]
**Attempted:** [What's been tried]
**Next Step:** [What to try next]
```

### .state/issues/RESOLVED.md

```markdown
# RESOLVED ISSUES

---

## TEMPLATE

### I-XXX: [Title] ✅

**Reported:** [Timestamp]
**Resolved:** [Timestamp]
**Resolution:** [How it was fixed]
**Affected Files:** [What was changed]
```

---

# PART 5: QUICK REFERENCE

## File Update Frequency

| File                | Update When                       |
| ------------------- | --------------------------------- |
| CURRENT.md          | Before/after every operation      |
| SESSION.md          | Every checkpoint (~10 lines)      |
| PROJECT.md          | After step/feature completion     |
| DECISIONS.md        | When any decision is made         |
| TESTS.md            | After any test run                |
| feature/STATUS.md   | After any task completion         |
| feature/PROGRESS.md | After any subtask completion      |
| feature/FILES.md    | When any file is created/modified |
| feature/OLDAPP.md   | When referencing oldapp/          |

## State Reading Order

```
New Session:
CURRENT.md → SESSION.md (if needed) → [start work]

Checking Progress:
CURRENT.md → PROJECT.md → [specific feature STATUS.md if needed]

Understanding Decisions:
DECISIONS.md

Checking Tests:
TESTS.md → [specific feature testing section if needed]

Understanding Feature:
feature/STATUS.md → feature/PROGRESS.md → feature/FILES.md
```

## Command Reference

```bash
# Verify build
npm run build

# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Coverage report
npm test -- --coverage
```

## Status Icons

```
✅ Complete / Passing
🔄 In Progress
⏳ Not Started / Pending
❌ Failed / Blocked
⚠️ Warning / Attention Needed
```

---

# IMPLEMENTATION MANDATE

## Your Mission

Build a production-ready Next.js 16 application that:

- Follows the architectural plan exactly
- Achieves full feature parity with oldapp/
- Has zero errors
- Has 85%+ test coverage
- Is maintainable by any future agent

## Your Method

1. **State First:** Update state files BEFORE doing work
2. **Checkpoint Often:** Log progress every ~10 lines
3. **Verify Continuously:** Build and test frequently
4. **Document Everything:** Future agents depend on your notes

## Your Responsibility

The quality of your state documentation determines whether work can continue after you.

**Perfect code + poor documentation = lost progress**
**Good documentation + incomplete code = continuable work**

## Start Sequence

```
1. Create .state/ directory and all template files
2. Read architecture plan (FINAL-ARCHITECTURE-OVERHAUL-PLAN.md)
3. Update CURRENT.md with first operation
4. Begin Phase 1: Foundation
5. Update state files continuously
```

---

**BEGIN IMPLEMENTATION**

Read any existing state files. If none exist, create them using the templates above. Then proceed with the implementation, maintaining continuous state updates throughout.
