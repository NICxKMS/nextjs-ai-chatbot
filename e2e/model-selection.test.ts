/**
 * E2E tests for the model selector component.
 *
 * Verifies that users can view, search, and change the AI model
 * selection in the chat header.
 */

import { expect, test } from "./fixtures"
import { createMockSSEResponse } from "./helpers/mock-chat-stream"
import { ChatPage } from "./pages/chat"

// ── Tests ────────────────────────────────────────────────────

test.describe("Model selector", () => {
	test("model selector is visible on the chat page", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		await expect(chat.modelSelector).toBeVisible()
	})

	test("clicking model selector opens the dropdown with available models", async ({
		authenticatedPage,
	}) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		await chat.modelSelector.click()

		// The dropdown should show a search input and at least one model item
		const searchInput = authenticatedPage.getByPlaceholder("Search models…")
		await expect(searchInput).toBeVisible()

		// At least one model item should be listed (static models are always available)
		const modelItems = authenticatedPage.locator('[data-testid^="model-selector-item-"]')
		await expect(modelItems.first()).toBeVisible()

		const count = await modelItems.count()
		expect(count).toBeGreaterThanOrEqual(1)
	})

	test("selecting a different model updates the selector display", async ({
		authenticatedPage,
	}) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		// Read the initial model label
		const initialText = await chat.modelSelector.innerText()

		await chat.modelSelector.click()

		// Find a model item that is NOT the currently selected one and click it
		const modelItems = authenticatedPage.locator('[data-testid^="model-selector-item-"]')
		const count = await modelItems.count()

		// Pick the second item if available (to ensure it's different from current)
		const targetItem = count > 1 ? modelItems.nth(1) : modelItems.first()
		await targetItem.click()

		// The selector should now show a different model name (or at least re-render)
		// Wait for the dropdown to close
		await expect(authenticatedPage.getByPlaceholder("Search models…")).not.toBeVisible()

		const updatedText = await chat.modelSelector.innerText()
		// If there was more than one model, the text should have changed
		if (count > 1) {
			expect(updatedText).not.toBe(initialText)
		}
	})

	test("selected model is included in chat request", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		// Select a specific model if the dropdown has multiple options
		await chat.modelSelector.click()

		const modelItems = authenticatedPage.locator('[data-testid^="model-selector-item-"]')
		const firstItem = modelItems.first()
		await firstItem.click()

		// Wait for dropdown to close
		await expect(authenticatedPage.getByPlaceholder("Search models…")).not.toBeVisible()

		// Intercept the chat API to capture the request body, then mock the response
		// (we only need to verify the model ID was sent, not get a real AI response)
		let capturedModelId: string | undefined

		await authenticatedPage.route("**/api/chat", async (route) => {
			const request = route.request()
			const body = request.postDataJSON()
			capturedModelId = body?.selectedChatModel
			await route.fulfill(createMockSSEResponse(["Model test response."]))
		})

		await chat.sendMessageAndWaitForResponse("Hello")

		// Verify a model ID was sent in the request
		expect(capturedModelId).toBeDefined()
		expect(typeof capturedModelId).toBe("string")
		expect(capturedModelId?.length).toBeGreaterThan(0)
	})
})
