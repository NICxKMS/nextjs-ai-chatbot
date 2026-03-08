/**
 * E2E tests for the artifact panel.
 *
 * Uses the built-in `e2e-artifact-fixture` cookie to activate the mock model
 * in the chat route, producing deterministic artifact content without hitting
 * a real AI provider.
 */

import { expect, test } from "./fixtures"
import { ChatPage } from "./pages/chat"

// ── Setup — activate the artifact fixture model ──────────────
// The cookie must be set on the authenticatedPage context, not the default
// `page` fixture, because authenticatedPage creates its own browser context.

test.beforeEach(async ({ authenticatedPage }) => {
	await authenticatedPage.context().addCookies([
		{
			name: "e2e-artifact-fixture",
			value: "1",
			domain: "localhost",
			path: "/",
		},
	])
	// Re-navigate so the server sees the cookie on the initial page load.
	// The authenticatedPage fixture already navigated to "/" during setup,
	// but the cookie wasn't set yet at that point.
	await authenticatedPage.goto("/")
	await authenticatedPage
		.getByTestId("multimodal-input")
		.waitFor({ state: "visible", timeout: 30_000 })
})

// ── Tests ────────────────────────────────────────────────────

test.describe("Artifact panel", () => {
	test("opens artifact panel when creating an artifact", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.sendMessageAndWaitForResponse("Create a text artifact titled 'My Test Document'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })
	})

	test("artifact panel shows generated content", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.sendMessageAndWaitForResponse("Create a text artifact titled 'E2E Content Test'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })

		// The fixture generates multi-line deterministic text content
		await expect(artifactPanel).toContainText("e2e artifact fixture", { ignoreCase: true })
	})

	test("close button hides the artifact panel", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.sendMessageAndWaitForResponse("Create a text artifact titled 'Close Test'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })

		const closeButton = authenticatedPage.getByTestId("artifact-close-button")
		await closeButton.click()

		await expect(artifactPanel).not.toBeVisible()
	})

	test("artifact panel can be reopened after closing", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.sendMessageAndWaitForResponse("Create a text artifact titled 'Reopen Test'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })

		// Close
		await authenticatedPage.getByTestId("artifact-close-button").click()
		await expect(artifactPanel).not.toBeVisible()

		// Reopen by clicking the artifact preview hitbox in the chat message.
		// The ArtifactPreview renders a <button aria-label="Open artifact: <title>">
		// overlay when the panel is closed.
		const artifactPreview = authenticatedPage.getByRole("button", {
			name: /Open artifact/i,
		})
		await artifactPreview.first().click()

		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })
	})

	test("creates a code artifact with deterministic code content", async ({
		authenticatedPage,
	}) => {
		const chat = new ChatPage(authenticatedPage)

		await chat.sendMessageAndWaitForResponse("Create a code artifact titled 'Fibonacci Script'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })

		// The fixture generates a Python fibonacci snippet for code artifacts
		await expect(artifactPanel).toContainText("fibonacci")
	})

	test("follow-up update message modifies the artifact", async ({ authenticatedPage }) => {
		const chat = new ChatPage(authenticatedPage)

		// First — create an artifact
		await chat.sendMessageAndWaitForResponse("Create a text artifact titled 'Update Test'")

		const artifactPanel = authenticatedPage.getByTestId("artifact-panel")
		await expect(artifactPanel).toBeVisible({ timeout: 15_000 })

		// Close the artifact panel — it's a full-screen overlay that blocks
		// the chat input. The follow-up message can only be typed after closing.
		const closeButton = authenticatedPage.getByTestId("artifact-close-button")
		await closeButton.click()
		await expect(artifactPanel).not.toBeVisible()

		// Send follow-up to update the artifact
		await chat.sendMessageAndWaitForResponse(
			"Update the current artifact with improved content",
		)

		// Verify the assistant confirmed the update
		const lastAssistantText = await chat.getLastAssistantMessageContent()
		expect(lastAssistantText).toContain("updated the artifact")
	})
})
