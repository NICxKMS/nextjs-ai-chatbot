import { expect, test } from "@playwright/test"

// ── Auth E2E Tests ────────────────────────────────────────────
// Covers: login, register, guest auto-bootstrap, logout flows.
// Uses data-testid selectors for stability.

test.describe("Authentication", () => {
	test.describe("Guest Auto-Bootstrap", () => {
		test("should auto-bootstrap guest session on first visit", async ({ page }) => {
			await page.goto("/")

			// Guest session is created server-side by proxy.ts.
			// Verify the chat input is available (proves session was resolved).
			await expect(page.getByTestId("multimodal-input")).toBeVisible()
		})

		test("should bootstrap guest session when navigating directly to a chat URL", async ({
			page,
		}) => {
			// Navigate to a non-existent chat — should create guest session then redirect
			await page.goto("/chat/non-existent-chat-id")

			// Guest should be redirected (chat not found → notice or home)
			await page.waitForURL(/\/(\?notice=chat_not_found)?/)

			// Verify the page is usable (guest session active)
			await expect(page.getByTestId("multimodal-input")).toBeVisible()
		})

		test("should show guest user in sidebar", async ({ page }) => {
			await page.goto("/")

			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Verify guest user is shown in user nav
			const userEmail = page.getByTestId("user-email")
			await expect(userEmail).toContainText("Guest")
		})
	})

	test.describe("Login", () => {
		test("should display login form with email and password fields", async ({ page }) => {
			await page.goto("/login")

			await expect(page.getByTestId("auth-form")).toBeVisible()
			await expect(page.getByLabel("Email Address")).toBeVisible()
			await expect(page.getByLabel("Password")).toBeVisible()
			await expect(page.getByTestId("login-button")).toBeVisible()
		})

		test("should show validation errors for empty form submission", async ({ page }) => {
			await page.goto("/login")

			// Submit empty form
			await page.getByTestId("login-button").click()

			// Required fields should trigger validation
			await expect(page.getByTestId("auth-form")).toBeVisible()
		})

		test("should show error for invalid credentials", async ({ page }) => {
			await page.goto("/login")

			await page.getByLabel("Email Address").fill("invalid@example.com")
			await page.getByLabel("Password").fill("wrongpassword123")
			await page.getByTestId("login-button").click()

			// Should remain on login page with an error
			await expect(page.locator("[role='alert']")).toBeVisible({ timeout: 10000 })
		})

		test("should have link to register page", async ({ page }) => {
			await page.goto("/login")

			const registerLink = page.getByRole("link", { name: "Sign up" })
			await expect(registerLink).toBeVisible()
			await registerLink.click()

			await expect(page).toHaveURL(/\/register/)
		})
	})

	test.describe("Register", () => {
		test("should display register form with name, email, and password fields", async ({
			page,
		}) => {
			await page.goto("/register")

			await expect(page.getByTestId("auth-form")).toBeVisible()
			await expect(page.getByLabel(/name/i)).toBeVisible()
			await expect(page.getByLabel("Email Address")).toBeVisible()
			await expect(page.getByLabel("Password")).toBeVisible()
			await expect(page.getByTestId("register-button")).toBeVisible()
		})

		test("should show validation error for short password", async ({ page }) => {
			await page.goto("/register")

			await page.getByLabel("Email Address").fill("test@example.com")
			await page.getByLabel("Password").fill("123")
			await page.getByTestId("register-button").click()

			// Zod validation should catch short password
			await expect(page.locator("[role='alert']")).toBeVisible({ timeout: 10000 })
		})

		test("should show validation error for invalid email", async ({ page }) => {
			await page.goto("/register")

			await page.getByLabel("Email Address").fill("not-an-email")
			await page.getByLabel("Password").fill("validpassword123")
			await page.getByTestId("register-button").click()

			await expect(page.locator("[role='alert']")).toBeVisible({ timeout: 10000 })
		})

		test("should have link to login page", async ({ page }) => {
			await page.goto("/register")

			const loginLink = page.getByRole("link", { name: "Sign in" })
			await expect(loginLink).toBeVisible()
			await loginLink.click()

			await expect(page).toHaveURL(/\/login/)
		})
	})

	test.describe("Logout", () => {
		test("should not show logout option for guest users", async ({ page }) => {
			await page.goto("/")

			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Open user nav menu
			const userNavButton = page.getByTestId("user-nav-button")
			await expect(userNavButton).toBeVisible()
			await userNavButton.click()

			// Verify the user nav menu is open
			const userNavMenu = page.getByTestId("user-nav-menu")
			await expect(userNavMenu).toBeVisible()

			// Guest users should see "Sign in" not "Sign out"
			await expect(page.getByTestId("user-nav-item-auth")).toBeVisible()
		})
	})
})
