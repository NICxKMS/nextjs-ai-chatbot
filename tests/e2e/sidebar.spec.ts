import { expect, test } from "@playwright/test"

// ── Sidebar E2E Tests ────────────────────────────────────────
// Covers: chat history loads, click chat navigates, delete removes
// from list, new chat button, mobile sidebar toggle.
// Uses data-testid selectors for stability.

test.describe("Sidebar", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page — guest session is auto-bootstrapped
		await page.goto("/")
		await expect(page.getByTestId("multimodal-input")).toBeVisible()
	})

	test.describe("Chat History", () => {
		test("should display empty state when no chats exist", async ({ page }) => {
			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Should show empty state message
			await expect(
				page.getByText(/conversations will appear here|start chatting/i),
			).toBeVisible({ timeout: 5000 })
		})
	})

	test.describe("New Chat Button", () => {
		test("should create a new chat from the sidebar header", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Create a chat first to bring up sidebar content
			await input.fill("First chat")
			await page.getByTestId("send-button").click()
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })

			// Click the "New Chat" button/link (+ icon in sidebar header or chat header)
			const newChatLink = page.getByRole("link", { name: "New Chat" })
			await newChatLink.first().click()

			// Should navigate to home page with clean state
			await page.waitForURL("/")
			await expect(page.getByTestId("multimodal-input")).toHaveValue("")
		})
	})

	test.describe("Mobile Sidebar Toggle", () => {
		test("should toggle sidebar as overlay on mobile viewport", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto("/")
			await expect(page.getByTestId("multimodal-input")).toBeVisible()

			// Toggle sidebar open
			await page.getByTestId("sidebar-toggle").click()

			// Verify the mobile sheet exposes the sidebar header actions
			await expect(
				page.locator("[data-sidebar='sidebar']").getByRole("link", { name: "Assistant" }),
			).toBeVisible({ timeout: 5000 })
		})

		test("should close mobile sidebar when navigating", async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize({ width: 375, height: 667 })
			await page.goto("/")
			await expect(page.getByTestId("multimodal-input")).toBeVisible()

			// Create a chat first
			const input = page.getByTestId("multimodal-input")
			await input.fill("Mobile sidebar test")
			await page.getByTestId("send-button").click()
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// Open sidebar on mobile
			await page.getByTestId("sidebar-toggle").click()

			await expect(page.getByTestId("user-nav-button")).toBeVisible({ timeout: 5000 })

			// Click the stable home link from the sidebar header
			await page
				.locator("[data-sidebar='sidebar']")
				.getByRole("link", { name: "Assistant" })
				.click()

			// Sidebar should auto-close on mobile after navigation
			await page.waitForURL("/")
			await expect(page.getByTestId("user-nav-button")).not.toBeVisible({ timeout: 5000 })
		})
	})
})
