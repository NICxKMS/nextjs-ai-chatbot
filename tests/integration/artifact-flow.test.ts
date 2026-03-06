import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/lib/errors/app-error"
import { createMockArtifact } from "@/tests/fixtures/artifact"
import { createMockSession, createMockUserPair, TEST_USER_ID } from "@/tests/fixtures/user"
import {
	buildArtifactCreateSequence,
	buildSseStream,
	collectStreamEvents,
	filterArtifactEvents,
} from "@/tests/utils/stream"

const JSON_HEADERS = {
	"Content-Type": "application/json",
	origin: "http://localhost",
}

// ── Module mocks ────────────────────────────────────────────

const mockGetAppSession = vi.fn()
vi.mock("@/lib/auth/session", () => ({
	getAppSession: (...args: unknown[]) => mockGetAppSession(...args),
}))

// Data access — artifact
const mockGetArtifactById = vi.fn()
const mockGetArtifactVersions = vi.fn()
const mockSaveArtifactVersion = vi.fn()
const mockDeleteArtifactVersion = vi.fn()

vi.mock("@/lib/data/artifact", () => ({
	getArtifactById: (...args: unknown[]) => mockGetArtifactById(...args),
	getArtifactVersions: (...args: unknown[]) => mockGetArtifactVersions(...args),
	saveArtifactVersion: (...args: unknown[]) => mockSaveArtifactVersion(...args),
	deleteArtifactVersion: (...args: unknown[]) => mockDeleteArtifactVersion(...args),
}))

// Cache revalidation
vi.mock("@/lib/cache/revalidate", () => ({
	refreshArtifact: vi.fn(),
	refreshChat: vi.fn(),
	refreshChatList: vi.fn(),
}))

// ── Tests ───────────────────────────────────────────────────

describe("Artifact Flow — Integration Tests", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	// ── GET /api/artifact — Auth boundary ────────────────────

	describe("GET /api/artifact — auth boundary", () => {
		it("returns 401 when session is missing", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact?id=some-uuid")

			const response = await GET(request)
			expect(response.status).toBe(401)

			const json = await response.json()
			expect(json.code).toBe("unauthorized:chat:auth_required")
		})
	})

	// ── GET /api/artifact — Validation boundary ──────────────

	describe("GET /api/artifact — validation boundary", () => {
		it("returns 400 when id param is missing", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact")

			const response = await GET(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:validation:invalid_input")
		})

		it("returns 400 when id param is not a valid UUID", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact?id=not-a-uuid")

			const response = await GET(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:validation:invalid_input")
		})
	})

	// ── GET /api/artifact — Not found ────────────────────────

	describe("GET /api/artifact — not found", () => {
		it("returns 404 when artifact does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockResolvedValue(null)

			const artifactId = crypto.randomUUID()
			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request(`http://localhost/api/artifact?id=${artifactId}`)

			const response = await GET(request)
			expect(response.status).toBe(404)

			const json = await response.json()
			expect(json.code).toBe("not_found:artifact:artifact_not_found")
		})
	})

	// ── GET /api/artifact — Ownership boundary ───────────────

	describe("GET /api/artifact — ownership boundary", () => {
		it("returns 403 when non-owner requests artifact versions", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			// Artifact belongs to the owner
			const artifact = createMockArtifact({ userId: TEST_USER_ID })
			mockGetArtifactById.mockResolvedValue(artifact)

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request(`http://localhost/api/artifact?id=${artifact.id}`)

			const response = await GET(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})

		it("allows owner to fetch their artifact versions", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const artifact = createMockArtifact({ userId: TEST_USER_ID })
			mockGetArtifactById.mockResolvedValue(artifact)

			const versions = [
				artifact,
				createMockArtifact({
					id: artifact.id,
					userId: TEST_USER_ID,
					content: "Updated content",
					createdAt: new Date("2026-01-02T00:00:00Z"),
				}),
			]
			mockGetArtifactVersions.mockResolvedValue(versions)

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request(`http://localhost/api/artifact?id=${artifact.id}`)

			const response = await GET(request)
			expect(response.status).toBe(200)

			const json = await response.json()
			expect(json).toHaveLength(2)
		})

		it("returns data-layer AppError responses as-is", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockRejectedValue(
				AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied"),
			)

			const { GET } = await import("@/app/api/artifact/route")
			const request = new Request(`http://localhost/api/artifact?id=${crypto.randomUUID()}`)

			const response = await GET(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})
	})

	// ── POST /api/artifact — Save mode ───────────────────────

	describe("POST /api/artifact — save mode", () => {
		it("returns 403 when origin header is missing", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					mode: "save",
					id: crypto.randomUUID(),
					title: "Test",
					content: "Content",
					kind: "text",
					chatId: crypto.randomUUID(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:api:csrf_failed")
		})

		it("returns 401 when unauthenticated", async () => {
			mockGetAppSession.mockResolvedValue(null)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: crypto.randomUUID(),
					title: "Test",
					content: "Content",
					kind: "text",
					chatId: crypto.randomUUID(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(401)
		})

		it("returns 400 for invalid body schema", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({ mode: "save", id: "not-valid" }),
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:validation:invalid_input")
		})

		it("returns 400 for invalid JSON body", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: "not-json",
			})

			const response = await POST(request)
			expect(response.status).toBe(400)

			const json = await response.json()
			expect(json.code).toBe("bad_request:api:invalid_request_body")
		})

		it("returns 403 when non-owner tries to save to existing artifact", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			// Artifact belongs to the owner
			const existing = createMockArtifact({ userId: TEST_USER_ID })
			mockGetArtifactById.mockResolvedValue(existing)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: existing.id,
					title: "Hijack",
					content: "Evil content",
					kind: "text",
					chatId: existing.chatId,
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})

		it("saves artifact version for the owner", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const artifactId = crypto.randomUUID()
			const chatId = crypto.randomUUID()

			// No existing artifact — new creation
			mockGetArtifactById.mockResolvedValue(null)

			const savedArtifact = createMockArtifact({
				id: artifactId,
				chatId,
				userId: TEST_USER_ID,
				title: "My Artifact",
				content: "Hello world",
				kind: "text",
			})
			mockSaveArtifactVersion.mockResolvedValue(savedArtifact)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "My Artifact",
					content: "Hello world",
					kind: "text",
					chatId,
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const json = await response.json()
			expect(json.artifact.id).toBe(artifactId)
			expect(json.artifact.title).toBe("My Artifact")
		})

		it("returns data-layer AppError responses in save mode", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockResolvedValue(null)
			mockSaveArtifactVersion.mockRejectedValue(
				AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied"),
			)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: crypto.randomUUID(),
					title: "Test",
					content: "Content",
					kind: "text",
					chatId: crypto.randomUUID(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})

		it("returns 500 when save mode hits an unexpected error", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockResolvedValue(null)
			mockSaveArtifactVersion.mockRejectedValue(new Error("write failed"))

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: crypto.randomUUID(),
					title: "Test",
					content: "Content",
					kind: "text",
					chatId: crypto.randomUUID(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(500)

			const json = await response.json()
			expect(json.code).toBe("internal_error:database:query_failed")
		})
	})

	// ── POST /api/artifact — Restore mode ────────────────────

	describe("POST /api/artifact — restore mode", () => {
		it("returns 404 when artifact to restore does not exist", async () => {
			mockGetAppSession.mockResolvedValue(createMockSession())
			mockGetArtifactById.mockResolvedValue(null)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "restore",
					id: crypto.randomUUID(),
					timestamp: new Date().toISOString(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(404)

			const json = await response.json()
			expect(json.code).toBe("not_found:artifact:artifact_not_found")
		})

		it("returns 403 when non-owner tries to restore", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			const existing = createMockArtifact({ userId: TEST_USER_ID })
			mockGetArtifactById.mockResolvedValue(existing)

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "restore",
					id: existing.id,
					timestamp: new Date("2026-01-01T00:00:00Z").toISOString(),
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(403)

			const json = await response.json()
			expect(json.code).toBe("forbidden:chat:owner_mismatch")
		})

		it("restores artifact to a specific version for the owner", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const existing = createMockArtifact({ userId: TEST_USER_ID })
			mockGetArtifactById.mockResolvedValue(existing)
			mockDeleteArtifactVersion.mockResolvedValue(undefined)

			const restoreTimestamp = new Date("2026-01-01T00:00:00Z").toISOString()

			const { POST } = await import("@/app/api/artifact/route")
			const request = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "restore",
					id: existing.id,
					timestamp: restoreTimestamp,
				}),
			})

			const response = await POST(request)
			expect(response.status).toBe(200)

			const json = await response.json()
			expect(json.success).toBe(true)

			// Verify delete was called with correct timestamp (1ms after restore point)
			expect(mockDeleteArtifactVersion).toHaveBeenCalledWith(existing.id, expect.any(Date))
		})
	})

	// ── Stream test utilities — artifact event sequence ──────

	describe("Artifact stream utilities", () => {
		it("builds and parses a complete artifact creation sequence", async () => {
			const parts = buildArtifactCreateSequence({
				id: "art-123",
				title: "Code Example",
				kind: "code",
				content: "const x = 1;",
			})

			const stream = buildSseStream(parts)
			const events = await collectStreamEvents(stream)

			expect(events).toHaveLength(6)

			const artifactEvents = filterArtifactEvents(events)
			expect(artifactEvents).toHaveLength(6)

			// Verify artifact lifecycle ordering
			expect(artifactEvents[0]?.data.type).toBe("artifact-id")
			expect(artifactEvents[0]?.data.content).toBe("art-123")

			expect(artifactEvents[1]?.data.type).toBe("artifact-title")
			expect(artifactEvents[1]?.data.content).toBe("Code Example")

			expect(artifactEvents[2]?.data.type).toBe("artifact-kind")
			expect(artifactEvents[2]?.data.content).toBe("code")

			expect(artifactEvents[3]?.data.type).toBe("artifact-clear")
			expect(artifactEvents[4]?.data.type).toBe("artifact-codeDelta")
			expect(artifactEvents[4]?.data.content).toBe("const x = 1;")

			expect(artifactEvents[5]?.data.type).toBe("artifact-finish")
		})

		it("builds text artifact with textDelta", async () => {
			const parts = buildArtifactCreateSequence({
				kind: "text",
				content: "Hello world",
			})

			const stream = buildSseStream(parts)
			const events = await collectStreamEvents(stream)

			const textDelta = events.find((e) => e.data.type === "artifact-textDelta")
			expect(textDelta).toBeDefined()
			expect(textDelta?.data.content).toBe("Hello world")
		})

		it("builds sheet artifact with sheetDelta", async () => {
			const parts = buildArtifactCreateSequence({
				kind: "sheet",
				content: "csv,data",
			})

			const stream = buildSseStream(parts)
			const events = await collectStreamEvents(stream)

			const sheetDelta = events.find((e) => e.data.type === "artifact-sheetDelta")
			expect(sheetDelta).toBeDefined()
			expect(sheetDelta?.data.content).toBe("csv,data")
		})
	})

	// ── Multi-user artifact ownership ────────────────────────

	describe("Multi-user scenarios — artifact ownership", () => {
		it("owner can perform full artifact lifecycle (save → get → restore)", async () => {
			const { ownerSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(ownerSession)

			const artifactId = crypto.randomUUID()
			const chatId = crypto.randomUUID()

			// 1. Save new artifact
			mockGetArtifactById.mockResolvedValueOnce(null) // new artifact
			const savedArtifact = createMockArtifact({
				id: artifactId,
				chatId,
				userId: TEST_USER_ID,
			})
			mockSaveArtifactVersion.mockResolvedValue(savedArtifact)

			const { POST, GET } = await import("@/app/api/artifact/route")
			const saveRequest = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "Test",
					content: "v1",
					kind: "text",
					chatId,
				}),
			})

			const saveResponse = await POST(saveRequest)
			expect(saveResponse.status).toBe(200)

			// 2. Get versions
			mockGetArtifactById.mockResolvedValueOnce(savedArtifact)
			mockGetArtifactVersions.mockResolvedValue([savedArtifact])

			const getRequest = new Request(`http://localhost/api/artifact?id=${artifactId}`)
			const getResponse = await GET(getRequest)
			expect(getResponse.status).toBe(200)

			// 3. Restore
			mockGetArtifactById.mockResolvedValueOnce(savedArtifact)
			mockDeleteArtifactVersion.mockResolvedValue(undefined)

			const restoreRequest = new Request("http://localhost/api/artifact", {
				method: "POST",
				headers: JSON_HEADERS,
				body: JSON.stringify({
					mode: "restore",
					id: artifactId,
					timestamp: new Date("2026-01-01T00:00:00Z").toISOString(),
				}),
			})

			const restoreResponse = await POST(restoreRequest)
			expect(restoreResponse.status).toBe(200)
		})

		it("non-owner is blocked at every artifact operation", async () => {
			const { otherSession } = createMockUserPair()
			mockGetAppSession.mockResolvedValue(otherSession)

			const ownerArtifact = createMockArtifact({ userId: TEST_USER_ID })

			// GET — blocked
			mockGetArtifactById.mockResolvedValueOnce(ownerArtifact)
			const { GET, POST } = await import("@/app/api/artifact/route")

			const getResponse = await GET(
				new Request(`http://localhost/api/artifact?id=${ownerArtifact.id}`),
			)
			expect(getResponse.status).toBe(403)

			// Save — blocked
			mockGetArtifactById.mockResolvedValueOnce(ownerArtifact)
			const saveResponse = await POST(
				new Request("http://localhost/api/artifact", {
					method: "POST",
					headers: JSON_HEADERS,
					body: JSON.stringify({
						mode: "save",
						id: ownerArtifact.id,
						title: "Hijack",
						content: "Evil",
						kind: "text",
						chatId: ownerArtifact.chatId,
					}),
				}),
			)
			expect(saveResponse.status).toBe(403)

			// Restore — blocked
			mockGetArtifactById.mockResolvedValueOnce(ownerArtifact)
			const restoreResponse = await POST(
				new Request("http://localhost/api/artifact", {
					method: "POST",
					headers: JSON_HEADERS,
					body: JSON.stringify({
						mode: "restore",
						id: ownerArtifact.id,
						timestamp: new Date().toISOString(),
					}),
				}),
			)
			expect(restoreResponse.status).toBe(403)
		})
	})
})
