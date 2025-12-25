# Testing Guide

> Testing strategy with Vitest, Playwright, and mock AI providers

## Overview

| Test Type | Tool | Location | Purpose |
|-----------|------|----------|---------|
| Unit | Vitest | `tests/unit/` | Individual functions/components |
| Integration | Vitest | `tests/integration/` | Feature interactions |
| E2E | Playwright | `tests/e2e/` | Full user flows |

## Running Tests

```bash
# Unit tests
pnpm test              # Run once
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e          # Headless
pnpm test:e2e:ui       # Interactive UI
pnpm test:e2e:debug    # Debug mode
```

## Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit/integration test config |
| `playwright.config.ts` | E2E test config |
| `tests/unit/setup.ts` | Unit test setup |
| `tests/integration/setup.ts` | Integration test setup |

## Mock AI Provider

### USE_MOCK_AI Environment Variable

The application supports mock AI responses for testing:

```bash
# .env.test or .env.local
USE_MOCK_AI=true
```

When enabled, AI calls return deterministic mock responses instead of calling real APIs.

### Test Setup Files

Mock AI is automatically enabled in test setup:

```typescript
// tests/unit/setup.ts
process.env.USE_MOCK_AI = "true";

// tests/integration/setup.ts  
process.env.USE_MOCK_AI = "true";

// playwright.config.ts
webServer: {
  env: {
    USE_MOCK_AI: "true",
  },
}
```

### MockLanguageModel

The mock provider implements the AI SDK's `LanguageModelV2` interface:

```typescript
// lib/ai/mock-provider.ts
export type MockLanguageModel = LanguageModelV2;

/**
 * Check if mock AI is enabled
 */
export function isMockAIEnabled(): boolean {
  return process.env.USE_MOCK_AI === "true";
}

/**
 * Configure mock responses
 */
export function configureMockProvider(config: MockProviderConfig): void;
export function addMockResponse(pattern: RegExp, response: string): void;
export function resetMockProvider(): void;
```

### Customizing Mock Responses

```typescript
import { configureMockProvider, addMockResponse, resetMockProvider } from "@/lib/ai/mock-provider";

beforeEach(() => {
  resetMockProvider();
});

it("should handle specific prompts", async () => {
  addMockResponse(/summarize/i, "This is a summary of the content.");
  addMockResponse(/translate/i, "Traducción del texto.");
  
  // Test with these mock responses
});

it("should use custom default response", async () => {
  configureMockProvider({
    defaultResponse: "Custom mock response for this test",
    delay: 50, // Faster for tests
  });
  
  // Test with custom config
});
```

## Writing Unit Tests

### Basic Test Structure

```typescript
// tests/unit/lib/example.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myFunction } from "@/lib/example";

describe("myFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return expected result", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should throw on invalid input", () => {
    expect(() => myFunction("")).toThrow("Invalid input");
  });
});
```

### Testing Async Functions

```typescript
import { withRetry } from "@/lib/utils/retry";

describe("withRetry", () => {
  it("should retry on failure", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("success");
    
    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 });
    
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

### Testing Components

```typescript
import { render, screen } from "@testing-library/react";
import { ErrorFallback } from "@/shared/components/error-fallback";

describe("ErrorFallback", () => {
  it("should display error message", () => {
    render(<ErrorFallback error={new Error("Test error")} />);
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it("should call onRetry when button clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorFallback error={new Error("Error")} onRetry={onRetry} />);
    
    await userEvent.click(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

## Writing Integration Tests

Integration tests verify feature interactions:

```typescript
// tests/integration/chat/send-message.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase, cleanupTestDatabase } from "@/tests/utils";

describe("Chat Send Message", () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  it("should save message and invalidate cache", async () => {
    const chatId = await createTestChat();
    
    await sendMessage(chatId, "Hello, AI!");
    
    const messages = await getMessages(chatId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("Hello, AI!");
  });
});
```

## Writing E2E Tests

E2E tests use Playwright for browser automation:

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Login if needed
  });

  test("should send message and receive response", async ({ page }) => {
    await page.fill('[data-testid="message-input"]', "Hello!");
    await page.click('[data-testid="send-button"]');
    
    // Wait for mock AI response
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-message"]')).toContainText(
      "mock AI response"
    );
  });

  test("should show error on failure", async ({ page }) => {
    // Trigger error scenario
    await page.route("**/api/chat", (route) => route.abort());
    
    await page.fill('[data-testid="message-input"]', "Hello!");
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

## Test Utilities

Common test utilities are in `tests/utils/`:

```typescript
// tests/utils/index.ts
export { createTestUser, createTestChat, createTestMessage } from "./factories";
export { createRetryableMock } from "./mock-factories";
export { waitFor, act } from "./async-helpers";
```

### Mock Factories

```typescript
import { createRetryableMock } from "@/tests/utils";

// Create a mock that fails N times then succeeds
const unreliableFn = createRetryableMock({
  failCount: 2,
  successValue: "finally worked",
});
```

## Coverage

Generate coverage reports:

```bash
pnpm test:coverage
```

Coverage thresholds are configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  thresholds: {
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80,
  },
}
```

## CI/CD Integration

Tests run automatically in CI:

```yaml
# .github/workflows/test.yml
- name: Unit Tests
  run: pnpm test:coverage
  
- name: E2E Tests
  run: pnpm test:e2e
  env:
    USE_MOCK_AI: true
```

## Best Practices

1. **Use mock AI in tests** - Always set `USE_MOCK_AI=true`
2. **Isolate tests** - Reset mocks and state between tests
3. **Test error paths** - Include error scenarios in tests
4. **Use test IDs** - Add `data-testid` for E2E selectors
5. **Keep tests fast** - Use small delays in retry tests
6. **Test at the right level** - Unit for logic, E2E for flows

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - Error testing strategies
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

*Last updated: December 2024*
