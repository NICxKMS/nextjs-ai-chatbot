import { expect, test } from "@playwright/test"

// ── Chat E2E Tests ────────────────────────────────────────────
// Covers: send message, streaming response, weather tool invocation,
// new chat creation, load existing chat.
// Uses data-testid selectors for stability.

test.describe("Chat", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page — guest session is auto-bootstrapped
		await page.goto("/")
		await expect(page.getByTestId("multimodal-input")).toBeVisible()
	})

	test.describe("Message Input", () => {
		test("should display chat input and send button", async ({ page }) => {
			await expect(page.getByTestId("multimodal-input")).toBeVisible()
			await expect(page.getByTestId("send-button")).toBeVisible()
		})

		test("should enable send button when text is entered", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")
			const sendButton = page.getByTestId("send-button")

			// Send button should be disabled when input is empty
			await expect(sendButton).toBeDisabled()

			// Type a message
			await input.fill("Hello, world!")

			// Send button should be enabled
			await expect(sendButton).toBeEnabled()
		})

		test("should clear input after sending a message", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Hello, world!")
			await page.getByTestId("send-button").click()

			// Input should be cleared after sending
			await expect(input).toHaveValue("")
		})
	})

	test.describe("Send and Receive", () => {
		test("should send a message and display it in the chat", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Why is the sky blue?")
			await page.getByTestId("send-button").click()

			// User message should appear
			const userMessage = page.getByTestId("message-user")
			await expect(userMessage.last()).toBeVisible()
		})

		test("should show stop button during streaming", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Write a long essay about artificial intelligence")
			await page.getByTestId("send-button").click()

			// Stop button should appear during streaming
			await expect(page.getByTestId("stop-button")).toBeVisible({ timeout: 5000 })
		})

		test("should receive an assistant response", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Hello!")
			await page.getByTestId("send-button").click()

			// Wait for assistant response
			const assistantMessage = page.getByTestId("message-assistant")
			await expect(assistantMessage.first()).toBeVisible({ timeout: 30000 })

			// Response content should be non-empty
			const content = assistantMessage.first().getByTestId("message-content")
			await expect(content).not.toBeEmpty({ timeout: 30000 })
		})

		test("should redirect to /chat/:id after sending first message", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Hello!")
			await page.getByTestId("send-button").click()

			// URL should change to include a chat ID
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })
		})

		test("should display send button after response completes", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Say hello back in one word")
			await page.getByTestId("send-button").click()

			// Wait for response to complete
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// After streaming completes, send button should reappear
			await expect(page.getByTestId("send-button")).toBeVisible({ timeout: 30000 })
			await expect(page.getByTestId("stop-button")).not.toBeVisible()
		})
	})

	test.describe("Edit Message", () => {
		test("should not show empty greeting state while resubmitting an edited first message", async ({
			page,
		}) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Give me one short sentence about the sky")
			await page.getByTestId("send-button").click()
			await expect(page.getByTestId("message-assistant").first()).toBeVisible({
				timeout: 30000,
			})

			const firstUserMessage = page.getByTestId("message-user").first()
			await firstUserMessage.hover()
			await page.getByRole("button", { name: "Edit" }).first().click()

			const editor = page.getByTestId("message-editor")
			await expect(editor).toBeVisible({ timeout: 10000 })
			await editor.fill("Give me one short sentence about the ocean")
			await page.getByTestId("message-editor-send-button").click()

			// Regression guard: editing the first message should not bounce to the
			// empty-state greeting while the edit flow transitions to resubmission.
			await expect(page.getByTestId("messages-empty")).toHaveCount(0)

			// Ensure the route remains on an active chat during handoff.
			await expect(page).toHaveURL(/\/chat\/[\w-]+/)
		})
	})

	test.describe("Tool Invocation", () => {
		test("should invoke weather tool and display result", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("What is the weather in San Francisco?")
			await page.getByTestId("send-button").click()

			// Wait for assistant response with tool result
			const assistantMessage = page.getByTestId("message-assistant")
			await expect(assistantMessage.first()).toBeVisible({ timeout: 30000 })

			// The weather tool should produce a visible response
			// (either inline tool result or text mentioning weather data)
			await expect(assistantMessage.first()).not.toBeEmpty({ timeout: 30000 })
		})
	})

	test.describe("New Chat", () => {
		test("should create a new chat via header button", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Send a message first to establish a chat
			await input.fill("Hello!")
			await page.getByTestId("send-button").click()
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })

			// Click the "New Chat" link in the header
			const newChatButton = page.getByRole("link", { name: "New Chat" })
			await newChatButton.click()

			// Should navigate back to home
			await page.waitForURL("/")
			await expect(page.getByTestId("multimodal-input")).toBeVisible()
			await expect(page.getByTestId("multimodal-input")).toHaveValue("")
		})
	})

	test.describe("Load Existing Chat", () => {
		test("should load an existing chat by navigating to its URL", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Send a message to create a chat
			await input.fill("Remember this: the answer is 42")
			await page.getByTestId("send-button").click()

			// Wait for URL to change to /chat/:id
			await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30000 })
			const chatUrl = page.url()

			// Wait for response
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 30000 })

			// Navigate away and back
			await page.goto("/")
			await page.goto(chatUrl)

			// Chat messages should be restored
			await expect(page.getByTestId("message-user")).toBeVisible({ timeout: 10000 })
			await expect(page.getByTestId("message-assistant")).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe("Model Selector", () => {
		test("should display the model selector in the chat header", async ({ page }) => {
			await expect(page.getByTestId("model-selector")).toBeVisible()
		})
	})
})
