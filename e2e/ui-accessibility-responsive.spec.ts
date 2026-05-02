import type { Locator, Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

const MODEL_COOKIE_NAME = "chat-model"
const PERSISTED_MODEL_ID = "google:gemini-2.5-flash-lite"
const PERSISTED_MODEL_NAME = "Gemini 2.5 Flash Lite"
const SETTINGS_SYSTEM_PROMPT = "Batch 4 settings prompt"
const ATTACHMENT_MESSAGE = "attachment removed before submit"
const ATTACHMENT_UPLOAD_MESSAGE = "attachment uploaded before submit"
const WEATHER_MESSAGE = "show weather for Oslo"

const RESPONSIVE_VIEWPORTS = [
	{ name: "mobile", width: 320, height: 720 },
	{ name: "tablet", width: 768, height: 900 },
	{ name: "desktop", width: 1024, height: 900 },
	{ name: "wide", width: 1280, height: 900 },
] as const

const MINIMUM_TOUCH_TARGET_SIZE = 32

async function expectNoHorizontalOverflow(page: Page) {
	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
		bodyScrollWidth: document.body.scrollWidth,
	}))

	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
	expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

async function expectMinimumTouchTarget(target: Locator) {
	const targetSize = await target.evaluate((element) => {
		const rect = element.getBoundingClientRect()
		const style = getComputedStyle(element)

		return {
			height:
				rect.height +
				Number.parseFloat(style.paddingBlockStart) +
				Number.parseFloat(style.paddingBlockEnd),
			width:
				rect.width +
				Number.parseFloat(style.paddingInlineStart) +
				Number.parseFloat(style.paddingInlineEnd),
		}
	})

	expect(targetSize.width).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_SIZE)
	expect(targetSize.height).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET_SIZE)
}

async function openHome(page: Page) {
	await page.goto("/")
	await expect(page.getByTestId("multimodal-input")).toBeVisible()
}

function sseBody(chunks: Array<Record<string, unknown>>) {
	return `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}`).join("\n\n")}\n\ndata: [DONE]\n\n`
}

function assistantTextStream(text: string) {
	const textId = "batch-4-text"

	return sseBody([
		{ type: "start", messageId: "batch-4-assistant" },
		{ type: "start-step" },
		{ type: "text-start", id: textId },
		{ type: "text-delta", id: textId, delta: text },
		{ type: "text-end", id: textId },
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

function weatherToolStream() {
	const currentTime = "2026-05-02T12:00:00Z"
	const toolCallId = "batch-4-weather-tool"

	return sseBody([
		{ type: "start", messageId: "batch-4-weather-assistant" },
		{ type: "start-step" },
		{
			type: "tool-input-available",
			toolCallId,
			toolName: "getWeather",
			input: { city: "Oslo" },
		},
		{
			type: "tool-output-available",
			toolCallId,
			output: {
				latitude: 59.9,
				longitude: 10.8,
				generationtime_ms: 0.2,
				utc_offset_seconds: 0,
				timezone: "Europe/Oslo",
				timezone_abbreviation: "CEST",
				elevation: 23,
				cityName: "Oslo",
				current_units: {
					time: "iso8601",
					interval: "seconds",
					temperature_2m: "°C",
				},
				current: {
					time: currentTime,
					interval: 900,
					temperature_2m: 7.2,
				},
				hourly_units: {
					time: "iso8601",
					temperature_2m: "°C",
				},
				hourly: {
					time: [
						"2026-05-02T12:00:00Z",
						"2026-05-02T13:00:00Z",
						"2026-05-02T14:00:00Z",
						"2026-05-02T15:00:00Z",
						"2026-05-02T16:00:00Z",
						"2026-05-02T17:00:00Z",
					],
					temperature_2m: [7.2, 8.1, 8.7, 9.1, 8.8, 7.9],
				},
				daily_units: {
					time: "iso8601",
					sunrise: "iso8601",
					sunset: "iso8601",
				},
				daily: {
					time: ["2026-05-02"],
					sunrise: ["2026-05-02T04:45:00Z"],
					sunset: ["2026-05-02T20:32:00Z"],
				},
			},
		},
		{ type: "finish-step" },
		{ type: "finish", finishReason: "stop" },
	])
}

async function sendChatMessage(page: Page, message: string) {
	await page.getByTestId("multimodal-input").fill(message)
	await page.getByTestId("send-button").click()
}

test.describe("UI accessibility and responsive smoke", () => {
	test("login and register expose accessible fields and submit actions", async ({ page }) => {
		await page.goto("/login")
		await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible()
		await expect(page.getByLabel(/password/i)).toBeVisible()
		await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
		await expect(page.getByRole("link", { name: /sign up/i })).toHaveAttribute(
			"href",
			"/register",
		)

		await page.goto("/register")
		await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible()
		await expect(page.getByLabel(/password/i)).toBeVisible()
		await expect(page.getByRole("button", { name: /sign up/i })).toBeVisible()
		await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login")
	})

	test("auth validation errors are announced and linked to invalid fields", async ({ page }) => {
		await page.goto("/login")

		await page.getByRole("textbox", { name: /email address/i }).fill("user@example.com")
		await page.getByLabel(/password/i).fill("short")
		await page.getByRole("button", { name: /sign in/i }).click()

		const passwordAlert = page.getByRole("alert").filter({
			hasText: /password must be at least 6 characters/i,
		})

		await expect(passwordAlert).toBeVisible()
		await expect(page.getByLabel(/password/i)).toHaveAttribute(
			"aria-describedby",
			"password-error",
		)
	})

	test("home chat shell exposes accessible input, model, settings, and send controls", async ({
		page,
	}) => {
		await openHome(page)

		const input = page.getByTestId("multimodal-input")
		await expect(input).toHaveAttribute("placeholder", "Send a message...")
		await expect(page.getByRole("button", { name: /select ai model/i }).first()).toBeVisible()
		await expect(page.getByRole("button", { name: /settings/i })).toBeVisible()

		const sendButton = page.getByRole("button", { name: /submit/i })
		await expect(sendButton).toBeVisible()
		await expect(sendButton).toBeDisabled()
		await input.pressSequentially("hello")
		await expect(input).toHaveValue("hello")
	})

	test("attachment action exposes file selection controls", async ({ page }) => {
		await openHome(page)

		await expect(page.locator('input[type="file"]')).toHaveCount(1)
		await expect(page.getByRole("button", { name: /attach file/i })).toBeVisible()
	})

	test("root layout allows browser zoom and honors reduced motion CSS", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" })
		await openHome(page)

		const viewportContent = await page.locator('meta[name="viewport"]').getAttribute("content")
		expect(viewportContent).toContain("width=device-width")
		expect(viewportContent).toContain("initial-scale=1")
		expect(viewportContent).not.toMatch(/maximum-scale|user-scalable/i)

		const greetingAnimationDuration = await page
			.getByTestId("greeting")
			.locator("div")
			.first()
			.evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration))
		expect(greetingAnimationDuration).toBeLessThanOrEqual(0.001)
	})

	for (const viewport of RESPONSIVE_VIEWPORTS) {
		test(`home chat shell has no horizontal overflow at ${viewport.name} width`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: viewport.width, height: viewport.height })
			await openHome(page)
			await expectNoHorizontalOverflow(page)
		})
	}

	test("mobile key controls preserve minimum touch target geometry", async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 720 })
		await openHome(page)

		await expectMinimumTouchTarget(page.getByTestId("model-selector").first())
		await expectMinimumTouchTarget(page.getByRole("button", { name: /attach file/i }))
		await expectMinimumTouchTarget(page.getByTestId("send-button"))
		await expectMinimumTouchTarget(page.getByRole("button", { name: /settings/i }))
	})

	test("empty chat state and message list expose accessible regions", async ({ page }) => {
		await openHome(page)

		await expect(page.getByTestId("messages-empty")).toBeVisible()
		await expect(page.getByTestId("greeting")).toContainText("Hello there!")
		await expect(page.getByTestId("suggested-actions")).toBeVisible()

		await page.route("**/api/chat", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream; charset=utf-8",
				body: assistantTextStream("Accessible live region response."),
			})
		})

		await sendChatMessage(page, "check live region")

		const messagesList = page.getByTestId("messages-list")
		await expect(messagesList).toBeVisible()
		await expect(messagesList).toHaveAttribute("aria-live", "polite")
		await expect(page.getByRole("region", { name: /chat messages/i })).toBeVisible()
		await expect(messagesList).toContainText("Accessible live region response.")
	})

	test("settings entry point exposes an accessible control", async ({ page }) => {
		await openHome(page)

		await expect(page.getByRole("button", { name: /settings/i })).toBeVisible()
	})

	test("model selector exposes accessible model choice controls", async ({ page }) => {
		await openHome(page)

		await expect(page.locator('[data-testid="model-selector"]').first()).toBeVisible()
		await expect(page.getByRole("button", { name: /select ai model/i }).first()).toBeVisible()
	})

	test("model selector moves focus into search and returns focus on close", async ({ page }) => {
		await openHome(page)

		const modelSelector = page.getByTestId("model-selector").first()
		await modelSelector.focus()
		await expect(modelSelector).toBeFocused()
		await expect(modelSelector).toHaveAttribute("aria-expanded", "false")

		await modelSelector.press("Enter")
		await expect(modelSelector).toHaveAttribute("aria-expanded", "true")
		await expect(page.getByRole("combobox", { name: /search models/i })).toBeFocused()

		await page.keyboard.press("Escape")
		await expect(modelSelector).toHaveAttribute("aria-expanded", "false")
		await expect(modelSelector).toBeFocused()
	})

	test("settings sheet exposes switch states and returns focus when dismissed", async ({
		page,
	}) => {
		await openHome(page)

		const settingsButton = page.getByRole("button", { name: /settings/i })
		await settingsButton.focus()
		await settingsButton.press("Enter")
		await expect(page.getByRole("heading", { name: /chat settings/i })).toBeVisible()

		const reasoningSwitch = page.getByRole("switch", { name: /enable reasoning/i })
		await expect(reasoningSwitch).toHaveAttribute("aria-checked", "false")
		await reasoningSwitch.click()
		await expect(reasoningSwitch).toHaveAttribute("aria-checked", "true")

		await page.getByRole("button", { name: /^done$/i }).click()
		await expect(page.getByRole("heading", { name: /chat settings/i })).toBeHidden()
		await expect(settingsButton).toBeFocused()
	})

	test("model selection persists through the chat-model cookie after reload", async ({
		page,
	}) => {
		await openHome(page)

		await page.getByTestId("model-selector").first().click()
		await page.getByTestId(`model-selector-item-${PERSISTED_MODEL_ID}`).click()

		await expect
			.poll(async () => {
				const cookies = await page.context().cookies()
				return cookies.find((cookie) => cookie.name === MODEL_COOKIE_NAME)?.value
			})
			.toBe(PERSISTED_MODEL_ID)

		await page.reload()
		await expect(page.getByTestId("model-selector").first()).toContainText(PERSISTED_MODEL_NAME)
	})

	test("settings persist locally and are included in the chat request body", async ({ page }) => {
		let chatRequestBody: Record<string, unknown> | undefined
		const chatRequestCaptured = new Promise<void>((resolve) => {
			void page.route("**/api/chat", async (route) => {
				chatRequestBody = route.request().postDataJSON() as Record<string, unknown>
				resolve()
				await route.fulfill({
					status: 200,
					contentType: "text/event-stream; charset=utf-8",
					body: assistantTextStream("Batch 4 settings response."),
				})
			})
		})

		await openHome(page)
		await page.getByRole("button", { name: /settings/i }).click()
		await expect(page.getByRole("heading", { name: /chat settings/i })).toBeVisible()

		await page.getByRole("slider", { name: /temperature/i }).fill("1.25")
		await page.getByRole("slider", { name: /top p/i }).fill("0.42")
		await page.getByRole("spinbutton", { name: /max output tokens/i }).fill("2048")
		await page.getByRole("textbox", { name: /system prompt/i }).fill(SETTINGS_SYSTEM_PROMPT)
		await page.getByRole("switch", { name: /enable reasoning/i }).click()
		await page.getByRole("switch", { name: /detailed token usage/i }).click()

		await expect
			.poll(() =>
				page.evaluate(() => {
					const storedSettings = localStorage.getItem("chat-settings")
					return storedSettings ? JSON.parse(storedSettings) : null
				}),
			)
			.toMatchObject({
				contextDisplayMode: "detailed",
				enableReasoning: true,
				maxOutputTokens: 2048,
				systemPrompt: SETTINGS_SYSTEM_PROMPT,
				temperature: 1.25,
				topP: 0.42,
			})

		await page.getByRole("button", { name: /^done$/i }).click()
		await sendChatMessage(page, "send settings snapshot")
		await chatRequestCaptured

		expect(chatRequestBody).toMatchObject({
			settings: {
				contextDisplayMode: "detailed",
				enableReasoning: true,
				maxOutputTokens: 2048,
				systemPrompt: SETTINGS_SYSTEM_PROMPT,
				temperature: 1.25,
				topP: 0.42,
			},
		})
	})

	test("attachment preview can be removed before submit", async ({ page }) => {
		let uploadCalled = false
		let chatRequestBody: Record<string, unknown> | undefined
		const chatRequestCaptured = new Promise<void>((resolve) => {
			void page.route("**/api/chat", async (route) => {
				chatRequestBody = route.request().postDataJSON() as Record<string, unknown>
				resolve()
				await route.fulfill({
					status: 200,
					contentType: "text/event-stream; charset=utf-8",
					body: assistantTextStream("Batch 4 attachment response."),
				})
			})
		})
		await page.route("**/api/files/upload", async (route) => {
			uploadCalled = true
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					url: "https://example.test/uploads/batch-4-preview.png",
					pathname: "uploads/batch-4-preview.png",
					contentType: "image/png",
				}),
			})
		})

		await openHome(page)
		await page.getByLabel("Upload files").setInputFiles({
			name: "batch-4-preview.png",
			mimeType: "image/png",
			buffer: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
				"base64",
			),
		})

		const preview = page.getByRole("img", { name: "batch-4-preview.png" })
		await expect(preview).toBeVisible()
		await page.getByRole("button", { name: /remove batch-4-preview\.png/i }).click()
		await expect(preview).toBeHidden()

		await sendChatMessage(page, ATTACHMENT_MESSAGE)
		await chatRequestCaptured

		expect(uploadCalled).toBe(false)
		expect(chatRequestBody).toMatchObject({
			message: {
				parts: [{ type: "text", text: ATTACHMENT_MESSAGE }],
			},
		})
	})

	test("uploaded attachment is sent as a trusted file part", async ({ page }) => {
		let chatRequestBody: Record<string, unknown> | undefined
		const chatRequestCaptured = new Promise<void>((resolve) => {
			void page.route("**/api/chat", async (route) => {
				chatRequestBody = route.request().postDataJSON() as Record<string, unknown>
				resolve()
				await route.fulfill({
					status: 200,
					contentType: "text/event-stream; charset=utf-8",
					body: assistantTextStream("Batch 4 uploaded attachment response."),
				})
			})
		})
		await page.route("**/api/files/upload", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					url: "https://abc.public.blob.vercel-storage.com/uploads/batch-4-upload.png",
					pathname: "uploads/batch-4-upload.png",
					contentType: "image/png",
				}),
			})
		})

		await openHome(page)
		await page.getByLabel("Upload files").setInputFiles({
			name: "batch-4-upload.png",
			mimeType: "image/png",
			buffer: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
				"base64",
			),
		})
		await expect(page.getByRole("img", { name: "batch-4-upload.png" })).toBeVisible()

		await sendChatMessage(page, ATTACHMENT_UPLOAD_MESSAGE)
		await chatRequestCaptured

		expect(chatRequestBody).toMatchObject({
			message: {
				parts: expect.arrayContaining([
					{ type: "text", text: ATTACHMENT_UPLOAD_MESSAGE },
					expect.objectContaining({
						type: "file",
						mediaType: "image/png",
						url: "https://abc.public.blob.vercel-storage.com/uploads/batch-4-upload.png",
					}),
				]),
			},
		})
	})

	test("failed attachment upload shows an error and does not submit chat", async ({ page }) => {
		let chatCalled = false
		await page.route("**/api/chat", async (route) => {
			chatCalled = true
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream; charset=utf-8",
				body: assistantTextStream("Unexpected chat response."),
			})
		})
		await page.route("**/api/files/upload", async (route) => {
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ message: "Batch 4 upload unavailable" }),
			})
		})

		await openHome(page)
		await page.getByLabel("Upload files").setInputFiles({
			name: "batch-4-failure.png",
			mimeType: "image/png",
			buffer: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
				"base64",
			),
		})
		await expect(page.getByRole("img", { name: "batch-4-failure.png" })).toBeVisible()

		await sendChatMessage(page, "do not submit when upload fails")

		await expect(page.getByText("Batch 4 upload unavailable")).toBeVisible()
		expect(chatCalled).toBe(false)
		await expect(page.getByTestId("message-user")).toHaveCount(0)
	})

	test("weather tool output renders the rich weather card from a mocked chat stream", async ({
		page,
	}) => {
		await page.route("**/api/chat", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "text/event-stream; charset=utf-8",
				body: weatherToolStream(),
			})
		})

		await openHome(page)
		await sendChatMessage(page, WEATHER_MESSAGE)

		const weatherCard = page.getByRole("region", { name: /weather for oslo/i })
		await expect(weatherCard).toBeVisible()
		await expect(weatherCard).toContainText("Oslo")
		await expect(weatherCard).toContainText("Hourly Forecast")
		await expect(weatherCard).toContainText("Sunrise:")
		await expect(weatherCard).toContainText("Sunset:")
	})

	test("chat input supports Shift+Enter newline without submitting", async ({ page }) => {
		await openHome(page)

		const input = page.getByTestId("multimodal-input")
		await input.pressSequentially("first line")
		await page.keyboard.down("Shift")
		await page.keyboard.press("Enter")
		await page.keyboard.up("Shift")
		await input.pressSequentially("second line")

		await expect(input).toHaveValue("first line\nsecond line")
		await expect(page.getByRole("button", { name: /submit/i })).toBeVisible()
	})
})
