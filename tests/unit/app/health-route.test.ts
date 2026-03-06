import { beforeEach, describe, expect, it, vi } from "vitest"

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
	beforeEach(() => {
		vi.resetAllMocks()
		mockDbExecute.mockResolvedValue([{ ok: 1 }])
		mockPing.mockResolvedValue("PONG")
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
	})
})
