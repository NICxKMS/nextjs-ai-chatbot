/**
 * E2E tests for authentication flows.
 *
 * Covers guest sessions, registration, login, logout, and error states.
 *
 * Registration tests that directly test the browser signup flow are kept
 * as-is. Tests that only *need* a user to exist (login, logout, duplicate
 * email) use the Supabase Admin API to create users — bypassing signup
 * rate limits.
 */

import { expect, test } from "./fixtures"
import { generateTestEmail, generateTestPassword, submitWithRateLimitRetry } from "./helpers"
import { createUserViaAdmin } from "./helpers/supabase-admin"
import { AuthPage } from "./pages/auth"

test.describe("Auth — Guest session", () => {
	test("guest session auto-created on first visit", async ({ guestPage }) => {
		// Guest should land on the chat page without any redirect to /login
		await expect(guestPage).toHaveURL("/")

		// Chat input should be visible — guests can interact with the chat
		const chatInput = guestPage.getByTestId("multimodal-input")
		await expect(chatInput).toBeVisible()
	})

	test("guest user sees login link in user nav", async ({ guestPage }) => {
		const userNavButton = guestPage.getByTestId("user-nav-button")
		await expect(userNavButton).toBeVisible()
		await userNavButton.click()

		// Guest should see "Login to your account" instead of "Sign out"
		const authItem = guestPage.getByTestId("user-nav-item-auth")
		await expect(authItem).toContainText("Login")
	})
})

test.describe("Auth — Navigation", () => {
	test("navigate to /login shows login form", async ({ page }) => {
		await page.goto("/login")

		const form = page.getByTestId("auth-form")
		await expect(form).toBeVisible()

		const loginButton = page.getByTestId("login-button")
		await expect(loginButton).toBeVisible()
		await expect(loginButton).toContainText("Sign In")
	})

	test("navigate to /register shows register form", async ({ page }) => {
		await page.goto("/register")

		const form = page.getByTestId("auth-form")
		await expect(form).toBeVisible()

		const registerButton = page.getByTestId("register-button")
		await expect(registerButton).toBeVisible()
		await expect(registerButton).toContainText("Sign Up")
	})
})

test.describe("Auth — Registration", () => {
	test("register a new user and redirect to chat", async ({ page }) => {
		const auth = new AuthPage(page)
		const email = generateTestEmail()
		const password = generateTestPassword()

		await submitWithRateLimitRetry(page, () => auth.register(email, password), "/")

		// User email should appear in the sidebar user nav
		await auth.expectUserEmail(email)
	})

	test("register with existing email shows error", async ({ page }) => {
		const auth = new AuthPage(page)
		const email = generateTestEmail()
		const password = generateTestPassword()

		// Create user via Admin API (avoids rate limiting the signup endpoint)
		await createUserViaAdmin(email, password)

		// Try registering through the browser with the same email
		await auth.goto("register")
		await auth.fillEmail(email)
		await auth.fillPassword(password)
		await auth.submit()

		// Should show an error message
		await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
	})
})

test.describe("Auth — Login", () => {
	test("login with registered user redirects to chat", async ({ page }) => {
		const auth = new AuthPage(page)
		const email = generateTestEmail()
		const password = generateTestPassword()

		// Create user via Admin API (avoids rate limiting)
		await createUserViaAdmin(email, password)

		// Login with the created credentials — retries if rate limited
		await submitWithRateLimitRetry(page, () => auth.login(email, password), "/")

		// User email should be visible in sidebar
		await auth.expectUserEmail(email)
	})

	test("login with wrong password shows error", async ({ page }) => {
		const auth = new AuthPage(page)
		const email = generateTestEmail()
		const password = generateTestPassword()

		// Create user via Admin API (avoids rate limiting)
		await createUserViaAdmin(email, password)

		// Try logging in with wrong password
		await auth.login(email, "WrongP@ss999")

		// Should show an error
		await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
	})
})

test.describe("Auth — Logout", () => {
	test("logout redirects to /login", async ({ authenticatedPage }) => {
		const auth = new AuthPage(authenticatedPage)

		await auth.logout()

		// Use polling-based assertion — server action redirect is client-side
		await expect(authenticatedPage).toHaveURL("/login", { timeout: 15_000 })
	})
})
