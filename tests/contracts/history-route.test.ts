import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	checkRateLimitWithInfo: vi.fn(),
	getChatsByUserId: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/rate-limit", () => ({
	checkRateLimitWithInfo: mocks.checkRateLimitWithInfo,
}))
vi.mock("@/lib/data/chat", () => ({ getChatsByUserId: mocks.getChatsByUserId }))

import { GET } from "@/app/api/history/route"

describe("GET /api/history", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue({ user: { id: "user-1", type: "guest" } })
		mocks.checkRateLimitWithInfo.mockResolvedValue({ allowed: true })
		mocks.getChatsByUserId.mockResolvedValue({ chats: [], hasMore: false, nextCursor: null })
	})

	it("returns unauthorized when no session exists", async () => {
		mocks.getAppSession.mockResolvedValue(null)

		const response = await GET(new Request("https://app.example.com/api/history"))

		expect(response.status).toBe(401)
		expect(await response.json()).toMatchObject({ code: "unauthorized:chat:auth_required" })
	})

	it("returns rate limit response with retry header", async () => {
		mocks.checkRateLimitWithInfo.mockResolvedValue({ allowed: false, retryAfter: 9 })

		const response = await GET(new Request("https://app.example.com/api/history"))

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("9")
		expect(await response.json()).toMatchObject({
			code: "rate_limit:history:too_many_requests",
		})
	})

	it("clamps pagination limit and returns history response shape", async () => {
		mocks.getChatsByUserId.mockResolvedValue({
			chats: [{ id: "chat-1", title: "Hello" }],
			hasMore: true,
			nextCursor: "chat-1",
		})

		const response = await GET(new Request("https://app.example.com/api/history?limit=500"))
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(mocks.getChatsByUserId).toHaveBeenCalledWith("user-1", {
			limit: 100,
			cursor: undefined,
		})
		expect(body).toEqual({
			chats: [{ id: "chat-1", title: "Hello" }],
			hasMore: true,
			nextCursor: "chat-1",
		})
	})

	it("uses the default limit and passes through a non-empty cursor", async () => {
		const response = await GET(
			new Request("https://app.example.com/api/history?cursor=2026-05-01T00%3A00%3A00.000Z"),
		)

		expect(response.status).toBe(200)
		expect(mocks.getChatsByUserId).toHaveBeenCalledWith("user-1", {
			limit: 20,
			cursor: "2026-05-01T00:00:00.000Z",
		})
	})

	it("sets Cache-Control to no-store on history responses", async () => {
		const response = await GET(new Request("https://app.example.com/api/history"))

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
	})
})
