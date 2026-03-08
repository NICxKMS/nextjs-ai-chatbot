/**
 * E2E tests for the main chat interface.
 *
 * Uses mock SSE responses to test chat interactions without
 * hitting a real AI provider.
 */

import { expect, test } from "./fixtures"
import { createMockSSEResponse } from "./helpers/mock-chat-stream"
import { ChatPage } from "./pages/chat"

// ── Helpers ────────────────────────────────────────────────────

/** Set up the chat API mock and return a ChatPage instance. */
function setupChatMock(page: import("@playwright/test").Page, chunks: string[]) {
	return page.route("**/api/chat", (route) => {
		route.fulfill(createMockSSEResponse(chunks))
	})
}

// ── Tests ──────────────────────────────────────────────────────

test.describe("Chat — Empty state", () => {
	test("shows greeting on new chat", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		await chat.expectEmptyState()
		await expect(guestPage.getByTestId("greeting")).toBeVisible()
	})

	test("suggested actions visible on empty chat", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		await expect(chat.suggestedActions).toBeVisible()
	})

	test("send button disabled when input is empty", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		// Input should be empty, send button should be disabled
		await expect(chat.input).toBeVisible()
		await expect(chat.sendButton).toBeDisabled()
	})
})

test.describe("Chat — Sending messages", () => {
	test("type message and send — user message appears", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		// Mock the chat API to return a simple response
		await setupChatMock(guestPage, ["Hello", " from", " AI!"])

		await chat.sendMessage("Hello, world!")

		// User message should appear in the messages list
		const userMessages = guestPage.getByTestId("message-user")
		await expect(userMessages.first()).toBeVisible({ timeout: 10_000 })
	})

	test("mock AI response — assistant message appears", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		await setupChatMock(guestPage, ["Hello", " from", " AI!"])

		await chat.sendMessageAndWaitForResponse("Tell me something")

		// Verify the response content
		const content = await chat.getLastAssistantMessageContent()
		expect(content).toContain("Hello from AI!")
	})

	test("chat URL changes to /chat/[id] after first message", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		// Start on the root URL
		await expect(authenticatedPage).toHaveURL("/")

		await setupChatMock(authenticatedPage, ["Response text"])

		await chat.sendMessageAndWaitForResponse("Create a chat")

		// URL should update to include a chat ID
		await chat.expectChatIdInUrl()
	})

	test("multiple messages in conversation", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		// First exchange
		await setupChatMock(guestPage, ["First", " response"])
		await chat.sendMessageAndWaitForResponse("First message")

		// Second exchange — re-mock the route for a different response
		await guestPage.unrouteAll({ behavior: "ignoreErrors" })
		await setupChatMock(guestPage, ["Second", " response"])
		await chat.sendMessageAndWaitForResponse("Second message")

		// Should now have 2 user and 2 assistant messages
		const { userMessages, assistantMessages } = await chat.getMessages()
		expect(userMessages.length).toBeGreaterThanOrEqual(2)
		expect(assistantMessages.length).toBeGreaterThanOrEqual(2)
	})
})

test.describe("Chat — Navigation", () => {
	test("new chat button creates new empty chat", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)
		await chat.goto()

		// Send a message to create a chat session
		await setupChatMock(authenticatedPage, ["Some response"])
		await chat.sendMessageAndWaitForResponse("Start a chat")
		await chat.expectChatIdInUrl()

		// Click the new chat button in the header
		const newChatButton = authenticatedPage.getByTestId("new-chat-button")
		await expect(newChatButton).toBeVisible()
		await newChatButton.click()

		// Should navigate back to root
		await expect(authenticatedPage).toHaveURL("/", { timeout: 15_000 })

		// Reload to bypass App Router client cache — soft navigation in dev
		// mode may briefly keep stale page content from the previous chat.
		await authenticatedPage.reload()
		await chat.input.waitFor({ state: "visible", timeout: 30_000 })

		// Verify the empty state rendered — suggested actions are only shown
		// when messages.length === 0.
		const suggestedActions = authenticatedPage.getByTestId("suggested-actions")
		await expect(suggestedActions).toBeVisible({ timeout: 15_000 })
	})

	test("chat header is visible", async ({ guestPage }) => {
		const chat = new ChatPage(guestPage)
		await chat.goto()

		const header = guestPage.getByTestId("chat-header")
		await expect(header).toBeVisible()
	})
})
