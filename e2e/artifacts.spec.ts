import { expect, type Page, test } from "@playwright/test"

type ArtifactKind = "text" | "code" | "image" | "sheet"

const ARTIFACT_FIXTURE_COOKIE = "e2e-artifact-fixture"
const ARTIFACT_EDITOR_CRASH_COOKIE = "e2e-artifact-editor-crash"
const FALLBACK_BASE_URL = "http://127.0.0.1:3000"

async function enableArtifactFixture(page: Page, baseURL?: string) {
	await page.context().addCookies([
		{
			name: ARTIFACT_FIXTURE_COOKIE,
			value: "1",
			url: baseURL ?? FALLBACK_BASE_URL,
		},
	])
}

async function enableArtifactEditorCrash(page: Page, baseURL?: string) {
	await page.context().addCookies([
		{
			name: ARTIFACT_EDITOR_CRASH_COOKIE,
			value: "1",
			url: baseURL ?? FALLBACK_BASE_URL,
		},
	])
}

async function sendChatMessage(page: Page, message: string) {
	await page.getByTestId("multimodal-input").fill(message)
	await page.getByTestId("send-button").click()
}

async function createArtifactFromFixture({
	page,
	baseURL,
	title,
	kind,
}: {
	page: Page
	baseURL?: string
	title: string
	kind: ArtifactKind
}) {
	await enableArtifactFixture(page, baseURL)
	await page.goto("/")
	await sendChatMessage(page, `create a ${kind} artifact titled '${title}'`)

	await expect(page.getByRole("dialog", { name: `Artifact: ${title}` })).toBeVisible()
	await expect(page.getByTestId("message-assistant")).toContainText(
		"I've created the artifact in the panel.",
	)
	await page.getByTestId("artifact-close-button").click()
	await expect(page.getByTestId("artifact-panel")).toBeHidden()

	const openArtifactButton = page.getByRole("button", {
		name: `Open artifact: ${title}`,
	})
	await expect(openArtifactButton).toBeVisible()
	await openArtifactButton.click()

	const panel = page.getByTestId("artifact-panel")
	await expect(panel).toBeVisible()
	await expect(page.getByRole("dialog", { name: `Artifact: ${title}` })).toBeVisible()

	return panel
}

function mockArtifactVersion({
	id,
	title,
	content,
	createdAt,
}: {
	id: string
	title: string
	content: string
	createdAt: string
}) {
	return {
		id,
		createdAt,
		updatedAt: createdAt,
		title,
		content,
		kind: "text",
		userId: "00000000-0000-4000-8000-000000000001",
		chatId: "00000000-0000-4000-8000-000000000002",
	}
}

test.describe("artifact route smoke", () => {
	test("artifact API rejects anonymous reads with a structured error", async ({ request }) => {
		const response = await request.get("/api/artifact?id=33333333-3333-4333-8333-333333333333")
		expect(response.status()).toBe(401)
		await expect(response.json()).resolves.toMatchObject({
			code: expect.stringContaining("unauthorized"),
		})
	})
})

test.describe("artifact UI", () => {
	test("opens a streamed text artifact from its preview and renders the panel content", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Text Artifact"
		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })

		await expect(
			panel.getByText("This artifact is generated from the scoped e2e artifact fixture."),
		).toBeVisible()
		await expect(
			panel.getByText("This final line guarantees a visible multi-line artifact body."),
		).toBeVisible()
	})

	test("shows text artifact save feedback during a successful save", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Save Feedback Artifact"
		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })
		const editor = panel.locator(".ProseMirror")
		const updatedContent = "Batch 3 save feedback content updated from Playwright."
		let releaseSaveResponse: (() => void) | undefined
		let postedSaveBody: { id: string; title: string; content: string; mode: string } | null =
			null

		await page.route("**/api/artifact", async (route) => {
			const request = route.request()

			if (request.method() !== "POST") {
				await route.continue()
				return
			}

			postedSaveBody = request.postDataJSON() as {
				id: string
				title: string
				content: string
				mode: string
			}

			const savedArtifact = mockArtifactVersion({
				id: postedSaveBody.id ?? "fixture-save-feedback-id",
				title,
				content: postedSaveBody.content ?? updatedContent,
				createdAt: "2026-05-02T12:00:00.000Z",
			})

			await new Promise<void>((resolve) => {
				releaseSaveResponse = resolve
			})

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ artifact: savedArtifact }),
			})
		})

		await editor.click()
		await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A")
		await page.keyboard.type(updatedContent)

		await expect(panel.getByText("Unsaved changes")).toBeVisible()
		await expect
			.poll(() => postedSaveBody)
			.toMatchObject({
				mode: "save",
				content: updatedContent,
			})
		await expect(panel.getByText("Saving changes…")).toBeVisible()

		releaseSaveResponse?.()

		await expect(panel.getByText(/^Updated /)).toBeVisible()
		await expect(panel.getByText("Unsaved changes")).toBeHidden()
		await expect(panel.getByText("Saving changes…")).toBeHidden()
	})

	test("contains an artifact editor crash and keeps panel chrome usable", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Crash Containment Artifact"
		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })

		await enableArtifactEditorCrash(page, baseURL)
		await page.getByTestId("artifact-close-button").click()
		await expect(panel).toBeHidden()

		await page.getByRole("button", { name: `Open artifact: ${title}` }).click()

		const crashedPanel = page.getByTestId("artifact-panel")
		const fallback = crashedPanel.getByRole("alert")

		await expect(fallback).toContainText("Failed to render artifact")
		await expect(crashedPanel.getByRole("button", { name: "Retry" })).toBeVisible()
		await expect(crashedPanel.getByTestId("artifact-close-button")).toBeVisible()

		await crashedPanel.getByTestId("artifact-close-button").click()
		await expect(crashedPanel).toBeHidden()
	})

	test("renders a streamed code artifact in the code editor path", async ({ page, baseURL }) => {
		const panel = await createArtifactFromFixture({
			page,
			baseURL,
			title: "Batch 3 Code Artifact",
			kind: "code",
		})

		await expect(panel.getByRole("button", { name: "Run code" })).toBeVisible()
		await expect(panel.locator(".cm-content")).toContainText("def fibonacci")
		await expect(panel.locator(".cm-content")).toContainText("print")
	})

	test("renders a streamed sheet artifact in the spreadsheet path", async ({ page, baseURL }) => {
		const panel = await createArtifactFromFixture({
			page,
			baseURL,
			title: "Batch 3 Sheet Artifact",
			kind: "sheet",
		})

		await expect(panel.getByRole("grid")).toBeVisible()
		await expect(panel.getByText("Artifact Fixture")).toBeVisible()
		await expect(panel.getByText("Deterministic sheet content for Playwright")).toBeVisible()
	})

	test("renders a streamed image artifact and contains broken image errors to the editor area", async ({
		page,
		baseURL,
	}) => {
		const imageTitle = "Batch 3 Image Artifact"
		const imagePanel = await createArtifactFromFixture({
			page,
			baseURL,
			title: imageTitle,
			kind: "image",
		})

		const artifactImage = imagePanel.getByRole("img", { name: imageTitle })
		await expect(artifactImage).toBeVisible()
		await expect(artifactImage).toHaveAttribute("src", /^data:image\/svg\+xml/)
		await expect
			.poll(async () =>
				artifactImage.evaluate((img) => (img as HTMLImageElement).naturalWidth),
			)
			.toBeGreaterThan(0)

		await page.getByTestId("artifact-close-button").click()
		await sendChatMessage(
			page,
			"create a broken image artifact titled 'Batch 3 Broken Image Artifact'",
		)

		const brokenPanel = page.getByTestId("artifact-panel")
		await expect(
			page.getByRole("dialog", { name: "Artifact: Batch 3 Broken Image Artifact" }),
		).toBeVisible()
		await expect(brokenPanel.getByRole("alert")).toContainText("Failed to load image")
		await expect(brokenPanel.getByRole("button", { name: "Close artifact" })).toBeVisible()
	})

	test("streams an artifact update and exposes the saved updated version", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Update Artifact"
		const previousContent = "Batch 3 original content before the fixture update."
		const updatedContent = "Batch 3 updated content from the deterministic fixture route."
		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })

		await page.getByTestId("artifact-close-button").click()
		await expect(panel).toBeHidden()
		await page.route("**/api/artifact**", async (route) => {
			const request = route.request()
			const artifactId = new URL(request.url()).searchParams.get("id") ?? "fixture-update-id"
			const previousVersion = mockArtifactVersion({
				id: artifactId,
				title,
				content: previousContent,
				createdAt: "2026-05-02T11:00:00.000Z",
			})
			const updatedVersion = mockArtifactVersion({
				id: artifactId,
				title,
				content: updatedContent,
				createdAt: "2026-05-02T11:05:00.000Z",
			})

			if (request.method() === "POST") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ artifact: updatedVersion }),
				})
				return
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([updatedVersion, previousVersion]),
			})
		})

		await sendChatMessage(page, "update the current artifact with fixture update coverage")
		await expect(page.getByTestId("message-assistant").last()).toContainText(
			"I've updated the artifact in the panel.",
		)

		await expect(panel).toBeVisible()
		await expect(panel.getByText(updatedContent)).toBeVisible()
		await expect(panel.getByText("Version 2 of 2")).toBeVisible()
	})

	test("displays streamed artifact suggestions and keeps them visible after reopening", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Suggestion Artifact"
		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })

		await page.getByTestId("artifact-close-button").click()
		await expect(panel).toBeHidden()

		await sendChatMessage(page, "request suggestions for the current artifact")
		await expect(page.getByTestId("message-assistant").last()).toContainText(
			"Suggestions generated.",
		)

		await expect(panel).toBeVisible()
		await expect(panel.getByText("Assistant")).toBeVisible()
		await expect(
			panel.getByText("Clarify that the fixture stream renders inline suggestions."),
		).toBeVisible()
		await expect(panel.getByRole("button", { name: "Apply" })).toBeVisible()

		await page.getByTestId("artifact-close-button").click()
		await page.getByRole("button", { name: `Open artifact: ${title}` }).click()
		await expect(
			panel.getByText("Clarify that the fixture stream renders inline suggestions."),
		).toBeVisible()
	})

	test("navigates artifact versions and restores a mocked previous version", async ({
		page,
		baseURL,
	}) => {
		const title = "Batch 3 Version Artifact"
		const previousContent = "Batch 3 previous version content from mocked API."
		const latestContent = "Batch 3 latest version content from mocked API."
		const previousCreatedAt = "2026-05-02T10:00:00.000Z"
		const latestCreatedAt = "2026-05-02T10:05:00.000Z"
		const restoreRequests: unknown[] = []
		let restored = false

		await page.route("**/api/artifact**", async (route) => {
			const request = route.request()
			const url = new URL(request.url())
			const requestBody = request.method() === "POST" ? request.postDataJSON() : null
			const postedArtifactId =
				requestBody &&
				typeof requestBody === "object" &&
				"id" in requestBody &&
				typeof requestBody.id === "string"
					? requestBody.id
					: undefined
			const artifactId =
				url.searchParams.get("id") ??
				postedArtifactId ??
				"00000000-0000-4000-8000-000000000003"
			const previousVersion = mockArtifactVersion({
				id: artifactId,
				title,
				content: previousContent,
				createdAt: previousCreatedAt,
			})
			const latestVersion = mockArtifactVersion({
				id: artifactId,
				title,
				content: latestContent,
				createdAt: latestCreatedAt,
			})

			if (request.method() === "POST") {
				if (
					requestBody &&
					typeof requestBody === "object" &&
					"mode" in requestBody &&
					requestBody.mode === "restore"
				) {
					restoreRequests.push(requestBody)
					restored = true
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify({ success: true }),
					})
					return
				}

				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ artifact: latestVersion }),
				})
				return
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(
					url.searchParams.get("view") === "latest"
						? [restored ? previousVersion : latestVersion]
						: restored
							? [previousVersion]
							: [latestVersion, previousVersion],
				),
			})
		})

		const panel = await createArtifactFromFixture({ page, baseURL, title, kind: "text" })
		await expect(panel.getByText(latestContent)).toBeVisible()

		await panel.getByRole("button", { name: "Previous" }).click()
		await expect(panel.getByText("Version 1 of 2")).toBeVisible()
		await expect(panel.getByText(previousContent)).toBeVisible()
		await expect(panel.getByRole("button", { name: "Previous" })).toBeDisabled()

		await panel.getByRole("button", { name: "Back to latest version" }).click()
		await expect(panel.getByText(latestContent)).toBeVisible()
		await expect(panel.getByText("Version 1 of 2")).toBeHidden()

		await panel.getByRole("button", { name: "Previous" }).click()
		await panel.getByRole("button", { name: "Next" }).click()
		await expect(panel.getByText(latestContent)).toBeVisible()

		await panel.getByRole("button", { name: "Previous" }).click()
		await panel.getByRole("button", { name: "Restore this version" }).click()

		await expect.poll(() => restoreRequests.length).toBe(1)
		expect(restoreRequests[0]).toMatchObject({
			mode: "restore",
			timestamp: previousCreatedAt,
		})
		await expect(panel.getByText(previousContent)).toBeVisible()
		await expect(panel.getByText("Version 1 of 2")).toBeHidden()
	})
})
