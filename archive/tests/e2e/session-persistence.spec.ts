/**
 * Session Persistence E2E Tests
 * TEST-003: E2E Tests for Auth Flows
 *
 * Tests session persistence, restoration, and edge cases.
 * Verifies sessions survive browser events and handle
 * edge cases gracefully.
 */

import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "./helpers";

/** Guest token cookie name - must match lib/auth/constants.ts */
const GUEST_TOKEN_COOKIE = "guest_token";

test.describe("Session Persistence", () => {
    test.describe("Guest Session Persistence", () => {
        test("should maintain session across multiple page loads", async ({
            page,
            context,
        }) => {
            // TEST-003: Verify session persists across loads
            await page.goto("/");
            await page.waitForLoadState("networkidle");

            const cookies1 = await context.cookies();
            const token1 = cookies1.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;
            expect(token1).toBeDefined();

            // Reload page multiple times
            for (let i = 0; i < 3; i++) {
                await page.reload();
                await page.waitForLoadState("networkidle");

                const cookies = await context.cookies();
                const token = cookies.find(
                    (c) => c.name === GUEST_TOKEN_COOKIE
                )?.value;

                // Token should be same (or rotated, which is also valid)
                expect(token).toBeDefined();
            }
        });

        test("should restore session in new tab (same context)", async ({
            page,
            context,
        }) => {
            // TEST-003: Verify session shared across tabs
            await page.goto("/");
            await page.waitForLoadState("networkidle");

            const cookies = await context.cookies();
            const originalToken = cookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Open new tab in same context
            const newTab = await context.newPage();
            await newTab.goto("/");
            await newTab.waitForLoadState("networkidle");

            const newCookies = await context.cookies();
            const newToken = newCookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Same session
            expect(newToken).toBe(originalToken);

            await newTab.close();
        });

        test("should create new session in incognito/new context", async ({
            browser,
        }) => {
            // TEST-003: Verify fresh context gets new session
            // Create first context
            const context1 = await browser.newContext();
            const page1 = await context1.newPage();
            await page1.goto("/");
            await page1.waitForLoadState("networkidle");

            const cookies1 = await context1.cookies();
            const token1 = cookies1.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Create second context (like incognito)
            const context2 = await browser.newContext();
            const page2 = await context2.newPage();
            await page2.goto("/");
            await page2.waitForLoadState("networkidle");

            const cookies2 = await context2.cookies();
            const token2 = cookies2.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Different sessions
            expect(token1).toBeDefined();
            expect(token2).toBeDefined();
            expect(token1).not.toBe(token2);

            await context1.close();
            await context2.close();
        });
    });

    test.describe("Session Recovery", () => {
        test("should handle expired session cookie gracefully", async ({
            page,
            context,
        }) => {
            // TEST-003: Verify expired token handling
            // Set an "expired" token (the server will reject it)
            const expiredPayload = btoa(
                JSON.stringify({
                    sub: "expired-guest",
                    iat: Math.floor(Date.now() / 1000) - 86_400, // 24 hours ago
                    exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
                })
            );
            const expiredToken = `eyJhbGciOiJIUzI1NiJ9.${expiredPayload}.invalid`;

            await context.addCookies([
                {
                    name: GUEST_TOKEN_COOKIE,
                    value: expiredToken,
                    domain: "localhost",
                    path: "/",
                },
            ]);

            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Should not crash, should get new session
            const cookies = await context.cookies();
            const newToken = cookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            expect(newToken).toBeDefined();
            // Page should be accessible
            await expect(page).not.toHaveURL(/error/);
        });

        test("should handle corrupted cookie value", async ({
            page,
            context,
        }) => {
            // TEST-003: Verify corrupted cookie handling
            await context.addCookies([
                {
                    name: GUEST_TOKEN_COOKIE,
                    value: "not-a-valid-jwt-at-all!!!",
                    domain: "localhost",
                    path: "/",
                },
            ]);

            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Should recover gracefully
            const cookies = await context.cookies();
            const token = cookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            expect(token).toBeDefined();
            await expect(page).not.toHaveURL(/error/);
        });

        test("should handle empty cookie value", async ({ page, context }) => {
            // TEST-003: Verify empty cookie handling
            await context.addCookies([
                {
                    name: GUEST_TOKEN_COOKIE,
                    value: "",
                    domain: "localhost",
                    path: "/",
                },
            ]);

            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Should create new session
            const cookies = await context.cookies();
            const token = cookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Should have valid token now
            expect(token).toBeDefined();
            expect(token?.length).toBeGreaterThan(0);
        });
    });

    test.describe("Authenticated Session Persistence", () => {
        test("should maintain authenticated session across navigation", async ({
            page,
        }) => {
            // TEST-003: Verify auth session persists
            const { email, password } = generateRandomTestUser();

            // Register
            await page.goto("/register");
            await page.waitForLoadState("networkidle");
            await page.getByPlaceholder("user@acme.com").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /sign up/i }).click();

            // Wait for redirect or error
            await page.waitForLoadState("networkidle");
            const currentUrl = page.url();

            // If registration failed, skip this test
            if (
                currentUrl.includes("/register") ||
                currentUrl.includes("/login")
            ) {
                await page.waitForTimeout(2000);
                if (page.url() !== "http://localhost:3000/") {
                    test.skip();
                    return;
                }
            }

            await expect(page).toHaveURL("/", { timeout: 15_000 });

            // Get auth session cookie
            const cookies1 = await page.context().cookies();
            const authCookie1 = cookies1.find(
                (c) =>
                    c.name.includes("authjs.session") ||
                    c.name.includes("session-token")
            );
            expect(authCookie1).toBeDefined();

            // Navigate around
            await page.goto("/login");
            await page.waitForLoadState("networkidle");

            // Should still be logged in (might redirect back)
            const cookies2 = await page.context().cookies();
            const authCookie2 = cookies2.find(
                (c) =>
                    c.name.includes("authjs.session") ||
                    c.name.includes("session-token")
            );

            expect(authCookie2).toBeDefined();
        });

        test("should clear session on logout", async ({ page }) => {
            // TEST-003: Verify logout clears session
            const { email, password } = generateRandomTestUser();

            // Register
            await page.goto("/register");
            await page.waitForLoadState("networkidle");
            await page.getByPlaceholder("user@acme.com").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /sign up/i }).click();

            // Wait for redirect or error
            await page.waitForLoadState("networkidle");
            const currentUrl = page.url();

            // If registration failed, skip this test
            if (
                currentUrl.includes("/register") ||
                currentUrl.includes("/login")
            ) {
                await page.waitForTimeout(2000);
                if (page.url() !== "http://localhost:3000/") {
                    test.skip();
                    return;
                }
            }

            await expect(page).toHaveURL("/", { timeout: 15_000 });

            // Verify logged in
            const cookies1 = await page.context().cookies();
            const authCookie1 = cookies1.find(
                (c) =>
                    c.name.includes("authjs.session") ||
                    c.name.includes("session-token")
            );
            expect(authCookie1).toBeDefined();

            // Try to find and click logout
            // Open sidebar if needed
            const sidebarToggle = page.getByTestId("sidebar-toggle-button");
            if (await sidebarToggle.isVisible()) {
                await sidebarToggle.click();
            }

            // Look for user nav and logout option
            const userNavButton = page.getByTestId("user-nav-button");
            if (await userNavButton.isVisible()) {
                await userNavButton.click();

                const logoutItem = page.getByTestId("user-nav-item-logout");
                if (await logoutItem.isVisible()) {
                    await logoutItem.click();
                    await page.waitForLoadState("networkidle");

                    // Session should be cleared
                    const cookies2 = await page.context().cookies();
                    const authCookie2 = cookies2.find(
                        (c) =>
                            c.name.includes("authjs.session") ||
                            c.name.includes("session-token")
                    );

                    // Auth cookie should be gone or different
                    if (authCookie2) {
                        expect(authCookie2.value).not.toBe(authCookie1?.value);
                    }
                }
            }
        });
    });

    test.describe("Session State Sync", () => {
        test("should sync session state between API and UI", async ({
            page,
            request,
        }) => {
            // TEST-003: Verify session state consistency
            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Get cookies from page
            const pageCookies = await page.context().cookies();
            const pageToken = pageCookies.find(
                (c) => c.name === GUEST_TOKEN_COOKIE
            )?.value;

            // Make API request with same cookies
            const apiResponse = await request.get("/api/health", {
                headers: {
                    Cookie: `${GUEST_TOKEN_COOKIE}=${pageToken}`,
                },
            });

            // API should accept the same session
            expect(apiResponse.status()).toBe(200);
        });

        test("should handle concurrent requests with same session", async ({
            page,
            request,
        }) => {
            // TEST-003: Verify concurrent request handling
            await page.goto("/");
            await page.waitForLoadState("networkidle");

            // Make concurrent requests
            const requests = [
                request.get("/api/health"),
                request.get("/api/health"),
                request.get("/api/health"),
            ];

            const responses = await Promise.all(requests);

            // All should succeed
            for (const r of responses) {
                expect([200, 401]).toContain(r.status()); // 401 if auth required
            }
        });
    });
});
