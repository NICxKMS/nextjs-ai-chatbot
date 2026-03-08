/**
 * E2E tests for the inline message editing functionality.
 *
 * Tests the MessageEditor component that appears when a user
 * clicks the edit action on their own message. Verifies the
 * edit UI appears, content is preserved, submission works,
 * and cancellation restores the original message.
 */

import { expect, test } from "./fixtures"
import { createMockSSEResponse } from "./helpers/mock-chat-stream"
import { ChatPage } from "./pages/chat"

test.describe("Message editing", () => {
	/** Helper: send a message and wait for the mocked response to complete. */
	async function sendMockedMessage(page: import("@playwright/test").Page, chat: ChatPage) {
		await page.route("**/api/chat", (route) => {
			route.fulfill(createMockSSEResponse(["Mocked reply"]))
		})

		await chat.sendMessageAndWaitForResponse("Original message")
		await chat.expectChatIdInUrl()
	}

	test("user message shows edit button on hover", async ({ authenticatedPage: page }) => {
		const chat = new ChatPage(page)
		await sendMockedMessage(page, chat)

		// Hover over the user message to reveal the edit action
		const userMessage = page.getByTestId("message-user").last()
		await userMessage.hover()

		// The edit action is in MessageActions (sibling of message-user), so
		// go up to the parent wrapper to find the button.
		const editButton = userMessage.locator("xpath=..").getByRole("button", { name: "Edit" })
		await expect(editButton).toBeVisible()
	})

	test("clicking edit shows the message editor with original text", async ({
		authenticatedPage: page,
	}) => {
		const chat = new ChatPage(page)
		await sendMockedMessage(page, chat)

		// Hover and click edit (Edit is in sibling MessageActions, not inside message-user)
		const userMessage = page.getByTestId("message-user").last()
		await userMessage.hover()
		const editButton = userMessage.locator("xpath=..").getByRole("button", { name: "Edit" })
		await editButton.click()

		// The message editor textarea should appear with original text
		const editor = page.getByTestId("message-editor")
		await expect(editor).toBeVisible()
		await expect(editor).toHaveValue("Original message")
	})

	test("edit message and submit sends updated message", async ({ authenticatedPage: page }) => {
		const chat = new ChatPage(page)

		// Use real API so DB records exist — deleteTrailingMessages server action
		// needs a valid chat record. The initial mocked approach caused page crashes
		// when intercepting server actions with fake RSC payloads.
		await chat.sendMessageAndWaitForResponse("Original message")
		await chat.expectChatIdInUrl()

		// Enter edit mode (Edit is in sibling MessageActions, not inside message-user)
		const userMessage = page.getByTestId("message-user").last()
		await userMessage.hover()
		await userMessage.locator("xpath=..").getByRole("button", { name: "Edit" }).click()

		const editor = page.getByTestId("message-editor")
		await expect(editor).toBeVisible()

		// Clear and type new content
		await editor.fill("Updated message")

		// Click the send button to submit the edit
		await page.getByTestId("message-editor-send-button").click()

		// After edit submission, the editor should close and the user
		// message should display the updated text in the DOM.
		await expect(editor).not.toBeVisible({ timeout: 10_000 })

		// The user message should now show "Updated message"
		const updatedUserMsg = page.getByTestId("message-user").last()
		await expect(updatedUserMsg).toContainText("Updated message", { timeout: 15_000 })
	})

	test("cancel edit preserves the original message", async ({ authenticatedPage: page }) => {
		const chat = new ChatPage(page)
		await sendMockedMessage(page, chat)

		// Enter edit mode (Edit is in sibling MessageActions, not inside message-user)
		const userMessage = page.getByTestId("message-user").last()
		await userMessage.hover()
		await userMessage.locator("xpath=..").getByRole("button", { name: "Edit" }).click()

		const editor = page.getByTestId("message-editor")
		await expect(editor).toBeVisible()

		// Modify the text but then cancel
		await editor.fill("I changed my mind")

		// Click cancel button
		await page.getByRole("button", { name: "Cancel" }).click()

		// Editor should disappear
		await expect(editor).not.toBeVisible()

		// Original message text should still be displayed
		const messageContent = userMessage.getByTestId("message-content")
		await expect(messageContent).toContainText("Original message")
	})
})
