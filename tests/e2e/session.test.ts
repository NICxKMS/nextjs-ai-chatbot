import type { Page } from "@playwright/test";
import { getMessageByErrorCode } from "@/lib/errors";
import { expect, test } from "../fixtures";
import { generateRandomTestUser } from "../helpers";
import { AuthPage } from "../pages/auth";
import { ChatPage } from "../pages/chat";

const _asGlobalRequest = (
    request: import("@playwright/test").Request
): Request => {
    return request as unknown as Request;
};

const _waitForChatRequest = async (page: Page): Promise<Request> => {
    const playwrightRequest = await page.waitForRequest("**/api/chat");
    return playwrightRequest as unknown as Request;
};

test.describe
    .serial("Guest Session", () => {
        test("Authenticate as guest user when a new session is loaded", async ({
            page,
        }) => {
            // First visit to home page - client-side AuthProvider will POST to /api/auth/guest
            await page.goto("/");

            // Wait for the client-side guest session creation
            const guestRequest = await page.waitForRequest(
                (request) =>
                    request.url().includes("/api/auth/guest") &&
                    request.method() === "POST"
            );

            expect(guestRequest).toBeTruthy();

            // Verify the page is accessible
            await expect(
                page.getByPlaceholder("Send a message...")
            ).toBeVisible();
        });

        test("Create guest session when navigating directly to a chat page", async ({
            page,
        }) => {
            // Direct navigation to a chat page should redirect through guest auth
            // to create session, then back to home (since chat doesn't exist)
            const response = await page.goto("/chat/non-existent-chat-id");

            if (!response) {
                throw new Error("Failed to load page");
            }

            // Should end up on home page with notice (chat not found after guest auth)
            await page.waitForURL(/\/(\?notice=chat_not_found)?/);

            // Verify guest session was created (user shows as Guest)
            const sidebarToggleButton = page.getByTestId(
                "sidebar-toggle-button"
            );
            await sidebarToggleButton.click();

            const userEmail = page.getByTestId("user-email");
            await expect(userEmail).toContainText("Guest");
        });

        test("Log out is not available for guest users", async ({ page }) => {
            await page.goto("/");

            const sidebarToggleButton = page.getByTestId(
                "sidebar-toggle-button"
            );
            await sidebarToggleButton.click();

            const userNavButton = page.getByTestId("user-nav-button");
            await expect(userNavButton).toBeVisible();

            await userNavButton.click();
            const userNavMenu = page.getByTestId("user-nav-menu");
            await expect(userNavMenu).toBeVisible();

            const authMenuItem = page.getByTestId("user-nav-item-auth");
            await expect(authMenuItem).toContainText("Login to your account");
        });

        test("Do not authenticate as guest user when an existing non-guest session is active", async ({
            adaContext,
        }) => {
            const response = await adaContext.page.goto("/");

            if (!response) {
                throw new Error("Failed to load page");
            }

            let request: import("@playwright/test").Request | null =
                response.request();

            const chain: string[] = [];

            while (request) {
                chain.unshift(request.url());
                request = request.redirectedFrom();
            }

            expect(chain).toEqual(["http://localhost:3000/"]);
        });

        test("Allow navigating to /login as guest user", async ({ page }) => {
            await page.goto("/login");
            await page.waitForURL("/login");
            await expect(page).toHaveURL("/login");
        });

        test("Allow navigating to /register as guest user", async ({
            page,
        }) => {
            await page.goto("/register");
            await page.waitForURL("/register");
            await expect(page).toHaveURL("/register");
        });

        test("Do not show email in user menu for guest user", async ({
            page,
        }) => {
            await page.goto("/");

            const sidebarToggleButton = page.getByTestId(
                "sidebar-toggle-button"
            );
            await sidebarToggleButton.click();

            const userEmail = page.getByTestId("user-email");
            await expect(userEmail).toContainText("Guest");
        });
    });

test.describe
    .serial("Login and Registration", () => {
        let authPage: AuthPage;

        const testUser = generateRandomTestUser();

        test.beforeEach(({ page }) => {
            authPage = new AuthPage(page);
        });

        test("Register new account", async () => {
            await authPage.register(testUser.email, testUser.password);
            await authPage.expectToastToContain(
                "Account created successfully!"
            );
        });

        test("Register new account with existing email", async () => {
            await authPage.register(testUser.email, testUser.password);
            await authPage.expectToastToContain("Account already exists!");
        });

        test("Log into account that exists", async ({ page }) => {
            await authPage.login(testUser.email, testUser.password);

            await page.waitForURL("/");
            await expect(
                page.getByPlaceholder("Send a message...")
            ).toBeVisible();
        });

        test("Display user email in user menu", async ({ page }) => {
            await authPage.login(testUser.email, testUser.password);

            await page.waitForURL("/");
            await expect(
                page.getByPlaceholder("Send a message...")
            ).toBeVisible();

            const userEmail = await page.getByTestId("user-email");
            await expect(userEmail).toHaveText(testUser.email);
        });

        test("Log out as non-guest user", async () => {
            await authPage.logout(testUser.email, testUser.password);
        });

        test("Do not force create a guest session if non-guest session already exists", async ({
            page,
        }) => {
            await authPage.login(testUser.email, testUser.password);
            await page.waitForURL("/");

            const userEmail = await page.getByTestId("user-email");
            await expect(userEmail).toHaveText(testUser.email);

            await page.goto("/api/auth/guest");
            await page.waitForURL("/");

            const updatedUserEmail = await page.getByTestId("user-email");
            await expect(updatedUserEmail).toHaveText(testUser.email);
        });

        test("Log out is available for non-guest users", async ({ page }) => {
            await authPage.login(testUser.email, testUser.password);
            await page.waitForURL("/");

            authPage.openSidebar();

            const userNavButton = page.getByTestId("user-nav-button");
            await expect(userNavButton).toBeVisible();

            await userNavButton.click();
            const userNavMenu = page.getByTestId("user-nav-menu");
            await expect(userNavMenu).toBeVisible();

            const authMenuItem = page.getByTestId("user-nav-item-auth");
            await expect(authMenuItem).toContainText("Sign out");
        });

        test("Do not navigate to /register for non-guest users", async ({
            page,
        }) => {
            await authPage.login(testUser.email, testUser.password);
            await page.waitForURL("/");

            await page.goto("/register");
            await expect(page).toHaveURL("/");
        });

        test("Do not navigate to /login for non-guest users", async ({
            page,
        }) => {
            await authPage.login(testUser.email, testUser.password);
            await page.waitForURL("/");

            await page.goto("/login");
            await expect(page).toHaveURL("/");
        });
    });

test.describe("Entitlements", () => {
    let chatPage: ChatPage;

    test.beforeEach(({ page }) => {
        chatPage = new ChatPage(page);
    });

    test("Guest user cannot send more than 20 messages/day", async () => {
        test.fixme();
        await chatPage.createNewChat();

        for (let i = 0; i <= 20; i++) {
            await chatPage.sendUserMessage("Why is the sky blue?");
            await chatPage.isGenerationComplete();
        }

        await chatPage.sendUserMessage("Why is the sky blue?");
        await chatPage.expectToastToContain(
            getMessageByErrorCode("rate_limit:chat")
        );
    });
});
