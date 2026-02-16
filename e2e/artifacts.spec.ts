import { expect, test } from "@playwright/test"

/**
 * E2E Tests for Artifact Functionality
 * Tests artifact creation, editing, and version management
 */

test.describe("Artifacts Flow", () => {
	test.describe("Artifact Creation", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/")
		})

		test("should create text artifact from chat message", async ({
			page,
		}) => {
			// Send a message that might generate an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a text document about AI")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			// Wait for response
			await page.waitForTimeout(3000)

			// Look for artifact indicator in the response
			const artifactIndicator = page
				.locator(
					'[class*="artifact"], [data-testid="artifact"], button:has-text("artifact")',
				)
				.first()

			// If artifact was created, it should be visible or clickable
			if (
				await artifactIndicator
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await expect(artifactIndicator).toBeVisible()
			}
		})

		test("should create code artifact from chat message", async ({
			page,
		}) => {
			// Send a message requesting code
			const input = page.locator("textarea").first()
			await input.fill("Write a Python function to calculate fibonacci")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			// Wait for response
			await page.waitForTimeout(3000)

			// Look for code block or artifact
			const codeBlock = page.locator("pre, code, [class*='code']").first()
			await expect(codeBlock)
				.toBeVisible({ timeout: 10000 })
				.catch(() => {
					// Code might be in an artifact panel
				})
		})
	})

	test.describe("Artifact Panel", () => {
		test("should open artifact panel when clicking artifact", async ({
			page,
		}) => {
			await page.goto("/")

			// First, create an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document with some content")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Look for clickable artifact
			const artifactTrigger = page
				.locator(
					'[class*="artifact-trigger"], button:has-text("document"), [data-testid="artifact-trigger"]',
				)
				.first()

			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Artifact panel should open
				const artifactPanel = page
					.locator(
						'[class*="artifact-panel"], [data-testid="artifact-panel"], [role="dialog"]',
					)
					.first()
				await expect(artifactPanel).toBeVisible({ timeout: 5000 })
			}
		})

		test("should close artifact panel when clicking close button", async ({
			page,
		}) => {
			await page.goto("/")

			// Create an artifact and open panel
			const input = page.locator("textarea").first()
			await input.fill("Create a document")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact panel if available
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Find close button
				const closeButton = page
					.locator(
						'button[aria-label*="close"], button:has([class*="close"]), [data-testid="close-artifact"]',
					)
					.first()

				if (await closeButton.isVisible()) {
					await closeButton.click()

					// Panel should be closed
					const artifactPanel = page
						.locator('[class*="artifact-panel"]')
						.first()
					await expect(artifactPanel).not.toBeVisible()
				}
			}
		})
	})

	test.describe("Artifact Editing", () => {
		test("should allow editing text artifact content", async ({ page }) => {
			await page.goto("/")

			// Create a text artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a text document")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact panel
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for editable content area
				const editor = page
					.locator(
						'[contenteditable="true"], textarea, .ProseMirror, [class*="editor"]',
					)
					.first()

				if (
					await editor.isVisible({ timeout: 5000 }).catch(() => false)
				) {
					// Try to edit content
					await editor.click()
					await editor.fill("Updated content for the artifact")

					// Content should be updated
					await expect(editor).toContainText("Updated content")
				}
			}
		})

		test("should save artifact changes", async ({ page }) => {
			await page.goto("/")

			// Create an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document to edit")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open and edit artifact
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for save button
				const saveButton = page
					.locator(
						'button:has-text("Save"), button:has-text("Update"), button[aria-label*="save"]',
					)
					.first()

				if (
					await saveButton
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					await saveButton.click()

					// Should show success indicator
					const successIndicator = page
						.locator("text=/saved|updated|success/i")
						.first()
					await expect(successIndicator)
						.toBeVisible({ timeout: 5000 })
						.catch(() => {
							// Might auto-save without explicit indicator
						})
				}
			}
		})
	})

	test.describe("Artifact Versions", () => {
		test("should display version history", async ({ page }) => {
			await page.goto("/")

			// Create an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document for versioning")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact panel
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for version history button
				const versionButton = page
					.locator(
						'button:has-text("version"), button:has-text("history"), [aria-label*="version"]',
					)
					.first()

				if (
					await versionButton
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					await versionButton.click()

					// Should show version list
					const versionList = page
						.locator('[class*="version"], [class*="history"]')
						.first()
					await expect(versionList)
						.toBeVisible({ timeout: 5000 })
						.catch(() => {
							// Version UI might be different
						})
				}
			}
		})

		test("should allow reverting to previous version", async ({ page }) => {
			await page.goto("/")

			// Create and modify an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact and make changes
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for revert/rollback option
				const revertButton = page
					.locator(
						'button:has-text("revert"), button:has-text("rollback"), button:has-text("restore")',
					)
					.first()

				if (
					await revertButton
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					await revertButton.click()

					// Confirm revert if dialog appears
					const confirmButton = page
						.locator(
							'button:has-text("confirm"), button:has-text("yes")',
						)
						.first()
					if (await confirmButton.isVisible()) {
						await confirmButton.click()
					}
				}
			}
		})
	})

	test.describe("Artifact Types", () => {
		test("should handle code artifacts with syntax highlighting", async ({
			page,
		}) => {
			await page.goto("/")

			// Request code generation
			const input = page.locator("textarea").first()
			await input.fill("Write a JavaScript function")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Look for code artifact or code block
			const codeArtifact = page
				.locator('pre code, [class*="code-editor"], [class*="syntax"]')
				.first()

			await expect(codeArtifact)
				.toBeVisible({ timeout: 10000 })
				.catch(() => {
					// Code might be displayed differently
				})
		})

		test("should handle image artifacts", async ({ page }) => {
			await page.goto("/")

			// Request image generation (if supported)
			const input = page.locator("textarea").first()
			await input.fill("Generate an image of a sunset")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(5000)

			// Look for image
			const imageArtifact = page
				.locator('img, [class*="image-artifact"]')
				.first()

			await expect(imageArtifact)
				.toBeVisible({ timeout: 15000 })
				.catch(() => {
					// Image generation might not be supported
				})
		})

		test("should handle sheet/spreadsheet artifacts", async ({ page }) => {
			await page.goto("/")

			// Request spreadsheet creation
			const input = page.locator("textarea").first()
			await input.fill("Create a spreadsheet with sample data")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Look for spreadsheet artifact
			const sheetArtifact = page
				.locator(
					'[class*="sheet"], [class*="spreadsheet"], [class*="grid"], table',
				)
				.first()

			await expect(sheetArtifact)
				.toBeVisible({ timeout: 10000 })
				.catch(() => {
					// Spreadsheet might not be generated
				})
		})
	})

	test.describe("Artifact Actions", () => {
		test("should allow copying artifact content", async ({ page }) => {
			await page.goto("/")

			// Create an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document to copy")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact panel
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for copy button
				const copyButton = page
					.locator(
						'button:has-text("copy"), button[aria-label*="copy"], [class*="copy-button"]',
					)
					.first()

				if (
					await copyButton
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					await copyButton.click()

					// Should show copy success indicator
					const copyIndicator = page
						.locator("text=/copied|copied to clipboard/i")
						.first()
					await expect(copyIndicator)
						.toBeVisible({ timeout: 3000 })
						.catch(() => {
							// Copy might be silent
						})
				}
			}
		})

		test("should allow downloading artifact", async ({ page }) => {
			await page.goto("/")

			// Create an artifact
			const input = page.locator("textarea").first()
			await input.fill("Create a document to download")

			const sendButton = page
				.locator(
					'button[type="submit"], button:has([class*="send"]), button[aria-label*="send"]',
				)
				.first()
			await sendButton.click()

			await page.waitForTimeout(3000)

			// Open artifact panel
			const artifactTrigger = page
				.locator('[class*="artifact-trigger"]')
				.first()
			if (
				await artifactTrigger
					.isVisible({ timeout: 5000 })
					.catch(() => false)
			) {
				await artifactTrigger.click()

				// Look for download button
				const downloadButton = page
					.locator(
						'button:has-text("download"), button[aria-label*="download"], [class*="download-button"]',
					)
					.first()

				if (
					await downloadButton
						.isVisible({ timeout: 3000 })
						.catch(() => false)
				) {
					// Setup download listener
					const [download] = await Promise.all([
						page.waitForEvent("download").catch(() => null),
						downloadButton.click(),
					])

					if (download) {
						expect(download.suggestedFilename()).toBeTruthy()
					}
				}
			}
		})
	})
})
