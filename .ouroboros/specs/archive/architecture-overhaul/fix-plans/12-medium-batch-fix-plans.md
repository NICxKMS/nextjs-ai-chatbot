# MEDIUM Batch Fix Plans

**Created**: 2025-12-22
**Total Issues Covered**: ~100+ MEDIUM severity issues
**Estimated Total Effort**: 25-35 hours
**Purpose**: Consolidate remaining MEDIUM issues not covered by existing fix plans (05-08)

---

## Executive Summary

Existing fix plans cover:

- **05-medium-error-handling.md**: 9 issues (~80m)
- **06-medium-accessibility-arch.md**: 10 issues (~5h)
- **07-medium-testing-build.md**: 18 issues (~7h)
- **08-medium-database-config.md**: 13 issues (~6h)

**Remaining ~55 issues** are covered by the 4 batch plans below.

---

## Batch 1: UI Polish Sweep 🎨

**Issues Covered**: #41, #100, #101, #102, #133, #139, #148, #149, #152, #153, #154, #159, #160, #161, #162, #166, #170, #171, #173, #182
**Effort**: 6-8 hours
**Theme**: Missing testids, focus states, loading states, UI polish

### Issues Breakdown

| #    | Issue                                      | Component           | Fix                                                       |
| ---- | ------------------------------------------ | ------------------- | --------------------------------------------------------- |
| #41  | Loading UI Mismatch                        | chat/loading        | Match oldapp skeleton structure                           |
| #100 | Missing toggle-sidebar-button testid       | sidebar/toggle      | Add `data-testid="toggle-sidebar-button"`                 |
| #101 | Missing visibility-dropdown-item-\* testid | chat/visibility     | Add `data-testid="visibility-dropdown-item-{visibility}"` |
| #102 | Missing artifact-version-footer testid     | artifacts/version   | Add `data-testid="artifact-version-footer"`               |
| #133 | Model Selector Missing Loading State       | chat/model-selector | Add loading spinner during fetch                          |
| #139 | Mobile Visibility Button Hidden            | chat/header         | Show visibility on mobile                                 |
| #148 | Using title Instead of Tooltip             | message/actions     | Replace `title` with Tooltip component                    |
| #149 | Missing Accessible Name Avatar             | chat/avatar         | Add `aria-label` to avatars                               |
| #152 | Remove Button Only Visible Hover           | attachments         | Make accessible via keyboard                              |
| #153 | Image Missing Error State                  | message/image       | Add error boundary + fallback                             |
| #154 | Missing Focus Visible Styles               | multimodal-input    | Add `focus-visible:ring-2` classes                        |
| #159 | No Accessible Name Container               | artifacts/panel     | Add `aria-label` to container                             |
| #160 | Restore Button Missing Loading             | artifacts/version   | Add loading state during restore                          |
| #161 | motion.div for Interactive Element         | animations          | Use semantic HTML (button/link)                           |
| #162 | randomArr SSR Mismatch                     | skeletons           | Use deterministic values or `useEffect`                   |
| #166 | Theme Flash on Hydration                   | theme-provider      | Add `suppressHydrationWarning`                            |
| #170 | Visibility Change No Loading State         | chat/visibility     | Add loading during visibility change                      |
| #171 | More Options No Focus State                | sidebar/chat-item   | Add `focus-visible:` styles                               |
| #173 | Duplicate SidebarToggle Components         | sidebar             | Consolidate into single component                         |
| #182 | Missing aria-pressed Toggle Buttons        | toggles             | Add `aria-pressed` state                                  |

### Approach

```bash
# Single sweep through UI components
1. Add all missing data-testid attributes (5 issues, 30m)
2. Add focus-visible styles globally (3 issues, 20m)
3. Fix loading states (4 issues, 1h)
4. Fix accessibility attrs (5 issues, 45m)
5. Fix hydration issues (3 issues, 30m)
```

### Checklist

- [ ] Add all missing `data-testid` attributes
- [ ] Add `focus-visible:ring-2 focus-visible:ring-offset-2` to all interactive elements
- [ ] Add loading states to async operations
- [ ] Add `aria-label`, `aria-pressed` where missing
- [ ] Fix SSR/hydration mismatches with `useEffect` guards
- [ ] Replace `title` with Tooltip component
- [ ] Consolidate duplicate SidebarToggle components

---

## Batch 2: API Hardening 🔒

**Issues Covered**: #3, #4, #5, #13, #15, #20, #21, #23, #27, #35, #36, #43, #55, #64, #89, #90, #91, #92, #93, #117, #120, #122, #123, #145, #155, #156, #187, #189, #191, #193, #194
**Effort**: 10-12 hours
**Theme**: Input validation, error handling, response consistency, rate limiting

### Issues Breakdown

#### Input Validation (8 issues)

| #    | Issue                              | Route/Function | Fix                         |
| ---- | ---------------------------------- | -------------- | --------------------------- |
| #15  | Missing messageMetadataSchema      | lib/types      | Add Zod schema              |
| #55  | Unsafe Type Assertion              | lib/utils      | Add runtime validation      |
| #64  | Guest Chat ID Not Validated        | api/chat       | Validate UUID format        |
| #89  | AUTH_SECRET Runtime Validation     | lib/auth       | Add validation on startup   |
| #122 | Blob Token Not Validated           | api/files      | Validate before use         |
| #145 | Missing Max File Size Validation   | api/files      | Add size check (25MB)       |
| #193 | Unsafe Double Type Assertion       | lib/ai         | Use proper type guards      |
| #194 | No Weather API Response Validation | lib/ai/tools   | Add Zod schema for response |

#### Error Handling (7 issues)

| #    | Issue                           | Location     | Fix                                           |
| ---- | ------------------------------- | ------------ | --------------------------------------------- |
| #5   | Inconsistent Error Format       | all routes   | Standardize to `{ error: { code, message } }` |
| #92  | Document Handler Leaks Info     | api/document | Sanitize error messages                       |
| #93  | AI Token Usage Logs User ID     | lib/ai       | Hash or anonymize user ID                     |
| #120 | Redis Degradation Inconsistent  | lib/cache    | Standardize fallback behavior                 |
| #123 | AI Provider Registration Silent | lib/ai       | Log registration failures                     |
| #155 | SWR Fetcher No Error Handling   | hooks        | Add error boundaries                          |
| #156 | Artifact SWR No Error Handling  | artifacts    | Add error state handling                      |

#### API Enhancements (10 issues)

| #   | Issue                  | Route           | Fix                           |
| --- | ---------------------- | --------------- | ----------------------------- |
| #3  | DELETE Endpoint        | api/chat        | Add DELETE handler            |
| #4  | Pagination             | api/history     | Implement cursor pagination   |
| #13 | Upload Rate Limiting   | api/files       | Add rate limit (5/hour)       |
| #20 | Geo Hints              | api/chat        | Add geo data to system prompt |
| #21 | Title Race Condition   | api/chat        | Add mutex/lock                |
| #23 | AI SDK Telemetry       | api/chat        | Add `experimental_telemetry`  |
| #27 | Stream Table           | lib/db          | Add stream resumption table   |
| #35 | Document Handler Model | lib/ai/handlers | Pass model param              |
| #36 | Network Retry          | lib/api         | Add exponential backoff       |
| #43 | Upload AbortController | api/files       | Add cancellation support      |

#### Security (6 issues)

| #    | Issue                               | Location            | Fix                      |
| ---- | ----------------------------------- | ------------------- | ------------------------ |
| #90  | Open Redirect Incomplete            | middleware          | Validate redirect URLs   |
| #91  | Server Actions Lack CSRF            | features/\*/actions | Add CSRF verification    |
| #117 | Missing server-only Guard           | lib/middleware      | Add `server-only` import |
| #187 | Global Cache Key Collision          | features/artifacts  | Namespace cache keys     |
| #189 | Optimistic Delete Filter            | sidebar/hooks       | Fix filter logic         |
| #191 | Cloudflare Providers Not Registered | lib/ai              | Register async providers |

### Approach

```bash
# API sweep in phases
Phase 1: Input validation schemas (2h)
Phase 2: Error handling standardization (2h)
Phase 3: Rate limiting & security (2h)
Phase 4: API enhancements (4h)
Phase 5: Integration testing (2h)
```

### Checklist

- [ ] Create standardized error response utility
- [ ] Add Zod schemas for all API inputs
- [ ] Add rate limiting to upload endpoint
- [ ] Implement pagination for history API
- [ ] Add DELETE handler to chat API
- [ ] Validate redirect URLs in middleware
- [ ] Add `server-only` guards to server modules
- [ ] Standardize Redis fallback behavior
- [ ] Add network retry with exponential backoff

---

## Batch 3: A11y Sweep (WCAG Compliance) ♿

**Issues Covered**: #75, #128, #130, #134, #135, #138, #140, #176
**Effort**: 3-4 hours
**Theme**: WCAG 2.1 AA compliance

### Issues Breakdown

| #    | Issue                            | Component        | WCAG Criterion               |
| ---- | -------------------------------- | ---------------- | ---------------------------- |
| #75  | ARIA Accessibility Error         | various          | 4.1.2 Name, Role, Value      |
| #128 | Missing aria-live Greeting       | overview         | 4.1.3 Status Messages        |
| #130 | Missing role="alert"             | error-fallback   | 4.1.3 Status Messages        |
| #134 | Missing aria-selected            | dropdown         | 4.1.2 Name, Role, Value      |
| #135 | Missing Accessible Name Textarea | multimodal-input | 4.1.2 Name, Role, Value      |
| #138 | Missing Weather Icon Alt Text    | weather          | 1.1.1 Non-text Content       |
| #140 | Missing Keyboard Activation      | suggestions      | 2.1.1 Keyboard               |
| #176 | Input Missing autoComplete       | auth-form        | 1.3.5 Identify Input Purpose |

### Approach

```bash
# A11y audit sweep
1. Run axe-core on all pages (identify additional issues)
2. Fix ARIA roles and states
3. Add keyboard navigation
4. Add alt text to images
5. Add autoComplete attributes
6. Verify with screen reader
```

### Checklist

- [ ] Add `aria-live="polite"` to dynamic content areas
- [ ] Add `role="alert"` to error messages
- [ ] Add `aria-selected` to dropdown items
- [ ] Add `aria-label` to form inputs
- [ ] Add `alt` text to all images
- [ ] Add `autoComplete` to auth inputs
- [ ] Add keyboard handlers to interactive elements
- [ ] Run axe-core and fix all violations
- [ ] Test with NVDA/VoiceOver

---

## Batch 4: Feature Parity (OldApp Migration) 🔄

**Issues Covered**: #24, #28, #32, #33, #39, #44, #45, #47, #48, #50, #56, #58, #59, #60, #67, #68, #69, #71, #72, #73, #74, #80, #81, #82, #115, #116, #132, #143, #147, #164
**Effort**: 8-10 hours
**Theme**: Missing oldapp features and patterns

### Issues Breakdown

#### Missing Components (5 issues)

| #    | Issue              | OldApp Source                            | Target                            |
| ---- | ------------------ | ---------------------------------------- | --------------------------------- |
| #68  | MessageReasoning   | oldapp/components/elements/reasoning.tsx | features/chat/components/message/ |
| #69  | TipTap Suggestions | oldapp/artifacts/text/extensions/        | features/artifacts/editors/       |
| #71  | branch.tsx         | oldapp/components/elements/branch.tsx    | features/chat/components/         |
| #72  | Tool Types         | oldapp/lib/types/tools.ts                | lib/types/                        |
| #143 | handleEdit         | TODO in message.tsx                      | Implement edit functionality      |

#### Missing Hooks/Patterns (7 issues)

| #    | Issue                       | OldApp Source                     | Target                         |
| ---- | --------------------------- | --------------------------------- | ------------------------------ |
| #44  | SWRInfinite History         | oldapp/hooks/use-chat-history.ts  | features/chat/hooks/           |
| #45  | UI Timing Constants         | oldapp/lib/constants.ts           | lib/config/constants.ts        |
| #47  | localStorage Key            | oldapp localStorage format        | Match key format               |
| #48  | useLocalStorage Hook        | oldapp/hooks/use-local-storage.ts | shared/hooks/                  |
| #50  | Hydration Flag              | oldapp/hooks/ pattern             | Add to settings store          |
| #115 | useScreenSize SSR           | oldapp/hooks/use-screen-size.ts   | Fix SSR return value           |
| #116 | Hydration Mismatch Artifact | oldapp pattern                    | Add `suppressHydrationWarning` |

#### Architecture Fixes (8 issues)

| #      | Issue                      | Fix                               |
| ------ | -------------------------- | --------------------------------- |
| #32    | ModelPart Type             | Add to lib/types/stream.ts        |
| #33    | Model Persistence          | Store selected model in messages  |
| #56    | Unbounded Console Output   | Add max buffer size               |
| #58    | Silent Error Catch         | Add logging to catch blocks       |
| #59    | Visibility Race Condition  | Add debounce/mutex                |
| #60    | Missing Index Optimization | Add DB indexes                    |
| #67    | Duplicate SessionContext   | Consolidate type definitions      |
| #80-82 | Import Violations          | Fix circular lib→features imports |

#### Feature Additions (6 issues)

| #    | Issue                 | Feature                      |
| ---- | --------------------- | ---------------------------- |
| #24  | Vercel Fluid          | Add fluid compute config     |
| #28  | OpenGraph Image       | Add /app/opengraph-image.tsx |
| #39  | Vercel Analytics      | Add @vercel/analytics        |
| #73  | Lazy-Load SheetEditor | Dynamic import               |
| #74  | Heavy Library Imports | Code-split large deps        |
| #132 | Hardcoded Model IDs   | Move to config               |

#### State Management (4 issues)

| #    | Issue                    | Fix                           |
| ---- | ------------------------ | ----------------------------- |
| #147 | handleVote Incomplete    | Complete vote action          |
| #164 | CodeMirror Init          | Pass initial content prop     |
| #187 | Cache Key Collision      | Namespace artifact cache keys |
| #189 | Optimistic Delete Filter | Fix filter predicate          |

### Approach

```bash
# Feature parity in phases
Phase 1: Port missing components (3h)
Phase 2: Port missing hooks (2h)
Phase 3: Fix architecture issues (2h)
Phase 4: Add missing features (2h)
Phase 5: State management fixes (1h)
```

### Checklist

- [ ] Port MessageReasoning from oldapp
- [ ] Port TipTap Suggestions extension
- [ ] Port branch.tsx component
- [ ] Add tool types definitions
- [ ] Port useLocalStorage hook
- [ ] Add UI timing constants
- [ ] Fix lib→features circular imports
- [ ] Add Vercel Analytics
- [ ] Add OpenGraph image
- [ ] Lazy-load heavy components
- [ ] Namespace cache keys properly

---

## Implementation Priority

### Week 1: Security & Stability

1. **Batch 2 Phase 1-3**: Input validation, error handling, security (6h)
2. **Batch 3**: A11y sweep (4h)

### Week 2: API & Features

3. **Batch 2 Phase 4-5**: API enhancements (6h)
4. **Batch 4 Phase 1-2**: Port components & hooks (5h)

### Week 3: Polish

5. **Batch 1**: UI Polish sweep (8h)
6. **Batch 4 Phase 3-5**: Architecture & features (5h)

---

## Risk Matrix

| Batch          | Risk   | Mitigation                         |
| -------------- | ------ | ---------------------------------- |
| UI Polish      | Low    | Visual changes only, easy rollback |
| API Hardening  | Medium | Add feature flags, gradual rollout |
| A11y Sweep     | Low    | Non-breaking enhancements          |
| Feature Parity | Medium | Port from working oldapp code      |

---

## Success Metrics

| Metric                | Current | Target |
| --------------------- | ------- | ------ |
| MEDIUM issues         | 105     | 0      |
| E2E test pass rate    | ~30%    | 100%   |
| axe-core violations   | Unknown | 0      |
| API error consistency | Mixed   | 100%   |
| Missing testids       | ~5      | 0      |

---

## Dependencies

```
Batch 2 (API) → Batch 1 (UI) → Batch 3 (A11y)
                    ↓
              Batch 4 (Features)
```

**Note**: Batch 2 (API Hardening) should complete first as UI components may depend on standardized error responses.

---

## File: 12-medium-batch-fix-plans.md

**Location**: `.ouroboros/specs/architecture-overhaul/fix-plans/`
**Status**: READY FOR IMPLEMENTATION
