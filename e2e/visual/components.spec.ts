import { expect, test } from "@playwright/test"

/**
 * Visual Regression Tests for UI Components
 * Uses Playwright's toHaveScreenshot() API for screenshot comparison
 *
 * Run with: pnpm test:e2e -- --grep "Visual"
 * Update snapshots: pnpm test:e2e -- --grep "Visual" -- --update-snapshots
 */

// Configure visual test settings
test.use({
	// Set consistent viewport for all visual tests
	viewport: { width: 1280, height: 720 },
	// Ensure consistent rendering
	hasTouch: false,
	isMobile: false,
})

test.describe("Visual Regression Tests", () => {
	test.describe("Chat Interface", () => {
		test("should match empty chat state snapshot", async ({ page }) => {
			await page.goto("/")

			// Wait for page to be fully loaded
			await page.waitForLoadState("networkidle")

			// Wait for chat interface to be visible
			await expect(page.locator("textarea").first()).toBeVisible({
				timeout: 10000,
			})

			// Take screenshot of empty chat state
			const chatContainer = page
				.locator('[class*="chat"], main, [role="main"]')
				.first()
			await expect(chatContainer).toHaveScreenshot(
				"chat-empty-state.png",
				{
					maxDiffPixels: 100,
					threshold: 0.001,
				},
			)
		})

		test("should match chat with user message snapshot", async ({
			page,
		}) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Send a message
			const input = page.locator("textarea").first()
			await input.fill("Hello, this is a test message for visual testing")
			await input.press("Enter")

			// Wait for message to appear
			await page.waitForTimeout(2000)

			// Take screenshot of chat with message
			const chatContainer = page
				.locator('[class*="chat"], main, [role="main"]')
				.first()
			await expect(chatContainer).toHaveScreenshot(
				"chat-with-message.png",
				{
					maxDiffPixels: 100,
					threshold: 0.001,
				},
			)
		})

		test("should match chat input focus state snapshot", async ({
			page,
		}) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Focus the input
			const input = page.locator("textarea").first()
			await input.focus()

			// Take screenshot of focused input
			const inputContainer = page
				.locator('[class*="input"], [class*="prompt"]')
				.first()
			await expect(inputContainer).toHaveScreenshot(
				"chat-input-focused.png",
				{
					maxDiffPixels: 100,
					threshold: 0.001,
				},
			)
		})
	})

	test.describe("Auth Forms", () => {
		test("should match login form snapshot", async ({ page }) => {
			await page.goto("/login")
			await page.waitForLoadState("networkidle")

			// Wait for form to be visible
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible({ timeout: 10000 })

			// Take screenshot of login form
			const loginForm = page.locator('form, [class*="auth"]').first()
			await expect(loginForm).toHaveScreenshot("login-form.png", {
				maxDiffPixels: 100,
				threshold: 0.001,
			})
		})

		test("should match register form snapshot", async ({ page }) => {
			await page.goto("/register")
			await page.waitForLoadState("networkidle")

			// Wait for form to be visible
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible({ timeout: 10000 })

			// Take screenshot of register form
			const registerForm = page.locator('form, [class*="auth"]').first()
			await expect(registerForm).toHaveScreenshot("register-form.png", {
				maxDiffPixels: 100,
				threshold: 0.001,
			})
		})

		test("should match login form with error state snapshot", async ({
			page,
		}) => {
			await page.goto("/login")
			await page.waitForLoadState("networkidle")

			// Fill in invalid credentials
			await page
				.locator('input[type="email"]')
				.first()
				.fill("invalid-email")
			await page.locator('input[type="password"]').first().fill("pass")
			await page
				.getByRole("button", { name: /sign in|login/i })
				.first()
				.click()

			// Wait for error to appear
			await page.waitForTimeout(1000)

			// Take screenshot of form with error
			const loginForm = page.locator('form, [class*="auth"]').first()
			await expect(loginForm).toHaveScreenshot("login-form-error.png", {
				maxDiffPixels: 100,
				threshold: 0.001,
			})
		})
	})

	test.describe("Sidebar", () => {
		test("should match expanded sidebar snapshot", async ({ page }) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Open sidebar if collapsed
			const toggleButton = page
				.locator(
					'button[aria-label*="sidebar"], button[aria-label*="menu"]',
				)
				.first()

			if (await toggleButton.isVisible()) {
				await toggleButton.click()
				await page.waitForTimeout(500)
			}

			// Take screenshot of expanded sidebar
			const sidebar = page
				.locator('[class*="sidebar"], nav[class*="sidebar"]')
				.first()

			if (await sidebar.isVisible()) {
				await expect(sidebar).toHaveScreenshot("sidebar-expanded.png", {
					maxDiffPixels: 100,
					threshold: 0.001,
				})
			}
		})

		test("should match collapsed sidebar snapshot on mobile", async ({
			page,
		}) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Take screenshot of mobile view
			await expect(page).toHaveScreenshot("mobile-view-collapsed.png", {
				maxDiffPixels: 100,
				threshold: 0.001,
				fullPage: false,
			})
		})
	})

	test.describe("Artifact Panel", () => {
		test("should match text artifact snapshot", async ({ page }) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Request a text artifact
			const input = page.locator("textarea").first()
			await input.fill(
				"Create a text document about artificial intelligence",
			)
			await input.press("Enter")

			// Wait for response
			await page.waitForTimeout(5000)

			// Look for artifact trigger
			const artifactTrigger = page
				.locator(
					'[class*="artifact-trigger"], button:has-text("document"), [data-testid="artifact-trigger"]',
				)
				.first()

			if (
				await artifactTrigger
					.isVisible({ timeout: 10000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()
				await page.waitForTimeout(1000)

				// Take screenshot of artifact panel
				const artifactPanel = page
					.locator(
						'[class*="artifact-panel"], [data-testid="artifact-panel"], [role="dialog"]',
					)
					.first()

				if (await artifactPanel.isVisible()) {
					await expect(artifactPanel).toHaveScreenshot(
						"artifact-text-panel.png",
						{
							maxDiffPixels: 100,
							threshold: 0.001,
						},
					)
				}
			}
		})

		test("should match code artifact snapshot", async ({ page }) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Request code generation
			const input = page.locator("textarea").first()
			await input.fill(
				"Write a Python function to calculate fibonacci numbers",
			)
			await input.press("Enter")

			// Wait for response
			await page.waitForTimeout(5000)

			// Look for code block or artifact
			const codeBlock = page.locator("pre, code, [class*='code']").first()

			if (
				await codeBlock.isVisible({ timeout: 10000 }).catch(() => false)
			) {
				// Take screenshot of code block
				await expect(codeBlock).toHaveScreenshot("code-block.png", {
					maxDiffPixels: 100,
					threshold: 0.001,
				})
			}
		})
	})

	test.describe("Full Page Snapshots", () => {
		test("should match full login page snapshot", async ({ page }) => {
			await page.goto("/login")
			await page.waitForLoadState("networkidle")

			// Wait for form to be visible
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible({ timeout: 10000 })

			// Take full page screenshot
			await expect(page).toHaveScreenshot("full-page-login.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: true,
			})
		})

		test("should match full register page snapshot", async ({ page }) => {
			await page.goto("/register")
			await page.waitForLoadState("networkidle")

			// Wait for form to be visible
			await expect(
				page.locator('input[type="email"]').first(),
			).toBeVisible({ timeout: 10000 })

			// Take full page screenshot
			await expect(page).toHaveScreenshot("full-page-register.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: true,
			})
		})

		test("should match full chat page snapshot", async ({ page }) => {
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Wait for chat interface to be visible
			await expect(page.locator("textarea").first()).toBeVisible({
				timeout: 10000,
			})

			// Take full page screenshot
			await expect(page).toHaveScreenshot("full-page-chat.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: true,
			})
		})
	})

	test.describe("Responsive Design", () => {
		test("should match tablet viewport snapshot", async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize({ width: 768, height: 1024 })
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Wait for chat interface
			await expect(page.locator("textarea").first()).toBeVisible({
				timeout: 10000,
			})

			// Take screenshot
			await expect(page).toHaveScreenshot("tablet-view.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: false,
			})
		})

		test("should match mobile viewport snapshot", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Wait for chat interface
			await expect(page.locator("textarea").first()).toBeVisible({
				timeout: 10000,
			})

			// Take screenshot
			await expect(page).toHaveScreenshot("mobile-view.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: false,
			})
		})

		test("should match desktop viewport snapshot", async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize({ width: 1920, height: 1080 })
			await page.goto("/")
			await page.waitForLoadState("networkidle")

			// Wait for chat interface
			await expect(page.locator("textarea").first()).toBeVisible({
				timeout: 10000,
			})

			// Take screenshot
			await expect(page).toHaveScreenshot("desktop-view.png", {
				maxDiffPixels: 200,
				threshold: 0.001,
				fullPage: false,
			})
		})
	})
})
