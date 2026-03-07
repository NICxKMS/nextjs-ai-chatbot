import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

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

describe("GET /api/health", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		vi.resetAllMocks()
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		mockDbExecute.mockResolvedValue([{ ok: 1 }])
		mockPing.mockResolvedValue("PONG")
	})

	afterEach(() => {
		consoleErrorSpy.mockRestore()
	})

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
		expect(body.checks.database.error).toBe("Database check failed")
		expect(body.checks.database.error).not.toContain("db down")
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"[health] database check failed",
			expect.any(Error),
		)
	})

	it("returns 503 with the hardened public cache failure message when cache check fails", async () => {
		mockPing.mockRejectedValue(new Error("cache down"))

		const { GET } = await import("@/app/api/health/route")
		const response = await GET()

		expect(response.status).toBe(503)

		const body = await response.json()
		expect(body.status).toBe("unhealthy")
		expect(body.checks.cache.status).toBe("unhealthy")
		expect(body.checks.cache.error).toBe("Cache check failed")
		expect(body.checks.cache.error).not.toContain("cache down")
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"[health] cache check failed",
			expect.any(Error),
		)
	})
})
