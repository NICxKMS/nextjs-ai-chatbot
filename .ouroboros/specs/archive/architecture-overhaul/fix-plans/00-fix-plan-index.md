# Fix Plan Index - Architecture Overhaul

**Created**: 2025-12-22
**Updated**: 2025-12-22
**Total Issues**: ~257 issues across 13 fix plan documents
**Estimated Total Effort**: 80-100 hours

---

## COMPLETE FIX PLAN SUMMARY

| Category  | Planned | Closed | Duplicate | Total   |
| --------- | ------- | ------ | --------- | ------- |
| CRITICAL  | 6       | 0      | 0         | 6       |
| HIGH      | 22      | 6      | 5         | 33      |
| MEDIUM    | 139     | 15     | 3         | 157     |
| LOW       | 49      | 9      | 1         | 59      |
| **TOTAL** | **216** | **30** | **9**     | **255** |

**GRAND TOTAL**: ~257 issues identified, ~216 planned, ~30 closed, ~9 duplicate
**TOTAL EFFORT**: ~80-100 hours

---

## Execution Priority

### Phase 1: CRITICAL (Must fix first) - 6 issues

| Issue | Title                                        | Fix Plan                                                           | Effort | Blocks  |
| ----- | -------------------------------------------- | ------------------------------------------------------------------ | ------ | ------- |
| #1    | Chat persistence - onFinish missing saveChat | [01-critical-data-persistence.md](01-critical-data-persistence.md) | 2-3h   | #9, #10 |
| #9    | DELETE /api/chat endpoint missing            | [01-critical-data-persistence.md](01-critical-data-persistence.md) | 1-2h   | -       |
| #10   | Server Actions not persisting                | [01-critical-data-persistence.md](01-critical-data-persistence.md) | 2-3h   | -       |
| #19   | User system prompt missing                   | [02-critical-security-ux.md](02-critical-security-ux.md)           | 2-3h   | -       |
| #83   | Missing security headers                     | [02-critical-security-ux.md](02-critical-security-ux.md)           | 2-3h   | -       |
| #97   | E2E tests failing (mock AI not used)         | [02-critical-security-ux.md](02-critical-security-ux.md)           | 3-4h   | -       |

**Phase 1 Subtotal**: 12-18 hours

---

### Phase 2: HIGH Security (Next priority) - 5 issues

| Issue | Title                                   | Fix Plan                                   | Effort | Blocks |
| ----- | --------------------------------------- | ------------------------------------------ | ------ | ------ |
| #85   | Chat API allows unauthenticated access  | [03-high-security.md](03-high-security.md) | 1h     | -      |
| #86   | Health endpoint exposes internal state  | [03-high-security.md](03-high-security.md) | 0.5h   | -      |
| #87   | Token stored without additional binding | [03-high-security.md](03-high-security.md) | 1h     | -      |
| #88   | Rate limiting fails open                | [03-high-security.md](03-high-security.md) | 0.5h   | #197   |
| #197  | Quota check fails open                  | [03-high-security.md](03-high-security.md) | 0.5h   | -      |

**Phase 2 Subtotal**: 3-4 hours

---

### Phase 3: HIGH API/Infrastructure - 7 issues

| Issue | Title                             | Fix Plan                                     | Effort | Blocks |
| ----- | --------------------------------- | -------------------------------------------- | ------ | ------ |
| #3    | Model selector not persisting     | [04-high-api-infra.md](04-high-api-infra.md) | 1h     | -      |
| #6    | Attachment handling incomplete    | [04-high-api-infra.md](04-high-api-infra.md) | 2h     | -      |
| #144  | Message streaming errors          | [04-high-api-infra.md](04-high-api-infra.md) | 1h     | -      |
| #215  | SUPABASE_URL assertion crash      | [04-high-api-infra.md](04-high-api-infra.md) | 0.5h   | #216   |
| #216  | ANON_KEY assertion crash          | [04-high-api-infra.md](04-high-api-infra.md) | 0.5h   | -      |
| #221  | Type assertion without validation | [04-high-api-infra.md](04-high-api-infra.md) | 1h     | -      |
| #244  | Missing guest rate limit          | [04-high-api-infra.md](04-high-api-infra.md) | 0.5h   | -      |

**Phase 3 Subtotal**: 6-8 hours

---

### Phase 4: MEDIUM Error Handling - 9 issues

| Issue | Title                              | Fix Plan                                                   | Effort | Blocks |
| ----- | ---------------------------------- | ---------------------------------------------------------- | ------ | ------ |
| #130  | Missing role="alert" on error      | [05-medium-error-handling.md](05-medium-error-handling.md) | 5m     | -      |
| #151  | normalizeMessagePart drops unknown | [05-medium-error-handling.md](05-medium-error-handling.md) | 10m    | -      |
| #158  | Generic error toast                | [05-medium-error-handling.md](05-medium-error-handling.md) | 10m    | -      |
| #174  | Generic fetch error                | [05-medium-error-handling.md](05-medium-error-handling.md) | 10m    | -      |
| #178  | Errors silently swallowed          | [05-medium-error-handling.md](05-medium-error-handling.md) | 10m    | -      |
| #195  | Fire-and-forget DB write           | [05-medium-error-handling.md](05-medium-error-handling.md) | 15m    | -      |
| #200  | Empty catch without logging        | [05-medium-error-handling.md](05-medium-error-handling.md) | 5m     | -      |
| #212  | Error message exposed              | [05-medium-error-handling.md](05-medium-error-handling.md) | 10m    | -      |
| #226  | Generic 500 no request ID          | [05-medium-error-handling.md](05-medium-error-handling.md) | 5m     | -      |

**Phase 4 Subtotal**: ~80 minutes

---

### Phase 5: MEDIUM Accessibility & Architecture - 10 issues

| Issue | Title                      | Fix Plan                                                           | Effort | Blocks     |
| ----- | -------------------------- | ------------------------------------------------------------------ | ------ | ---------- |
| #129  | Hardcoded greeting (i18n)  | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 30m    | -          |
| #148  | title instead of Tooltip   | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 15m    | -          |
| #171  | Missing focus state        | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 10m    | -          |
| #176  | Input missing autoComplete | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 5m     | -          |
| #68   | Missing MessageReasoning   | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 2h     | -          |
| #69   | Missing TipTap Suggestions | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 1h     | -          |
| #73   | Heavy library imports      | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 30m    | -          |
| #74   | No env validation          | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 30m    | #215, #216 |
| #75   | No correlation IDs         | [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | 30m    | -          |

**Phase 5 Subtotal**: ~5 hours

---

### Phase 6: MEDIUM Testing & Build - 18 issues

| Issue    | Title                            | Fix Plan                                                 | Effort | Blocks |
| -------- | -------------------------------- | -------------------------------------------------------- | ------ | ------ |
| #98      | setupMockAI never called         | [07-medium-testing-build.md](07-medium-testing-build.md) | 30m    | #97    |
| #99      | No seed logic in tests           | [07-medium-testing-build.md](07-medium-testing-build.md) | 45m    | -      |
| #101     | Hardcoded delays                 | [07-medium-testing-build.md](07-medium-testing-build.md) | 30m    | -      |
| #102     | No action unit tests             | [07-medium-testing-build.md](07-medium-testing-build.md) | 2h     | -      |
| #103     | Coverage gaps                    | [07-medium-testing-build.md](07-medium-testing-build.md) | 1h     | -      |
| #104     | Missing maxDuration export       | [07-medium-testing-build.md](07-medium-testing-build.md) | 5m     | -      |
| #107     | Biome rules disabled             | [07-medium-testing-build.md](07-medium-testing-build.md) | 15m    | -      |
| #109-113 | Missing env vars in .env.example | [07-medium-testing-build.md](07-medium-testing-build.md) | 30m    | -      |
| #307     | rAF without cancellation         | [07-medium-testing-build.md](07-medium-testing-build.md) | 15m    | -      |
| #314     | Zustand hydration mismatch       | [07-medium-testing-build.md](07-medium-testing-build.md) | 30m    | -      |
| #316     | deleteChat no rollback           | [07-medium-testing-build.md](07-medium-testing-build.md) | 20m    | -      |
| #317     | Context not memoized             | [07-medium-testing-build.md](07-medium-testing-build.md) | 10m    | -      |
| #322     | No MAX_OPTIMISTIC_CHATS          | [07-medium-testing-build.md](07-medium-testing-build.md) | 15m    | -      |
| #323     | O(n) duplicate detection         | [07-medium-testing-build.md](07-medium-testing-build.md) | 15m    | -      |

**Phase 6 Subtotal**: ~7 hours

---

### Phase 7: MEDIUM Database & Config - 13 issues

| Issue | Title                        | Fix Plan                                                     | Effort | Blocks |
| ----- | ---------------------------- | ------------------------------------------------------------ | ------ | ------ |
| #248  | passwordHash length          | [08-medium-database-config.md](08-medium-database-config.md) | 15m    | -      |
| #249  | Missing vote.messageId index | [08-medium-database-config.md](08-medium-database-config.md) | 10m    | -      |
| #252  | JSON columns unvalidated     | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |
| #254  | Document content null        | [08-medium-database-config.md](08-medium-database-config.md) | 10m    | -      |
| #258  | Naming inconsistency         | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |
| #262  | Source maps disabled         | [08-medium-database-config.md](08-medium-database-config.md) | 10m    | -      |
| #265  | Missing security headers     | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |
| #270  | noExplicitAny disabled       | [08-medium-database-config.md](08-medium-database-config.md) | 1h     | -      |
| #279  | Coverage exclude incomplete  | [08-medium-database-config.md](08-medium-database-config.md) | 15m    | -      |
| #13   | Vote toggle state            | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |
| #14   | Document preview cache       | [08-medium-database-config.md](08-medium-database-config.md) | 45m    | -      |
| #21   | Streaming abort handling     | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |
| #22   | Tool call timeout            | [08-medium-database-config.md](08-medium-database-config.md) | 30m    | -      |

**Phase 7 Subtotal**: ~6 hours

---

### Phase 8-11: LOW Issues - 49 issues

| Phase | Category     | Issues | Effort | Fix Plan                                                               |
| ----- | ------------ | ------ | ------ | ---------------------------------------------------------------------- |
| 8     | Quick Wins   | 12     | ~1.5h  | [09-low-batch1-security-testing.md](09-low-batch1-security-testing.md) |
| 9     | UX & UI      | 12     | ~2h    | [10-low-batch2-ui-misc.md](10-low-batch2-ui-misc.md)                   |
| 10    | Perf & Hooks | 8      | ~1.5h  | [11-low-batch3-all-remaining.md](11-low-batch3-all-remaining.md)       |
| 11    | DX & Types   | 7      | ~2h    | [11-low-batch3-all-remaining.md](11-low-batch3-all-remaining.md)       |
| 12+   | Deferred     | 9      | TBD    | Future phases                                                          |
| -     | WONTFIX      | 1      | -      | #325 (UX decision)                                                     |

**LOW Issues Summary**:

- **TODO**: 39 issues (~7 hours)
- **DEFERRED**: 9 issues (Phase 12+)
- **WONTFIX**: 1 issue

---

### Phase 12: Remaining HIGH Issues - 10 issues

| Issue | Title                                   | Fix Plan                                     | Effort | Blocks |
| ----- | --------------------------------------- | -------------------------------------------- | ------ | ------ |
| #65   | Missing /api/settings route             | [12-remaining-high.md](12-remaining-high.md) | 30m    | -      |
| #76   | Missing API route for suggestions       | [12-remaining-high.md](12-remaining-high.md) | 30m    | -      |
| #165  | React import order issue                | [12-remaining-high.md](12-remaining-high.md) | 15m    | -      |
| #190  | Missing error handling model resolution | [12-remaining-high.md](12-remaining-high.md) | 30m    | -      |
| #196  | Missing handler error corrupts stream   | [12-remaining-high.md](12-remaining-high.md) | 45m    | -      |
| #250  | Suggestion FK missing onDelete cascade  | [12-remaining-high.md](12-remaining-high.md) | 20m    | -      |
| #276  | DATABASE_URL non-null assertion         | [12-remaining-high.md](12-remaining-high.md) | 15m    | -      |
| #292  | No optimistic update revert             | [12-remaining-high.md](12-remaining-high.md) | 30m    | -      |
| #318  | Missing suggestions-extension           | [12-remaining-high.md](12-remaining-high.md) | 45m    | -      |
| #125  | No visual regression tests              | [12-remaining-high.md](12-remaining-high.md) | DEFER  | -      |

**Duplicates Closed**: #118, #119, #137, #286, #287 → See [12-remaining-high.md](12-remaining-high.md)

**Phase 12 Subtotal**: ~4-5 hours

---

### Phase 13: MEDIUM Batch Plans - ~89 issues

| Batch | Name            | Issues | Effort | Fix Plan                                             |
| ----- | --------------- | ------ | ------ | ---------------------------------------------------- |
| 1     | UI Polish Sweep | 20     | 6-8h   | [13-medium-batch-plans.md](13-medium-batch-plans.md) |
| 2     | API Hardening   | 31     | 10-12h | [13-medium-batch-plans.md](13-medium-batch-plans.md) |
| 3     | A11y Sweep      | 8      | 3-4h   | [13-medium-batch-plans.md](13-medium-batch-plans.md) |
| 4     | Feature Parity  | 30     | 8-10h  | [13-medium-batch-plans.md](13-medium-batch-plans.md) |

**Phase 13 Subtotal**: ~28-34 hours

---

## Total Effort Summary

| Phase     | Category                 | Issues  | Effort      |
| --------- | ------------------------ | ------- | ----------- |
| 1         | CRITICAL                 | 6       | 12-18h      |
| 2         | HIGH - Security          | 5       | 3-4h        |
| 3         | HIGH - API/Infra         | 7       | 6-8h        |
| 4         | MEDIUM - Error Handling  | 9       | ~1.5h       |
| 5         | MEDIUM - A11y/Arch       | 10      | ~5h         |
| 6         | MEDIUM - Testing/Build   | 18      | ~7h         |
| 7         | MEDIUM - Database/Config | 13      | ~6h         |
| 8-11      | LOW - All Categories     | 49      | ~7h         |
| 12        | HIGH - Remaining         | 10      | ~4-5h       |
| 13        | MEDIUM - Batch Plans     | 89      | ~28-34h     |
| **TOTAL** | -                        | **216** | **80-100h** |

---

## CLOSED / DUPLICATE Summary

### Closed Issues (30)

Issues verified as already fixed or not reproducible.

### Duplicate Issues (9)

| Issue     | Duplicate Of             | Reason                        |
| --------- | ------------------------ | ----------------------------- | ----------- |
| #118      | #276, #215               | Non-null assertion (DB)       |
| #119      | #215, #216               | Non-null assertion (Supabase) |
| #137      | #194                     | Weather sample data           |
| #260      | #252                     | JSON columns unvalidated      |
| #286      | #10                      | updateVisibility stub         |
| #287      | #10                      | deleteMessages stub           |
| #66       | -                        | Verified: Not an issue        |
| #67       | -                        | Verified: Not an issue        |
| #70       | -                        | Verified: Not an issue        |
| 7         | MEDIUM - Database/Config | 13                            | ~6h         |
| 8-11      | LOW - All Categories     | 49                            | ~7h         |
| 12        | HIGH - Remaining         | 10                            | ~4-5h       |
| 13        | MEDIUM - Batch Plans     | 89                            | ~28-34h     |
| **TOTAL** | -                        | **216**                       | **80-100h** |

---

## MEDIUM Issues Summary

**Total MEDIUM Issues**: ~139 issues (across Phases 4-7 + Phase 13)
**Total MEDIUM Effort**: ~48-54 hours
**Target Completion**: Phase 3-4 (Week 3-4)

### MEDIUM Fix Plans

| File                                                               | Category            | Issues | Effort  |
| ------------------------------------------------------------------ | ------------------- | ------ | ------- |
| [05-medium-error-handling.md](05-medium-error-handling.md)         | Error Handling      | 9      | ~80m    |
| [06-medium-accessibility-arch.md](06-medium-accessibility-arch.md) | A11y + Architecture | 10     | ~5h     |
| [07-medium-testing-build.md](07-medium-testing-build.md)           | Testing + Build     | 18     | ~7h     |
| [08-medium-database-config.md](08-medium-database-config.md)       | Database + Config   | 13     | ~6h     |
| [12-remaining-high.md](12-remaining-high.md)                       | Remaining HIGH      | 10     | ~4-5h   |
| [13-medium-batch-plans.md](13-medium-batch-plans.md)               | Batch Plans (4)     | ~89    | ~28-34h |

### MEDIUM Batch Fix Plans (Phase 13)

| Batch | Name            | Issues | Effort | Theme                                 |
| ----- | --------------- | ------ | ------ | ------------------------------------- |
| 1     | UI Polish Sweep | 20     | 6-8h   | Testids, focus states, loading states |
| 2     | API Hardening   | 31     | 10-12h | Validation, errors, rate limiting     |
| 3     | A11y Sweep      | 8      | 3-4h   | WCAG 2.1 AA compliance                |
| 4     | Feature Parity  | 30     | 8-10h  | OldApp migration                      |

### LOW Fix Plans

| File                                                                   | Category     | Issues | Effort |
| ---------------------------------------------------------------------- | ------------ | ------ | ------ |
| [09-low-batch1-security-testing.md](09-low-batch1-security-testing.md) | Sec/Test/Err | 18     | ~2.5h  |
| [10-low-batch2-ui-misc.md](10-low-batch2-ui-misc.md)                   | UI/Misc/DB   | 15     | ~2h    |
| [11-low-batch3-all-remaining.md](11-low-batch3-all-remaining.md)       | All LOW Ref  | 49     | ~7h    |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: CRITICAL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐                                                    │
│  │   #1    │ Chat Persistence                                   │
│  │ onFinish│────────────────────────┐                           │
│  └────┬────┘                        │                           │
│       │ blocks                      │                           │
│       ▼                             ▼                           │
│  ┌─────────┐                   ┌─────────┐                      │
│  │   #9    │                   │   #10   │                      │
│  │ DELETE  │                   │ Actions │                      │
│  │ endpoint│                   │ persist │                      │
│  └─────────┘                   └─────────┘                      │
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │   #19   │    │   #83   │    │   #97   │                      │
│  │ System  │    │Security │    │  E2E    │                      │
│  │ Prompt  │    │ Headers │    │  Tests  │                      │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 2: HIGH - SECURITY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │   #85   │    │   #86   │    │   #87   │                      │
│  │  Unauth │    │ Health  │    │  Token  │                      │
│  │   Chat  │    │ Leaks   │    │ Binding │                      │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                 │
│  ┌─────────┐                                                    │
│  │   #88   │ Rate Limit Fails Open                              │
│  └────┬────┘                                                    │
│       │ related                                                 │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │  #197   │ Quota Fails Open                                   │
│  └─────────┘                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 3: HIGH - API/INFRA                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │   #3    │    │   #6    │    │  #144   │                      │
│  │  Model  │    │ Attach- │    │ Stream  │                      │
│  │Selector │    │  ments  │    │ Errors  │                      │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                 │
│  ┌─────────┐                                                    │
│  │  #215   │ SUPABASE_URL crash                                 │
│  └────┬────┘                                                    │
│       │ pair                                                    │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │  #216   │ ANON_KEY crash                                     │
│  └─────────┘                                                    │
│                                                                 │
│  ┌─────────┐    ┌─────────┐                                     │
│  │  #221   │    │  #244   │                                     │
│  │  Type   │    │  Guest  │                                     │
│  │ Assert  │    │  Rate   │                                     │
│  └─────────┘    └─────────┘                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Existing Fix Plans

The following fix plans already exist with full implementation details:

| Issue | Existing Fix Plan                                              | Status |
| ----- | -------------------------------------------------------------- | ------ |
| #19   | [FIX-019-user-system-prompt.md](FIX-019-user-system-prompt.md) | READY  |
| #83   | [FIX-083-security-headers.md](FIX-083-security-headers.md)     | READY  |
| #97   | [FIX-097-e2e-tests-mock-ai.md](FIX-097-e2e-tests-mock-ai.md)   | READY  |

---

## Risk Matrix

| Risk Level       | Issues                   | Mitigation      |
| ---------------- | ------------------------ | --------------- |
| 🔴 HIGH          | #1, #9, #10, #83         | Fix in Week 1   |
| 🟠 MEDIUM        | #85-88, #197, #215-216   | Fix in Week 2   |
| 🟡 LOW           | #3, #6, #144, #221, #244 | Fix in Week 3   |
| 🟢 MEDIUM (bulk) | #130-323 (50 issues)     | Fix in Week 3-4 |

---

## Implementation Order Recommendation

### Week 1-2: CRITICAL + HIGH (Phases 1-3)

1. **Day 1-2**: Fix #83 (security headers) - protects everything else
2. **Day 2-3**: Fix #1, #9, #10 (data persistence) - core functionality
3. **Day 3-4**: Fix #97 (E2E tests) - enables validation
4. **Day 4-5**: Fix #19 (system prompt) - user feature
5. **Week 2**: Fix Phase 2 (security hardening)
6. **Week 2**: Fix Phase 3 (API stability)

### Week 3-4: MEDIUM (Phases 4-7)

7. **Week 3**: Error handling + A11y fixes
8. **Week 3**: Testing infrastructure
9. **Week 4**: Database migrations
10. **Week 4**: Configuration cleanup
