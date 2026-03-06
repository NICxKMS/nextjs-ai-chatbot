// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockUseArtifactSelector = vi.fn()
const mockToastError = vi.fn()

vi.mock("@/features/artifacts/hooks/use-artifact-selector", () => ({
	useArtifactSelector: (selector: (artifact: { artifactId?: string }) => unknown) =>
		mockUseArtifactSelector(selector),
}))

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
	},
}))

import { VersionFooter } from "@/features/artifacts/components/version-footer"
import { createMockArtifact } from "@/tests/fixtures/artifact"

beforeEach(() => {
	vi.clearAllMocks()
	mockUseArtifactSelector.mockImplementation(
		(selector: (artifact: { artifactId?: string }) => unknown) =>
			selector({ artifactId: "artifact-1" }),
	)
})

describe("version-footer.tsx deep coverage", () => {
	it("returns null when there are no versions or current version is latest", () => {
		const { container: emptyVersions } = render(
			<VersionFooter
				currentVersionIndex={0}
				handleVersionChange={vi.fn()}
				onVersionRestore={vi.fn()}
				versions={[]}
			/>,
		)
		expect(emptyVersions.firstChild).toBeNull()

		const versions = [
			createMockArtifact({ createdAt: new Date("2026-01-01T00:00:00Z") }),
			createMockArtifact({ createdAt: new Date("2026-01-02T00:00:00Z") }),
		]
		const { container: latestVersion } = render(
			<VersionFooter
				currentVersionIndex={1}
				handleVersionChange={vi.fn()}
				onVersionRestore={vi.fn()}
				versions={versions}
			/>,
		)

		expect(latestVersion.firstChild).toBeNull()
	})

	it("renders version metadata and navigation controls for non-latest versions", () => {
		const handleVersionChange = vi.fn()
		const versions = [
			createMockArtifact({
				createdAt: new Date("2026-01-01T10:00:00Z"),
				id: "v1",
			}),
			createMockArtifact({
				createdAt: new Date("2026-01-02T12:00:00Z"),
				id: "v2",
			}),
		]

		render(
			<VersionFooter
				currentVersionIndex={0}
				handleVersionChange={handleVersionChange}
				onVersionRestore={vi.fn()}
				versions={versions}
			/>,
		)

		expect(screen.getByText("Version 1 of 2")).toBeInTheDocument()
		expect(screen.getByText(/Restore this version to make edits/i)).toBeInTheDocument()

		expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
		expect(screen.getByRole("button", { name: "Next" })).toBeEnabled()

		fireEvent.click(screen.getByRole("button", { name: "Next" }))
		expect(handleVersionChange).toHaveBeenCalledWith("next")

		fireEvent.click(screen.getByRole("button", { name: /Back to latest version/i }))
		expect(handleVersionChange).toHaveBeenCalledWith("latest")
	})

	it("restores version content successfully and returns to latest", async () => {
		const handleVersionChange = vi.fn()
		const onVersionRestore = vi.fn().mockResolvedValue(undefined)
		const fetchMock = vi.fn().mockResolvedValue({ ok: true })
		const originalFetch = globalThis.fetch
		globalThis.fetch = fetchMock as unknown as typeof fetch

		try {
			const versions = [
				createMockArtifact({
					content: "older",
					createdAt: new Date("2026-01-01T10:00:00Z"),
					id: "v1",
					kind: "text",
				}),
				createMockArtifact({
					content: "latest",
					createdAt: new Date("2026-01-02T12:00:00Z"),
					id: "v2",
					kind: "text",
				}),
			]

			render(
				<VersionFooter
					currentVersionIndex={0}
					handleVersionChange={handleVersionChange}
					onVersionRestore={onVersionRestore}
					versions={versions}
				/>,
			)

			fireEvent.click(screen.getByRole("button", { name: /restore this version/i }))

			await waitFor(() => {
				expect(fetchMock).toHaveBeenCalledWith(
					"/api/artifact",
					expect.objectContaining({ method: "POST" }),
				)
			})

			const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string }
			expect(requestInit.body).toBeDefined()
			if (!requestInit.body) {
				throw new Error("Expected restore request body")
			}

			const payload = JSON.parse(requestInit.body) as {
				id: string
				mode: string
				timestamp: string
			}
			expect(payload.id).toBe("artifact-1")
			expect(payload.mode).toBe("restore")
			expect(payload.timestamp).toBeTruthy()

			expect(onVersionRestore).toHaveBeenCalled()
			expect(handleVersionChange).toHaveBeenCalledWith("latest")
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	it("reports restore errors and skips restore when timestamp is missing", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false })
		const originalFetch = globalThis.fetch
		globalThis.fetch = fetchMock as unknown as typeof fetch

		try {
			const versions = [
				createMockArtifact({
					content: "older",
					createdAt: new Date("2026-01-01T10:00:00Z"),
					id: "v1",
					kind: "text",
				}),
				createMockArtifact({
					content: "latest",
					createdAt: new Date("2026-01-02T12:00:00Z"),
					id: "v2",
					kind: "text",
				}),
			]

			const { unmount } = render(
				<VersionFooter
					currentVersionIndex={0}
					handleVersionChange={vi.fn()}
					onVersionRestore={vi.fn()}
					versions={versions}
				/>,
			)

			fireEvent.click(screen.getByRole("button", { name: /restore this version/i }))

			await waitFor(() => {
				expect(mockToastError).toHaveBeenCalledWith(
					"Failed to restore version. Please try again.",
				)
			})

			unmount()

			const missingTimestampFetch = vi.fn()
			globalThis.fetch = missingTimestampFetch as unknown as typeof fetch

			render(
				<VersionFooter
					currentVersionIndex={99}
					handleVersionChange={vi.fn()}
					onVersionRestore={vi.fn()}
					versions={versions}
				/>,
			)

			fireEvent.click(screen.getByRole("button", { name: /restore this version/i }))
			expect(missingTimestampFetch).not.toHaveBeenCalled()
		} finally {
			globalThis.fetch = originalFetch
		}
	})
})
