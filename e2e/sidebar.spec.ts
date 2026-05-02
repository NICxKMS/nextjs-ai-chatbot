import { expect, type Page, test } from "@playwright/test"
import { SignJWT } from "jose"
import postgres from "postgres"

const PENDING_CHAT_MESSAGE = "Batch 2 pending sidebar chat"
const ACTIVE_CHAT_MESSAGE = "Batch 2 active sidebar chat"
const MOBILE_CHAT_MESSAGE = "Batch 2 mobile sidebar chat"
const PENDING_DELETE_MESSAGE = "Batch 2 pending delete sidebar chat"
const STREAMED_TITLE_MESSAGE = "Batch 2 title update sidebar chat"
const STREAMED_SIDEBAR_TITLE = "Batch 2 streamed sidebar title"
const GUEST_COOKIE_NAME = "guest_token"
const FALLBACK_BASE_URL = "http://127.0.0.1:3000"

const sql = process.env.DATABASE_URL
	? postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10, prepare: false })
	: null

type SeedChat = {
	id: string
	title: string
	createdAt: Date
	updatedAt: Date
	visibility?: "private" | "public"
	messages?: Array<{
		role: "user" | "assistant"
		parts: Array<{ type: "text"; text: string }>
		createdAt: Date
	}>
}

function sseBody(chunks: Array<Record<string, unknown>>) {
	return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n\n")}\n\ndata: [DONE]\n\n`
}

function assistantTextStream(text: string) {
	const textId = "batch-2-text"

	return sseBody([
		{ type: "start", messageId: "batch-2-assistant" },
		{ type: "start-step" },
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: text },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

function assistantTextStreamWithTitle(text: string, title: string) {
	const textId = "batch-2-title-text"

	return sseBody([
		{ type: "start", messageId: "batch-2-title-assistant" },
		{ type: "data-chat-title", data: title },
		{ type: "start-step" },
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: text },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

async function sendChatMessage(page: Page, message: string) {
	await page.getByTestId("multimodal-input").fill(message)
	await page.getByTestId("send-button").click()
}

function historyNav(page: Page) {
	return page.getByRole("navigation", { name: /chat history/i })
}

function historyItem(page: Page, title: string) {
	return historyNav(page)
		.getByTestId("sidebar-history-item")
		.filter({ has: page.getByRole("link", { name: title }) })
		.first()
}

function historyMenuButton(page: Page, title: string) {
	return historyItem(page, title).locator('[data-sidebar="menu-button"]')
}

function historyActionButton(page: Page, title: string) {
	return historyItem(page, title).getByRole("button", { name: "More" })
}

function seededChat(title: string, updatedAt: Date): SeedChat {
	return {
		id: crypto.randomUUID(),
		title,
		createdAt: updatedAt,
		updatedAt,
		visibility: "private",
	}
}

async function mintGuestToken(userId: string) {
	const secret = process.env.GUEST_JWT_SECRET
	if (!secret) {
		test.skip(true, "GUEST_JWT_SECRET is required for seeded sidebar history")
	}

	const nowSeconds = Math.floor(Date.now() / 1000)

	return new SignJWT({ sub: userId, type: "guest" })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt(nowSeconds)
		.setExpirationTime(nowSeconds + 60 * 60)
		.sign(new TextEncoder().encode(secret))
}

async function seedGuestHistory({
	page,
	baseURL,
	chats,
}: {
	page: Page
	baseURL?: string
	chats: SeedChat[]
}) {
	if (!sql) {
		test.skip(true, "DATABASE_URL is required for seeded sidebar history")
		throw new Error("DATABASE_URL is required for seeded sidebar history")
	}
	const db = sql

	const userId = crypto.randomUUID()
	const token = await mintGuestToken(userId)

	await db`insert into "User" (id) values (${userId}::uuid)`
	for (const chat of chats) {
		await db`
			insert into "Chat" (id, user_id, title, visibility, created_at, updated_at)
			values (
				${chat.id}::uuid,
				${userId}::uuid,
				${chat.title},
				${chat.visibility ?? "private"},
				${chat.createdAt},
				${chat.updatedAt}
			)
		`

		for (const message of chat.messages ?? []) {
			await db`
				insert into "Message_v2" (id, chat_id, role, parts, created_at)
				values (
					${crypto.randomUUID()}::uuid,
					${chat.id}::uuid,
					${message.role},
					${JSON.stringify(message.parts)},
					${message.createdAt}
				)
			`
		}
	}

	await page.context().addCookies([
		{
			name: GUEST_COOKIE_NAME,
			value: token,
			url: baseURL ?? FALLBACK_BASE_URL,
		},
	])

	return async () => {
		await db`delete from "User" where id = ${userId}::uuid`
	}
}

async function openHistoryActionMenu(page: Page, title: string) {
	const item = historyItem(page, title)
	await expect(item).toBeVisible()
	await item.hover()
	await historyActionButton(page, title).click()
}

async function mockChatStream(page: Page, reply: string) {
	await page.route("**/api/chat", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "text/event-stream; charset=utf-8",
			body: assistantTextStream(reply),
		})
	})
}

async function mockChatStreamBody(page: Page, body: string) {
	await page.route("**/api/chat", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "text/event-stream; charset=utf-8",
			body,
		})
	})
}

async function mockDeferredChatStream(page: Page, reply: string) {
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
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream; charset=utf-8",
				body: assistantTextStream(reply),
			})
		})()
		await routeCompleted
	})

	return {
		allowResponse,
		requestStarted,
		get routeCompleted() {
			return routeCompleted
		},
	}
}

test.afterAll(async () => {
	await sql?.end()
})

test.describe("sidebar navigation", () => {
	test("chat layout exposes sidebar navigation, empty history, and new chat action", async ({
		page,
	}) => {
		await page.goto("/")
		await expect(historyNav(page)).toBeVisible()
		await expect(page.getByTestId("new-chat-button")).toBeVisible()
		await expect(
			page.getByText("Your conversations will appear here once you start chatting!"),
		).toBeVisible()
	})

	test("server-rendered initial history appears before client pagination", async ({
		page,
		baseURL,
	}) => {
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [
				seededChat("Batch 2 server history newest", new Date("2026-05-02T10:00:00Z")),
				seededChat("Batch 2 server history older", new Date("2026-05-01T10:00:00Z")),
			],
		})

		try {
			const historyRequests: string[] = []
			await page.route("**/api/history**", async (route) => {
				historyRequests.push(route.request().url())
				await route.continue()
			})

			await page.goto("/")

			await expect(historyItem(page, "Batch 2 server history newest")).toBeVisible()
			await expect(historyItem(page, "Batch 2 server history older")).toBeVisible()
			expect(historyRequests).toEqual([])
		} finally {
			await cleanup()
		}
	})

	test("history pagination loads the next page through /api/history", async ({
		page,
		baseURL,
	}) => {
		const initialChats = Array.from({ length: 20 }, (_, index) =>
			seededChat(
				`Batch 2 paginated chat ${String(index + 1).padStart(2, "0")}`,
				new Date(Date.UTC(2026, 4, 2, 12, 0, 0 - index)),
			),
		)
		const cursorFillerChat = seededChat(
			"Batch 2 database cursor filler",
			new Date("2026-05-01T10:00:00Z"),
		)
		const nextChat = seededChat(
			"Batch 2 loaded pagination chat",
			new Date("2026-04-30T10:00:00Z"),
		)
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [...initialChats, cursorFillerChat],
		})

		try {
			let allowHistoryResponse!: () => void
			const historyResponseAllowed = new Promise<void>((resolve) => {
				allowHistoryResponse = resolve
			})
			let paginationRequestUrl = ""

			await page.route("**/api/history**", async (route) => {
				paginationRequestUrl = route.request().url()
				await historyResponseAllowed
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ chats: [nextChat], hasMore: false }),
				})
			})

			await page.goto("/")
			await expect(historyItem(page, "Batch 2 paginated chat 01")).toBeVisible()

			await historyItem(page, "Batch 2 paginated chat 20").scrollIntoViewIfNeeded()
			await expect(page.getByLabel("Loading more chats")).toBeVisible()
			expect(paginationRequestUrl).toContain("/api/history?limit=20")

			allowHistoryResponse()
			await expect(historyItem(page, "Batch 2 loaded pagination chat")).toBeVisible()
			await expect(page.getByLabel("Loading more chats")).toBeHidden()
		} finally {
			await cleanup()
		}
	})

	test("renames and deletes a chat through the history item menu and dialog", async ({
		page,
		baseURL,
	}) => {
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [seededChat("Batch 2 menu original title", new Date("2026-05-02T11:00:00Z"))],
		})

		try {
			await page.goto("/")
			await openHistoryActionMenu(page, "Batch 2 menu original title")
			await page.getByTestId("rename-chat-button").click()
			await page
				.getByRole("textbox", { name: "Rename chat" })
				.fill("Batch 2 menu renamed title")
			await page.getByRole("textbox", { name: "Rename chat" }).press("Enter")

			await expect(historyItem(page, "Batch 2 menu renamed title")).toBeVisible()
			await expect(historyItem(page, "Batch 2 menu original title")).toBeHidden()

			await openHistoryActionMenu(page, "Batch 2 menu renamed title")
			await page.getByTestId("delete-chat-button").click()
			await expect(
				page.getByRole("alertdialog", { name: "Are you absolutely sure?" }),
			).toBeVisible()
			await page.getByRole("button", { name: "Continue" }).click()

			await expect(historyItem(page, "Batch 2 menu renamed title")).toBeHidden()
			await expect(
				page.getByText("Your conversations will appear here once you start chatting!"),
			).toBeVisible()
		} finally {
			await cleanup()
		}
	})

	test("delete-all clears seeded and pending chats after confirmation", async ({
		page,
		baseURL,
	}) => {
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [
				seededChat("Batch 2 delete all first", new Date("2026-05-02T12:00:00Z")),
				seededChat("Batch 2 delete all second", new Date("2026-05-02T11:59:00Z")),
			],
		})
		const chatStream = await mockDeferredChatStream(
			page,
			"Batch 2 delete-all assistant response.",
		)

		try {
			await page.goto("/")
			await sendChatMessage(page, "Batch 2 delete all pending")
			await chatStream.requestStarted
			await expect(historyItem(page, "Batch 2 delete all pending")).toBeVisible()

			await page.getByTestId("delete-all-chats-button").click()
			await expect(page.getByRole("alertdialog", { name: "Delete all chats?" })).toBeVisible()
			await page.getByRole("button", { name: "Delete All" }).click()

			await expect(historyItem(page, "Batch 2 delete all first")).toBeHidden()
			await expect(historyItem(page, "Batch 2 delete all second")).toBeHidden()
			await expect(historyItem(page, "Batch 2 delete all pending")).toBeHidden()

			chatStream.allowResponse()
			await chatStream.routeCompleted
		} finally {
			await cleanup()
		}
	})

	test("pending chat can be removed from the sidebar before the chat response finishes", async ({
		page,
	}) => {
		const chatStream = await mockDeferredChatStream(
			page,
			"Batch 2 pending delete assistant response.",
		)

		await page.goto("/")
		await sendChatMessage(page, PENDING_DELETE_MESSAGE)
		await chatStream.requestStarted
		await expect(historyItem(page, PENDING_DELETE_MESSAGE)).toBeVisible()

		await openHistoryActionMenu(page, PENDING_DELETE_MESSAGE)
		await page.getByTestId("delete-chat-button").click()
		await expect(
			page.getByRole("alertdialog", { name: "Are you absolutely sure?" }),
		).toBeVisible()
		await page.getByRole("button", { name: "Continue" }).click()

		await expect(historyItem(page, PENDING_DELETE_MESSAGE)).toBeHidden()

		chatStream.allowResponse()
		await chatStream.routeCompleted
		await expect(historyItem(page, PENDING_DELETE_MESSAGE)).toBeHidden()
	})

	test("single data-chat-title stream updates the pending sidebar title without a duplicate row", async ({
		page,
	}) => {
		await mockChatStreamBody(
			page,
			assistantTextStreamWithTitle(
				"Batch 2 title update assistant response.",
				STREAMED_SIDEBAR_TITLE,
			),
		)

		await page.goto("/")
		await sendChatMessage(page, STREAMED_TITLE_MESSAGE)

		await expect(page.getByTestId("message-assistant")).toContainText(
			"Batch 2 title update assistant response.",
		)
		await expect(historyItem(page, STREAMED_SIDEBAR_TITLE)).toBeVisible()
		await expect(historyItem(page, STREAMED_TITLE_MESSAGE)).toBeHidden()
		await expect(historyNav(page).getByTestId("sidebar-history-item")).toHaveCount(1)
	})

	test("pending chat appears after first send and becomes active after the URL transitions", async ({
		page,
	}) => {
		const chatStream = await mockDeferredChatStream(
			page,
			"Batch 2 deferred assistant response.",
		)

		await page.goto("/")
		await sendChatMessage(page, PENDING_CHAT_MESSAGE)
		await chatStream.requestStarted

		await expect(historyItem(page, PENDING_CHAT_MESSAGE)).toBeVisible()
		await expect(page).not.toHaveURL(/\/chat\/[0-9a-f-]+$/)

		chatStream.allowResponse()
		await chatStream.routeCompleted

		await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)
		await expect(historyMenuButton(page, PENDING_CHAT_MESSAGE)).toHaveAttribute(
			"data-active",
			"true",
		)
	})

	test("active chat history item exposes active state for the current chat URL", async ({
		page,
	}) => {
		await mockChatStream(page, "Batch 2 active assistant response.")

		await page.goto("/")
		await sendChatMessage(page, ACTIVE_CHAT_MESSAGE)

		await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)
		const activePath = new URL(page.url()).pathname
		const activeItem = historyItem(page, ACTIVE_CHAT_MESSAGE)
		const activeLink = activeItem.getByRole("link", { name: ACTIVE_CHAT_MESSAGE })

		await expect(activeLink).toHaveAttribute("href", activePath)
		await expect(activeLink).toHaveAttribute("data-active", "true")
	})

	test("clicking a seeded sidebar history link navigates to the chat and keeps it active", async ({
		page,
		baseURL,
	}) => {
		const clickedChat = seededChat(
			"Batch 2 clicked sidebar history chat",
			new Date("2026-05-02T13:30:00Z"),
		)
		clickedChat.messages = [
			{
				role: "user",
				parts: [{ type: "text", text: "Persisted clicked chat message" }],
				createdAt: new Date("2026-05-02T13:30:01Z"),
			},
		]
		const otherChat = seededChat(
			"Batch 2 non-active sidebar history chat",
			new Date("2026-05-02T13:29:00Z"),
		)
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [clickedChat, otherChat],
		})
		const apiChatRequests: string[] = []

		try {
			await page.route("**/api/chat", async (route) => {
				apiChatRequests.push(route.request().url())
				await route.abort()
			})

			await page.goto("/")

			const clickedLink = historyItem(page, clickedChat.title).getByRole("link", {
				name: clickedChat.title,
			})
			await expect(clickedLink).toHaveAttribute("href", `/chat/${clickedChat.id}`)
			await clickedLink.click()

			await expect(page).toHaveURL(`/chat/${clickedChat.id}`)
			await expect(page.getByTestId("message-user")).toContainText(
				"Persisted clicked chat message",
			)
			await expect(clickedLink).toHaveAttribute("data-active", "true")
			expect(apiChatRequests).toHaveLength(0)
		} finally {
			await cleanup()
		}
	})

	test("directly loads an existing chat with persisted messages and active sidebar state", async ({
		page,
		baseURL,
	}) => {
		const chat = seededChat("Batch 2 direct existing chat", new Date("2026-05-02T13:00:00Z"))
		chat.messages = [
			{
				role: "user",
				parts: [{ type: "text", text: "Persisted user message" }],
				createdAt: new Date("2026-05-02T13:00:01Z"),
			},
			{
				role: "assistant",
				parts: [{ type: "text", text: "Persisted assistant message" }],
				createdAt: new Date("2026-05-02T13:00:02Z"),
			},
		]
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [chat],
		})
		const apiChatRequests: string[] = []

		try {
			await page.route("**/api/chat", async (route) => {
				apiChatRequests.push(route.request().url())
				await route.abort()
			})

			await page.goto(`/chat/${chat.id}`)

			await expect(page.getByTestId("message-user")).toContainText("Persisted user message")
			await expect(page.getByTestId("message-assistant")).toContainText(
				"Persisted assistant message",
			)
			await expect(page).toHaveURL(`/chat/${chat.id}`)
			await expect(historyMenuButton(page, chat.title)).toHaveAttribute("data-active", "true")
			expect(apiChatRequests).toHaveLength(0)
		} finally {
			await cleanup()
		}
	})

	test("edits a persisted user message and deletes trailing messages", async ({
		page,
		baseURL,
	}) => {
		const originalUserText = "Original persisted edit prompt"
		const trailingAssistantText = "Original assistant should be deleted"
		const editedUserText = "Edited deterministic prompt"
		const editedAssistantText = "Edited deterministic assistant reply"

		const chat = seededChat("Batch 2 persisted edit chat", new Date("2026-05-02T13:10:00Z"))
		chat.messages = [
			{
				role: "user",
				parts: [{ type: "text", text: originalUserText }],
				createdAt: new Date("2026-05-02T13:10:01Z"),
			},
			{
				role: "assistant",
				parts: [{ type: "text", text: trailingAssistantText }],
				createdAt: new Date("2026-05-02T13:10:02Z"),
			},
		]
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [chat],
		})
		let chatRequestBody: unknown

		function requestBodyContainsText(body: unknown, text: string): boolean {
			if (!body || typeof body !== "object") {
				return false
			}

			const record = body as Record<string, unknown>
			if (record.text === text) {
				return true
			}

			if (Array.isArray(record.parts)) {
				if (
					record.parts.some(
						(part) =>
							part !== null &&
							typeof part === "object" &&
							"text" in part &&
							(part as { text?: unknown }).text === text,
					)
				) {
					return true
				}
			}

			if (
				Array.isArray(record.messages) &&
				record.messages.some((message) => requestBodyContainsText(message, text))
			) {
				return true
			}

			if (record.message && requestBodyContainsText(record.message, text)) {
				return true
			}

			return Object.values(record).some((value) => requestBodyContainsText(value, text))
		}

		try {
			await page.route("**/api/chat", async (route) => {
				chatRequestBody = route.request().postDataJSON() as unknown
				await route.fulfill({
					status: 200,
					contentType: "text/event-stream; charset=utf-8",
					body: assistantTextStream(editedAssistantText),
				})
			})

			await page.goto(`/chat/${chat.id}`)

			const originalMessage = page.getByText(originalUserText, { exact: true })
			await expect(originalMessage).toBeVisible()
			await expect(page.getByText(trailingAssistantText, { exact: true })).toBeVisible()

			await originalMessage.hover()
			await page.getByRole("button", { name: "Edit" }).click()
			await page.getByTestId("message-editor").fill(editedUserText)
			await page.getByTestId("message-editor-send-button").click()

			await expect.poll(() => chatRequestBody).not.toBeUndefined()
			expect(requestBodyContainsText(chatRequestBody, editedUserText)).toBe(true)

			await expect(page.getByTestId("message-user")).toContainText(editedUserText)
			await expect(page.getByTestId("message-assistant")).toContainText(editedAssistantText)
			await expect(page.getByText(originalUserText, { exact: true })).toHaveCount(0)
			await expect(page.getByText(trailingAssistantText, { exact: true })).toHaveCount(0)

			const db = sql
			if (!db) {
				test.skip(true, "DATABASE_URL is required for seeded sidebar history")
				throw new Error("DATABASE_URL is required for seeded sidebar history")
			}

			await expect
				.poll(async () => {
					const rows = await db`
						select count(*)::int as count
						from "Message_v2"
						where chat_id = ${chat.id}::uuid
							and parts::text like ${`%${originalUserText}%`}
					`
					const row = rows[0] as { count?: number } | undefined
					return row?.count ?? 0
				})
				.toBe(0)

			await expect
				.poll(async () => {
					const rows = await db`
						select count(*)::int as count
						from "Message_v2"
						where chat_id = ${chat.id}::uuid
							and parts::text like ${`%${trailingAssistantText}%`}
					`
					const row = rows[0] as { count?: number } | undefined
					return row?.count ?? 0
				})
				.toBe(0)
		} finally {
			await cleanup()
		}
	})

	test("chat visibility selector persists public visibility for the owner", async ({
		page,
		baseURL,
	}) => {
		const chat = seededChat("Batch 2 visibility toggle chat", new Date("2026-05-02T14:00:00Z"))
		const cleanup = await seedGuestHistory({
			page,
			baseURL,
			chats: [chat],
		})

		try {
			await page.goto(`/chat/${chat.id}`)

			await expect(page).toHaveURL(`/chat/${chat.id}`)

			const visibilitySelector = page.getByTestId("visibility-selector")
			const privateVisibilityItem = page.getByTestId("visibility-selector-item-private")
			const publicVisibilityItem = page.getByTestId("visibility-selector-item-public")

			await expect(visibilitySelector).toBeVisible()
			await visibilitySelector.click()
			await expect(privateVisibilityItem).toHaveAttribute("data-active", "true")
			await expect(publicVisibilityItem).toHaveAttribute("data-active", "false")

			await publicVisibilityItem.click()

			await expect(visibilitySelector).toHaveText("Public")
			await visibilitySelector.click()
			await expect(publicVisibilityItem).toHaveAttribute("data-active", "true")
			await expect(privateVisibilityItem).toHaveAttribute("data-active", "false")

			const db = sql
			if (!db) {
				test.skip(true, "DATABASE_URL is required for seeded sidebar history")
				throw new Error("DATABASE_URL is required for seeded sidebar history")
			}

			await expect
				.poll(async () => {
					const rows = await db`select visibility from "Chat" where id = ${chat.id}::uuid`
					return rows[0]?.visibility
				})
				.toBe("public")
		} finally {
			await cleanup()
		}
	})

	test("mobile sidebar opens with the trigger and closes from the sidebar new chat action", async ({
		browser,
	}) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		})
		const page = await context.newPage()

		try {
			await mockChatStream(page, "Batch 2 mobile assistant response.")

			await page.goto("/")
			await sendChatMessage(page, MOBILE_CHAT_MESSAGE)
			await expect(page).toHaveURL(/\/chat\/[0-9a-f-]+$/)

			await page.getByTestId("sidebar-toggle").click()
			await expect(page.getByRole("dialog", { name: "Sidebar" })).toBeVisible()
			await expect(historyItem(page, MOBILE_CHAT_MESSAGE)).toBeVisible()

			await page.getByTestId("new-chat-button-sidebar").click()
			await expect(page).toHaveURL(/\/$/)
			await expect(page.getByRole("dialog", { name: "Sidebar" })).toBeHidden()
		} finally {
			await context.close()
		}
	})
})
