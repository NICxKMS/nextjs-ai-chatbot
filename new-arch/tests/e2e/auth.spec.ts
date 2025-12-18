import { expect, test } from "@playwright/test";

// =============================================================================
// Constants
// =============================================================================

const TEST_USER = process.env.TEST_USER_EMAIL ?? "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "testpassword123";

// Regex patterns for selectors
const SIGN_IN_TITLE_PATTERN = /Sign In|Login/i;
const SIGN_IN_HEADING_PATTERN = /sign in/i;
const EMAIL_LABEL_PATTERN = /email/i;
const PASSWORD_LABEL_PATTERN = /password/i;
const SIGN_IN_BUTTON_PATTERN = /sign in/i;
const SIGN_UP_LINK_PATTERN = /sign up|register/i;
const SIGN_UP_HEADING_PATTERN = /sign up|register|create/i;
const SIGN_UP_BUTTON_PATTERN = /sign up|register|create/i;
const LOGIN_URL_PATTERN = /\/login/;
const PASSWORD_REQUIREMENT_PATTERN = /8 characters|too short|minimum/i;
const VALIDATION_ERROR_PATTERN = /email is required|please enter/i;
const CREDENTIAL_ERROR_PATTERN = /invalid|incorrect|failed/i;
const USER_MENU_PATTERN = /user|menu|avatar/i;
const LOGOUT_PATTERN = /logout|sign out/i;
const VALID_EMAIL_PATTERN = /valid email|invalid email/i;

// =============================================================================
// Authentication Flow Tests
// =============================================================================

test.describe("Authentication Flow", () => {
    test.describe("Login", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/login");
        });

        test("displays login form correctly", async ({ page }) => {
            // Check page title and heading
            await expect(page).toHaveTitle(SIGN_IN_TITLE_PATTERN);
            await expect(
                page.getByRole("heading", { name: SIGN_IN_HEADING_PATTERN })
            ).toBeVisible();

            // Check form elements
            await expect(page.getByLabel(EMAIL_LABEL_PATTERN)).toBeVisible();
            await expect(page.getByLabel(PASSWORD_LABEL_PATTERN)).toBeVisible();
            await expect(
                page.getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
            ).toBeVisible();

            // Check link to register
            await expect(
                page.getByRole("link", { name: SIGN_UP_LINK_PATTERN })
            ).toBeVisible();
        });

        test("shows validation errors for empty form", async ({ page }) => {
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();

            // Should show validation messages
            await expect(
                page.getByText(VALIDATION_ERROR_PATTERN)
            ).toBeVisible();
        });

        test("shows error for invalid credentials", async ({ page }) => {
            await page
                .getByLabel(EMAIL_LABEL_PATTERN)
                .fill("invalid@example.com");
            await page.getByLabel(PASSWORD_LABEL_PATTERN).fill("wrongpassword");
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();

            // Should show error message
            await expect(page.getByText(CREDENTIAL_ERROR_PATTERN)).toBeVisible({
                timeout: 5000,
            });
        });

        test("successful login redirects to chat", async ({ page }) => {
            await page.getByLabel(EMAIL_LABEL_PATTERN).fill(TEST_USER);
            await page.getByLabel(PASSWORD_LABEL_PATTERN).fill(TEST_PASSWORD);
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();

            // Should redirect to main chat page
            await expect(page).toHaveURL("/", { timeout: 10_000 });

            // Should show chat interface
            await expect(page.getByRole("textbox")).toBeVisible();
        });

        test("remembers user session", async ({ page, context }) => {
            // Login
            await page.getByLabel(EMAIL_LABEL_PATTERN).fill(TEST_USER);
            await page.getByLabel(PASSWORD_LABEL_PATTERN).fill(TEST_PASSWORD);
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();
            await expect(page).toHaveURL("/");

            // Open new page in same context
            const newPage = await context.newPage();
            await newPage.goto("/");

            // Should still be logged in
            await expect(newPage.getByRole("textbox")).toBeVisible();
            await newPage.close();
        });

        test("redirects unauthenticated users to login", async ({ page }) => {
            // Clear any existing session by using a fresh context approach
            await page.context().clearCookies();
            await page.goto("/");
            await expect(page).toHaveURL(LOGIN_URL_PATTERN);
        });
    });

    test.describe("Register", () => {
        test.beforeEach(async ({ page }) => {
            await page.goto("/register");
        });

        test("displays register form correctly", async ({ page }) => {
            await expect(
                page.getByRole("heading", { name: SIGN_UP_HEADING_PATTERN })
            ).toBeVisible();
            await expect(page.getByLabel(EMAIL_LABEL_PATTERN)).toBeVisible();
            await expect(page.getByLabel(PASSWORD_LABEL_PATTERN)).toBeVisible();
            await expect(
                page.getByRole("button", { name: SIGN_UP_BUTTON_PATTERN })
            ).toBeVisible();
        });

        test("shows password requirements", async ({ page }) => {
            const passwordField = page.getByLabel(PASSWORD_LABEL_PATTERN);
            await passwordField.focus();
            await passwordField.fill("short");
            await passwordField.blur();

            // Should show password requirement message
            await expect(
                page.getByText(PASSWORD_REQUIREMENT_PATTERN)
            ).toBeVisible();
        });

        test("shows validation for invalid email format", async ({ page }) => {
            await page.getByLabel(EMAIL_LABEL_PATTERN).fill("invalid-email");
            await page
                .getByLabel(PASSWORD_LABEL_PATTERN)
                .fill("validpassword123");
            await page
                .getByRole("button", { name: SIGN_UP_BUTTON_PATTERN })
                .click();

            // Should show email validation error
            await expect(page.getByText(VALID_EMAIL_PATTERN)).toBeVisible();
        });
    });

    test.describe("Logout", () => {
        test("successfully logs out user", async ({ page }) => {
            // First login
            await page.goto("/login");
            await page.getByLabel(EMAIL_LABEL_PATTERN).fill(TEST_USER);
            await page.getByLabel(PASSWORD_LABEL_PATTERN).fill(TEST_PASSWORD);
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();
            await expect(page).toHaveURL("/");

            // Find and click logout
            await page.getByRole("button", { name: USER_MENU_PATTERN }).click();
            await page.getByRole("menuitem", { name: LOGOUT_PATTERN }).click();

            // Should redirect to login
            await expect(page).toHaveURL(LOGIN_URL_PATTERN);
        });

        test("clears session after logout", async ({ page, context }) => {
            // Login first
            await page.goto("/login");
            await page.getByLabel(EMAIL_LABEL_PATTERN).fill(TEST_USER);
            await page.getByLabel(PASSWORD_LABEL_PATTERN).fill(TEST_PASSWORD);
            await page
                .getByRole("button", { name: SIGN_IN_BUTTON_PATTERN })
                .click();
            await expect(page).toHaveURL("/");

            // Logout
            await page.getByRole("button", { name: USER_MENU_PATTERN }).click();
            await page.getByRole("menuitem", { name: LOGOUT_PATTERN }).click();
            await expect(page).toHaveURL(LOGIN_URL_PATTERN);

            // Try to access protected route in new page
            const newPage = await context.newPage();
            await newPage.goto("/");

            // Should redirect to login
            await expect(newPage).toHaveURL(LOGIN_URL_PATTERN);
            await newPage.close();
        });
    });
});
