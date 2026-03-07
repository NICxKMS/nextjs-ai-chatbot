import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockArtifact } from "@/tests/fixtures/artifact"
import { createMockSession, TEST_GUEST_ID, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockGetArtifactById = vi.fn()
const mockGetArtifactByIdAndCreatedAt = vi.fn()
vi.mock("@/lib/data/artifact", () => ({
	getArtifactById: (...args: unknown[]) => mockGetArtifactById(...args),
	getArtifactByIdAndCreatedAt: (...args: unknown[]) => mockGetArtifactByIdAndCreatedAt(...args),
}))

const mockGetSuggestionsByArtifactVersion = vi.fn()
vi.mock("@/lib/data/suggestion", () => ({
	getSuggestionsByArtifactVersion: (...args: unknown[]) =>
		mockGetSuggestionsByArtifactVersion(...args),
}))

describe("API routes", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe("GET /api/suggestions", () => {
		it("returns 401 when unauthenticated", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(
				`http://localhost/api/suggestions?artifactId=${crypto.randomUUID()}`,
			)
			const response = await GET(request)

			expect(response.status).toBe(401)
			const body = await response.json()
			expect(body.code).toBe("unauthorized:auth:no_session")
		})

		it("returns 400 when artifactId query parameter is missing", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request("http://localhost/api/suggestions")
			const response = await GET(request)

			expect(response.status).toBe(400)
			const body = await response.json()
			expect(body.code).toBe("bad_request:validation:invalid_input")
		})

		it("returns 200 with an empty array for guest users", async () => {
			mockGetAppSession.mockResolvedValue(
				createMockSession({
					user: { id: TEST_GUEST_ID, type: "guest", email: "guest@example.com" },
				}),
			)

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(
				`http://localhost/api/suggestions?artifactId=${crypto.randomUUID()}`,
			)
			const response = await GET(request)

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body).toEqual({ suggestions: [] })
			expect(mockGetArtifactById).not.toHaveBeenCalled()
			expect(mockGetArtifactByIdAndCreatedAt).not.toHaveBeenCalled()
			expect(mockGetSuggestionsByArtifactVersion).not.toHaveBeenCalled()
		})

		it("returns 400 when artifactCreatedAt query parameter is invalid", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(
				`http://localhost/api/suggestions?artifactId=${crypto.randomUUID()}&artifactCreatedAt=not-a-timestamp`,
			)
			const response = await GET(request)

			expect(response.status).toBe(400)
			const body = await response.json()
			expect(body.code).toBe("bad_request:validation:invalid_input")
		})

		it("returns 200 with suggestions for the latest owned artifact version when no artifactCreatedAt is provided", async () => {
			const artifactId = crypto.randomUUID()
			const artifact = createMockArtifact({ id: artifactId, userId: TEST_USER_ID })
			const suggestions = [
				{
					id: crypto.randomUUID(),
					artifactId,
					artifactCreatedAt: artifact.createdAt,
					originalText: "bad text",
					suggestedText: "better text",
					description: "Improve wording",
					isResolved: false,
					userId: TEST_USER_ID,
					createdAt: new Date("2026-01-01T00:00:00Z"),
				},
			]

			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockResolvedValue(artifact)
			mockGetSuggestionsByArtifactVersion.mockResolvedValue(suggestions)

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(`http://localhost/api/suggestions?artifactId=${artifactId}`)
			const response = await GET(request)

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.suggestions).toHaveLength(1)
			expect(body.suggestions[0]?.suggestedText).toBe("better text")
			expect(mockGetArtifactById).toHaveBeenCalledWith(artifactId)
			expect(mockGetSuggestionsByArtifactVersion).toHaveBeenCalledWith(
				artifactId,
				artifact.createdAt,
			)
		})

		it("returns 200 with suggestions for the requested owned artifact version", async () => {
			const artifactId = crypto.randomUUID()
			const artifactCreatedAt = new Date("2026-01-02T00:00:00Z")
			const artifact = createMockArtifact({
				id: artifactId,
				userId: TEST_USER_ID,
				createdAt: artifactCreatedAt,
				updatedAt: artifactCreatedAt,
			})
			const suggestions = [
				{
					id: crypto.randomUUID(),
					artifactId,
					artifactCreatedAt,
					originalText: "older text",
					suggestedText: "version specific text",
					description: "Target the requested version",
					isResolved: false,
					userId: TEST_USER_ID,
					createdAt: new Date("2026-01-02T00:30:00Z"),
				},
			]

			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactByIdAndCreatedAt.mockResolvedValue(artifact)
			mockGetSuggestionsByArtifactVersion.mockResolvedValue(suggestions)

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(
				`http://localhost/api/suggestions?artifactId=${artifactId}&artifactCreatedAt=${encodeURIComponent(
					artifactCreatedAt.toISOString(),
				)}`,
			)
			const response = await GET(request)

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.suggestions).toHaveLength(1)
			expect(body.suggestions[0]?.suggestedText).toBe("version specific text")
			expect(mockGetArtifactByIdAndCreatedAt).toHaveBeenCalledWith(
				artifactId,
				artifactCreatedAt,
			)
			expect(mockGetSuggestionsByArtifactVersion).toHaveBeenCalledWith(
				artifactId,
				artifactCreatedAt,
			)
		})
	})
})
