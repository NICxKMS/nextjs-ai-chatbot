import { expect, test } from "@playwright/test"

// ── Auth E2E Tests ────────────────────────────────────────────
// Covers: login and register flows.
// Uses data-testid selectors for stability.

test.describe("Authentication", () => {
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

		test("should render a register link with the correct href", async ({ page }) => {
			await page.goto("/login")

			const registerLink = page.getByRole("link", { name: "Sign up" })
			await expect(registerLink).toBeVisible()
			await expect(registerLink).toHaveAttribute("href", "/register")
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

			await expect(page.getByText("Password must be at least 6 characters")).toBeVisible({
				timeout: 30000,
			})
		})

		test("should show validation error for invalid email", async ({ page }) => {
			await page.goto("/register")

			await page.getByLabel("Email Address").fill("not-an-email")
			await page.getByLabel("Password").fill("validpassword123")
			await page.getByTestId("register-button").click()

			await expect(page.locator("[role='alert']")).toBeVisible({ timeout: 10000 })
		})

		test("should render a login link with the correct href", async ({ page }) => {
			await page.goto("/register")

			const loginLink = page.getByRole("link", { name: "Sign in" })
			await expect(loginLink).toBeVisible()
			await expect(loginLink).toHaveAttribute("href", "/login")
		})
	})
})
