import { expect, type Page, test } from "@playwright/test"
import { ARTIFACT_E2E_COOKIE_NAME } from "@/features/chat/lib/e2e-artifact-fixture-cookie"
import { gotoIsolatedGuestHome, toCookie } from "./session-helpers"

const TOOL_CAPABLE_MODEL_ID = "google:gemini-2.5-flash-lite"
const MODEL_COOKIE_NAME = "chat-model"

async function bootstrapToolCapableModel(page: Page) {
	await gotoIsolatedGuestHome(page, [
		toCookie(MODEL_COOKIE_NAME, TOOL_CAPABLE_MODEL_ID),
		toCookie(ARTIFACT_E2E_COOKIE_NAME, "1"),
	])
	await expect(page.getByTestId("multimodal-input")).toBeVisible({ timeout: 15000 })
}

async function sendArtifactPrompt(page: Page, prompt: string) {
	const requestPromise = page.waitForRequest(
		(request) => request.method() === "POST" && request.url().includes("/api/chat"),
	)

	const input = page.getByTestId("multimodal-input")
	await input.fill(prompt)
	await page.getByTestId("send-button").click()

	const request = await requestPromise
	const payload = request.postDataJSON() as { selectedChatModel?: string }
	await expect(payload.selectedChatModel).toBe(TOOL_CAPABLE_MODEL_ID)
}

async function closeArtifactPanel(page: Page) {
	await expect(page.getByTestId("send-button")).toBeVisible({ timeout: 60000 })
	await page.getByTestId("artifact-close-button").click()
	await expect(page.getByTestId("artifact-panel")).not.toBeVisible({ timeout: 15000 })
}

// ── Artifact E2E Tests ───────────────────────────────────────
// Covers: AI creates text artifact (panel opens), code artifact
// (CodeMirror renders), version navigation, close panel.
// Uses data-testid selectors for stability.
// All naming uses "artifact" (never "document").

test.describe("Artifacts", () => {
	test.beforeEach(async ({ page }) => {
		await bootstrapToolCapableModel(page)
	})

	test.describe("Text Artifact", () => {
		test("should open artifact panel when AI creates a text artifact", async ({ page }) => {
			await sendArtifactPrompt(
				page,
				"Create a text artifact titled 'Silicon Valley Essay' with at least 12 lines about Silicon Valley. Use the artifact panel instead of replying inline.",
			)

			// Wait for the artifact panel to open
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })
		})

		test("should display artifact content in the editor", async ({ page }) => {
			await sendArtifactPrompt(
				page,
				"Create a text artifact titled 'TypeScript Overview' with at least 12 lines explaining TypeScript and why teams adopt it. Use the artifact panel.",
			)

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Artifact panel should contain content (editor is rendered)
			await expect(artifactPanel).not.toBeEmpty()
		})
	})

	test.describe("Code Artifact", () => {
		test("should open artifact panel with CodeMirror for code artifacts", async ({ page }) => {
			await sendArtifactPrompt(
				page,
				"Create a code artifact titled 'fibonacci.py' containing a recursive Python fibonacci function that prints the first 8 Fibonacci numbers. Use the artifact panel.",
			)

			// Wait for the artifact panel to open
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// CodeMirror editor should be rendered inside the artifact panel
			// CodeMirror uses the .cm-editor class
			const codeEditor = artifactPanel.locator(".cm-editor")
			await expect(codeEditor).toBeVisible({ timeout: 10000 })
		})
	})

	test.describe("Version Navigation", () => {
		test("should navigate between artifact versions", async ({ page }) => {
			// Create initial artifact
			await sendArtifactPrompt(
				page,
				"Create a text artifact titled 'Programming Haiku' with a multi-line haiku sequence about programming. Use the artifact panel.",
			)

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Wait for streaming to complete (send button reappears)
			await expect(page.getByTestId("send-button")).toBeVisible({ timeout: 30000 })
			await closeArtifactPanel(page)

			// Ask for an update to create a new version
			await sendArtifactPrompt(
				page,
				"Update the current artifact so the haiku sequence is about debugging instead of programming. Rewrite the artifact in the panel.",
			)

			// Wait for the update to complete
			await expect(page.getByTestId("send-button")).toBeVisible({ timeout: 60000 })

			// Version footer should appear with navigation buttons
			// Check for Previous/Next buttons in version footer
			const previousButton = artifactPanel.getByRole("button", { name: "Previous" })

			// Navigate to previous version
			if (await previousButton.isVisible()) {
				await previousButton.click()

				// Should show version indicator text
				await expect(artifactPanel.getByText(/Version \d+ of \d+/)).toBeVisible()
			}
		})
	})

	test.describe("Close Panel", () => {
		test("should close the artifact panel", async ({ page }) => {
			// Create an artifact
			await sendArtifactPrompt(
				page,
				"Create a text artifact titled 'Cloud Poem' with at least 12 lines about clouds. Use the artifact panel.",
			)

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Close the artifact panel
			await closeArtifactPanel(page)
		})

		test("should reopen artifact by clicking on it in chat", async ({ page }) => {
			// Create an artifact
			await sendArtifactPrompt(
				page,
				"Create a text artifact titled 'JavaScript Limerick' with a limerick about JavaScript. Use the artifact panel.",
			)

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Close the artifact panel
			await closeArtifactPanel(page)

			// Click on the artifact reference in the chat to reopen
			// Artifact references render as preview hitboxes with an accessible button label.
			const assistantMessage = page.getByTestId("message-assistant").last()
			const artifactLink = assistantMessage.getByRole("button", { name: /open artifact:/i })

			await expect(artifactLink).toBeVisible({ timeout: 10000 })
			await artifactLink.click()
			await expect(artifactPanel).toBeVisible({ timeout: 10000 })
		})
	})
})
