/**
 * E2E tests for the chat visibility selector.
 *
 * Tests the VisibilitySelector dropdown that allows chat owners to
 * toggle between "private" and "public" visibility.
 *
 * Uses the REAL backend (no mocks) so that chat + message records are
 * persisted in the database. The `updateChatVisibility` server action
 * verifies chat ownership and needs a real DB record to succeed.
 */

import { expect, test } from "./fixtures"
import { ChatPage } from "./pages/chat"

/**
 * Helper: send a message and then do a full page navigation to the
 * resulting /chat/[id] URL. This is critical because the AI SDK uses
 * pushState to change the URL, which causes Next.js to potentially
 * render both `/` and `/chat/[id]` page components (resulting in
 * duplicate elements like 2 visibility selectors). A full goto()
 * ensures only the /chat/[id] page component is rendered.
 */
async function createChatAndNavigate(page: import("@playwright/test").Page) {
	const chat = new ChatPage(page)
	await chat.sendMessageAndWaitForResponse("Hi there")
	await chat.expectChatIdInUrl()
	// Full navigation to the actual chat route
	const chatUrl = page.url()
	await page.goto(chatUrl)
	await page.getByTestId("multimodal-input").waitFor({ state: "visible", timeout: 30_000 })
}

test.describe("Visibility selector", () => {
	test("visibility selector is visible after sending a message", async ({
		authenticatedPage: page,
	}) => {
		await createChatAndNavigate(page)

		// The visibility selector is hidden on mobile (md:flex), so ensure
		// the viewport is wide enough — Desktop Chrome default is fine.
		const selector = page.getByTestId("visibility-selector")
		await expect(selector).toBeVisible()
	})

	test("default visibility is private", async ({ authenticatedPage: page }) => {
		await createChatAndNavigate(page)

		const selector = page.getByTestId("visibility-selector")
		await expect(selector).toBeVisible()

		// Open the dropdown and verify the "private" item is active
		await selector.click()
		const privateItem = page.getByTestId("visibility-selector-item-private")
		await expect(privateItem).toBeVisible()
		await expect(privateItem).toHaveAttribute("data-active", "true")

		const publicItem = page.getByTestId("visibility-selector-item-public")
		await expect(publicItem).toHaveAttribute("data-active", "false")
	})

	test("change visibility to public updates the selector", async ({
		authenticatedPage: page,
	}) => {
		await createChatAndNavigate(page)

		const selector = page.getByTestId("visibility-selector")

		// Wait for the selector to be enabled (not pending from navigation transition)
		await expect(selector).toBeEnabled({ timeout: 15_000 })
		await selector.click()

		// Select "public"
		const publicItem = page.getByTestId("visibility-selector-item-public")
		await publicItem.click()

		// Wait for the server action transition to complete (button re-enables)
		await expect(selector).toBeEnabled({ timeout: 15_000 })

		// Re-open to verify the active state changed
		await selector.click()
		await expect(page.getByTestId("visibility-selector-item-public")).toHaveAttribute(
			"data-active",
			"true",
			{ timeout: 10_000 },
		)
		await expect(page.getByTestId("visibility-selector-item-private")).toHaveAttribute(
			"data-active",
			"false",
		)
	})

	test("change visibility back to private updates the selector", async ({
		authenticatedPage: page,
	}) => {
		await createChatAndNavigate(page)

		const selector = page.getByTestId("visibility-selector")

		// Wait for the selector to be enabled
		await expect(selector).toBeEnabled({ timeout: 15_000 })

		// Switch to public first
		await selector.click()
		await page.getByTestId("visibility-selector-item-public").click()

		// Wait for the server action transition to complete
		await expect(selector).toBeEnabled({ timeout: 15_000 })

		// Switch back to private
		await selector.click()
		await page.getByTestId("visibility-selector-item-private").click()

		// Wait for the server action transition to complete
		await expect(selector).toBeEnabled({ timeout: 15_000 })

		// Verify private is active again
		await selector.click()
		await expect(page.getByTestId("visibility-selector-item-private")).toHaveAttribute(
			"data-active",
			"true",
			{ timeout: 10_000 },
		)
		await expect(page.getByTestId("visibility-selector-item-public")).toHaveAttribute(
			"data-active",
			"false",
		)
	})
})
