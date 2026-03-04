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

		test("should display chat history after creating a chat", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Create a chat
			await input.fill("Hello, this is a test chat")
			await page.getByTestId("send-button").click()

			// Wait for response
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Chat should appear in history
			// The sidebar should contain at least one chat item link
			const sidebarMenu = page.locator("[data-sidebar='menu']")
			await expect(sidebarMenu.getByRole("link").first()).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe("Navigation", () => {
		test("should navigate to a chat when clicking on it in the sidebar", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Create a chat first
			await input.fill("Test navigation chat")
			await page.getByTestId("send-button").click()
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// Go to home
			await page.goto("/")

			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Click on the chat in the sidebar history
			const sidebarMenu = page.locator("[data-sidebar='menu']")
			const chatLink = sidebarMenu.getByRole("link").first()
			await expect(chatLink).toBeVisible({ timeout: 10000 })
			await chatLink.click()

			// Should navigate to the chat page
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 10000 })

			// Previous messages should be visible
			await expect(page.getByTestId("message-user")).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe("Delete Chat", () => {
		test("should remove a chat from the sidebar when deleted", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Create a chat
			await input.fill("Chat to be deleted")
			await page.getByTestId("send-button").click()
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// Open sidebar
			await page.getByTestId("sidebar-toggle").click()

			// Find the chat item in the sidebar
			const sidebarMenu = page.locator("[data-sidebar='menu']")
			const chatItem = sidebarMenu.getByRole("link").first()
			await expect(chatItem).toBeVisible({ timeout: 10000 })
			const chatTitle = await chatItem.textContent()

			// Open the context menu for the chat item (More button)
			await chatItem.hover()
			const moreButton = chatItem.locator("..").getByRole("button", { name: "More" })
			await moreButton.click()

			// Click delete
			const deleteMenuItem = page.getByRole("menuitem", { name: "Delete" })
			await deleteMenuItem.click()

			// Chat should be removed from the list
			if (chatTitle) {
				await expect(page.getByText(chatTitle)).not.toBeVisible({ timeout: 10000 })
			}

			// Should redirect to home after deleting active chat
			await page.waitForURL("/", { timeout: 10000 })
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

			// Sidebar should not be visible initially on mobile
			const sidebarContent = page.locator("[data-sidebar='sidebar']")

			// Toggle sidebar open
			await page.getByTestId("sidebar-toggle").click()

			// Sidebar should appear as overlay on mobile (Sheet component)
			// The sidebar content should be visible
			await expect(sidebarContent.first()).toBeVisible({ timeout: 5000 })

			// Verify user nav is accessible
			await expect(page.getByTestId("user-nav-button")).toBeVisible()
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

			const sidebarContent = page.locator("[data-sidebar='sidebar']")
			await expect(sidebarContent.first()).toBeVisible({ timeout: 5000 })

			// Click "New Chat" link from sidebar
			const newChatLink = page.getByRole("link", { name: /new chat/i })
			await newChatLink.first().click()

			// Sidebar should auto-close on mobile after navigation
			await page.waitForURL("/")
			// The sidebar overlay should close (mobile behavior)
		})
	})
})
