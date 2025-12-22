# 🧪 Testing Issues

**Total**: 15 issues
**Critical**: 1 | **High**: 3 | **Medium**: 8 | **Low**: 3

## Summary Table

| #    | Issue                             | Severity | File                   | Status      | Verified     |
| ---- | --------------------------------- | -------- | ---------------------- | ----------- | ------------ |
| #75  | ARIA Accessibility Error          | MEDIUM   | shared/ui/switch.tsx   | 🔴 OPEN     | -            |
| #76  | No Tests for API Routes           | HIGH     | app/api/               | 🔴 OPEN     | -            |
| #77  | No Tests for lib/ai/tools         | MEDIUM   | lib/ai/tools/          | 🔴 OPEN     | -            |
| #78  | No Tests for lib/cache-ops        | MEDIUM   | lib/cache-ops/         | 🔴 OPEN     | -            |
| #79  | Missing lib/data Unit Tests       | MEDIUM   | lib/data/              | 🔴 OPEN     | -            |
| #97  | ALL 31 E2E Tests Failing          | HIGH     | test-results/          | 🟠 ADJUSTED | ✅ CONFIRMED |
| #98  | setupMockAI never called          | HIGH     | tests/e2e/             | 🔴 OPEN     | ✅ CONFIRMED |
| #99  | No seed logic in tests            | HIGH     | tests/e2e/             | 🔴 OPEN     | ✅ CONFIRMED |
| #100 | Missing testids                   | MEDIUM   | features/              | 🔴 OPEN     | ⚠️ PARTIAL   |
| #101 | Hardcoded delays                  | MEDIUM   | tests/e2e/             | 🔴 OPEN     | ✅ CONFIRMED |
| #102 | No action unit tests              | MEDIUM   | features/\*/actions/   | 🔴 OPEN     | ✅ CONFIRMED |
| #103 | Coverage gaps                     | LOW      | tests/                 | 🔴 OPEN     | ⚠️ PARTIAL   |
| #124 | Playwright webServer health check | MEDIUM   | playwright.config.ts   | 🔴 OPEN     | -            |
| #125 | No Mock AI Provider for E2E       | HIGH     | tests/e2e/             | 🔴 OPEN     | -            |
| #126 | Auth tests create real users      | MEDIUM   | tests/e2e/auth.spec.ts | 🔴 OPEN     | -            |
| #127 | Test timeout too long (60s)       | LOW      | playwright.config.ts   | 🔴 OPEN     | -            |

---

## Issue #97 - ALL 31 E2E Tests Failing

**Severity**: � HIGH (Adjusted from CRITICAL)
**File**: test-results/results.json

### Verification

- **Status**: ⚠️ PARTIALLY CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: Mock infrastructure EXISTS in `tests/e2e/utils.ts`. Mock is NOT INTEGRATED into spec files. Fix is straightforward.
- **Severity**: ADJUSTED from CRITICAL to HIGH (infrastructure exists, just needs integration)

**Description**:
All 31 E2E tests fail. Tests timeout waiting for AI responses because there's no mock AI provider configured for E2E testing.

**Evidence**:

```json
{
  "failedTests": [
    /* 31 test IDs */
  ],
  "passed": 0,
  "failed": 31
}
```

**Root Cause**:

- Tests send real AI requests
- Require valid API keys
- AI responses are slow and non-deterministic

**Fix**:

1. Enable `USE_MOCK_AI=true` in E2E test environment
2. Configure mock responses in `lib/ai/mock.ts`
3. Add network interception for deterministic tests

---

## Issue #76 - No Tests for API Routes

**Severity**: 🟠 HIGH
**Files**: app/api/

**Description**:
Zero test coverage for 8 API route handlers:

- `/api/chat` (POST, streaming)
- `/api/document` (CRUD)
- `/api/history` (GET)
- `/api/health` (GET)
- `/api/vote` (POST)
- `/api/files/upload` (POST)
- `/api/auth/*` (exchange, logout)

**Impact**:

- API regressions undetected
- Auth flows untested
- Streaming behavior unverified

---

## Missing data-testid Attributes

E2E tests expect specific `data-testid` attributes that don't exist:

| Expected                     | Component          | Issue # |
| ---------------------------- | ------------------ | ------- |
| `artifact-panel`             | ArtifactPanel      | #98     |
| `artifact-document-preview`  | DocumentPreview    | #99     |
| `toggle-sidebar-button`      | SidebarToggle      | #100    |
| `visibility-dropdown-item-*` | VisibilitySelector | #101    |
| `artifact-version-footer`    | ArtifactPanel      | #102    |
| `toast`                      | Toast              | #103    |

**Fix**:
Add `data-testid` attributes to each component.

---

## Test Coverage Gaps

### Components with ZERO Unit Tests

- features/artifacts/components/\* (all)
- features/chat/components/\* (all)
- features/sidebar/components/\* (all)
- features/documents/components/\* (all)
- features/auth/components/\* (all)

### Critical Paths Untested

- lib/ai/\* - AI provider configuration
- lib/cache-ops/\* - Cache operations
- lib/data/\* - Data access layer
- lib/middleware/\* - Rate limiting, auth guards
- app/api/\* - All route handlers
- features/_/actions/_ - Server Actions

---

## Fake Assertions Found

11 instances of `expect(true).toBe(true)` - tests that always pass:

| File                          | Line |
| ----------------------------- | ---- |
| tests/unit/lib/auth.test.ts   | 36   |
| tests/unit/lib/auth.test.ts   | 162  |
| tests/unit/lib/auth.test.ts   | 210  |
| tests/unit/lib/errors.test.ts | 48   |
| tests/unit/lib/errors.test.ts | 122  |
| tests/unit/lib/errors.test.ts | 166  |
| tests/unit/lib/errors.test.ts | 202  |
| tests/unit/lib/utils.test.ts  | 31   |
| tests/unit/lib/utils.test.ts  | 84   |
| tests/unit/lib/utils.test.ts  | 101  |

**These need real assertions.**

---

## Recommendations

1. **Short-term**: Add mock AI provider for E2E
2. **Short-term**: Add missing data-testid attributes
3. **Medium-term**: Add API route tests with MSW
4. **Medium-term**: Replace fake assertions
5. **Long-term**: Achieve 80%+ coverage
