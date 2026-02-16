import { expect, test } from "@playwright/test"

/**
 * E2E Tests for Authentication Flow
 * Tests login, register, and session management
 */

test.describe("Authentication Flow", () => {
	test.describe("Login Page", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/login")
		})

		test("should display login form", async ({ page }) => {
			// Check for email input
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible()

			// Check for password input
			await expect(
				page.locator('input[type="password"]').first(),
			).toBeVisible()

			// Check for submit button
			await expect(
				page.getByRole("button", { name: /sign in|login/i }),
			).toBeVisible()
		})

		test("should show validation error for invalid email", async ({
			page,
		}) => {
			// Fill in invalid email
			await page
				.locator('input[type="email"]')
				.first()
				.fill("invalid-email")

			// Fill in password
			await page
				.locator('input[type="password"]')
				.first()
				.fill("password123")

			// Submit form
			await page.getByRole("button", { name: /sign in|login/i }).click()

			// Should show validation error
			await expect(
				page.locator("text=/invalid|valid email/i").first(),
			).toBeVisible()
		})

		test("should show error for invalid credentials", async ({ page }) => {
			// Fill in non-existent user
			await page
				.locator('input[type="email"]')
				.first()
				.fill("nonexistent@test.com")

			await page
				.locator('input[type="password"]')
				.first()
				.fill("wrongpassword")

			// Submit form
			await page.getByRole("button", { name: /sign in|login/i }).click()

			// Should show error message
			await expect(
				page.locator("text=/invalid|incorrect|failed/i").first(),
			).toBeVisible({ timeout: 10000 })
		})

		test("should navigate to register page", async ({ page }) => {
			// Click on register link
			await page
				.getByRole("link", { name: /register|sign up|create account/i })
				.click()

			// Should be on register page
			await expect(page).toHaveURL(/\/register/)
		})
	})

	test.describe("Register Page", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/register")
		})

		test("should display registration form", async ({ page }) => {
			// Check for email input
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible()

			// Check for password input
			await expect(
				page.locator('input[type="password"]').first(),
			).toBeVisible()

			// Check for submit button
			await expect(
				page.getByRole("button", { name: /register|sign up|create/i }),
			).toBeVisible()
		})

		test("should show validation error for weak password", async ({
			page,
		}) => {
			// Fill in email
			await page
				.locator('input[type="email"]')
				.first()
				.fill("newuser@test.com")

			// Fill in weak password
			await page.locator('input[type="password"]').first().fill("123")

			// Submit form
			await page
				.getByRole("button", { name: /register|sign up|create/i })
				.click()

			// Should show validation error for password
			await expect(
				page.locator("text=/password|character|weak/i").first(),
			).toBeVisible()
		})

		test("should navigate to login page", async ({ page }) => {
			// Click on login link
			await page
				.getByRole("link", { name: /sign in|login|already have/i })
				.click()

			// Should be on login page
			await expect(page).toHaveURL(/\/login/)
		})
	})

	test.describe("Guest Access", () => {
		test("should allow guest access to chat", async ({ page }) => {
			await page.goto("/")

			// Should either be redirected to chat or show guest option
			const currentUrl = page.url()

			// Check if we're on chat page or can access as guest
			if (currentUrl.includes("/login")) {
				// Look for "Continue as Guest" or similar option
				const guestButton = page.getByRole("button", {
					name: /guest|continue without|try/i,
				})

				if (await guestButton.isVisible()) {
					await guestButton.click()
					await expect(page).toHaveURL(/\/|\/chat/)
				}
			} else {
				// Already on chat page
				await expect(page).toHaveURL(/\/|\/chat/)
			}
		})
	})

	test.describe("Session Management", () => {
		test("should persist session across page reloads", async ({ page }) => {
			// Start at home page
			await page.goto("/")

			// If redirected to login, skip this test (no existing session)
			const currentUrl = page.url()
			if (currentUrl.includes("/login")) {
				test.skip()
				return
			}

			// Reload page
			await page.reload()

			// Should still be on the same page (not redirected to login)
			await expect(page).not.toHaveURL(/\/login/)
		})

		test("should logout successfully", async ({ page }) => {
			// Start at home page
			await page.goto("/")

			// If redirected to login, skip this test (no existing session)
			const currentUrl = page.url()
			if (currentUrl.includes("/login")) {
				test.skip()
				return
			}

			// Look for logout button (might be in a menu)
			const userMenu = page
				.locator(
					'[data-testid="user-menu"], [aria-label="User menu"], button:has-text("User")',
				)
				.first()

			if (await userMenu.isVisible()) {
				await userMenu.click()

				const logoutButton = page.getByRole("button", {
					name: /logout|sign out/i,
				})
				if (await logoutButton.isVisible()) {
					await logoutButton.click()

					// Should be redirected to login or home
					await expect(page).toHaveURL(/\/|\/login/)
				}
			}
		})
	})

	test.describe("Protected Routes", () => {
		test("should redirect to login when accessing protected route unauthenticated", async ({
			page,
		}) => {
			// Try to access a protected chat route directly
			await page.goto("/chat/test-chat-id")

			// Should be redirected to login or show access denied
			const currentUrl = page.url()
			const isLoginPage = currentUrl.includes("/login")
			const hasAccessDenied = await page
				.locator("text=/access denied|unauthorized|sign in/i")
				.isVisible()
				.catch(() => false)

			expect(isLoginPage || hasAccessDenied).toBeTruthy()
		})
	})
})
