/**
 * E2E Test Helpers
 *
 * Utility functions for Playwright E2E tests.
 */

import { expect, type Page } from "@playwright/test";

// =============================================================================
// Constants
// =============================================================================

// Regex patterns for selectors
const EMAIL_LABEL_PATTERN = /email/i;
const PASSWORD_LABEL_PATTERN = /password/i;
const SIGN_IN_BUTTON_PATTERN = /sign in/i;
const USER_MENU_PATTERN = /user|menu|avatar/i;
const LOGOUT_PATTERN = /logout|sign out/i;
const LOGIN_URL_PATTERN = /\/login/;
const SEND_BUTTON_PATTERN = /send/i;
const CHAT_URL_PATTERN = /\/chat\//;
const TOGGLE_SIDEBAR_PATTERN = /toggle sidebar|menu|sidebar/i;
const MODEL_SELECTOR_PATTERN = /model/i;
const CHAT_ID_EXTRACT_PATTERN = /\/chat\/([^/?]+)/;
const DELETE_PATTERN = /delete|trash|remove/i;
const CONFIRM_PATTERN = /confirm|yes|delete/i;

// Timing constants
const CONFIRM_TIMEOUT_MS = 1000;
const STABILITY_CHECK_INTERVAL_MS = 100;
const STABILITY_CHECK_THRESHOLD = 3;

/**
 * Test user credentials for E2E tests.
 * In a real environment, these would come from environment variables.
 */
export const TEST_USER = {
    email: process.env.TEST_USER_EMAIL ?? "test@example.com",
    password: process.env.TEST_USER_PASSWORD ?? "testpassword123",
};

// =============================================================================
// Authentication Helpers
// =============================================================================

/**
 * Login as the test user
 */
export async function loginAsTestUser(page: Page): Promise<void> {
    await page.goto("/login");

    // Fill in credentials
    await page.getByLabel(EMAIL_LABEL_PATTERN).fill(TEST_USER.email);
    await page.getByLabel(PASSWORD_LABEL_PATTERN).fill(TEST_USER.password);

    // Submit the form
    await page.getByRole("button", { name: SIGN_IN_BUTTON_PATTERN }).click();

    // Wait for navigation to complete
    await page.waitForURL("/", { timeout: 10_000 });
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
    // Open user menu and click logout
    await page.getByRole("button", { name: USER_MENU_PATTERN }).click();
    await page.getByRole("menuitem", { name: LOGOUT_PATTERN }).click();

    // Wait for redirect to login
    await page.waitForURL(LOGIN_URL_PATTERN);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
    await page.goto("/");

    // If redirected to login, user is not logged in
    const url = page.url();
    return !LOGIN_URL_PATTERN.test(url);
}

// =============================================================================
// Chat Helpers
// =============================================================================

/**
 * Send a message in the chat
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
    const input = page.getByRole("textbox");
    await input.fill(message);
    await page.getByRole("button", { name: SEND_BUTTON_PATTERN }).click();

    // Wait for message to appear in the chat
    await expect(page.getByText(message)).toBeVisible();
}

/**
 * Wait for AI response to appear
 */
export async function waitForAIResponse(
    page: Page,
    timeout = 30_000
): Promise<void> {
    // Wait for the loading indicator to disappear
    const loadingIndicator = page.locator('[data-testid="message-loading"]');
    if (await loadingIndicator.isVisible({ timeout: 2000 })) {
        await loadingIndicator.waitFor({ state: "detached", timeout });
    }

    // Wait for assistant message to appear
    const assistantMessage = page.locator(
        '[data-role="assistant"], [data-testid="assistant-message"]'
    );
    await expect(assistantMessage.last()).toBeVisible({ timeout });
}

/**
 * Create a new chat and return the chat ID from the URL
 */
export async function createNewChat(
    page: Page,
    message: string
): Promise<string> {
    await page.goto("/");

    // Send a message to create a new chat
    await sendMessage(page, message);

    // Wait for the URL to change to include a chat ID
    await page.waitForURL(CHAT_URL_PATTERN);

    // Extract chat ID from URL
    const url = page.url();
    const chatId = url.split("/chat/")[1]?.split("?")[0] ?? "";
    return chatId;
}

/**
 * Navigate to an existing chat
 */
export async function navigateToChat(
    page: Page,
    chatId: string
): Promise<void> {
    await page.goto(`/chat/${chatId}`);
    await page.waitForLoadState("networkidle");
}

/**
 * Get the current chat ID from the URL
 */
export function getChatIdFromUrl(page: Page): string | null {
    const url = page.url();
    const match = url.match(CHAT_ID_EXTRACT_PATTERN);
    return match ? (match[1] ?? null) : null;
}

// =============================================================================
// Sidebar Helpers
// =============================================================================

/**
 * Open the sidebar if it's not visible
 */
export async function openSidebar(page: Page): Promise<void> {
    const sidebar = page.getByRole("complementary");

    if (!(await sidebar.isVisible())) {
        const toggleButton = page.getByRole("button", {
            name: TOGGLE_SIDEBAR_PATTERN,
        });
        if (await toggleButton.isVisible()) {
            await toggleButton.click();
            await expect(sidebar).toBeVisible();
        }
    }
}

/**
 * Close the sidebar if it's visible
 */
export async function closeSidebar(page: Page): Promise<void> {
    const sidebar = page.getByRole("complementary");

    if (await sidebar.isVisible()) {
        const toggleButton = page.getByRole("button", {
            name: TOGGLE_SIDEBAR_PATTERN,
        });
        if (await toggleButton.isVisible()) {
            await toggleButton.click();
            await expect(sidebar).not.toBeVisible();
        }
    }
}

/**
 * Get chat items from sidebar
 */
export async function getSidebarChatItems(page: Page) {
    await openSidebar(page);
    const sidebar = page.getByRole("complementary");
    return sidebar.locator('[data-testid="chat-item"]');
}

/**
 * Click on a chat item in the sidebar by index
 */
export async function clickSidebarChatItem(
    page: Page,
    index: number
): Promise<void> {
    const chatItems = await getSidebarChatItems(page);
    await chatItems.nth(index).click();
    await page.waitForURL(CHAT_URL_PATTERN);
}

/**
 * Delete a chat from the sidebar by index
 */
export async function deleteSidebarChatItem(
    page: Page,
    index: number
): Promise<void> {
    const chatItems = await getSidebarChatItems(page);
    const chatItem = chatItems.nth(index);

    await chatItem.hover();
    const deleteButton = chatItem.getByRole("button", { name: DELETE_PATTERN });

    if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm if dialog appears
        const confirmButton = page.getByRole("button", {
            name: CONFIRM_PATTERN,
        });
        if (await confirmButton.isVisible({ timeout: CONFIRM_TIMEOUT_MS })) {
            await confirmButton.click();
        }
    }
}

// =============================================================================
// Model Selection Helpers
// =============================================================================

/**
 * Select a model by name
 */
export async function selectModel(
    page: Page,
    modelName: string
): Promise<void> {
    const modelSelector = page
        .getByRole("combobox", { name: MODEL_SELECTOR_PATTERN })
        .or(page.getByRole("button", { name: MODEL_SELECTOR_PATTERN }));

    if (await modelSelector.isVisible()) {
        await modelSelector.click();
        await page
            .getByRole("option", { name: new RegExp(modelName, "i") })
            .click();
    }
}

/**
 * Get the currently selected model name
 */
export async function getSelectedModel(page: Page): Promise<string | null> {
    const modelSelector = page
        .getByRole("combobox", { name: MODEL_SELECTOR_PATTERN })
        .or(page.getByRole("button", { name: MODEL_SELECTOR_PATTERN }));

    if (await modelSelector.isVisible()) {
        return modelSelector.textContent();
    }
    return null;
}

// =============================================================================
// Message Helpers
// =============================================================================

/**
 * Get all user messages in the chat
 */
export function getUserMessages(page: Page) {
    return page.locator('[data-role="user"], [data-testid="user-message"]');
}

/**
 * Get all assistant messages in the chat
 */
export function getAssistantMessages(page: Page) {
    return page.locator(
        '[data-role="assistant"], [data-testid="assistant-message"]'
    );
}

/**
 * Get the count of messages in the chat
 */
export async function getMessageCount(page: Page): Promise<number> {
    const userMessages = await getUserMessages(page).count();
    const assistantMessages = await getAssistantMessages(page).count();
    return userMessages + assistantMessages;
}

/**
 * Wait for a specific number of messages
 */
export async function waitForMessageCount(
    page: Page,
    count: number,
    timeout = 30_000
): Promise<void> {
    await expect(async () => {
        const currentCount = await getMessageCount(page);
        expect(currentCount).toBe(count);
    }).toPass({ timeout });
}

// =============================================================================
// Utility Helpers
// =============================================================================

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(
    page: Page,
    timeout = 5000
): Promise<void> {
    await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
        path: `tests/screenshots/${name}.png`,
        fullPage: true,
    });
}

/**
 * Clear all cookies and storage for the page
 */
export async function clearSession(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/**
 * Set viewport to mobile size
 */
export async function setMobileViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 375, height: 667 });
}

/**
 * Set viewport to desktop size
 */
export async function setDesktopViewport(page: Page): Promise<void> {
    await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * Wait for element to be stable (no layout shifts)
 */
export async function waitForElementStable(
    page: Page,
    selector: string,
    timeout = 5000
): Promise<void> {
    const element = page.locator(selector);
    await element.waitFor({ state: "visible", timeout });

    // Wait for element position to stabilize
    let previousBox = await element.boundingBox();
    let stableCount = 0;

    while (stableCount < STABILITY_CHECK_THRESHOLD) {
        await page.waitForTimeout(STABILITY_CHECK_INTERVAL_MS);
        const currentBox = await element.boundingBox();

        if (
            previousBox &&
            currentBox &&
            previousBox.x === currentBox.x &&
            previousBox.y === currentBox.y &&
            previousBox.width === currentBox.width &&
            previousBox.height === currentBox.height
        ) {
            stableCount++;
        } else {
            stableCount = 0;
        }

        previousBox = currentBox;
    }
}
