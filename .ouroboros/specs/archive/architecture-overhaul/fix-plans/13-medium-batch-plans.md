# MEDIUM Batch Fix Plans - Complete Coverage

**Created**: 2025-12-22
**Total Issues Covered**: ~100 MEDIUM severity issues
**Estimated Total Effort**: 28-34 hours
**Phase**: 13

---

## Executive Summary

This document consolidates ALL remaining MEDIUM issues into 4 actionable batches, designed for parallel execution by multiple developers or sequential execution in focused sprints.

### Existing Coverage (Phases 4-7)

| Fix Plan                        | Category            | Issues | Effort   |
| ------------------------------- | ------------------- | ------ | -------- |
| 05-medium-error-handling.md     | Error Handling      | 9      | ~80m     |
| 06-medium-accessibility-arch.md | A11y + Architecture | 10     | ~5h      |
| 07-medium-testing-build.md      | Testing + Build     | 18     | ~7h      |
| 08-medium-database-config.md    | Database + Config   | 13     | ~6h      |
| **Subtotal**                    |                     | **50** | **~20h** |

### New Batch Coverage (Phase 13)

| Batch        | Name            | Issues  | Effort      |
| ------------ | --------------- | ------- | ----------- |
| 1            | UI Polish Sweep | 20      | 6-8h        |
| 2            | API Hardening   | 31      | 10-12h      |
| 3            | A11y Sweep      | 8       | 3-4h        |
| 4            | Feature Parity  | 30      | 8-10h       |
| **Subtotal** |                 | **~89** | **~28-34h** |

### Grand Total: ~139 MEDIUM issues, ~48-54 hours

---

## Batch 1: UI Polish Sweep 🎨

**Issues Covered**: 20
**Effort**: 6-8 hours
**Theme**: Missing testids, focus states, loading states, hydration fixes
**Parallelizable**: Yes (by component area)

### Issues Breakdown

| #    | Issue                                   | Component           | Fix                         | Effort |
| ---- | --------------------------------------- | ------------------- | --------------------------- | ------ |
| #41  | Loading UI mismatch                     | chat/loading        | Match oldapp skeleton       | 30m    |
| #100 | Missing toggle-sidebar-button testid    | sidebar/toggle      | Add data-testid             | 5m     |
| #101 | Missing visibility-dropdown-item testid | chat/visibility     | Add data-testid             | 5m     |
| #102 | Missing artifact-version-footer testid  | artifacts/version   | Add data-testid             | 5m     |
| #133 | Model Selector no loading state         | chat/model-selector | Add spinner                 | 20m    |
| #139 | Mobile visibility button hidden         | chat/header         | Show on mobile              | 15m    |
| #148 | Using title instead of Tooltip          | message/actions     | Replace with Tooltip        | 15m    |
| #149 | Avatar missing accessible name          | chat/avatar         | Add aria-label              | 10m    |
| #152 | Remove button only on hover             | attachments         | Keyboard accessible         | 20m    |
| #153 | Image missing error state               | message/image       | Add error boundary          | 30m    |
| #154 | Missing focus-visible styles            | multimodal-input    | Add focus ring              | 15m    |
| #159 | Container missing accessible name       | artifacts/panel     | Add aria-label              | 10m    |
| #160 | Restore button no loading               | artifacts/version   | Add loading state           | 20m    |
| #161 | motion.div for interactive              | animations          | Use semantic HTML           | 30m    |
| #162 | randomArr SSR mismatch                  | skeletons           | Use deterministic/useEffect | 20m    |
| #166 | Theme flash on hydration                | theme-provider      | suppressHydrationWarning    | 15m    |
| #170 | Visibility change no loading            | chat/visibility     | Add loading state           | 20m    |
| #171 | More Options no focus state             | sidebar/chat-item   | Add focus-visible           | 10m    |
| #173 | Duplicate SidebarToggle                 | sidebar             | Consolidate                 | 30m    |
| #182 | Missing aria-pressed                    | toggles             | Add aria-pressed            | 15m    |

### Implementation Script

```bash
# Phase 1: TestIDs (20 min)
grep -r "data-testid" features/ shared/ components/ # Audit existing
# Add missing testids: #100, #101, #102

# Phase 2: Focus States (30 min)
# Global sweep for focus-visible:ring-2 focus-visible:ring-offset-2
# Issues: #154, #171

# Phase 3: Loading States (90 min)
# Issues: #133, #160, #170

# Phase 4: Accessibility (60 min)
# Issues: #148, #149, #159, #182

# Phase 5: Hydration Fixes (60 min)
# Issues: #162, #166

# Phase 6: Structural (90 min)
# Issues: #41, #161, #173
```

### Checklist

- [ ] Add all missing `data-testid` attributes
- [ ] Add `focus-visible:ring-2` to interactive elements
- [ ] Add loading spinners to async operations
- [ ] Replace `title` with Tooltip component
- [ ] Add `aria-label` to non-text elements
- [ ] Add `aria-pressed` to toggle buttons
- [ ] Fix SSR hydration with `useEffect` guards
- [ ] Consolidate duplicate components

---

## Batch 2: API Hardening 🔒

**Issues Covered**: 31
**Effort**: 10-12 hours
**Theme**: Input validation, error standardization, security hardening
**Parallelizable**: Yes (by endpoint/module)

### Issues Breakdown

#### Input Validation (8 issues, 2h)

| #    | Issue                              | Route/Function | Fix                | Effort |
| ---- | ---------------------------------- | -------------- | ------------------ | ------ |
| #15  | Missing messageMetadataSchema      | lib/types      | Add Zod schema     | 20m    |
| #55  | Unsafe type assertion              | lib/utils      | Runtime validation | 15m    |
| #64  | Guest chat ID not validated        | api/chat       | Validate UUID      | 10m    |
| #89  | AUTH_SECRET runtime validation     | lib/auth       | Startup validation | 15m    |
| #122 | Blob token not validated           | api/files      | Pre-use validation | 10m    |
| #145 | Missing max file size validation   | api/files      | Add 25MB check     | 15m    |
| #193 | Unsafe double type assertion       | lib/ai         | Type guards        | 20m    |
| #194 | No weather API response validation | lib/ai/tools   | Zod schema         | 20m    |

#### Error Handling (7 issues, 2h)

| #    | Issue                           | Location     | Fix                  | Effort |
| ---- | ------------------------------- | ------------ | -------------------- | ------ |
| #5   | Inconsistent error format       | all routes   | Standardize format   | 30m    |
| #92  | Document handler leaks info     | api/document | Sanitize errors      | 15m    |
| #93  | AI token usage logs user ID     | lib/ai       | Hash/anonymize       | 10m    |
| #120 | Redis degradation inconsistent  | lib/cache    | Standardize fallback | 20m    |
| #123 | AI provider registration silent | lib/ai       | Log failures         | 10m    |
| #155 | SWR fetcher no error handling   | hooks        | Error boundaries     | 20m    |
| #156 | Artifact SWR no error handling  | artifacts    | Error state          | 20m    |

#### API Enhancements (10 issues, 4h)

| #   | Issue                           | Route           | Fix                    | Effort |
| --- | ------------------------------- | --------------- | ---------------------- | ------ |
| #3  | DELETE endpoint missing         | api/chat        | Add handler            | 20m    |
| #4  | No pagination                   | api/history     | Cursor pagination      | 45m    |
| #13 | No upload rate limiting         | api/files       | 5/hour limit           | 20m    |
| #20 | Missing geo hints               | api/chat        | Add to system prompt   | 15m    |
| #21 | Title race condition            | api/chat        | Mutex/lock             | 30m    |
| #23 | No AI SDK telemetry             | api/chat        | experimental_telemetry | 15m    |
| #27 | Missing stream table            | lib/db          | Stream resumption      | 45m    |
| #35 | Document handler no model param | lib/ai/handlers | Pass model             | 15m    |
| #36 | No network retry                | lib/api         | Exponential backoff    | 30m    |
| #43 | Upload no AbortController       | api/files       | Cancellation           | 20m    |

#### Security (6 issues, 2h)

| #    | Issue                               | Location            | Fix                | Effort |
| ---- | ----------------------------------- | ------------------- | ------------------ | ------ |
| #90  | Open redirect incomplete            | middleware          | Validate URLs      | 20m    |
| #91  | Server actions lack CSRF            | features/\*/actions | CSRF verification  | 30m    |
| #117 | Missing server-only guard           | lib/middleware      | Add import         | 10m    |
| #187 | Global cache key collision          | features/artifacts  | Namespace keys     | 15m    |
| #189 | Optimistic delete filter bug        | sidebar/hooks       | Fix predicate      | 15m    |
| #191 | Cloudflare providers not registered | lib/ai              | Async registration | 20m    |

### Standardized Error Response

```typescript
// lib/api/error-response.ts
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId?: string
): Response {
  return Response.json(
    {
      error: { code, message, requestId },
    },
    { status }
  );
}
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
- [ ] Implement CSRF for server actions

---

## Batch 3: A11y Sweep ♿

**Issues Covered**: 8
**Effort**: 3-4 hours
**Theme**: WCAG 2.1 AA compliance
**Parallelizable**: Yes (by component)

### Issues Breakdown

| #    | Issue                            | Component        | WCAG  | Fix           | Effort |
| ---- | -------------------------------- | ---------------- | ----- | ------------- | ------ |
| #75  | ARIA accessibility error         | various          | 4.1.2 | Fix roles     | 30m    |
| #128 | Missing aria-live greeting       | overview         | 4.1.3 | Add region    | 15m    |
| #130 | Missing role="alert"             | error-fallback   | 4.1.3 | Add role      | 10m    |
| #134 | Missing aria-selected            | dropdown         | 4.1.2 | Add state     | 15m    |
| #135 | Missing accessible name textarea | multimodal-input | 4.1.2 | Add label     | 15m    |
| #138 | Missing weather icon alt         | weather          | 1.1.1 | Add alt text  | 10m    |
| #140 | Missing keyboard activation      | suggestions      | 2.1.1 | Add handlers  | 30m    |
| #176 | Input missing autoComplete       | auth-form        | 1.3.5 | Add attribute | 10m    |

### WCAG Mapping

| Criterion                    | Issues          | Priority |
| ---------------------------- | --------------- | -------- |
| 1.1.1 Non-text Content       | #138            | HIGH     |
| 1.3.5 Identify Input Purpose | #176            | HIGH     |
| 2.1.1 Keyboard               | #140            | HIGH     |
| 4.1.2 Name, Role, Value      | #75, #134, #135 | HIGH     |
| 4.1.3 Status Messages        | #128, #130      | MEDIUM   |

### Implementation Script

```bash
# Step 1: Run axe-core audit
npx @axe-core/cli http://localhost:3000 --tags wcag2aa

# Step 2: Fix ARIA roles and states
# #75, #128, #130, #134, #135

# Step 3: Add keyboard navigation
# #140 - suggestions

# Step 4: Add alt text to images
# #138 - weather icons

# Step 5: Add autoComplete to forms
# #176 - auth inputs

# Step 6: Verify with screen reader
# Test with NVDA/VoiceOver
```

### Checklist

- [ ] Run axe-core and document violations
- [ ] Add `aria-live="polite"` to dynamic areas
- [ ] Add `role="alert"` to error messages
- [ ] Add `aria-selected` to dropdown items
- [ ] Add `aria-label` to form inputs
- [ ] Add `alt` text to all images
- [ ] Add `autoComplete` to auth inputs
- [ ] Add keyboard handlers to interactive elements
- [ ] Test with screen reader (NVDA/VoiceOver)

---

## Batch 4: Feature Parity 🔄

**Issues Covered**: 30
**Effort**: 8-10 hours
**Theme**: Missing oldapp features and patterns
**Parallelizable**: Partially (by feature area)

### Issues Breakdown

#### Missing Components (5 issues, 3h)

| #    | Issue              | OldApp Source                   | Target              | Effort |
| ---- | ------------------ | ------------------------------- | ------------------- | ------ |
| #68  | MessageReasoning   | oldapp/components/reasoning.tsx | features/chat/      | 45m    |
| #69  | TipTap Suggestions | oldapp/artifacts/extensions/    | features/artifacts/ | 45m    |
| #71  | branch.tsx         | oldapp/components/branch.tsx    | features/chat/      | 30m    |
| #72  | Tool Types         | oldapp/lib/types/tools.ts       | lib/types/          | 20m    |
| #143 | handleEdit         | TODO in message.tsx             | features/chat/      | 40m    |

#### Missing Hooks/Patterns (7 issues, 2h)

| #    | Issue                       | OldApp Source           | Target                   | Effort |
| ---- | --------------------------- | ----------------------- | ------------------------ | ------ |
| #44  | SWRInfinite History         | oldapp/hooks/           | features/chat/           | 30m    |
| #45  | UI Timing Constants         | oldapp/lib/constants.ts | lib/config/              | 15m    |
| #47  | localStorage Key format     | oldapp pattern          | Match format             | 10m    |
| #48  | useLocalStorage Hook        | oldapp/hooks/           | shared/hooks/            | 20m    |
| #50  | Hydration Flag              | oldapp pattern          | settings store           | 15m    |
| #115 | useScreenSize SSR           | oldapp/hooks/           | Fix SSR return           | 15m    |
| #116 | Hydration mismatch Artifact | oldapp pattern          | suppressHydrationWarning | 15m    |

#### Architecture Fixes (8 issues, 2h)

| #      | Issue                         | Fix                        | Effort |
| ------ | ----------------------------- | -------------------------- | ------ |
| #32    | ModelPart type missing        | Add to lib/types/stream.ts | 15m    |
| #33    | Model not persisted           | Store in messages          | 20m    |
| #56    | Unbounded console output      | Max buffer size            | 15m    |
| #58    | Silent error catch            | Add logging                | 10m    |
| #59    | Visibility race condition     | Debounce/mutex             | 20m    |
| #60    | Missing DB index optimization | Add indexes                | 15m    |
| #67    | Duplicate SessionContext      | Consolidate types          | 20m    |
| #80-82 | Import violations             | Fix circular imports       | 30m    |

#### Feature Additions (6 issues, 2h)

| #    | Issue                 | Feature                  | Effort |
| ---- | --------------------- | ------------------------ | ------ |
| #24  | Vercel Fluid          | Fluid compute config     | 15m    |
| #28  | OpenGraph Image       | /app/opengraph-image.tsx | 30m    |
| #39  | Vercel Analytics      | @vercel/analytics        | 15m    |
| #73  | Lazy-load SheetEditor | Dynamic import           | 20m    |
| #74  | Heavy library imports | Code-split               | 30m    |
| #132 | Hardcoded model IDs   | Move to config           | 15m    |

#### State Management (4 issues, 1h)

| #    | Issue                    | Fix                  | Effort |
| ---- | ------------------------ | -------------------- | ------ |
| #147 | handleVote incomplete    | Complete action      | 15m    |
| #164 | CodeMirror init          | Pass initial content | 15m    |
| #187 | Cache key collision      | Namespace keys       | 15m    |
| #189 | Optimistic delete filter | Fix predicate        | 15m    |

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
- [ ] Complete handleVote action

---

## Implementation Schedule

### Week 1: Security & Stability (20h)

| Day | Batch | Phase               | Issues | Effort |
| --- | ----- | ------------------- | ------ | ------ |
| 1   | 2     | Input Validation    | 8      | 2h     |
| 1   | 2     | Error Handling      | 7      | 2h     |
| 2   | 2     | Security            | 6      | 2h     |
| 2   | 3     | A11y Sweep          | 8      | 3-4h   |
| 3   | 2     | API Enhancements    | 10     | 4h     |
| 4-5 | -     | Integration testing | -      | 4h     |

### Week 2: Features & Polish (14h)

| Day | Batch | Phase          | Issues | Effort |
| --- | ----- | -------------- | ------ | ------ |
| 1   | 4     | Components     | 5      | 3h     |
| 2   | 4     | Hooks/Patterns | 7      | 2h     |
| 3   | 4     | Architecture   | 8      | 2h     |
| 3   | 4     | Features       | 6      | 2h     |
| 4   | 1     | UI Polish      | 20     | 6-8h   |
| 5   | -     | Final testing  | -      | 2h     |

---

## Dependency Graph

```
                    ┌─────────────────┐
                    │  Batch 2 (API)  │
                    │    10-12h       │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Batch 1 (UI)│  │ Batch 3(A11y)│  │Batch 4(Feat)│
     │    6-8h     │  │    3-4h     │  │   8-10h     │
     └─────────────┘  └─────────────┘  └─────────────┘
```

**Note**: Batch 2 (API Hardening) should complete first as other batches may depend on standardized error responses and validated inputs.

---

## Risk Matrix

| Batch          | Risk   | Impact   | Mitigation                         |
| -------------- | ------ | -------- | ---------------------------------- |
| UI Polish      | Low    | Visual   | Easy rollback, no breaking changes |
| API Hardening  | Medium | Breaking | Feature flags, gradual rollout     |
| A11y Sweep     | Low    | Additive | Non-breaking enhancements          |
| Feature Parity | Medium | Complex  | Port from working oldapp code      |

---

## Success Metrics

| Metric                       | Before  | Target |
| ---------------------------- | ------- | ------ |
| MEDIUM issues open           | ~100    | 0      |
| E2E test pass rate           | ~60%    | 100%   |
| axe-core violations          | Unknown | 0      |
| API error format consistency | ~30%    | 100%   |
| Missing testids              | ~15     | 0      |
| Lighthouse A11y score        | Unknown | 95+    |

---

## File: 13-medium-batch-plans.md

**Location**: `.ouroboros/specs/architecture-overhaul/fix-plans/`
**Status**: READY FOR IMPLEMENTATION
