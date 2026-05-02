import { expect, type Page, test } from "@playwright/test"

const ASSISTANT_REPLY = "Batch 1 assistant output is visible."
const FAILED_REQUEST_MESSAGE = "Batch 1 forced chat failure"
const QUERY_MESSAGE = "Explain deterministic query entry"
const QUERY_REPLY = "Query entry response is visible."
const STREAMED_CHAT_TITLE = "Streamed browser title"
const REASONING_TEXT = "I should show my visible reasoning test content."
const TOOL_RESULT_TEXT = "Tool result rendered for coverage."

function sseBody(chunks: Array<Record<string, unknown>>) {
	return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n\n")}\n\ndata: [DONE]\n\n`
}

function assistantTextStream(text: string) {
	const textId = "batch-1-text"

	return sseBody([
		{ type: "start", messageId: "batch-1-assistant" },
		{ type: "start-step" },
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: text },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

function assistantTextStreamWithTitle(text: string, title: string) {
	const textId = "batch-1-title-text"

	return sseBody([
		{ type: "start", messageId: "batch-1-title-assistant" },
		{ type: "data-chat-title", data: title },
		{ type: "start-step" },
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: text },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

function assistantReasoningToolStream() {
	const reasoningId = "batch-1-reasoning"
	const textId = "batch-1-reasoning-text"
	const toolCallId = "batch-1-tool-call"

	return sseBody([
		{ type: "start", messageId: "batch-1-reasoning-assistant" },
		{ type: "start-step" },
		{ type: "reasoning-start", id: reasoningId },
		{ type: "reasoning-delta", id: reasoningId, delta: REASONING_TEXT },
		{ type: "reasoning-end", id: reasoningId },
		{
			type: "tool-input-available",
			toolCallId,
			toolName: "lookupCoverage",
			input: { topic: "chat" },
		},
		{
			type: "tool-output-available",
			toolCallId,
			output: TOOL_RESULT_TEXT,
		},
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: ASSISTANT_REPLY },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

async function mockChatStream(page: Page, body: string) {
	await page.route("**/api/chat", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "text/event-stream; charset=utf-8",
			body,
		})
	})
}

async function sendChatMessage(page: Page, message: string) {
	const input = page.getByRole("textbox", { name: "Send a message..." })
	await input.fill(message)
	await page.getByTestId("send-button").click()
}

function historyItem(page: Page, title: string) {
	return page
		.getByRole("navigation", { name: /chat history/i })
		.getByTestId("sidebar-history-item")
		.filter({ has: page.getByRole("link", { name: title }) })
		.first()
}

test.describe("chat shell", () => {
	test("new chat renders input, model selector, and settings entry", async ({ page }) => {
		await page.goto("/")
		await expect(page.getByRole("textbox", { name: "Send a message..." })).toBeVisible()
		await expect(page.getByTestId("model-selector").first()).toBeVisible()
		await expect(page.getByRole("button", { name: /settings/i })).toBeVisible()
	})

	test("q parameter variant submits a new chat and streams the response", async ({ page }) => {
		await mockChatStream(page, assistantTextStream(QUERY_REPLY))

		await page.goto(`/?q=${encodeURIComponent(QUERY_MESSAGE)}`)

		await expect(page.getByTestId("message-user")).toContainText(QUERY_MESSAGE)
		await expect(page.getByTestId("message-assistant")).toContainText(QUERY_REPLY)
		await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)
	})

	test("query parameter variant submits a new chat and streams the response", async ({
		page,
	}) => {
		await mockChatStream(page, assistantTextStream(QUERY_REPLY))

		await page.goto(`/?query=${encodeURIComponent(QUERY_MESSAGE)}`)

		await expect(page.getByTestId("message-user")).toContainText(QUERY_MESSAGE)
		await expect(page.getByTestId("message-assistant")).toContainText(QUERY_REPLY)
		await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)
	})

	test("streams mocked assistant output and replaces the new chat URL", async ({ page }) => {
		await mockChatStream(page, assistantTextStream(ASSISTANT_REPLY))

		await page.goto("/")
		await sendChatMessage(page, "show visible output")

		await expect(page.getByTestId("message-user")).toContainText("show visible output")
		await expect(page.getByTestId("message-assistant")).toContainText(ASSISTANT_REPLY)
		await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)
	})

	test("streams a chat title update into the sidebar history item", async ({ page }) => {
		await mockChatStream(
			page,
			assistantTextStreamWithTitle("Title update response is visible.", STREAMED_CHAT_TITLE),
		)

		await page.goto("/")
		await sendChatMessage(page, "temporary title before stream")

		await expect(page.getByTestId("message-assistant")).toContainText(
			"Title update response is visible.",
		)
		await expect(historyItem(page, STREAMED_CHAT_TITLE)).toBeVisible()
	})

	test("renders reasoning and generic tool parts from the streamed assistant message", async ({
		page,
	}) => {
		await mockChatStream(page, assistantReasoningToolStream())

		await page.goto("/")
		await sendChatMessage(page, "show reasoning and tool output")

		await page.getByTestId("message-reasoning").getByRole("button").click()
		await expect(page.getByText(REASONING_TEXT)).toBeVisible()
		await expect(page.getByRole("button", { name: /lookupCoverage/i })).toBeVisible()
		await expect(page.getByText(TOOL_RESULT_TEXT)).toBeVisible()
		await expect(page.getByTestId("message-assistant")).toContainText(ASSISTANT_REPLY)
	})

	test("guest assistant messages do not expose vote controls", async ({ page }) => {
		await mockChatStream(page, assistantTextStream(ASSISTANT_REPLY))

		await page.goto("/")
		await sendChatMessage(page, "guest vote controls should stay hidden")

		await expect(page.getByTestId("message-assistant")).toContainText(ASSISTANT_REPLY)
		await expect(page.getByTestId("vote-up")).toHaveCount(0)
		await expect(page.getByTestId("vote-down")).toHaveCount(0)
	})

	test("message actions copy text and expose user edit controls", async ({ page }) => {
		await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
		await mockChatStream(page, assistantTextStream(ASSISTANT_REPLY))

		await page.goto("/")
		await sendChatMessage(page, "copy and edit visible controls")

		const assistantMessage = page.getByTestId("message-assistant")
		await expect(assistantMessage).toContainText(ASSISTANT_REPLY)
		await page.getByRole("button", { name: "Copy" }).last().click()
		await expect(page.getByText("Copied to clipboard!")).toBeVisible()

		const userMessage = page.getByTestId("message-user")
		await userMessage.hover()
		await page.getByRole("button", { name: "Edit" }).click()
		await expect(page.getByTestId("message-editor")).toHaveValue(
			"copy and edit visible controls",
		)
		await page.getByRole("button", { name: "Cancel" }).click()
		await expect(page.getByTestId("message-editor")).toBeHidden()
	})

	test("shows stop control while a chat response is in progress", async ({ page }) => {
		let allowResponse!: () => void
		let markRequestStarted!: () => void
		const requestStarted = new Promise<void>((resolve) => {
			markRequestStarted = resolve
		})
		const responseAllowed = new Promise<void>((resolve) => {
			allowResponse = resolve
		})
		let routeCompleted: Promise<void> = Promise.resolve()

		await page.route("**/api/chat", async (route) => {
			markRequestStarted()
			routeCompleted = (async () => {
				await responseAllowed
				try {
					await route.fulfill({
						status: 200,
						contentType: "text/event-stream; charset=utf-8",
						body: assistantTextStream("This response was stopped."),
					})
				} catch {
					return
				}
			})()
			await routeCompleted
		})

		await page.goto("/")
		await sendChatMessage(page, "please keep responding")
		await requestStarted

		await expect(page.getByTestId("stop-button")).toBeVisible()
		await page.getByTestId("stop-button").click()
		await expect(page.getByTestId("send-button")).toBeVisible()
		await expect(page.getByTestId("stop-button")).toBeHidden()

		allowResponse()
		await routeCompleted
	})

	test("shows a toast when the chat request fails", async ({ page }) => {
		await page.route("**/api/chat", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "text/plain; charset=utf-8",
				body: FAILED_REQUEST_MESSAGE,
			})
		})

		await page.goto("/")
		await sendChatMessage(page, "force an error")

		await expect(page.getByTestId("message-user")).toContainText("force an error")
		await expect(page.getByText(FAILED_REQUEST_MESSAGE)).toBeVisible()
	})
})
