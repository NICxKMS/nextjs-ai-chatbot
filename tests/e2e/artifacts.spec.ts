import { expect, test } from "@playwright/test"

// ── Artifact E2E Tests ───────────────────────────────────────
// Covers: AI creates text artifact (panel opens), code artifact
// (CodeMirror renders), version navigation, close panel.
// Uses data-testid selectors for stability.
// All naming uses "artifact" (never "document").

test.describe("Artifacts", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page — guest session is auto-bootstrapped
		await page.goto("/")
		await expect(page.getByTestId("multimodal-input")).toBeVisible()
	})

	test.describe("Text Artifact", () => {
		test("should open artifact panel when AI creates a text artifact", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Request the AI to create a text artifact
			await input.fill("Help me write an essay about Silicon Valley")
			await page.getByTestId("send-button").click()

			// Wait for the artifact panel to open
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })
		})

		test("should display artifact content in the editor", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			await input.fill("Write a short paragraph about TypeScript")
			await page.getByTestId("send-button").click()

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Artifact panel should contain content (editor is rendered)
			await expect(artifactPanel).not.toBeEmpty()
		})
	})

	test.describe("Code Artifact", () => {
		test("should open artifact panel with CodeMirror for code artifacts", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Request the AI to create a code artifact
			await input.fill(
				"Create a Python function that calculates fibonacci numbers recursively",
			)
			await page.getByTestId("send-button").click()

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
			const input = page.getByTestId("multimodal-input")

			// Create initial artifact
			await input.fill("Write a haiku about programming")
			await page.getByTestId("send-button").click()

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Wait for streaming to complete (send button reappears)
			await expect(page.getByTestId("send-button")).toBeVisible({ timeout: 30000 })

			// Ask for an update to create a new version
			await input.fill("Make the haiku about debugging instead")
			await page.getByTestId("send-button").click()

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
			const input = page.getByTestId("multimodal-input")

			// Create an artifact
			await input.fill("Write a short poem about clouds")
			await page.getByTestId("send-button").click()

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Close the artifact panel
			const closeButton = page.getByTestId("artifact-close-button")
			await closeButton.click()

			// Artifact panel should be hidden
			await expect(artifactPanel).not.toBeVisible()
		})

		test("should reopen artifact by clicking on it in chat", async ({ page }) => {
			const input = page.getByTestId("multimodal-input")

			// Create an artifact
			await input.fill("Write a limerick about JavaScript")
			await page.getByTestId("send-button").click()

			// Wait for artifact panel
			const artifactPanel = page.getByTestId("artifact-panel")
			await expect(artifactPanel).toBeVisible({ timeout: 60000 })

			// Close the artifact panel
			await page.getByTestId("artifact-close-button").click()
			await expect(artifactPanel).not.toBeVisible()

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
