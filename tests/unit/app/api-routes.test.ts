import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockArtifact } from "@/tests/fixtures/artifact"
import { createMockSession, TEST_GUEST_ID, TEST_USER_ID } from "@/tests/fixtures/user"

vi.mock("server-only", () => ({}))

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

const mockPing = vi.fn()
vi.mock("@/lib/cache/client", () => ({
	ping: (...args: unknown[]) => mockPing(...args),
}))

const mockDbExecute = vi.fn()
vi.mock("@/lib/db/client", () => ({
	db: {
		execute: (...args: unknown[]) => mockDbExecute(...args),
	},
}))

const mockGetArtifactById = vi.fn()
vi.mock("@/lib/data/artifact", () => ({
	getArtifactById: (...args: unknown[]) => mockGetArtifactById(...args),
}))

const mockGetSuggestionsByArtifactId = vi.fn()
vi.mock("@/lib/data/suggestion", () => ({
	getSuggestionsByArtifactId: (...args: unknown[]) => mockGetSuggestionsByArtifactId(...args),
}))

describe("API routes", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		mockDbExecute.mockResolvedValue([{ ok: 1 }])
		mockPing.mockResolvedValue("PONG")
	})

	describe("GET /api/health", () => {
		it("returns 200 with healthy status when dependencies are healthy", async () => {
			const { GET } = await import("@/app/api/health/route")
			const response = await GET()

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body.status).toBe("healthy")
			expect(body.checks.database.status).toBe("healthy")
			expect(body.checks.cache.status).toBe("healthy")
		})

		it("returns 200 with degraded status when cache is unavailable", async () => {
			mockPing.mockResolvedValue(null)

			const { GET } = await import("@/app/api/health/route")
			const response = await GET()

			expect(response.status).toBe(200)

			const body = await response.json()
			expect(body.status).toBe("degraded")
			expect(body.checks.cache.status).toBe("degraded")
		})

		it("returns 503 with unhealthy status when database check fails", async () => {
			mockDbExecute.mockRejectedValue(new Error("db down"))

			const { GET } = await import("@/app/api/health/route")
			const response = await GET()

			expect(response.status).toBe(503)

			const body = await response.json()
			expect(body.status).toBe("unhealthy")
			expect(body.checks.database.status).toBe("unhealthy")
		})
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
			expect(mockGetSuggestionsByArtifactId).not.toHaveBeenCalled()
		})

		it("returns 200 with suggestions for a valid owned artifact", async () => {
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
			mockGetSuggestionsByArtifactId.mockResolvedValue(suggestions)

			const { GET } = await import("@/app/api/suggestions/route")
			const request = new Request(`http://localhost/api/suggestions?artifactId=${artifactId}`)
			const response = await GET(request)

			expect(response.status).toBe(200)
			const body = await response.json()
			expect(body.suggestions).toHaveLength(1)
			expect(body.suggestions[0]?.suggestedText).toBe("better text")
			expect(mockGetSuggestionsByArtifactId).toHaveBeenCalledWith(artifactId)
		})
	})
})
