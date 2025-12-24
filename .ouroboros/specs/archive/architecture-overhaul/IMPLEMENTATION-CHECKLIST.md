# Implementation Checklist - Architecture Overhaul

**Created**: 2025-12-22
**Total Issues**: 216 planned
**Total Effort**: 80-100 hours
**Start**: Phase 1 (CRITICAL)

---

## Quick Reference

| Priority    | Issues | Effort | Fix Plans |
| ----------- | ------ | ------ | --------- |
| 🔴 CRITICAL | 6      | 12-18h | 01-02     |
| 🟠 HIGH     | 22     | 13-17h | 03-04, 12 |
| 🟡 MEDIUM   | 139    | 48-54h | 05-08, 13 |
| 🟢 LOW      | 49     | 7h     | 09-11     |

---

## Pre-Implementation

- [ ] Backup current state: `git stash` or commit all changes
- [ ] Create feature branch: `git checkout -b fix/architecture-overhaul`
- [ ] Read master index: `fix-plans/00-fix-plan-index.md`
- [ ] Review CRITICAL fix plans (01-02)
- [ ] Setup test environment: `pnpm install && pnpm test`
- [ ] Verify database connection works

---

## Phase 1: CRITICAL Data Persistence (12-18h)

> **Blocks everything else.** Fix these first before any other work.

### Issue #1: saveChat not called after streaming (2-3h)

**Fix Plan**: [01-critical-data-persistence.md](fix-plans/01-critical-data-persistence.md)

- [ ] Read fix plan section for Issue #1
- [ ] Modify: `app/api/chat/route.ts`
  - [ ] Import `getChatByIdCached`, `saveChatCached`, `createChatCached` from `@/lib/data`
  - [ ] Update `onFinish` callback to save chat
  - [ ] Handle existing chat (append) vs new chat (create)
  - [ ] Add error logging for failed saves
- [ ] **Test**: Send a message, refresh page
- [ ] **Verify**: Chat appears in sidebar history
- [ ] **Verify**: Database has chat record with messages

### Issue #9: DELETE /api/chat endpoint missing (1-2h)

**Fix Plan**: [01-critical-data-persistence.md](fix-plans/01-critical-data-persistence.md)

- [ ] Read fix plan section for Issue #9
- [ ] Create: `app/api/chat/[id]/route.ts`
  - [ ] Implement DELETE handler
  - [ ] Add authentication check
  - [ ] Add ownership verification
  - [ ] Call `deleteChatCached()`
- [ ] **Test**: Delete button works in UI
- [ ] **Verify**: Chat removed from sidebar
- [ ] **Verify**: Chat removed from database

### Issue #10: Server Actions not persisting (2-3h)

**Fix Plan**: [01-critical-data-persistence.md](fix-plans/01-critical-data-persistence.md)

- [ ] Read fix plan section for Issue #10
- [ ] Modify: `features/chat/actions/chat-actions.ts`
  - [ ] Complete `getChats()` - fetch from database
  - [ ] Complete `deleteChat()` - call data layer
  - [ ] Complete `clearHistory()` - bulk delete
  - [ ] Complete `getChatById()` - single fetch
- [ ] **Test**: Sidebar shows chat history on load
- [ ] **Test**: Delete all chats works
- [ ] **Verify**: All sidebar actions work with database

### Issue #19: User system prompt missing (2-3h)

**Fix Plan**: [FIX-019-user-system-prompt.md](fix-plans/FIX-019-user-system-prompt.md) | [02-critical-security-ux.md](fix-plans/02-critical-security-ux.md)

- [ ] Read detailed fix plan: FIX-019
- [ ] Create: `lib/ai/prompts.ts`
  - [ ] Define `BASE_SYSTEM_PROMPT`
  - [ ] Define `ARTIFACT_INSTRUCTIONS`
  - [ ] Export `buildSystemPrompt()` function
- [ ] Modify: `features/chat/components/chat-input.tsx`
  - [ ] Include user settings in API request
- [ ] Modify: `app/api/chat/route.ts`
  - [ ] Import `buildSystemPrompt`
  - [ ] Use dynamic system prompt from request
- [ ] **Test**: Set custom system prompt in settings
- [ ] **Verify**: AI uses custom system prompt in conversation

### Issue #83: Security headers missing (2-3h)

**Fix Plan**: [FIX-083-security-headers.md](fix-plans/FIX-083-security-headers.md) | [02-critical-security-ux.md](fix-plans/02-critical-security-ux.md)

- [ ] Read detailed fix plan: FIX-083
- [ ] Create: `lib/middleware/security-headers.ts`
  - [ ] Add CSP header
  - [ ] Add X-Frame-Options: DENY
  - [ ] Add X-Content-Type-Options: nosniff
  - [ ] Add Referrer-Policy
  - [ ] Add HSTS (production only)
- [ ] Modify: `middleware.ts`
  - [ ] Import and call `applySecurityHeaders()`
- [ ] Modify: `next.config.ts`
  - [ ] Add headers for static assets
- [ ] **Test**: Check browser DevTools for headers
- [ ] **Verify**: All security headers present on responses

### Issue #97: E2E tests failing - mock AI not used (3-4h)

**Fix Plan**: [FIX-097-e2e-tests-mock-ai.md](fix-plans/FIX-097-e2e-tests-mock-ai.md) | [02-critical-security-ux.md](fix-plans/02-critical-security-ux.md)

- [ ] Read detailed fix plan: FIX-097
- [ ] Modify: `tests/e2e/utils.ts`
  - [ ] Enhance `setupMockAI()` function
  - [ ] Add configurable mock responses
  - [ ] Support streaming format
- [ ] Modify: All `tests/e2e/*.spec.ts` files
  - [ ] Add `setupMockAI(page)` in `beforeEach`
- [ ] Create: `tests/e2e/fixtures/mock-responses.ts` (optional)
- [ ] **Run**: `pnpm test:e2e`
- [ ] **Verify**: All 31 tests pass without real API calls
- [ ] **Verify**: No API costs in test runs

### ✅ Phase 1 Complete Checkpoint

- [ ] All 6 CRITICAL issues fixed
- [ ] Chat persists after refresh
- [ ] Delete chat works
- [ ] System prompt customizable
- [ ] Security headers applied
- [ ] E2E tests pass
- [ ] Commit: `git commit -m "fix: CRITICAL issues #1,#9,#10,#19,#83,#97"`

---

## Phase 2: HIGH Security (3-4h)

**Fix Plan**: [03-high-security.md](fix-plans/03-high-security.md)

### Issue #85: Chat API allows unauthenticated access (1h)

- [ ] Modify: `app/api/chat/route.ts`
  - [ ] Add session check at handler start
  - [ ] Return 401 if not authenticated (or guest limit)
- [ ] **Test**: Unauthenticated request returns 401
- [ ] **Verify**: Authenticated users can still chat

### Issue #86: Health endpoint exposes internal state (0.5h)

- [ ] Modify: `app/api/health/route.ts`
  - [ ] Reduce public response to minimal info
  - [ ] Add internal token for detailed health (optional)
- [ ] **Test**: Health endpoint shows only `status` and `timestamp`
- [ ] **Verify**: Internal details not exposed

### Issue #87: Token stored without additional binding (1h)

- [ ] Modify: `app/api/auth/exchange/route.ts`
  - [ ] Hash IP address
  - [ ] Store IP/UA binding with session
  - [ ] Log mismatches (optional enforcement)
- [ ] **Test**: Session includes binding metadata
- [ ] **Verify**: Suspicious activity logged

### Issue #88: Rate limiting fails open (0.5h)

- [ ] Modify: `lib/middleware/rate-limit.ts`
  - [ ] Change `failOpen` default to `false`
  - [ ] Add in-memory fallback when Redis unavailable
- [ ] **Test**: Simulate Redis failure
- [ ] **Verify**: Rate limiting still enforced

### Issue #197: Quota check fails open (0.5h)

- [ ] Modify: `lib/cache-ops/quota.ts`
  - [ ] Change fail behavior to deny
  - [ ] Add graceful degradation logging
- [ ] **Test**: Quota still enforced without Redis
- [ ] **Verify**: No unlimited access on failure

### ✅ Phase 2 Complete Checkpoint

- [ ] All 5 HIGH security issues fixed
- [ ] Commit: `git commit -m "fix: HIGH security issues #85,#86,#87,#88,#197"`

---

## Phase 3: HIGH API/Infrastructure (6-8h)

**Fix Plan**: [04-high-api-infra.md](fix-plans/04-high-api-infra.md)

### Issue #3: Model selector not persisting (1h)

- [ ] Implement model preference storage
- [ ] Persist selection to settings
- [ ] **Test**: Selected model persists after refresh

### Issue #6: Attachment handling incomplete (2h)

- [ ] Complete attachment upload flow
- [ ] Handle file types properly
- [ ] **Test**: Upload and use attachments in chat

### Issue #144: Message streaming errors (1h)

- [ ] Fix streaming error handling
- [ ] Add proper error boundaries
- [ ] **Test**: Errors display gracefully

### Issue #215: SUPABASE_URL assertion crash (0.5h)

- [ ] Modify: `app/api/auth/exchange/route.ts`
  - [ ] Remove non-null assertion
  - [ ] Add graceful validation
- [ ] **Test**: Missing env returns 503, not crash

### Issue #216: ANON_KEY assertion crash (0.5h)

- [ ] Same file as #215
- [ ] Validate SUPABASE_ANON_KEY
- [ ] **Test**: Missing env returns 503, not crash

### Issue #221: Type assertion without validation (1h)

- [ ] Modify: `app/api/chat/route.ts`
  - [ ] Add Zod schema for request body
  - [ ] Return 400 on validation failure
- [ ] **Test**: Malformed request returns validation error

### Issue #244: Missing guest rate limit (0.5h)

- [ ] Modify: `middleware.ts`
  - [ ] Add rate limit for `/api/auth/guest`
- [ ] **Test**: Guest endpoint rate limited

### ✅ Phase 3 Complete Checkpoint

- [ ] All 7 HIGH API issues fixed
- [ ] Commit: `git commit -m "fix: HIGH API issues #3,#6,#144,#215,#216,#221,#244"`

---

## Phase 4: MEDIUM Error Handling (~1.5h)

**Fix Plan**: [05-medium-error-handling.md](fix-plans/05-medium-error-handling.md)

- [ ] #130: Add `role="alert"` to error components (5m)
- [ ] #151: Log unknown message parts instead of dropping (10m)
- [ ] #158: Add specific error messages to toasts (10m)
- [ ] #174: Improve fetch error messages (10m)
- [ ] #178: Add logging to catch blocks (10m)
- [ ] #195: Handle fire-and-forget DB write errors (15m)
- [ ] #200: Add logging to empty catch blocks (5m)
- [ ] #212: Sanitize error messages for users (10m)
- [ ] #226: Add request ID to error responses (5m)

### ✅ Phase 4 Complete Checkpoint

- [ ] All 9 error handling issues fixed
- [ ] Commit: `git commit -m "fix: MEDIUM error handling issues"`

---

## Phase 5: MEDIUM Accessibility & Architecture (~5h)

**Fix Plan**: [06-medium-accessibility-arch.md](fix-plans/06-medium-accessibility-arch.md)

- [ ] #129: Extract hardcoded greeting for i18n (30m)
- [ ] #148: Replace `title` with proper `Tooltip` component (15m)
- [ ] #171: Add focus states to interactive elements (10m)
- [ ] #176: Add `autoComplete` to input fields (5m)
- [ ] #68: Implement MessageReasoning component (2h)
- [ ] #69: Add TipTap suggestions extension (1h)
- [ ] #73: Optimize heavy library imports (30m)
- [ ] #74: Add env validation with Zod (30m)
- [ ] #75: Implement correlation IDs for requests (30m)

### ✅ Phase 5 Complete Checkpoint

- [ ] All accessibility issues fixed
- [ ] Commit: `git commit -m "fix: MEDIUM a11y and architecture issues"`

---

## Phase 6: MEDIUM Testing & Build (~7h)

**Fix Plan**: [07-medium-testing-build.md](fix-plans/07-medium-testing-build.md)

- [ ] #98: Call `setupMockAI()` in all E2E tests (30m)
- [ ] #99: Add database seeding logic for tests (45m)
- [ ] #101: Replace hardcoded delays with waitFor (30m)
- [ ] #102: Add unit tests for server actions (2h)
- [ ] #103: Improve test coverage (1h)
- [ ] #104: Export `maxDuration` from route handlers (5m)
- [ ] #107: Fix disabled Biome rules (15m)
- [ ] #109-113: Update `.env.example` with all required vars (30m)
- [ ] #307: Cancel `requestAnimationFrame` on cleanup (15m)
- [ ] #314: Fix Zustand hydration mismatch (30m)
- [ ] #316: Add rollback for `deleteChat` failure (20m)
- [ ] #317: Memoize React contexts (10m)
- [ ] #322: Add `MAX_OPTIMISTIC_CHATS` limit (15m)
- [ ] #323: Optimize O(n) duplicate detection (15m)

### ✅ Phase 6 Complete Checkpoint

- [ ] Test infrastructure improved
- [ ] Commit: `git commit -m "fix: MEDIUM testing and build issues"`

---

## Phase 7: MEDIUM Database & Config (~6h)

**Fix Plan**: [08-medium-database-config.md](fix-plans/08-medium-database-config.md)

- [ ] #248: Fix `passwordHash` column length (15m)
- [ ] #249: Add index on `vote.messageId` (10m)
- [ ] #252: Add JSON validation for columns (30m)
- [ ] #254: Handle null document content (10m)
- [ ] #258: Fix naming inconsistencies (30m)
- [ ] #262: Enable source maps for dev (10m)
- [ ] #265: Add security headers to config (30m)
- [ ] #270: Enable `noExplicitAny` rule (1h)
- [ ] #279: Complete coverage exclude patterns (15m)
- [ ] #13: Fix vote toggle state (30m)
- [ ] #14: Add document preview cache (45m)
- [ ] #21: Handle streaming abort (30m)
- [ ] #22: Add tool call timeout (30m)

### ✅ Phase 7 Complete Checkpoint

- [ ] Database schema improved
- [ ] Commit: `git commit -m "fix: MEDIUM database and config issues"`

---

## Phase 8-11: LOW Priority (~7h)

### Phase 8: Quick Wins (~1.5h)

**Fix Plan**: [09-low-batch1-security-testing.md](fix-plans/09-low-batch1-security-testing.md)

- [ ] Review batch 1 fix plan
- [ ] Complete 12 quick security/testing fixes
- [ ] Commit: `git commit -m "fix: LOW batch 1 - quick wins"`

### Phase 9: UX & UI (~2h)

**Fix Plan**: [10-low-batch2-ui-misc.md](fix-plans/10-low-batch2-ui-misc.md)

- [ ] Review batch 2 fix plan
- [ ] Complete 12 UI/UX improvements
- [ ] Commit: `git commit -m "fix: LOW batch 2 - UX improvements"`

### Phase 10-11: Remaining Low (~3.5h)

**Fix Plan**: [11-low-batch3-all-remaining.md](fix-plans/11-low-batch3-all-remaining.md)

- [ ] Review batch 3 fix plan
- [ ] Complete remaining LOW issues
- [ ] Commit: `git commit -m "fix: LOW batch 3 - final cleanup"`

---

## Phase 12: Remaining HIGH Issues (~4-5h)

**Fix Plan**: [12-remaining-high.md](fix-plans/12-remaining-high.md)

- [ ] #65: Create `/api/settings` route (30m)
- [ ] #76: Create `/api/suggestions` route (30m)
- [ ] #165: Fix React import order (15m)
- [ ] #190: Add error handling for model resolution (30m)
- [ ] #196: Fix stream corruption on handler error (45m)
- [ ] #250: Add `onDelete: cascade` to suggestion FK (20m)
- [ ] #276: Fix `DATABASE_URL` non-null assertion (15m)
- [ ] #292: Add optimistic update revert (30m)
- [ ] #318: Implement suggestions extension (45m)
- [ ] #125: (DEFERRED) Visual regression tests

### ✅ Phase 12 Complete Checkpoint

- [ ] Commit: `git commit -m "fix: remaining HIGH issues"`

---

## Phase 13: MEDIUM Batch Plans (~28-34h)

**Fix Plan**: [13-medium-batch-plans.md](fix-plans/13-medium-batch-plans.md)

### Batch 1: UI Polish Sweep (20 issues, 6-8h)

- [ ] Add testids, focus states, loading states
- [ ] Commit: `git commit -m "fix: MEDIUM batch 1 - UI polish"`

### Batch 2: API Hardening (31 issues, 10-12h)

- [ ] Add validation, error handling, rate limiting
- [ ] Commit: `git commit -m "fix: MEDIUM batch 2 - API hardening"`

### Batch 3: A11y Sweep (8 issues, 3-4h)

- [ ] WCAG 2.1 AA compliance
- [ ] Commit: `git commit -m "fix: MEDIUM batch 3 - accessibility"`

### Batch 4: Feature Parity (30 issues, 8-10h)

- [ ] Migrate features from oldApp
- [ ] Commit: `git commit -m "fix: MEDIUM batch 4 - feature parity"`

---

## Post-Implementation

### Testing

- [ ] Run full test suite: `pnpm test`
- [ ] Run E2E tests: `pnpm test:e2e`
- [ ] Run type check: `pnpm typecheck`
- [ ] Run linter: `pnpm lint`

### Verification

- [ ] Manual testing of core flows
  - [ ] Create new chat
  - [ ] Send message
  - [ ] Refresh page → chat persists
  - [ ] Delete chat → chat removed
  - [ ] Settings → system prompt works
- [ ] Check security headers in production
- [ ] Review error logs for issues

### Documentation

- [ ] Update README if needed
- [ ] Update CHANGELOG.md
- [ ] Document any breaking changes

### Deployment

- [ ] Create PR: `fix/architecture-overhaul`
- [ ] Request code review
- [ ] Run CI checks
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Verify in staging
- [ ] Deploy to production

### Archive

- [ ] Move spec to completed: `mv specs/architecture-overhaul .ouroboros/completed/`
- [ ] Update master task list
- [ ] Close related issues

---

## Progress Tracking

| Phase             | Status         | Issues Fixed | Time Spent |
| ----------------- | -------------- | ------------ | ---------- |
| 1 CRITICAL        | ⬜ Pending     | 0/6          | 0h         |
| 2 HIGH Security   | ⬜ Pending     | 0/5          | 0h         |
| 3 HIGH API        | ⬜ Pending     | 0/7          | 0h         |
| 4 MEDIUM Errors   | ⬜ Pending     | 0/9          | 0h         |
| 5 MEDIUM A11y     | ⬜ Pending     | 0/10         | 0h         |
| 6 MEDIUM Testing  | ⬜ Pending     | 0/18         | 0h         |
| 7 MEDIUM DB       | ⬜ Pending     | 0/13         | 0h         |
| 8-11 LOW          | ⬜ Pending     | 0/49         | 0h         |
| 12 HIGH Remaining | ⬜ Pending     | 0/10         | 0h         |
| 13 MEDIUM Batch   | ⬜ Pending     | 0/89         | 0h         |
| **TOTAL**         | **⬜ Pending** | **0/216**    | **0h**     |

---

## Notes

- **Dependency**: Phase 1 must complete before other phases
- **Parallelization**: Phases 4-7 can run in parallel after Phase 3
- **Risk**: Database changes (Phase 7) require migration plan
- **Testing**: Run tests after each phase to catch regressions

---

_Last updated: 2025-12-22_
