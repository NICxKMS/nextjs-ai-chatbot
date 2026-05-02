import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	checkRateLimitWithInfo: vi.fn(),
	getArtifactById: vi.fn(),
	getArtifactOwnerId: vi.fn(),
	getArtifactVersions: vi.fn(),
	saveArtifactVersion: vi.fn(),
	deleteArtifactVersionsAfter: vi.fn(),
	getChatOwnerId: vi.fn(),
	getArtifactByIdAndCreatedAt: vi.fn(),
	getSuggestionsByArtifactVersion: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/rate-limit", () => ({
	checkRateLimitWithInfo: mocks.checkRateLimitWithInfo,
}))
vi.mock("@/lib/data/artifact", () => ({
	deleteArtifactVersionsAfter: mocks.deleteArtifactVersionsAfter,
	getArtifactById: mocks.getArtifactById,
	getArtifactByIdAndCreatedAt: mocks.getArtifactByIdAndCreatedAt,
	getArtifactOwnerId: mocks.getArtifactOwnerId,
	getArtifactVersions: mocks.getArtifactVersions,
	saveArtifactVersion: mocks.saveArtifactVersion,
}))
vi.mock("@/lib/data/chat", () => ({ getChatOwnerId: mocks.getChatOwnerId }))
vi.mock("@/lib/data/suggestion", () => ({
	getSuggestionsByArtifactVersion: mocks.getSuggestionsByArtifactVersion,
}))

import { GET as getArtifact, POST as postArtifact } from "@/app/api/artifact/route"
import { GET as getSuggestions } from "@/app/api/suggestions/route"

const artifactId = "11111111-1111-4111-8111-111111111111"
const chatId = "22222222-2222-4222-8222-222222222222"
const userId = "33333333-3333-4333-8333-333333333333"
const createdAt = new Date("2026-05-01T00:00:00.000Z")
const session = { user: { id: userId, type: "authenticated" } }

function sameOriginRequest(path: string, init?: RequestInit) {
	return new Request(`https://app.example.com${path}`, {
		...init,
		headers: { origin: "https://app.example.com", ...init?.headers },
	})
}

describe("artifact route contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.checkRateLimitWithInfo.mockResolvedValue({ allowed: true })
		mocks.getArtifactById.mockResolvedValue({
			id: artifactId,
			userId,
			chatId,
			kind: "text",
			createdAt,
		})
		mocks.getArtifactOwnerId.mockResolvedValue(userId)
		mocks.getArtifactVersions.mockResolvedValue([{ id: artifactId, createdAt }])
		mocks.getChatOwnerId.mockResolvedValue(userId)
		mocks.saveArtifactVersion.mockResolvedValue({ id: artifactId, title: "Draft" })
		mocks.deleteArtifactVersionsAfter.mockResolvedValue(undefined)
	})

	it("GET requires a session before reading query parameters", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		const response = await getArtifact(new Request("https://app.example.com/api/artifact"))

		expect(response.status).toBe(401)
		expect(await response.json()).toMatchObject({ code: "unauthorized:chat:auth_required" })
		expect(mocks.getArtifactOwnerId).not.toHaveBeenCalled()
	})

	it("GET returns owned artifact versions with private caching", async () => {
		const response = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}`),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("private, max-age=10")
		expect(await response.json()).toEqual([
			{ id: artifactId, createdAt: createdAt.toISOString() },
		])
		expect(mocks.getArtifactVersions).toHaveBeenCalledWith(artifactId)
	})

	it("GET returns rate limits with retry information before artifact lookup", async () => {
		mocks.checkRateLimitWithInfo.mockResolvedValueOnce({ allowed: false, retryAfter: 15 })

		const response = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}`),
		)

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("15")
		expect(await response.json()).toMatchObject({
			code: "rate_limit:artifact:too_many_requests",
		})
		expect(mocks.getArtifactById).not.toHaveBeenCalled()
		expect(mocks.getArtifactOwnerId).not.toHaveBeenCalled()
		expect(mocks.getArtifactVersions).not.toHaveBeenCalled()
	})

	it("GET validates missing and invalid artifact ids before data access", async () => {
		const missing = await getArtifact(new Request("https://app.example.com/api/artifact"))
		expect(missing.status).toBe(400)
		expect(await missing.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})

		const invalid = await getArtifact(
			new Request("https://app.example.com/api/artifact?id=bad"),
		)
		expect(invalid.status).toBe(400)
		expect(await invalid.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})
		expect(mocks.getArtifactOwnerId).not.toHaveBeenCalled()
	})

	it("GET returns not found or forbidden before returning versions", async () => {
		mocks.getArtifactOwnerId.mockResolvedValueOnce(null)
		const notFound = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}`),
		)
		expect(notFound.status).toBe(404)
		expect(await notFound.json()).toMatchObject({
			code: "not_found:artifact:artifact_not_found",
		})

		mocks.getArtifactOwnerId.mockResolvedValueOnce("other-user")
		const forbidden = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}`),
		)
		expect(forbidden.status).toBe(403)
		expect(await forbidden.json()).toMatchObject({ code: "forbidden:chat:owner_mismatch" })
		expect(mocks.getArtifactVersions).not.toHaveBeenCalled()
	})

	it("GET latest returns a single-version array and enforces ownership", async () => {
		const response = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}&view=latest`),
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toMatchObject([{ id: artifactId, userId }])

		mocks.getArtifactById.mockResolvedValue({ id: artifactId, userId: "other-user" })
		const forbidden = await getArtifact(
			new Request(`https://app.example.com/api/artifact?id=${artifactId}&view=latest`),
		)
		expect(forbidden.status).toBe(403)
	})

	it("POST save validates ownership and returns the saved artifact", async () => {
		mocks.getArtifactById.mockResolvedValue(null)

		const response = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "Draft",
					content: "Hello",
					kind: "text",
					chatId,
				}),
			}),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(await response.json()).toEqual({ artifact: { id: artifactId, title: "Draft" } })
		expect(mocks.getChatOwnerId).toHaveBeenCalledWith(chatId)
		expect(mocks.saveArtifactVersion).toHaveBeenCalledWith(
			expect.objectContaining({ id: artifactId, chatId, userId }),
		)
	})

	it("POST rejects cross-origin artifact writes before auth", async () => {
		const response = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				headers: { origin: "https://evil.example.com" },
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "Draft",
					content: "Hello",
					kind: "text",
					chatId,
				}),
			}),
		)

		expect(response.status).toBe(403)
		expect(await response.json()).toMatchObject({ code: "forbidden:api:csrf_failed" })
		expect(mocks.getAppSession).not.toHaveBeenCalled()
	})

	it("POST returns rate limits with retry information before parsing the body", async () => {
		mocks.checkRateLimitWithInfo.mockResolvedValueOnce({ allowed: false, retryAfter: 21 })

		const request = sameOriginRequest("/api/artifact", {
			method: "POST",
			body: "not-json",
		})
		const jsonSpy = vi.spyOn(request, "json")

		const response = await postArtifact(request)

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("21")
		expect(await response.json()).toMatchObject({
			code: "rate_limit:artifact:too_many_requests",
		})
		expect(jsonSpy).not.toHaveBeenCalled()
		expect(mocks.getArtifactById).not.toHaveBeenCalled()
		expect(mocks.getChatOwnerId).not.toHaveBeenCalled()
		expect(mocks.saveArtifactVersion).not.toHaveBeenCalled()
		expect(mocks.deleteArtifactVersionsAfter).not.toHaveBeenCalled()
	})

	it("POST save validates artifact kind and chat ownership", async () => {
		const invalidKind = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "Draft",
					content: "Hello",
					kind: "video",
					chatId,
				}),
			}),
		)
		expect(invalidKind.status).toBe(400)
		expect(await invalidKind.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})
		expect(mocks.getChatOwnerId).not.toHaveBeenCalled()

		mocks.getArtifactById.mockResolvedValue(null)
		mocks.getChatOwnerId.mockResolvedValue("other-user")
		const ownerMismatch = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({
					mode: "save",
					id: artifactId,
					title: "Draft",
					content: "Hello",
					kind: "text",
					chatId,
				}),
			}),
		)
		expect(ownerMismatch.status).toBe(403)
		expect(await ownerMismatch.json()).toMatchObject({ code: "forbidden:chat:owner_mismatch" })
		expect(mocks.saveArtifactVersion).not.toHaveBeenCalled()
	})

	it("POST restore deletes versions after the restore point", async () => {
		const response = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({
					mode: "restore",
					id: artifactId,
					timestamp: createdAt.toISOString(),
				}),
			}),
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ success: true })
		expect(mocks.deleteArtifactVersionsAfter).toHaveBeenCalledWith(artifactId, createdAt)
	})

	it("POST restore rejects owner mismatch without deleting versions", async () => {
		mocks.getArtifactById.mockResolvedValueOnce({
			id: artifactId,
			userId: "other-user",
			chatId,
			kind: "text",
			createdAt,
		})

		const response = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({
					mode: "restore",
					id: artifactId,
					timestamp: createdAt.toISOString(),
				}),
			}),
		)

		expect(response.status).toBe(403)
		expect(await response.json()).toMatchObject({ code: "forbidden:chat:owner_mismatch" })
		expect(mocks.deleteArtifactVersionsAfter).not.toHaveBeenCalled()
	})

	it("POST restore validates timestamp before deleting versions", async () => {
		const response = await postArtifact(
			sameOriginRequest("/api/artifact", {
				method: "POST",
				body: JSON.stringify({ mode: "restore", id: artifactId, timestamp: "not-a-date" }),
			}),
		)

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})
		expect(mocks.deleteArtifactVersionsAfter).not.toHaveBeenCalled()
	})
})

describe("suggestions route contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue(session)
		mocks.checkRateLimitWithInfo.mockResolvedValue({ allowed: true })
		mocks.getArtifactById.mockResolvedValue({ id: artifactId, userId, createdAt })
		mocks.getArtifactByIdAndCreatedAt.mockResolvedValue({ id: artifactId, userId, createdAt })
		mocks.getSuggestionsByArtifactVersion.mockResolvedValue([{ id: "suggestion-1" }])
	})

	it("returns empty suggestions for guest sessions without querying artifacts", async () => {
		mocks.getAppSession.mockResolvedValue({ user: { id: "guest-1", type: "guest" } })

		const response = await getSuggestions(
			new Request(`https://app.example.com/api/suggestions?artifactId=${artifactId}`),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("private, max-age=30")
		expect(await response.json()).toEqual({ suggestions: [] })
		expect(mocks.getArtifactById).not.toHaveBeenCalled()
	})

	it("validates query parameters for authenticated users", async () => {
		const response = await getSuggestions(
			new Request("https://app.example.com/api/suggestions"),
		)

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})
	})

	it("rejects invalid suggestion artifact ids before artifact lookup", async () => {
		const response = await getSuggestions(
			new Request("https://app.example.com/api/suggestions?artifactId=bad"),
		)

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({
			code: "bad_request:validation:invalid_input",
		})
		expect(mocks.getArtifactById).not.toHaveBeenCalled()
	})

	it("returns suggestion rate limits with retry information", async () => {
		mocks.checkRateLimitWithInfo.mockResolvedValue({ allowed: false, retryAfter: 12 })

		const response = await getSuggestions(
			new Request(`https://app.example.com/api/suggestions?artifactId=${artifactId}`),
		)

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("12")
		expect(await response.json()).toMatchObject({
			code: "rate_limit:suggestions:too_many_requests",
		})
		expect(mocks.getArtifactById).not.toHaveBeenCalled()
	})

	it("returns persisted suggestions for owned artifact versions", async () => {
		const response = await getSuggestions(
			new Request(
				`https://app.example.com/api/suggestions?artifactId=${artifactId}&artifactCreatedAt=${createdAt.toISOString()}`,
			),
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ suggestions: [{ id: "suggestion-1" }] })
		expect(mocks.getArtifactByIdAndCreatedAt).toHaveBeenCalledWith(artifactId, createdAt)
		expect(mocks.getSuggestionsByArtifactVersion).toHaveBeenCalledWith(artifactId, createdAt)
	})

	it("returns persisted suggestions for owned artifact versions without a createdAt query", async () => {
		const response = await getSuggestions(
			new Request(`https://app.example.com/api/suggestions?artifactId=${artifactId}`),
		)

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ suggestions: [{ id: "suggestion-1" }] })
		expect(mocks.getArtifactById).toHaveBeenCalledWith(artifactId)
		expect(mocks.getArtifactByIdAndCreatedAt).not.toHaveBeenCalled()
		expect(mocks.getSuggestionsByArtifactVersion).toHaveBeenCalledWith(artifactId, createdAt)
	})

	it("rejects suggestion access for artifacts owned by another user", async () => {
		mocks.getArtifactById.mockResolvedValue({ id: artifactId, userId: "other-user", createdAt })

		const response = await getSuggestions(
			new Request(`https://app.example.com/api/suggestions?artifactId=${artifactId}`),
		)

		expect(response.status).toBe(403)
		expect(await response.json()).toMatchObject({ code: "forbidden:chat:owner_mismatch" })
	})

	it("returns not found when the requested suggestion artifact version is missing", async () => {
		mocks.getArtifactByIdAndCreatedAt.mockResolvedValue(null)

		const response = await getSuggestions(
			new Request(
				`https://app.example.com/api/suggestions?artifactId=${artifactId}&artifactCreatedAt=${createdAt.toISOString()}`,
			),
		)

		expect(response.status).toBe(404)
		expect(await response.json()).toMatchObject({
			code: "not_found:artifact:artifact_not_found",
		})
		expect(mocks.getSuggestionsByArtifactVersion).not.toHaveBeenCalled()
	})
})
