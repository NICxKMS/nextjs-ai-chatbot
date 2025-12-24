# Fix Plan: Critical Security & UX Issues

**Issues**: #19, #83, #97
**Priority**: 🔴 CRITICAL
**Total Effort**: 7-10 hours
**Created**: 2025-12-22

---

## Summary

These issues represent critical security vulnerabilities and user experience failures that must be addressed immediately.

| Issue | Description                | Status       | Existing Fix Plan                           |
| ----- | -------------------------- | ------------ | ------------------------------------------- |
| #19   | User system prompt missing | ✅ CONFIRMED | ✅ [FIX-019](FIX-019-user-system-prompt.md) |
| #83   | Missing security headers   | ✅ CONFIRMED | ✅ [FIX-083](FIX-083-security-headers.md)   |
| #97   | E2E tests failing          | ✅ CONFIRMED | ✅ [FIX-097](FIX-097-e2e-tests-mock-ai.md)  |

> **Note**: Full implementation details exist in the linked fix plan files. This document provides a summary and quick reference.

---

## Issue #19: User System Prompt Missing

### Problem

**File**: `app/api/chat/route.ts`

The chat API uses a hardcoded `SYSTEM_PROMPT` constant, ignoring the user's custom system prompt from settings.

### Quick Fix Summary

1. **Create** `lib/ai/prompts.ts` - System prompt builder
2. **Modify** `features/chat/components/chat-input.tsx` - Send settings
3. **Modify** `app/api/chat/route.ts` - Use dynamic prompt

### Key Implementation

```typescript
// lib/ai/prompts.ts
export function buildSystemPrompt(options: {
  userSystemPrompt?: string;
  includeArtifactInstructions?: boolean;
}): string {
  const segments = [BASE_SYSTEM_PROMPT];

  if (options.userSystemPrompt?.trim()) {
    segments.push(`\n\nUser Instructions:\n${options.userSystemPrompt.trim()}`);
  }

  if (options.includeArtifactInstructions) {
    segments.push(ARTIFACT_INSTRUCTIONS);
  }

  return segments.join("");
}
```

### Effort: 2-3 hours

📄 **Full Details**: [FIX-019-user-system-prompt.md](FIX-019-user-system-prompt.md)

---

## Issue #83: Missing Security Headers

### Problem

**File**: `middleware.ts`

Middleware only handles rate limiting. Zero security headers configured.

### Missing Headers

| Header                    | Purpose                 | Risk Without |
| ------------------------- | ----------------------- | ------------ |
| Content-Security-Policy   | XSS protection          | HIGH         |
| X-Frame-Options           | Clickjacking protection | HIGH         |
| X-Content-Type-Options    | MIME sniffing           | MEDIUM       |
| Strict-Transport-Security | HTTPS enforcement       | MEDIUM       |
| Referrer-Policy           | Referrer leakage        | LOW          |
| Permissions-Policy        | Feature restrictions    | LOW          |

### Quick Fix Summary

1. **Create** `lib/middleware/security-headers.ts` - Header configuration
2. **Modify** `middleware.ts` - Apply headers
3. **Modify** `next.config.ts` - Static asset headers

### Key Implementation

```typescript
// lib/middleware/security-headers.ts
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // CSP - adjust for your CDN/analytics
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://api.openai.com https://api.anthropic.com;"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}
```

### Effort: 2-3 hours

📄 **Full Details**: [FIX-083-security-headers.md](FIX-083-security-headers.md)

---

## Issue #97: E2E Tests Failing

### Problem

**Files**: `tests/e2e/*.spec.ts`

E2E tests hit the real AI API instead of using mocks. `setupMockAI()` exists but is never called.

### Impact

- ❌ Tests slow (waiting for real AI)
- ❌ Tests flaky (non-deterministic responses)
- ❌ Tests fail in CI (no API keys)
- ❌ API costs during testing

### Quick Fix Summary

1. **Modify** `tests/e2e/utils.ts` - Enhance mock responses
2. **Modify** All test files - Add `setupMockAI(page)` call
3. **Create** `tests/e2e/global-setup.ts` - Optional global setup

### Key Implementation

```typescript
// tests/e2e/utils.ts
export async function setupMockAI(page: Page, config?: MockAIConfig) {
  await page.route("**/api/chat", async (route) => {
    const response = generateMockResponse(config);
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: formatAsStream(response),
    });
  });
}

// In each test file
test.beforeEach(async ({ page }) => {
  await setupMockAI(page);
});
```

### Effort: 3-4 hours

📄 **Full Details**: [FIX-097-e2e-tests-mock-ai.md](FIX-097-e2e-tests-mock-ai.md)

---

## Files Modified Summary

| File                                      | Action       | Issue |
| ----------------------------------------- | ------------ | ----- |
| `lib/ai/prompts.ts`                       | CREATE       | #19   |
| `app/api/chat/route.ts`                   | MODIFY       | #19   |
| `features/chat/components/chat-input.tsx` | MODIFY       | #19   |
| `lib/middleware/security-headers.ts`      | CREATE       | #83   |
| `middleware.ts`                           | MODIFY       | #83   |
| `next.config.ts`                          | MODIFY       | #83   |
| `tests/e2e/utils.ts`                      | MODIFY       | #97   |
| `tests/e2e/*.spec.ts`                     | MODIFY (all) | #97   |
| `tests/e2e/global-setup.ts`               | CREATE       | #97   |

---

## Implementation Order

```
┌───────────────────────────────────────────────────────────┐
│  1. Security Headers (#83)                                │
│     ↓ Protects all subsequent work                        │
├───────────────────────────────────────────────────────────┤
│  2. E2E Test Fix (#97)                                    │
│     ↓ Enables testing of other fixes                      │
├───────────────────────────────────────────────────────────┤
│  3. User System Prompt (#19)                              │
│     ↓ User-facing feature                                 │
└───────────────────────────────────────────────────────────┘
```

---

## Verification Checklist

### #19 - System Prompt

- [ ] Settings page shows system prompt textarea
- [ ] Custom prompt sent to API
- [ ] AI behavior reflects custom prompt
- [ ] Prompt validation works (max length)

### #83 - Security Headers

- [ ] Check headers with browser dev tools
- [ ] Verify CSP doesn't break functionality
- [ ] Test SecurityHeaders.com score
- [ ] HSTS only in production

### #97 - E2E Tests

- [ ] All tests pass locally
- [ ] Tests pass in CI (no API keys)
- [ ] Tests run fast (<30s total)
- [ ] Mock responses are realistic
