/**
 * E2E Test Utilities
 *
 * Common utilities for E2E tests including mock setup,
 * test data generation, and helper functions.
 *
 * @module tests/e2e/utils
 */

import type { Page } from "@playwright/test";

// =============================================================================
// TEST SELECTORS
// =============================================================================

/**
 * Common data-testid selectors for E2E tests.
 * Use these constants instead of hardcoding strings.
 */
export const SELECTORS = {
    // Auth components
    AUTH_FORM: '[data-testid="auth-form"]',
    EMAIL_INPUT: '[data-testid="email-input"]',
    PASSWORD_INPUT: '[data-testid="password-input"]',
    SUBMIT_BUTTON: '[data-testid="submit-button"]',
    ERROR_MESSAGE: '[data-testid="error-message"]',

    // Chat components
    CHAT_INPUT: '[data-testid="chat-input"]',
    SEND_BUTTON: '[data-testid="send-button"]',
    STOP_BUTTON: '[data-testid="stop-button"]',
    MESSAGES_CONTAINER: '[data-testid="messages-container"]',
    USER_MESSAGE: '[data-testid="user-message"]',
    ASSISTANT_MESSAGE: '[data-testid="assistant-message"]',

    // Sidebar components
    APP_SIDEBAR: '[data-testid="app-sidebar"]',
    SIDEBAR_TOGGLE_BUTTON: '[data-testid="sidebar-toggle-button"]',
    NEW_CHAT_BUTTON: '[data-testid="new-chat-button"]',
    CHAT_HISTORY: '[data-testid="chat-history"]',
    CHAT_HISTORY_ITEM: '[data-testid="chat-history-item"]',
    DELETE_CHAT_BUTTON: '[data-testid="delete-chat-button"]',
    USER_NAV_DROPDOWN: '[data-testid="user-nav-dropdown"]',

    // Header components
    MODEL_SELECTOR: '[data-testid="model-selector"]',

    // Artifact components
    ARTIFACT: '[data-testid="artifact"]',
    ARTIFACT_CLOSE_BUTTON: '[data-testid="artifact-close-button"]',
    ARTIFACT_TOOLBAR: '[data-testid="artifact-toolbar"]',
    VERSION_FOOTER: '[data-testid="version-footer"]',

    // Document components
    DOCUMENT_PREVIEW: '[data-testid="document-preview"]',
    DOCUMENT_TOOL_CALL: '[data-testid="document-tool-call"]',
    DOCUMENT_SKELETON: '[data-testid="document-skeleton"]',
} as const;

// =============================================================================
// MOCK SETUP
// =============================================================================

/**
 * Environment variables for enabling mock AI.
 */
export const MOCK_ENV = {
    USE_MOCK_AI: "true",
} as const;

/**
 * Mock AI configuration type
 */
export type MockAIConfig = {
    /** Default response text */
    defaultResponse: string;
    /** Response delay in ms (simulate network) */
    responseDelay: number;
    /** Custom responses by message pattern */
    customResponses: Map<RegExp, MockResponse>;
};

/**
 * Mock response type
 */
export type MockResponse = {
    text: string;
    toolCalls?: ToolCallMock[];
    delay?: number;
};

/**
 * Tool call mock type
 */
export type ToolCallMock = {
    name: string;
    args: Record<string, unknown>;
    result?: string;
};

/**
 * Default mock configuration
 */
const DEFAULT_MOCK_CONFIG: MockAIConfig = {
    defaultResponse: "This is a mock AI response for testing.",
    responseDelay: 50,
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
                            content:
                                "def hello():\n    print('Hello, World!')\n\nhello()",
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
 * Create mock streaming response body with proper AI SDK SSE format.
 * Uses the Vercel AI SDK protocol with proper SSE formatting:
 * - Each event is `data: {...}\n\n`
 * - Types: start-step, text-start, text-delta, text-end, finish-step, finish, [DONE]
 *
 * @param response - The mock response configuration
 * @returns Formatted SSE stream response
 */
function _createMockStreamResponse(response: MockResponse): string {
    const chunks: string[] = [];
    const messageId = `mock-msg-${Date.now()}`;

    // Start step
    chunks.push(`data: {"type":"start-step"}\n\n`);

    // Text start
    chunks.push(`data: {"type":"text-start","id":"${messageId}"}\n\n`);

    // Text streaming chunks - each word is a separate SSE event
    const words = response.text.split(" ");
    for (const word of words) {
        // Escape special characters in JSON string
        const escapedWord = JSON.stringify(`${word} `).slice(1, -1);
        chunks.push(
            `data: {"type":"text-delta","id":"${messageId}","delta":"${escapedWord}"}\n\n`
        );
    }

    // Text end
    chunks.push(`data: {"type":"text-end","id":"${messageId}"}\n\n`);

    // Tool calls if present
    if (response.toolCalls?.length) {
        for (const toolCall of response.toolCalls) {
            const toolCallId = `mock-tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            // Tool call start
            chunks.push(
                `data: {"type":"tool-call-start","id":"${toolCallId}","toolName":"${toolCall.name}"}\n\n`
            );
            // Tool call args
            chunks.push(
                `data: {"type":"tool-call-args","id":"${toolCallId}","args":${JSON.stringify(toolCall.args)}}\n\n`
            );
            // Tool result (if provided)
            if (toolCall.result) {
                chunks.push(
                    `data: {"type":"tool-result","id":"${toolCallId}","result":${JSON.stringify(toolCall.result)}}\n\n`
                );
            }
        }
    }

    // Finish step
    chunks.push(`data: {"type":"finish-step"}\n\n`);

    // Finish with usage statistics
    chunks.push(
        `data: {"type":"finish","finishReason":"stop","usage":{"inputTokens":10,"outputTokens":${response.text.length}}}\n\n`
    );

    // Done signal
    chunks.push("data: [DONE]\n\n");

    return chunks.join("");
}

/**
 * Create a streaming response body that simulates real streaming with delays.
 * This is used for tests that need to verify streaming behavior (stop button, etc.)
 *
 * @param response - The mock response configuration
 * @param chunkDelayMs - Delay between chunks in milliseconds
 * @returns An async generator that yields SSE chunks
 */
async function* createStreamingChunks(
    response: MockResponse,
    chunkDelayMs: number
): AsyncGenerator<string> {
    const messageId = `mock-msg-${Date.now()}`;

    // Start step
    yield `data: {"type":"start-step"}\n\n`;
    await new Promise((r) => setTimeout(r, chunkDelayMs));

    // Text start
    yield `data: {"type":"text-start","id":"${messageId}"}\n\n`;
    await new Promise((r) => setTimeout(r, chunkDelayMs));

    // Text streaming chunks - each word is a separate SSE event with delay
    const words = response.text.split(" ");
    for (const word of words) {
        const escapedWord = JSON.stringify(`${word} `).slice(1, -1);
        yield `data: {"type":"text-delta","id":"${messageId}","delta":"${escapedWord}"}\n\n`;
        await new Promise((r) => setTimeout(r, chunkDelayMs));
    }

    // Text end
    yield `data: {"type":"text-end","id":"${messageId}"}\n\n`;
    await new Promise((r) => setTimeout(r, chunkDelayMs));

    // Tool calls if present
    if (response.toolCalls?.length) {
        for (const toolCall of response.toolCalls) {
            const toolCallId = `mock-tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            yield `data: {"type":"tool-call-start","id":"${toolCallId}","toolName":"${toolCall.name}"}\n\n`;
            await new Promise((r) => setTimeout(r, chunkDelayMs));
            yield `data: {"type":"tool-call-args","id":"${toolCallId}","args":${JSON.stringify(toolCall.args)}}\n\n`;
            await new Promise((r) => setTimeout(r, chunkDelayMs));
            if (toolCall.result) {
                yield `data: {"type":"tool-result","id":"${toolCallId}","result":${JSON.stringify(toolCall.result)}}\n\n`;
                await new Promise((r) => setTimeout(r, chunkDelayMs));
            }
        }
    }

    // Finish step
    yield `data: {"type":"finish-step"}\n\n`;
    await new Promise((r) => setTimeout(r, chunkDelayMs));

    // Finish with usage statistics
    yield `data: {"type":"finish","finishReason":"stop","usage":{"inputTokens":10,"outputTokens":${response.text.length}}}\n\n`;

    // Done signal
    yield "data: [DONE]\n\n";
}

/**
 * Configure the page to use mock AI responses at the Playwright network layer.
 *
 * NOTE: With USE_MOCK_AI=true in the server environment, the server-side
 * mock provider handles AI responses. This function provides an additional
 * client-side fallback for AI streaming responses only.
 *
 * All other API calls (history, chat details, auth) hit real endpoints.
 *
 * @param page - Playwright page instance
 * @param config - Optional partial configuration to override defaults
 */
export async function setupMockAI(
    page: Page,
    config: Partial<MockAIConfig> = {}
): Promise<void> {
    const mergedConfig = { ...DEFAULT_MOCK_CONFIG, ...config };

    // Mock ONLY the main chat API POST endpoint for AI streaming responses
    // All other endpoints (history, chat/*, etc.) hit real server
    await page.route("**/api/chat", async (route) => {
        const request = route.request();

        // Only intercept POST requests (AI chat completions)
        if (request.method() !== "POST") {
            await route.continue();
            return;
        }

        // Parse request to get user message for custom responses
        let userMessage = "";
        try {
            const body = await request.postDataJSON();
            const lastMessage = body.messages?.findLast(
                (m: { role: string }) => m.role === "user"
            );
            userMessage =
                typeof lastMessage?.content === "string"
                    ? lastMessage.content
                    : (lastMessage?.content?.[0]?.text ?? "");
        } catch {
            // Ignore parse errors, use default response
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

        // Determine if we need streaming with delays (for stop button tests)
        const needsSlowStreaming = /long|story|essay|very/i.test(userMessage);
        const chunkDelayMs = needsSlowStreaming ? 150 : 20;

        // For streaming, we need to use fulfill with a body that simulates streaming
        // Since Playwright doesn't support true streaming easily, we'll use a longer
        // response for tests that need stop button visibility
        if (needsSlowStreaming) {
            // Extended response for stop button tests - more words = more time
            const extendedText =
                "This is a very long story about a cat. " +
                "Once upon a time, there was a fluffy cat named Whiskers. " +
                "Whiskers loved to explore the garden every morning. " +
                "One day, Whiskers found a magical mouse that could talk. " +
                "The mouse told Whiskers about a hidden treasure. " +
                "Together they went on an adventure through the forest. " +
                "They crossed rivers and climbed mountains. " +
                "Finally, they found the treasure chest. " +
                "Inside was the most delicious cat food ever made. " +
                "Whiskers shared it with all the neighborhood cats. " +
                "And they all lived happily ever after. The end.";
            response = { ...response, text: extendedText };
        }

        // Collect all chunks and send with small delays using fulfill
        const chunks: string[] = [];
        for await (const chunk of createStreamingChunks(
            response,
            chunkDelayMs
        )) {
            chunks.push(chunk);
        }

        // Return mock streaming response with proper SSE format
        await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            headers: {
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Mock-Response": "true",
            },
            body: chunks.join(""),
        });
    });
}

/**
 * Disable mock AI and use real API calls.
 *
 * @param page - Playwright page instance
 */
export async function disableMockAI(page: Page): Promise<void> {
    await page.unrouteAll({ behavior: "wait" });
}

// =============================================================================
// WAIT HELPERS
// =============================================================================

/**
 * Wait for a message to appear in the chat.
 *
 * @param page - Playwright page instance
 * @param role - Message role ('user' | 'assistant')
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForMessage(
    page: Page,
    role: "user" | "assistant",
    timeout = 10_000
): Promise<void> {
    const selector =
        role === "user" ? SELECTORS.USER_MESSAGE : SELECTORS.ASSISTANT_MESSAGE;
    await page.waitForSelector(selector, { timeout });
}

/**
 * Wait for the chat input to be ready for input.
 * Uses .first() to handle React Strict Mode duplicate elements.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForChatReady(
    page: Page,
    timeout = 5000
): Promise<void> {
    await page
        .locator(`${SELECTORS.CHAT_INPUT}:not([disabled])`)
        .first()
        .waitFor({ state: "visible", timeout });
}

/**
 * Wait for AI response to complete (stop button disappears).
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForResponseComplete(
    page: Page,
    timeout = 30_000
): Promise<void> {
    // Wait for stop button to disappear (generation complete)
    await page.waitForSelector(SELECTORS.STOP_BUTTON, {
        state: "hidden",
        timeout,
    });
}

// =============================================================================
// ACTION HELPERS
// =============================================================================

/**
 * Send a message in the chat.
 * Uses .first() to handle React Strict Mode duplicate elements.
 *
 * @param page - Playwright page instance
 * @param message - Message text to send
 */
export async function sendChatMessage(
    page: Page,
    message: string
): Promise<void> {
    await page.locator(SELECTORS.CHAT_INPUT).first().fill(message);
    await page.locator(SELECTORS.SEND_BUTTON).first().click();
}

/**
 * Login with credentials.
 *
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
export async function login(
    page: Page,
    email: string,
    password: string
): Promise<void> {
    await page.fill(SELECTORS.EMAIL_INPUT, email);
    await page.fill(SELECTORS.PASSWORD_INPUT, password);
    await page.click(SELECTORS.SUBMIT_BUTTON);
}

/**
 * Register a new user.
 *
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
export async function register(
    page: Page,
    email: string,
    password: string
): Promise<void> {
    await page.fill(SELECTORS.EMAIL_INPUT, email);
    await page.fill(SELECTORS.PASSWORD_INPUT, password);
    await page.click(SELECTORS.SUBMIT_BUTTON);
}

/**
 * Select an AI model from the dropdown.
 *
 * @param page - Playwright page instance
 * @param modelId - Model ID to select
 */
export async function selectModel(page: Page, modelId: string): Promise<void> {
    await page.selectOption(SELECTORS.MODEL_SELECTOR, modelId);
}

/**
 * Click the new chat button.
 *
 * @param page - Playwright page instance
 */
export async function startNewChat(page: Page): Promise<void> {
    await page.click(SELECTORS.NEW_CHAT_BUTTON);
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Get the count of messages by role.
 *
 * @param page - Playwright page instance
 * @param role - Message role ('user' | 'assistant')
 * @returns Number of messages with the given role
 */
export async function getMessageCount(
    page: Page,
    role: "user" | "assistant"
): Promise<number> {
    const selector =
        role === "user" ? SELECTORS.USER_MESSAGE : SELECTORS.ASSISTANT_MESSAGE;
    return await page.locator(selector).count();
}

/**
 * Get the text content of all messages by role.
 *
 * @param page - Playwright page instance
 * @param role - Message role ('user' | 'assistant')
 * @returns Array of message text contents
 */
export async function getMessageTexts(
    page: Page,
    role: "user" | "assistant"
): Promise<string[]> {
    const selector =
        role === "user" ? SELECTORS.USER_MESSAGE : SELECTORS.ASSISTANT_MESSAGE;
    return await page.locator(selector).allTextContents();
}

/**
 * Check if the sidebar is visible.
 *
 * @param page - Playwright page instance
 * @returns true if sidebar is visible
 */
export async function isSidebarVisible(page: Page): Promise<boolean> {
    return await page.locator(SELECTORS.APP_SIDEBAR).isVisible();
}

/**
 * Check if the chat input is enabled.
 * Uses .first() to handle React Strict Mode duplicate elements.
 *
 * @param page - Playwright page instance
 * @returns true if chat input is enabled
 */
export async function isChatInputEnabled(page: Page): Promise<boolean> {
    return await page.locator(SELECTORS.CHAT_INPUT).first().isEnabled();
}
