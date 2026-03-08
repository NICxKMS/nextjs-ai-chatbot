/**
 * ChatPage — Page Object Model for the main chat interface.
 *
 * Encapsulates interaction with the chat input, message list, and
 * streaming responses using existing `data-testid` attributes.
 */

import { expect, type Page } from "@playwright/test"

const CHAT_ID_REGEX =
	/^http:\/\/localhost:3000\/chat\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export class ChatPage {
	constructor(private page: Page) {}

	// ── Locators ────────────────────────────────────────────

	/** The multimodal text input field. */
	get input() {
		return this.page.getByTestId("multimodal-input")
	}

	/** The send button (visible when not generating). */
	get sendButton() {
		return this.page.getByTestId("send-button")
	}

	/** The stop button (visible during generation). */
	get stopButton() {
		return this.page.getByTestId("stop-button")
	}

	/** The messages list container. */
	get messagesList() {
		return this.page.getByTestId("messages-list")
	}

	/** The empty state (no messages yet). */
	get messagesEmpty() {
		return this.page.getByTestId("messages-empty")
	}

	/** The suggested actions container. */
	get suggestedActions() {
		return this.page.getByTestId("suggested-actions")
	}

	/** The model selector trigger. */
	get modelSelector() {
		return this.page.getByTestId("chat-header").getByTestId("model-selector")
	}

	// ── Navigation ──────────────────────────────────────────

	/** Navigate to the chat page. Optionally provide a specific chat ID. */
	async goto(chatId?: string) {
		const url = chatId ? `/chat/${chatId}` : "/"
		await this.page.goto(url)
	}

	// ── Actions ─────────────────────────────────────────────

	/** Type and send a message in the chat input. */
	async sendMessage(text: string) {
		await this.input.click()
		await this.input.fill(text)
		await this.sendButton.click()
	}

	/**
	 * Send a message and wait for the assistant response in one atomic operation.
	 *
	 * Sets up the response listener BEFORE clicking send to avoid the race
	 * condition where instant mock fulfillment completes before
	 * `page.waitForResponse()` starts listening.
	 */
	async sendMessageAndWaitForResponse(text: string) {
		await this.input.click()
		await this.input.fill(text)

		// Wait for React to process the controlled input change and enable the button
		await expect(this.sendButton).toBeEnabled({ timeout: 5_000 })

		// Set up the response listener BEFORE the action that triggers the request
		const responsePromise = this.page.waitForResponse(
			(res) => res.url().includes("/api/chat"),
			{ timeout: 60_000 },
		)

		await this.sendButton.click()

		const response = await responsePromise
		// response.finished() may throw AbortError on server-side stream
		// interruption — ignore it so subsequent assertions can still run.
		try {
			await response.finished()
		} catch {
			// Server-side abort (e.g., AbortError) — stream was cut short
			// but the chat was still created. Continue.
		}

		// Wait for the assistant message to be rendered in the DOM
		await expect(this.page.getByTestId("message-assistant").last()).toBeVisible({
			timeout: 30_000,
		})
	}

	/**
	 * Wait for the assistant response to complete.
	 *
	 * **Important:** Prefer `sendMessageAndWaitForResponse()` when sending
	 * a new message, as it avoids the race between click and response listener.
	 * Use this standalone method only for edit/resubmit flows where the
	 * response listener must be set up before a different click action.
	 *
	 * @returns A promise that resolves when the response is complete and visible.
	 */
	async waitForResponse() {
		// Wait for the assistant message to appear and remain visible
		await expect(this.page.getByTestId("message-assistant").last()).toBeVisible({
			timeout: 30_000,
		})
	}

	/**
	 * Set up a response listener for `/api/chat` BEFORE triggering an action.
	 * Returns a promise that resolves when the response finishes.
	 *
	 * Use this for edit/resubmit flows:
	 * ```ts
	 * const done = chat.expectChatResponse();
	 * await submitButton.click();
	 * await done;
	 * ```
	 */
	expectChatResponse() {
		const responsePromise = this.page.waitForResponse(
			(res) => res.url().includes("/api/chat"),
			{ timeout: 30_000 },
		)
		return responsePromise.then(async (res) => {
			await res.finished()
			await expect(this.page.getByTestId("message-assistant").last()).toBeVisible({
				timeout: 10_000,
			})
		})
	}

	/** Get all message elements grouped by role. */
	async getMessages() {
		const userMessages = await this.page.getByTestId("message-user").all()
		const assistantMessages = await this.page.getByTestId("message-assistant").all()
		return { userMessages, assistantMessages }
	}

	/** Get text content of the last assistant message. */
	async getLastAssistantMessageContent(): Promise<string | null> {
		const messages = await this.page.getByTestId("message-assistant").all()
		const last = messages.at(-1)
		if (!last) return null

		const content = last.getByTestId("message-content")
		return content.innerText()
	}

	// ── Assertions ──────────────────────────────────────────

	/** Assert the URL matches a chat ID pattern. */
	async expectChatIdInUrl() {
		await expect(this.page).toHaveURL(CHAT_ID_REGEX)
	}

	/** Assert the assistant loading indicator is visible. */
	async expectAssistantLoading() {
		await expect(this.page.getByTestId("message-assistant-loading")).toBeVisible()
	}

	/** Assert the empty state is visible. */
	async expectEmptyState() {
		// Generous timeout: client-side navigation shows loading.tsx skeleton
		// while the RSC payload streams in. The empty state only appears after
		// the page component resolves and ChatShell mounts with no messages.
		// Wait for multimodal-input first to confirm the page has loaded past
		// the skeleton, then check for empty state.
		await this.input.waitFor({ state: "visible", timeout: 30_000 })
		await expect(this.messagesEmpty).toBeVisible({ timeout: 15_000 })
	}
}
