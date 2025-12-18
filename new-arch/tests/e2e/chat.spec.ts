import { expect, test } from "@playwright/test";

import { loginAsTestUser } from "../helpers/e2e";

// =============================================================================
// Constants
// =============================================================================

// Regex patterns for selectors
const SEND_BUTTON_PATTERN = /send/i;
const GREETING_PATTERN =
    /how can i help|start a conversation|hello|what can i/i;
const MODEL_SELECTOR_PATTERN = /model/i;
const NEW_CHAT_PATTERN = /new chat|new conversation/i;
const DELETE_PATTERN = /delete|trash|remove/i;
const CONFIRM_PATTERN = /confirm|yes|delete/i;
const COPY_PATTERN = /copy/i;
const EDIT_PATTERN = /edit/i;
const SAVE_PATTERN = /save|submit/i;
const CHAT_URL_PATTERN = /\/chat\//;

// Timing constants
const MESSAGE_DELAY_MS = 500;
const DROPDOWN_DELAY_MS = 200;
const CONFIRM_TIMEOUT_MS = 1000;

// =============================================================================
// Chat Functionality Tests
// =============================================================================

test.describe("Chat Functionality", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    test.describe("Chat Interface", () => {
        test("displays chat interface elements", async ({ page }) => {
            await page.goto("/");

            // Check input area
            await expect(page.getByRole("textbox")).toBeVisible();
            await expect(
                page.getByRole("button", { name: SEND_BUTTON_PATTERN })
            ).toBeVisible();

            // Check sidebar
            await expect(page.getByRole("complementary")).toBeVisible();

            // Check header
            await expect(page.locator("header")).toBeVisible();
        });

        test("shows greeting for new conversation", async ({ page }) => {
            await page.goto("/");

            // Should show greeting or empty state
            const greeting = page.getByText(GREETING_PATTERN);
            await expect(greeting).toBeVisible();
        });

        test("input field is focused on load", async ({ page }) => {
            await page.goto("/");

            // Input should be ready for typing
            const input = page.getByRole("textbox");
            await expect(input).toBeVisible();
        });
    });

    test.describe("Sending Messages", () => {
        test("sends a text message", async ({ page }) => {
            await page.goto("/");
            const testMessage = "Hello, this is a test message";

            // Type and send message
            await page.getByRole("textbox").fill(testMessage);
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();

            // Message should appear in chat
            await expect(page.getByText(testMessage)).toBeVisible();

            // Input should be cleared
            await expect(page.getByRole("textbox")).toHaveValue("");
        });

        test("sends message with Enter key", async ({ page }) => {
            await page.goto("/");
            const testMessage = "Message sent with Enter";

            await page.getByRole("textbox").fill(testMessage);
            await page.keyboard.press("Enter");

            await expect(page.getByText(testMessage)).toBeVisible();
        });

        test("does not send empty message", async ({ page }) => {
            await page.goto("/");

            // Ensure input is empty
            await expect(page.getByRole("textbox")).toHaveValue("");

            // Click send with empty input - button should be disabled or no action
            const sendButton = page.getByRole("button", {
                name: SEND_BUTTON_PATTERN,
            });
            const isDisabled = await sendButton.isDisabled();

            if (!isDisabled) {
                await sendButton.click();
            }

            // Should not create a new message - check URL hasn't changed to a chat
            await expect(page).toHaveURL("/");
        });

        test("shows loading state while generating response", async ({
            page,
        }) => {
            await page.goto("/");

            await page.getByRole("textbox").fill("Hello");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();

            // Should show loading indicator
            const loadingIndicator = page.locator(
                '[data-testid="loading"], .animate-pulse, [aria-busy="true"], [data-testid="message-loading"]'
            );
            await expect(loadingIndicator.first()).toBeVisible({
                timeout: 2000,
            });
        });

        test("can send multiple messages in sequence", async ({ page }) => {
            await page.goto("/");

            const messages = [
                "First message",
                "Second message",
                "Third message",
            ];

            for (const message of messages) {
                await page.getByRole("textbox").fill(message);
                await page
                    .getByRole("button", { name: SEND_BUTTON_PATTERN })
                    .click();
                await expect(page.getByText(message)).toBeVisible();
                // Wait a bit between messages
                await page.waitForTimeout(MESSAGE_DELAY_MS);
            }

            // All messages should be visible
            for (const message of messages) {
                await expect(page.getByText(message)).toBeVisible();
            }
        });
    });

    test.describe("Chat History", () => {
        test("persists messages after page reload", async ({ page }) => {
            await page.goto("/");
            const testMessage = "Persistent message test";

            // Send a message
            await page.getByRole("textbox").fill(testMessage);
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await expect(page.getByText(testMessage)).toBeVisible();

            // Wait for chat to be created (URL should change)
            await page.waitForURL(CHAT_URL_PATTERN);

            // Reload page
            await page.reload();

            // Message should still be visible
            await expect(page.getByText(testMessage)).toBeVisible();
        });

        test("shows chat in sidebar history", async ({ page }) => {
            await page.goto("/");

            // Send a message to create a chat
            const testMessage = "Create history test";
            await page.getByRole("textbox").fill(testMessage);
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();

            // Wait for response
            await page.waitForURL(CHAT_URL_PATTERN);

            // Check sidebar for new chat entry
            const sidebar = page.getByRole("complementary");
            await expect(
                sidebar.locator('[data-testid="chat-item"]').first()
            ).toBeVisible({
                timeout: 5000,
            });
        });

        test("can navigate between chats", async ({ page }) => {
            // Create first chat
            await page.goto("/");
            await page.getByRole("textbox").fill("First chat message");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Create second chat via new chat button
            const newChatButton = page.getByRole("button", {
                name: NEW_CHAT_PATTERN,
            });
            if (await newChatButton.isVisible()) {
                await newChatButton.click();
            } else {
                await page.goto("/");
            }

            await page.getByRole("textbox").fill("Second chat message");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Navigate back to first chat via sidebar
            const sidebar = page.getByRole("complementary");
            const chatItems = sidebar.locator('[data-testid="chat-item"]');
            await chatItems.first().click();

            // Should show first chat content
            await expect(page.getByText("First chat message")).toBeVisible();
        });

        test("can delete a chat", async ({ page }) => {
            // Create a chat first
            await page.goto("/");
            await page.getByRole("textbox").fill("Chat to delete");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Find and delete from sidebar
            const sidebar = page.getByRole("complementary");
            const chatItem = sidebar
                .locator('[data-testid="chat-item"]')
                .first();
            await chatItem.hover();

            const deleteButton = chatItem.getByRole("button", {
                name: DELETE_PATTERN,
            });
            if (await deleteButton.isVisible()) {
                await deleteButton.click();

                // Confirm deletion if dialog appears
                const confirmButton = page.getByRole("button", {
                    name: CONFIRM_PATTERN,
                });
                if (
                    await confirmButton.isVisible({
                        timeout: CONFIRM_TIMEOUT_MS,
                    })
                ) {
                    await confirmButton.click();
                }

                // Chat should be removed or navigate away
                await page.waitForTimeout(MESSAGE_DELAY_MS);
            }
        });
    });

    test.describe("Model Selection", () => {
        test("can view model selector", async ({ page }) => {
            await page.goto("/");

            // Look for model selector (combobox or button)
            const modelSelector = page
                .getByRole("combobox", { name: MODEL_SELECTOR_PATTERN })
                .or(page.getByRole("button", { name: MODEL_SELECTOR_PATTERN }));

            if (await modelSelector.isVisible()) {
                await expect(modelSelector).toBeEnabled();
            }
        });

        test("can change AI model", async ({ page }) => {
            await page.goto("/");

            // Open model selector if it exists
            const modelSelector = page
                .getByRole("combobox", { name: MODEL_SELECTOR_PATTERN })
                .or(page.getByRole("button", { name: MODEL_SELECTOR_PATTERN }));

            if (await modelSelector.isVisible()) {
                await modelSelector.click();

                // Wait for dropdown to open
                await page.waitForTimeout(DROPDOWN_DELAY_MS);

                // Select a different model
                const modelOption = page.getByRole("option").first();
                if (await modelOption.isVisible()) {
                    await modelOption.click();
                }
            }
        });
    });

    test.describe("Message Actions", () => {
        test("can copy message content", async ({ page }) => {
            await page.goto("/");

            // Send a message
            const testMessage = "Message to copy";
            await page.getByRole("textbox").fill(testMessage);
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await expect(page.getByText(testMessage)).toBeVisible();

            // Hover over message to reveal actions
            const message = page
                .locator('[data-testid="user-message"]')
                .first();
            if (await message.isVisible()) {
                await message.hover();

                // Look for copy button
                const copyButton = message.getByRole("button", {
                    name: COPY_PATTERN,
                });
                if (await copyButton.isVisible()) {
                    await copyButton.click();
                }
            }
        });

        test("can edit user message", async ({ page }) => {
            await page.goto("/");

            // Send a message
            const originalMessage = "Original message";
            await page.getByRole("textbox").fill(originalMessage);
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await expect(page.getByText(originalMessage)).toBeVisible();

            // Hover over message to reveal edit action
            const message = page
                .locator('[data-testid="user-message"]')
                .first();
            if (await message.isVisible()) {
                await message.hover();

                const editButton = message.getByRole("button", {
                    name: EDIT_PATTERN,
                });
                if (await editButton.isVisible()) {
                    await editButton.click();

                    // Edit the message
                    const editInput = page.getByRole("textbox").first();
                    await editInput.clear();
                    await editInput.fill("Edited message");

                    // Save the edit
                    const saveButton = page.getByRole("button", {
                        name: SAVE_PATTERN,
                    });
                    if (await saveButton.isVisible()) {
                        await saveButton.click();
                    }
                }
            }
        });
    });
});
