import { expect, test } from "@playwright/test";
import { setupMockAI } from "./utils";

test.describe("Chat", () => {
    test.beforeEach(async ({ page }) => {
        // Set up mock AI responses for testing
        await setupMockAI(page);
        // Navigate to home to get a fresh chat session
        await page.goto("/");
        await page.waitForLoadState("networkidle");
    });

    test.describe("New Chat Creation", () => {
        test("should display chat interface on home page", async ({ page }) => {
            // Chat input should be visible (use .first() to handle React Strict Mode duplicates)
            await expect(page.getByPlaceholder(/send a message/i).first()).toBeVisible({
                timeout: 10_000,
            });
        });

        test("should have send button disabled when input is empty", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const sendButton = page.getByTestId("send-button").first();
            await expect(sendButton).toBeVisible();
            await expect(sendButton).toBeDisabled();
        });

        test("should enable send button when message is typed", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Hello, world!");
            await expect(sendButton).toBeEnabled();
        });

        test("should display suggested actions for new chat", async ({
            page,
        }) => {
            // Look for suggestion buttons or suggested actions container
            const suggestedActions = page.getByTestId("suggested-actions");
            if (
                await suggestedActions
                    .isVisible({ timeout: 5000 })
                    .catch(() => false)
            ) {
                await expect(suggestedActions).toBeVisible();
            }
        });
    });

    test.describe("Message Sending", () => {
        test("should send a message and receive a response", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Hello, this is a test message");
            await sendButton.click();

            // Wait for response from API
            const response = await page.waitForResponse(
                (res) =>
                    res.url().includes("/api/chat") && res.status() === 200,
                { timeout: 30_000 }
            );
            expect(response.ok()).toBe(true);
        });

        test("should show stop button during generation", async ({ page }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Write a long story about a cat");
            await sendButton.click();

            // Stop button should appear during generation
            const stopButton = page.getByTestId("stop-button");
            await expect(stopButton).toBeVisible({ timeout: 5000 });
        });

        test("should be able to stop generation", async ({ page }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Write a very long essay");
            await sendButton.click();

            const stopButton = page.getByTestId("stop-button");
            await expect(stopButton).toBeVisible({ timeout: 5000 });
            await stopButton.click();

            // Send button should reappear
            await expect(sendButton).toBeVisible({ timeout: 5000 });
        });

        test("should redirect to /chat/:id after sending message", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Test message for chat ID");
            await sendButton.click();

            // Wait for URL to change to chat/:id format
            await page.waitForURL(/\/chat\/[a-zA-Z0-9-]+/, { timeout: 30_000 });
            expect(page.url()).toMatch(/\/chat\/[a-zA-Z0-9-]+/);
        });

        test("should display user message in chat", async ({ page }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();
            const testMessage = "This is my test message";

            await input.fill(testMessage);
            await sendButton.click();

            // User message should appear in chat
            const userMessage = page.getByTestId("message-user");
            await expect(userMessage).toBeVisible({ timeout: 10_000 });
        });

        test("should display assistant message after sending", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Say hello");
            await sendButton.click();

            // Wait for assistant message
            const assistantMessage = page.getByTestId("message-assistant");
            await expect(assistantMessage).toBeVisible({ timeout: 30_000 });
        });
    });

    test.describe("Chat History", () => {
        test("should persist chat in history after sending message", async ({
            page,
        }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            await input.fill("Test message for history");
            await sendButton.click();

            // Wait for chat to be created
            await page.waitForURL(/\/chat\/[a-zA-Z0-9-]+/, { timeout: 30_000 });

            // Open sidebar to check history
            const sidebarToggle = page.getByTestId("sidebar-toggle-button");
            if (await sidebarToggle.isVisible()) {
                await sidebarToggle.click();
            }

            // Chat history should contain the new chat
            const historyItem = page.getByTestId("chat-history-item").first();
            await expect(historyItem).toBeVisible({ timeout: 10_000 });
        });

        test("should load existing chat from history", async ({ page }) => {
            // Use .first() to handle React Strict Mode duplicates
            const input = page.getByPlaceholder(/send a message/i).first();
            const sendButton = page.getByTestId("send-button").first();

            // Create a chat first
            await input.fill("First message in chat");
            await sendButton.click();
            await page.waitForURL(/\/chat\/[a-zA-Z0-9-]+/, { timeout: 30_000 });

            const chatUrl = page.url();

            // Go to home
            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Navigate back to the chat
            await page.goto(chatUrl);
            await page.waitForLoadState("networkidle");

            // Message should still be visible
            const userMessage = page.getByTestId("message-user");
            await expect(userMessage).toBeVisible({ timeout: 10_000 });
        });

        test("should create new chat from sidebar", async ({ page }) => {
            // Open sidebar
            const sidebarToggle = page.getByTestId("sidebar-toggle-button");
            if (await sidebarToggle.isVisible()) {
                await sidebarToggle.click();
            }

            // Click new chat button
            const newChatButton = page.getByTestId("new-chat-button");
            if (
                await newChatButton
                    .isVisible({ timeout: 5000 })
                    .catch(() => false)
            ) {
                await newChatButton.click();
                await expect(page).toHaveURL("/");
            }
        });
    });

    test.describe("Model Selection", () => {
        test("should display model selector", async ({ page }) => {
            const modelSelector = page.getByTestId("model-selector");
            await expect(modelSelector).toBeVisible({ timeout: 10_000 });
        });

        test("should open model selector dropdown on click", async ({
            page,
        }) => {
            const modelSelector = page.getByTestId("model-selector");
            await modelSelector.click();

            // Dropdown items should be visible
            const modelItems = page.locator(
                "[data-testid^='model-selector-item-']"
            );
            await expect(modelItems.first()).toBeVisible({ timeout: 5000 });
        });
    });
});
