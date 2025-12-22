# FIX-097: All E2E Tests Failing (Mock AI Not Used)

## Summary

**Issue**: E2E tests in `tests/e2e/*.spec.ts` hit the real AI API instead of using mocks. The `setupMockAI()` function exists in `tests/e2e/utils.ts` but is never called in any test file. This causes:

- Tests to be slow (waiting for real AI responses)
- Tests to be flaky (AI responses are non-deterministic)
- Tests to fail in CI (no API keys configured)
- API costs during test runs

**Impact**: Critical - E2E test suite is unusable

**Root Cause**: `setupMockAI(page)` was implemented but never integrated into test setup

---

## Files to Modify

| File                                                                | Change Type | Purpose                    |
| ------------------------------------------------------------------- | ----------- | -------------------------- |
| [tests/e2e/utils.ts](../../../tests/e2e/utils.ts)                   | MODIFY      | Improve mock responses     |
| [tests/e2e/chat.spec.ts](../../../tests/e2e/chat.spec.ts)           | MODIFY      | Add mock setup             |
| [tests/e2e/artifacts.spec.ts](../../../tests/e2e/artifacts.spec.ts) | MODIFY      | Add mock setup             |
| [tests/e2e/documents.spec.ts](../../../tests/e2e/documents.spec.ts) | MODIFY      | Add mock setup             |
| [tests/e2e/sidebar.spec.ts](../../../tests/e2e/sidebar.spec.ts)     | MODIFY      | Add mock setup             |
| [tests/e2e/auth.spec.ts](../../../tests/e2e/auth.spec.ts)           | MODIFY      | Add mock setup (if needed) |
| [playwright.config.ts](../../../playwright.config.ts)               | MODIFY      | Add global setup option    |
| [tests/e2e/global-setup.ts](../../../tests/e2e/global-setup.ts)     | CREATE      | Optional global mock setup |

---

## Implementation Steps

### Step 1: Enhance Mock AI Responses

**File**: `tests/e2e/utils.ts`

The current mock is too simple. Enhance it to:

1. Support different response types (text, tool calls, artifacts)
2. Properly simulate streaming format
3. Allow per-test custom responses

```typescript
// =============================================================================
// MOCK AI CONFIGURATION
// =============================================================================

export type MockAIConfig = {
  /** Default response text */
  defaultResponse: string;
  /** Response delay in ms (simulate network) */
  responseDelay: number;
  /** Whether to include tool calls */
  includeToolCalls: boolean;
  /** Custom responses by message pattern */
  customResponses: Map<RegExp, MockResponse>;
};

export type MockResponse = {
  text: string;
  toolCalls?: ToolCallMock[];
  delay?: number;
};

export type ToolCallMock = {
  name: string;
  args: Record<string, unknown>;
  result?: string;
};

const DEFAULT_MOCK_CONFIG: MockAIConfig = {
  defaultResponse: "This is a mock AI response for testing.",
  responseDelay: 50,
  includeToolCalls: false,
  customResponses: new Map([
    // Code generation requests
    [
      /python|javascript|typescript|code|function|program/i,
      {
        text: "Here's the code you requested:",
        toolCalls: [
          {
            name: "createDocument",
            args: {
              kind: "code",
              title: "example.py",
              content: "def hello():\n    print('Hello, World!')\n\nhello()",
            },
          },
        ],
      },
    ],
    // Fibonacci specifically
    [
      /fibonacci/i,
      {
        text: "Here's a Fibonacci function:",
        toolCalls: [
          {
            name: "createDocument",
            args: {
              kind: "code",
              title: "fibonacci.py",
              content:
                "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
            },
          },
        ],
      },
    ],
    // Document requests
    [
      /document|write|essay|article/i,
      {
        text: "Here's the document:",
        toolCalls: [
          {
            name: "createDocument",
            args: {
              kind: "text",
              title: "Document",
              content:
                "# Document\n\nThis is a test document created for testing purposes.",
            },
          },
        ],
      },
    ],
  ]),
};

/**
 * Create mock streaming response body with proper AI SDK format
 */
function createMockStreamResponse(response: MockResponse): string {
  const chunks: string[] = [];

  // Text streaming chunks
  const words = response.text.split(" ");
  for (const word of words) {
    chunks.push(`0:"${word} "\n`);
  }

  // Tool calls if present
  if (response.toolCalls?.length) {
    for (const toolCall of response.toolCalls) {
      // Tool call start
      chunks.push(
        `9:{"toolCallId":"mock-${Date.now()}","toolName":"${toolCall.name}"}\n`
      );
      // Tool call args
      chunks.push(
        `a:${JSON.stringify({
          toolCallId: `mock-${Date.now()}`,
          args: toolCall.args,
        })}\n`
      );
      // Tool result
      if (toolCall.result) {
        chunks.push(
          `b:${JSON.stringify({
            toolCallId: `mock-${Date.now()}`,
            result: toolCall.result,
          })}\n`
        );
      }
    }
  }

  // Usage data
  chunks.push(
    `e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":${response.text.length}}}\n`
  );

  // Finish
  chunks.push(`d:{"finishReason":"stop"}\n`);

  return chunks.join("");
}

/**
 * Configure the page to use mock AI responses.
 * Must be called BEFORE navigating to the app.
 */
export async function setupMockAI(
  page: Page,
  config: Partial<MockAIConfig> = {}
): Promise<void> {
  const mergedConfig = { ...DEFAULT_MOCK_CONFIG, ...config };

  await page.route("**/api/chat", async (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      // Parse request to get user message
      let userMessage = "";
      try {
        const body = await request.postDataJSON();
        const lastMessage = body.messages?.findLast(
          (m: { role: string }) => m.role === "user"
        );
        userMessage =
          typeof lastMessage?.content === "string"
            ? lastMessage.content
            : lastMessage?.content?.[0]?.text ?? "";
      } catch {
        // Ignore parse errors
      }

      // Find matching custom response
      let response: MockResponse = {
        text: mergedConfig.defaultResponse,
      };

      for (const [pattern, customResponse] of mergedConfig.customResponses) {
        if (pattern.test(userMessage)) {
          response = customResponse;
          break;
        }
      }

      // Simulate network delay
      await new Promise((resolve) =>
        setTimeout(resolve, response.delay ?? mergedConfig.responseDelay)
      );

      // Return mock streaming response
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Mock-Response": "true",
        },
        body: createMockStreamResponse(response),
      });
    } else {
      await route.continue();
    }
  });

  // Also mock title generation endpoint if separate
  await page.route("**/api/chat/title", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ title: "Test Chat" }),
    });
  });
}

/**
 * Add a custom mock response for a specific pattern
 */
export function addMockResponse(
  config: MockAIConfig,
  pattern: RegExp,
  response: MockResponse
): MockAIConfig {
  config.customResponses.set(pattern, response);
  return config;
}
```

### Step 2: Update All Test Files to Use Mock

**Pattern for each test file**:

```typescript
import { test, expect } from "@playwright/test";
import { setupMockAI } from "./utils";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // CRITICAL: Setup mock BEFORE navigation
    await setupMockAI(page);

    // Then navigate
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  // ... tests
});
```

### Step 3: Update chat.spec.ts

**File**: `tests/e2e/chat.spec.ts`

```typescript
import { expect, test } from "@playwright/test";
import { setupMockAI, waitForMessage, sendChatMessage } from "./utils";

test.describe("Chat", () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock AI BEFORE navigating
    await setupMockAI(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Message Sending", () => {
    test("should send a message and receive a response", async ({ page }) => {
      const input = page.getByPlaceholder(/send a message/i);
      const sendButton = page.getByTestId("send-button");

      await input.fill("Hello, this is a test message");
      await sendButton.click();

      // Wait for mock response
      await waitForMessage(page, "assistant");

      // Verify mock response appeared
      const assistantMessage = page.getByTestId("assistant-message");
      await expect(assistantMessage).toBeVisible();
    });

    // ... rest of tests
  });
});
```

### Step 4: Update artifacts.spec.ts

**File**: `tests/e2e/artifacts.spec.ts`

```typescript
import { expect, test } from "@playwright/test";
import { setupMockAI, SELECTORS } from "./utils";

test.describe("Artifacts", () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock with artifact tool calls enabled
    await setupMockAI(page, {
      includeToolCalls: true,
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Code Artifact", () => {
    test("should trigger code artifact creation via message", async ({
      page,
    }) => {
      const input = page.getByPlaceholder(/send a message/i);
      const sendButton = page.getByTestId("send-button");

      // This message pattern matches the fibonacci mock response
      await input.fill(
        "Create a Python function to calculate fibonacci numbers"
      );
      await sendButton.click();

      // Mock will return a createDocument tool call
      // Wait for artifact to appear
      const artifact = page.getByTestId("artifact");
      await expect(artifact).toBeVisible({ timeout: 10_000 });
    });

    // ... rest of tests
  });
});
```

### Step 5: Optional Global Setup (Alternative Approach)

If you want ALL tests to use mocks by default:

**File**: `tests/e2e/global-setup.ts`

```typescript
import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // Set environment variable to indicate mock mode
  process.env.E2E_MOCK_AI = "true";

  console.log("E2E Tests running with mock AI enabled");
}

export default globalSetup;
```

**File**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // ... existing config

  globalSetup: require.resolve("./tests/e2e/global-setup"),

  use: {
    // ... existing use config
  },
});
```

### Step 6: Create Test Fixture for Automatic Mock Setup

**File**: `tests/e2e/fixtures.ts`

```typescript
import { test as base, expect } from "@playwright/test";
import { setupMockAI, type MockAIConfig } from "./utils";

type TestFixtures = {
  mockAI: (config?: Partial<MockAIConfig>) => Promise<void>;
  withMockAI: void;
};

/**
 * Extended test with mock AI fixtures
 */
export const test = base.extend<TestFixtures>({
  // Manual mock setup fixture
  mockAI: async ({ page }, use) => {
    const setup = async (config?: Partial<MockAIConfig>) => {
      await setupMockAI(page, config);
    };
    await use(setup);
  },

  // Auto-mock fixture (use this for most tests)
  withMockAI: [
    async ({ page }, use) => {
      await setupMockAI(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
```

**Usage in tests**:

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from "./fixtures";

test.describe("Chat", () => {
  // withMockAI fixture auto-applies

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should receive mock response", async ({ page }) => {
    // Mock is already set up
  });
});
```

---

## CI/CD Considerations

### Environment Detection

Add to `tests/e2e/utils.ts`:

```typescript
/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return (
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.VERCEL === "1"
  );
}

/**
 * Check if mock AI should be used
 */
export function shouldUseMockAI(): boolean {
  // Always mock in CI
  if (isCI()) return true;

  // Mock if explicitly enabled
  if (process.env.E2E_MOCK_AI === "true") return true;

  // Check if API keys are available
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  // Mock if no API keys
  return !hasOpenAI && !hasAnthropic;
}
```

### GitHub Actions Workflow

Ensure workflow doesn't need API keys:

```yaml
# .github/workflows/e2e.yml
jobs:
  e2e:
    runs-on: ubuntu-latest
    env:
      E2E_MOCK_AI: "true"
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: pnpm install
      - name: Run E2E tests
        run: pnpm test:e2e
```

---

## Mock Response Patterns

| User Message Pattern          | Mock Response        | Tool Calls                      |
| ----------------------------- | -------------------- | ------------------------------- |
| `/python\|javascript\|code/i` | Code with artifact   | `createDocument(kind: "code")`  |
| `/fibonacci/i`                | Fibonacci function   | `createDocument(kind: "code")`  |
| `/document\|essay\|article/i` | Text document        | `createDocument(kind: "text")`  |
| `/spreadsheet\|table\|data/i` | Sheet artifact       | `createDocument(kind: "sheet")` |
| Default                       | Simple text response | None                            |

---

## Tests Required

### Verify Mock Works

```typescript
// tests/e2e/mock-verification.spec.ts
import { test, expect } from "@playwright/test";
import { setupMockAI } from "./utils";

test.describe("Mock AI Verification", () => {
  test("mock intercepts API calls", async ({ page }) => {
    await setupMockAI(page);
    await page.goto("/");

    // Send a message
    await page.getByPlaceholder(/send a message/i).fill("Hello");
    await page.getByTestId("send-button").click();

    // Check that mock header is present
    const response = await page.waitForResponse("**/api/chat");
    expect(response.headers()["x-mock-response"]).toBe("true");
  });

  test("custom mock response works", async ({ page }) => {
    await setupMockAI(page, {
      customResponses: new Map([
        [/custom test/i, { text: "CUSTOM_RESPONSE_TEXT" }],
      ]),
    });
    await page.goto("/");

    await page.getByPlaceholder(/send a message/i).fill("custom test");
    await page.getByTestId("send-button").click();

    // Verify custom response appears
    await expect(page.getByText("CUSTOM_RESPONSE_TEXT")).toBeVisible();
  });
});
```

---

## Dependencies

| Dependency       | Type     | Notes             |
| ---------------- | -------- | ----------------- |
| @playwright/test | Existing | Already installed |

---

## Effort Estimate

| Task                         | Estimate       |
| ---------------------------- | -------------- |
| Enhance setupMockAI function | 1 hour         |
| Update chat.spec.ts          | 30 min         |
| Update artifacts.spec.ts     | 30 min         |
| Update documents.spec.ts     | 30 min         |
| Update sidebar.spec.ts       | 15 min         |
| Update auth.spec.ts          | 15 min         |
| Create fixtures.ts           | 30 min         |
| Verify all tests pass        | 1 hour         |
| **Total**                    | **~4.5 hours** |

---

## Rollback Plan

1. Remove `setupMockAI()` calls from beforeEach hooks
2. Tests will hit real API again (will fail without keys)

**Risk Level**: Low - Mock is additive, doesn't change production code

---

## Success Criteria

1. ✅ All E2E tests pass in CI without API keys
2. ✅ Tests complete in < 2 minutes total
3. ✅ No flaky tests due to AI non-determinism
4. ✅ Artifact tests receive mock tool calls
5. ✅ Tests work locally with `pnpm test:e2e`

---

## Quick Fix (Minimal Changes)

If you want the absolute minimum change:

**Add to each test file's beforeEach**:

```typescript
import { setupMockAI } from "./utils";

test.beforeEach(async ({ page }) => {
  await setupMockAI(page); // <-- Add this line
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});
```

This alone will fix 80% of the failing tests.
