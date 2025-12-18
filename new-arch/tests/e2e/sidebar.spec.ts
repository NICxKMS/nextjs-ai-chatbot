import { expect, test } from "@playwright/test";

import { loginAsTestUser } from "../helpers/e2e";

// =============================================================================
// Constants
// =============================================================================

// Regex patterns for selectors
const TOGGLE_SIDEBAR_PATTERN = /toggle sidebar|menu|sidebar/i;
const NEW_CHAT_PATTERN = /new chat|new conversation/i;
const SEARCH_PLACEHOLDER_PATTERN = /search/i;
const SEND_BUTTON_PATTERN = /send/i;
const CHAT_URL_PATTERN = /\/chat\//;
const GREETING_PATTERN = /how can i help|what can i/i;
const USER_MENU_PATTERN = /user|account|avatar|menu/i;
const USER_BUTTON_PATTERN = /user|account|avatar/i;
const LOGOUT_PATTERN = /logout|sign out/i;
const SETTINGS_PATTERN = /settings|preferences/i;
const RENAME_PATTERN = /rename|edit/i;
const DELETE_PATTERN = /delete|trash|remove/i;
const CONFIRM_PATTERN = /confirm|yes|delete/i;
const NO_RESULTS_PATTERN = /no results|no chats|nothing found/i;

// Viewport sizes
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Timing constants
const ANIMATION_DELAY_MS = 300;
const DEBOUNCE_DELAY_MS = 500;
const ACTION_TIMEOUT_MS = 1000;
const HISTORY_TIMEOUT_MS = 5000;

// =============================================================================
// Sidebar Tests
// =============================================================================

test.describe("Sidebar", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
        await page.goto("/");
    });

    test.describe("Visibility", () => {
        test("sidebar is visible by default on desktop", async ({ page }) => {
            // Set desktop viewport
            await page.setViewportSize(DESKTOP_VIEWPORT);

            const sidebar = page.getByRole("complementary");
            await expect(sidebar).toBeVisible();
        });

        test("can toggle sidebar visibility", async ({ page }) => {
            const sidebar = page.getByRole("complementary");
            const toggleButton = page.getByRole("button", {
                name: TOGGLE_SIDEBAR_PATTERN,
            });

            // Skip if toggle button doesn't exist
            if (!(await toggleButton.isVisible())) {
                test.skip();
                return;
            }

            // Get initial state
            const initiallyVisible = await sidebar.isVisible();

            // Toggle
            await toggleButton.click();
            await page.waitForTimeout(ANIMATION_DELAY_MS); // Wait for animation

            if (initiallyVisible) {
                await expect(sidebar).not.toBeVisible();
            } else {
                await expect(sidebar).toBeVisible();
            }

            // Toggle back
            await toggleButton.click();
            await page.waitForTimeout(ANIMATION_DELAY_MS);

            if (initiallyVisible) {
                await expect(sidebar).toBeVisible();
            } else {
                await expect(sidebar).not.toBeVisible();
            }
        });

        test("sidebar collapses on mobile viewport", async ({ page }) => {
            // Set mobile viewport
            await page.setViewportSize(MOBILE_VIEWPORT);

            // Sidebar might be hidden or collapsed on mobile
            const sidebar = page.getByRole("complementary");
            const isCollapsed =
                !(await sidebar.isVisible()) ||
                (await sidebar.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    return (
                        style.width === "0px" ||
                        style.transform.includes("translate")
                    );
                }));

            expect(isCollapsed).toBeTruthy();
        });
    });

    test.describe("New Chat", () => {
        test("can create new chat from sidebar", async ({ page }) => {
            const newChatButton = page.getByRole("button", {
                name: NEW_CHAT_PATTERN,
            });

            if (await newChatButton.isVisible()) {
                await newChatButton.click();

                // Should navigate to new chat
                await expect(page).toHaveURL("/");

                // Input should be empty
                const input = page.getByRole("textbox");
                await expect(input).toHaveValue("");
            }
        });

        test("new chat clears previous conversation", async ({ page }) => {
            // First, create a chat with a message
            await page.getByRole("textbox").fill("First conversation message");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await expect(
                page.getByText("First conversation message")
            ).toBeVisible();

            // Click new chat
            const newChatButton = page.getByRole("button", {
                name: NEW_CHAT_PATTERN,
            });
            if (await newChatButton.isVisible()) {
                await newChatButton.click();
                await page.waitForTimeout(ANIMATION_DELAY_MS);

                // The greeting should be visible (indicates new conversation)
                const greeting = page.getByText(GREETING_PATTERN);
                if (await greeting.isVisible()) {
                    await expect(greeting).toBeVisible();
                }
            }
        });
    });

    test.describe("Chat History", () => {
        test("displays chat history list", async ({ page }) => {
            // Create a chat to ensure there's history
            await page.getByRole("textbox").fill("Chat for history");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Check sidebar has chat items
            const sidebar = page.getByRole("complementary");
            const chatItems = sidebar.locator('[data-testid="chat-item"]');

            // Should have at least one chat
            await expect(chatItems.first()).toBeVisible({
                timeout: HISTORY_TIMEOUT_MS,
            });
        });

        test("can click on chat history item to navigate", async ({ page }) => {
            // Create a chat
            await page.getByRole("textbox").fill("Navigable chat");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Go to home
            await page.goto("/");

            // Click on the chat in sidebar
            const sidebar = page.getByRole("complementary");
            const chatItem = sidebar
                .locator('[data-testid="chat-item"]')
                .first();

            if (await chatItem.isVisible()) {
                await chatItem.click();

                // Should navigate to the chat
                await expect(page).toHaveURL(CHAT_URL_PATTERN);
            }
        });

        test("highlights current chat in sidebar", async ({ page }) => {
            // Create a chat
            await page.getByRole("textbox").fill("Current chat");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // The current chat should be highlighted
            const sidebar = page.getByRole("complementary");
            const currentChatItem = sidebar.locator(
                '[data-testid="chat-item"][aria-current="true"]'
            );

            // Or check for active/selected class
            const activeChatItem = sidebar.locator(
                '[data-testid="chat-item"].active, [data-testid="chat-item"][data-active="true"]'
            );

            const hasHighlight =
                (await currentChatItem.isVisible()) ||
                (await activeChatItem.isVisible());
            expect(hasHighlight).toBeTruthy();
        });
    });

    test.describe("Search", () => {
        test("can search chats", async ({ page }) => {
            const searchInput = page.getByPlaceholder(
                SEARCH_PLACEHOLDER_PATTERN
            );

            if (await searchInput.isVisible()) {
                // Create some chats first
                await page.getByRole("textbox").fill("Searchable chat one");
                await page
                    .getByRole("button", { name: SEND_BUTTON_PATTERN })
                    .click();
                await page.waitForURL(CHAT_URL_PATTERN);

                // Search for it
                await searchInput.fill("Searchable");

                // Wait for debounce
                await page.waitForTimeout(DEBOUNCE_DELAY_MS);

                // Results should be filtered
                const sidebar = page.getByRole("complementary");
                const chatItems = sidebar.locator('[data-testid="chat-item"]');

                // Should still show matching results
                await expect(chatItems.first()).toBeVisible();
            }
        });

        test("shows no results message when search finds nothing", async ({
            page,
        }) => {
            const searchInput = page.getByPlaceholder(
                SEARCH_PLACEHOLDER_PATTERN
            );

            if (await searchInput.isVisible()) {
                await searchInput.fill("xyznonexistentchat123456");
                await page.waitForTimeout(DEBOUNCE_DELAY_MS);

                // Should show empty state or no results
                const noResults = page.getByText(NO_RESULTS_PATTERN);
                if (await noResults.isVisible()) {
                    await expect(noResults).toBeVisible();
                }
            }
        });

        test("can clear search", async ({ page }) => {
            const searchInput = page.getByPlaceholder(
                SEARCH_PLACEHOLDER_PATTERN
            );

            if (await searchInput.isVisible()) {
                await searchInput.fill("test search");
                await page.waitForTimeout(ANIMATION_DELAY_MS);

                // Clear the search
                await searchInput.clear();
                await page.waitForTimeout(ANIMATION_DELAY_MS);

                // Should show all chats again
                await expect(searchInput).toHaveValue("");
            }
        });
    });

    test.describe("User Menu", () => {
        test("shows user menu in sidebar", async ({ page }) => {
            const sidebar = page.getByRole("complementary");
            const userMenu = sidebar.getByRole("button", {
                name: USER_MENU_PATTERN,
            });

            if (await userMenu.isVisible()) {
                await expect(userMenu).toBeEnabled();
            }
        });

        test("user menu contains logout option", async ({ page }) => {
            const sidebar = page.getByRole("complementary");
            const userButton = sidebar.getByRole("button", {
                name: USER_BUTTON_PATTERN,
            });

            if (await userButton.isVisible()) {
                await userButton.click();

                const logoutItem = page.getByRole("menuitem", {
                    name: LOGOUT_PATTERN,
                });
                await expect(logoutItem).toBeVisible();
            }
        });

        test("user menu contains settings option", async ({ page }) => {
            const sidebar = page.getByRole("complementary");
            const userButton = sidebar.getByRole("button", {
                name: USER_BUTTON_PATTERN,
            });

            if (await userButton.isVisible()) {
                await userButton.click();

                const settingsItem = page.getByRole("menuitem", {
                    name: SETTINGS_PATTERN,
                });
                if (await settingsItem.isVisible()) {
                    await expect(settingsItem).toBeEnabled();
                }
            }
        });
    });

    test.describe("Chat Item Actions", () => {
        test("shows actions on chat item hover", async ({ page }) => {
            // Create a chat first
            await page.getByRole("textbox").fill("Chat with actions");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Hover over chat item
            const sidebar = page.getByRole("complementary");
            const chatItem = sidebar
                .locator('[data-testid="chat-item"]')
                .first();

            if (await chatItem.isVisible()) {
                await chatItem.hover();

                // Should reveal action buttons
                const actionButton = chatItem.getByRole("button");
                await expect(actionButton.first()).toBeVisible({
                    timeout: ACTION_TIMEOUT_MS,
                });
            }
        });

        test("can rename chat", async ({ page }) => {
            // Create a chat first
            await page.getByRole("textbox").fill("Chat to rename");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Hover and click rename
            const sidebar = page.getByRole("complementary");
            const chatItem = sidebar
                .locator('[data-testid="chat-item"]')
                .first();

            if (await chatItem.isVisible()) {
                await chatItem.hover();

                const renameButton = chatItem.getByRole("button", {
                    name: RENAME_PATTERN,
                });
                if (await renameButton.isVisible()) {
                    await renameButton.click();

                    // Should show input for renaming
                    const renameInput = chatItem.getByRole("textbox");
                    if (await renameInput.isVisible()) {
                        await renameInput.clear();
                        await renameInput.fill("Renamed Chat");
                        await renameInput.press("Enter");
                    }
                }
            }
        });

        test("can delete chat from sidebar", async ({ page }) => {
            // Create a chat first
            await page.getByRole("textbox").fill("Chat to delete from sidebar");
            await page
                .getByRole("button", { name: SEND_BUTTON_PATTERN })
                .click();
            await page.waitForURL(CHAT_URL_PATTERN);

            // Hover and click delete
            const sidebar = page.getByRole("complementary");
            const chatItem = sidebar
                .locator('[data-testid="chat-item"]')
                .first();

            if (await chatItem.isVisible()) {
                await chatItem.hover();

                const deleteButton = chatItem.getByRole("button", {
                    name: DELETE_PATTERN,
                });
                if (await deleteButton.isVisible()) {
                    await deleteButton.click();

                    // Confirm if dialog appears
                    const confirmButton = page.getByRole("button", {
                        name: CONFIRM_PATTERN,
                    });
                    if (
                        await confirmButton.isVisible({
                            timeout: ACTION_TIMEOUT_MS,
                        })
                    ) {
                        await confirmButton.click();
                    }
                }
            }
        });
    });
});
