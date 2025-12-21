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
 * Configure the page to use mock AI responses.
 * Call this before navigating to the app in tests.
 *
 * @param page - Playwright page instance
 */
export async function setupMockAI(page: Page): Promise<void> {
    // Mock AI responses are configured server-side via env vars.
    // For client-side mocking, we can intercept API calls.
    await page.route("**/api/chat/**", async (route) => {
        const request = route.request();

        if (request.method() === "POST") {
            // Return a mock streaming response
            await route.fulfill({
                status: 200,
                contentType: "text/plain; charset=utf-8",
                headers: {
                    "Transfer-Encoding": "chunked",
                    "X-Mock-Response": "true",
                },
                body: createMockStreamResponse(
                    "This is a mock AI response for testing."
                ),
            });
        } else {
            await route.continue();
        }
    });
}

/**
 * Create a mock streaming response body.
 *
 * @param text - The response text
 * @returns Formatted stream response
 */
function createMockStreamResponse(text: string): string {
    // AI SDK stream format with data prefix
    const chunks: string[] = [];

    // Split text into chunks to simulate streaming
    const words = text.split(" ");
    for (const word of words) {
        chunks.push(`0:"${word} "\n`);
    }

    // Add finish message
    chunks.push(
        `e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":${text.length}}}\n`
    );
    chunks.push(`d:{"finishReason":"stop"}\n`);

    return chunks.join("");
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
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForChatReady(
    page: Page,
    timeout = 5000
): Promise<void> {
    await page.waitForSelector(`${SELECTORS.CHAT_INPUT}:not([disabled])`, {
        timeout,
    });
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
 *
 * @param page - Playwright page instance
 * @param message - Message text to send
 */
export async function sendChatMessage(
    page: Page,
    message: string
): Promise<void> {
    await page.fill(SELECTORS.CHAT_INPUT, message);
    await page.click(SELECTORS.SEND_BUTTON);
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
 *
 * @param page - Playwright page instance
 * @returns true if chat input is enabled
 */
export async function isChatInputEnabled(page: Page): Promise<boolean> {
    return await page.locator(SELECTORS.CHAT_INPUT).isEnabled();
}
