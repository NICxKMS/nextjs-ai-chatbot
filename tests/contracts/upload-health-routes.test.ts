import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
	getAppSession: vi.fn(),
	checkRateLimit: vi.fn(),
	put: vi.fn(),
	dbExecute: vi.fn(),
	ping: vi.fn(),
	loggerError: vi.fn(),
}))

vi.mock("@/lib/auth/session", () => ({ getAppSession: mocks.getAppSession }))
vi.mock("@/lib/cache/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@vercel/blob", () => ({ put: mocks.put }))
vi.mock("@/lib/db/client", () => ({ db: { execute: mocks.dbExecute } }))
vi.mock("@/lib/cache/client", () => ({ ping: mocks.ping }))
vi.mock("@/lib/utils/logger", () => ({ logger: { error: mocks.loggerError } }))

import { POST as uploadFile } from "@/app/api/files/upload/route"
import { GET as getHealth } from "@/app/api/health/route"

const userId = "33333333-3333-4333-8333-333333333333"

function uploadRequest(formData: FormData, origin = "https://app.example.com") {
	return new Request("https://app.example.com/api/files/upload", {
		method: "POST",
		headers: { origin },
		body: formData,
	})
}

function pngFile(name = "avatar.png") {
	return new File(
		[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
		name,
		{ type: "image/png" },
	)
}

describe("upload route contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getAppSession.mockResolvedValue({ user: { id: userId, type: "authenticated" } })
		mocks.checkRateLimit.mockResolvedValue(true)
		mocks.put.mockResolvedValue({
			url: "https://blob.example.com/uploads/avatar.png",
			pathname: "uploads/avatar.png",
		})
	})

	it("rejects cross-origin upload attempts before auth", async () => {
		const formData = new FormData()
		formData.set("file", pngFile())

		const response = await uploadFile(uploadRequest(formData, "https://evil.example.com"))

		expect(response.status).toBe(403)
		expect(await response.json()).toMatchObject({ code: "forbidden:api:csrf_failed" })
		expect(mocks.getAppSession).not.toHaveBeenCalled()
	})

	it("requires a session and enforces upload rate limits", async () => {
		const formData = new FormData()
		formData.set("file", pngFile())
		mocks.getAppSession.mockResolvedValue(null)

		const unauthorized = await uploadFile(uploadRequest(formData))
		expect(unauthorized.status).toBe(401)

		mocks.getAppSession.mockResolvedValue({ user: { id: userId, type: "authenticated" } })
		mocks.checkRateLimit.mockResolvedValue(false)
		const limited = await uploadFile(uploadRequest(formData))
		expect(limited.status).toBe(429)
		expect(await limited.json()).toMatchObject({ code: "rate_limit:upload:too_many_requests" })
	})

	it("rejects missing files", async () => {
		const missing = await uploadFile(uploadRequest(new FormData()))
		expect(missing.status).toBe(400)
		expect(await missing.json()).toMatchObject({ code: "bad_request:api:no_file_uploaded" })
	})

	it("rejects empty uploads before blob storage", async () => {
		const emptyFile = new FormData()
		emptyFile.set("file", new File([""], "empty.png", { type: "image/png" }))
		const emptyResponse = await uploadFile(uploadRequest(emptyFile))
		expect(emptyResponse.status).toBe(400)
		expect(await emptyResponse.json()).toMatchObject({
			code: "bad_request:api:no_file_uploaded",
		})
		expect(mocks.put).not.toHaveBeenCalled()
	})

	it("rejects MIME and signature mismatches", async () => {
		const wrongType = new FormData()
		wrongType.set("file", new File(["text"], "note.txt", { type: "text/plain" }))
		const wrongTypeResponse = await uploadFile(uploadRequest(wrongType))
		expect(wrongTypeResponse.status).toBe(400)
		expect(await wrongTypeResponse.json()).toMatchObject({
			code: "bad_request:api:file_type_unsupported",
		})

		const forged = new FormData()
		forged.set("file", new File(["not png"], "avatar.png", { type: "image/png" }))
		const forgedResponse = await uploadFile(uploadRequest(forged))
		expect(forgedResponse.status).toBe(400)
		expect(await forgedResponse.json()).toMatchObject({
			code: "bad_request:api:file_type_unsupported",
		})
	})

	it("rejects uploads larger than 5 MB before blob storage", async () => {
		const formData = new FormData()
		formData.set(
			"file",
			new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
		)

		const response = await uploadFile(uploadRequest(formData))

		expect(response.status).toBe(400)
		expect(await response.json()).toMatchObject({ code: "bad_request:api:file_too_large" })
		expect(mocks.put).not.toHaveBeenCalled()
	})

	it("uploads valid image files with sanitized paths", async () => {
		const formData = new FormData()
		formData.set("file", pngFile("..\\unsafe name.png"))

		const response = await uploadFile(uploadRequest(formData))

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(mocks.put).toHaveBeenCalledWith("uploads/..unsafe_name.png", expect.any(File), {
			access: "public",
			contentType: "image/png",
		})
		expect(await response.json()).toEqual({
			url: "https://blob.example.com/uploads/avatar.png",
			pathname: "uploads/avatar.png",
			contentType: "image/png",
		})
	})

	it("returns service unavailable when blob storage fails", async () => {
		const formData = new FormData()
		formData.set("file", pngFile())
		mocks.put.mockRejectedValue(new Error("blob down"))

		const response = await uploadFile(uploadRequest(formData))

		expect(response.status).toBe(503)
		expect(await response.json()).toMatchObject({
			code: "offline:upload:storage_unavailable",
		})
	})
})

describe("health route contracts", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.dbExecute.mockResolvedValue(undefined)
		mocks.ping.mockResolvedValue("PONG")
	})

	it("reports healthy dependencies with public cache headers", async () => {
		const response = await getHealth()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=60, s-maxage=60")
		expect(body).toMatchObject({
			status: "healthy",
			checks: {
				database: { status: "healthy" },
				cache: { status: "healthy" },
			},
		})
		expect(typeof body.timestamp).toBe("string")
	})

	it("returns a stable health response shape for degraded dependencies", async () => {
		mocks.ping.mockResolvedValue(null)

		const response = await getHealth()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(Object.keys(body).sort()).toEqual(["checks", "status", "timestamp"])
		expect(Object.keys(body.checks).sort()).toEqual(["cache", "database"])
		expect(body).toMatchObject({
			status: "degraded",
			checks: {
				database: { status: "healthy" },
				cache: { status: "degraded" },
			},
		})
		expect(typeof body.timestamp).toBe("string")
	})

	it("reports degraded when cache is unavailable but database is healthy", async () => {
		mocks.ping.mockResolvedValue(null)

		const response = await getHealth()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body).toMatchObject({
			status: "degraded",
			checks: { cache: { status: "degraded", error: "Cache not configured or unavailable" } },
		})
	})

	it("reports unhealthy with 503 when a dependency throws", async () => {
		mocks.dbExecute.mockRejectedValue(new Error("database down"))

		const response = await getHealth()
		const body = await response.json()

		expect(response.status).toBe(503)
		expect(body).toMatchObject({
			status: "unhealthy",
			checks: { database: { status: "unhealthy", error: "Database check failed" } },
		})
		expect(mocks.loggerError).toHaveBeenCalledWith("[health] database check failed", {
			error: "Error: database down",
		})
	})

	it("reports unhealthy with 503 when cache throws and database stays healthy", async () => {
		mocks.ping.mockRejectedValue(new Error("cache down"))

		const response = await getHealth()
		const body = await response.json()

		expect(response.status).toBe(503)
		expect(body).toMatchObject({
			status: "unhealthy",
			checks: {
				database: { status: "healthy" },
				cache: { status: "unhealthy", error: "Cache check failed" },
			},
		})
		expect(mocks.loggerError).toHaveBeenCalledWith("[health] cache check failed", {
			error: "Error: cache down",
		})
	})
})
