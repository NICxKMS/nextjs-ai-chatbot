/**
 * E2E tests for the sidebar navigation.
 *
 * Covers chat history, navigation, delete/rename actions,
 * user nav, and theme toggling.
 */

import { expect, test } from "./fixtures"
import { createChatInDB, getUserIdFromCookies } from "./helpers/supabase-admin"
import { ChatPage } from "./pages/chat"
import { SidebarPage } from "./pages/sidebar"

// ── Helpers ────────────────────────────────────────────────────

/** Create a chat by sending a message via the real API, then return the chat ID from the URL.
 *
 * Uses the REAL backend (no mocks) so that chat + message records are
 * persisted in the database. This is required because the sidebar
 * fetches chat history from the DB via SWR — mocked chats disappear
 * on revalidation.
 */
async function createChat(page: import("@playwright/test").Page, message: string): Promise<string> {
	const chat = new ChatPage(page)

	await chat.sendMessageAndWaitForResponse(message)

	// Wait for the URL to update with a chat ID
	await chat.expectChatIdInUrl()

	// Extract and return the chat ID from the URL
	const url = page.url()
	const chatId = url.split("/chat/")[1]
	if (!chatId) throw new Error("Could not extract chat ID from URL")

	return chatId
}

/** Create a chat directly in the database and navigate to it.
 *
 * Bypasses the AI API entirely — no model call, no streaming, no
 * risk of server AbortErrors. The chat appears in the sidebar after
 * page load because it's already in the DB.
 */
async function createChatViaDB(
	page: import("@playwright/test").Page,
	opts: { title: string; userMessage: string; assistantMessage?: string },
): Promise<string> {
	const userId = await getUserIdFromCookies(page.context())
	const chatId = crypto.randomUUID()

	await createChatInDB({
		chatId,
		userId,
		title: opts.title,
		userMessage: opts.userMessage,
		assistantMessage: opts.assistantMessage ?? `Response to: ${opts.userMessage}`,
	})

	return chatId
}

// ── Tests ──────────────────────────────────────────────────────

test.describe("Sidebar — Chat history", () => {
	test("sidebar shows chat history after creating chats", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)
		const chat = new ChatPage(authenticatedPage)

		await chat.goto()

		// Create a chat
		await createChat(authenticatedPage, "My first chat")

		// Wait for sidebar to reflect the new chat
		const assistantMsg = authenticatedPage.getByTestId("message-assistant")
		await expect(assistantMsg.first()).toBeVisible({ timeout: 15_000 })

		// Check sidebar has at least one history item
		const items = await sidebar.getChatItems()
		expect(items.length).toBeGreaterThanOrEqual(1)
	})

	test("navigate between chats via sidebar", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.goto()

		// Create first chat
		const firstChatId = await createChat(authenticatedPage, "Chat one")
		const assistantMsg = authenticatedPage.getByTestId("message-assistant")
		await expect(assistantMsg.first()).toBeVisible({ timeout: 15_000 })

		// Navigate to new chat and create second
		await authenticatedPage.goto("/")
		await authenticatedPage
			.getByTestId("multimodal-input")
			.waitFor({ state: "visible", timeout: 30_000 })
		await createChat(authenticatedPage, "Chat two")
		await expect(assistantMsg.first()).toBeVisible({ timeout: 15_000 })

		// Navigate to first chat via sidebar
		const firstChatLink = authenticatedPage.locator(`a[href="/chat/${firstChatId}"]`).first()
		await firstChatLink.click()

		await expect(authenticatedPage).toHaveURL(new RegExp(firstChatId), { timeout: 15_000 })
	})

	test("delete a chat from sidebar", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)
		const chat = new ChatPage(authenticatedPage)

		await chat.goto()

		// Create a chat
		const chatId = await createChat(authenticatedPage, "Chat to delete")
		const assistantMsg = authenticatedPage.getByTestId("message-assistant")
		await expect(assistantMsg.first()).toBeVisible({ timeout: 15_000 })

		// Verify the chat link exists in sidebar
		const chatLink = authenticatedPage.locator(`a[href="/chat/${chatId}"]`).first()
		await expect(chatLink).toBeVisible()

		// Delete via dropdown
		await sidebar.deleteChat(chatId)

		// Chat link should no longer be visible
		await expect(chatLink).not.toBeVisible({ timeout: 10_000 })
	})

	test("rename a chat from sidebar", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)

		// Create a chat directly in the DB to avoid AI API timeouts
		const chatId = await createChatViaDB(authenticatedPage, {
			title: "Original title chat",
			userMessage: "Original title chat",
		})

		// Navigate to the chat page — this triggers sidebar SWR to load the record
		await authenticatedPage.goto(`/chat/${chatId}`)
		await authenticatedPage
			.getByTestId("multimodal-input")
			.waitFor({ state: "visible", timeout: 30_000 })

		// Verify the chat appears in the sidebar before renaming
		const chatLink = authenticatedPage.locator(`a[href="/chat/${chatId}"]`).first()
		await expect(chatLink).toBeVisible({ timeout: 10_000 })

		// Rename the chat
		await sidebar.renameChat(chatId, "Renamed chat title")

		// The sidebar item should now show the new title
		await expect(chatLink).toContainText("Renamed chat title", { timeout: 10_000 })
	})
})

test.describe("Sidebar — Toggle", () => {
	test("sidebar toggle opens and closes", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)

		// The outer sidebar wrapper carries data-state="expanded" or "collapsed".
		// The inner [data-sidebar="sidebar"] div is always in the DOM (it uses
		// CSS off-screen positioning via group-data-[collapsible=offcanvas]),
		// so we assert on the data-state attribute instead of visibility.
		const sidebarWrapper = authenticatedPage.locator("[data-state]").filter({
			has: authenticatedPage.locator('[data-sidebar="sidebar"]'),
		})
		await expect(sidebarWrapper).toHaveAttribute("data-state", "expanded")

		// Toggle closed
		await sidebar.toggle()
		await expect(sidebarWrapper).toHaveAttribute("data-state", "collapsed", { timeout: 5_000 })

		// Toggle open again
		await sidebar.toggle()
		await expect(sidebarWrapper).toHaveAttribute("data-state", "expanded", { timeout: 5_000 })
	})
})

test.describe("Sidebar — User nav", () => {
	test("user nav button shows email", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)

		// The user email should be displayed in the sidebar footer
		const userEmail = sidebar.userEmail
		await expect(userEmail).toBeVisible()

		// Should contain an email-like string
		const emailText = await userEmail.innerText()
		expect(emailText).toContain("@")
	})

	test("theme toggle switches between dark and light mode", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)

		// Open user nav dropdown
		await sidebar.userNavButton.click()

		const themeItem = authenticatedPage.getByTestId("user-nav-item-theme")
		await expect(themeItem).toBeVisible()

		// Get the initial theme state from the html element
		const htmlElement = authenticatedPage.locator("html")
		const initialClass = await htmlElement.getAttribute("class")

		// Click theme toggle
		await themeItem.click()

		// The html class should change (dark ↔ light)
		await expect(htmlElement).not.toHaveClass(initialClass ?? "", { timeout: 5_000 })
	})
})

test.describe("Sidebar — Delete all chats", () => {
	test("delete all chats clears history", async ({ authenticatedPage }) => {
		const sidebar = new SidebarPage(authenticatedPage)

		// Create two chats directly in the DB to avoid AI API timeouts
		const chatIdA = await createChatViaDB(authenticatedPage, {
			title: "Chat A",
			userMessage: "Chat A",
		})
		await createChatViaDB(authenticatedPage, {
			title: "Chat B",
			userMessage: "Chat B",
		})

		// Navigate to one of the chats — triggers sidebar SWR load
		await authenticatedPage.goto(`/chat/${chatIdA}`)
		await authenticatedPage
			.getByTestId("multimodal-input")
			.waitFor({ state: "visible", timeout: 30_000 })

		// Verify we have chats in sidebar
		const itemsBefore = await sidebar.getChatItems()
		expect(itemsBefore.length).toBeGreaterThanOrEqual(2)

		// Click delete all chats button
		const deleteAllButton = authenticatedPage.getByTestId("delete-all-chats-button")
		await expect(deleteAllButton).toBeVisible()
		await deleteAllButton.click()

		// Confirm the deletion in the alert dialog
		const confirmButton = authenticatedPage.getByRole("button", { name: /delete all/i })
		await expect(confirmButton).toBeVisible()
		await confirmButton.click()

		// Wait for the redirect and verify empty state
		await expect(authenticatedPage).toHaveURL("/", { timeout: 15_000 })

		// Sidebar should have no chat items
		const itemsAfter = await sidebar.getChatItems()
		expect(itemsAfter).toHaveLength(0)
	})
})
