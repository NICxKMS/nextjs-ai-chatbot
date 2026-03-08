// Flow: cache-operations | Step: redis-client

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock @upstash/redis ──────────────────────────────────────────

const mockIncr = vi.fn()
const mockExpire = vi.fn()
const mockPing = vi.fn()

vi.mock("@upstash/redis", () => ({
	Redis: vi.fn().mockImplementation(() => ({
		incr: mockIncr,
		expire: mockExpire,
		ping: mockPing,
	})),
}))

// Access the mock Redis constructor to re-establish after global vi.restoreAllMocks()
import { Redis } from "@upstash/redis"

const MockRedis = vi.mocked(Redis)

// Static import — module evaluates once with NODE_ENV=test (IS_PRODUCTION=false)
import { expire, incr, ping } from "@/lib/cache/client"

// ── Helpers ──────────────────────────────────────────────────────

function resetGlobalSingleton() {
	const g = globalThis as Record<string, unknown>
	delete g.__upstashRedis
	delete g.__upstashRedisInitFailed
	delete g.__upstashRedisMissingEnvWarned
}

function setRedisEnv() {
	process.env.CACHE_KV_REST_API_URL = "https://redis.example.com"
	process.env.CACHE_KV_REST_API_TOKEN = "test-token"
}

function clearRedisEnv() {
	delete process.env.CACHE_KV_REST_API_URL
	delete process.env.CACHE_KV_REST_API_TOKEN
}

// ── Tests ────────────────────────────────────────────────────────

describe("Redis client (lib/cache/client)", () => {
	beforeEach(() => {
		resetGlobalSingleton()
		clearRedisEnv()
		// Re-establish Redis mock implementation (cleared by global vi.restoreAllMocks in setup.ts)
		MockRedis.mockImplementation(
			() =>
				({
					incr: mockIncr,
					expire: mockExpire,
					ping: mockPing,
				}) as any,
		)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		clearRedisEnv()
		resetGlobalSingleton()
	})

	describe("with Redis configured", () => {
		it("incr returns the incremented value", async () => {
			setRedisEnv()
			mockIncr.mockResolvedValue(5)

			const result = await incr("counter-key")

			expect(result).toBe(5)
			expect(mockIncr).toHaveBeenCalledWith("counter-key")
		})

		it("expire returns true when TTL is set (result=1)", async () => {
			setRedisEnv()
			mockExpire.mockResolvedValue(1)

			const result = await expire("some-key", 3600)

			expect(result).toBe(true)
			expect(mockExpire).toHaveBeenCalledWith("some-key", 3600)
		})

		it("expire returns false when key does not exist (result=0)", async () => {
			setRedisEnv()
			mockExpire.mockResolvedValue(0)

			const result = await expire("missing-key", 60)

			expect(result).toBe(false)
		})

		it("ping returns PONG", async () => {
			setRedisEnv()
			mockPing.mockResolvedValue("PONG")

			const result = await ping()

			expect(result).toBe("PONG")
		})
	})

	describe("without Redis in production", () => {
		// IS_PRODUCTION is a module-level constant evaluated at import time.
		// To test the production code path (getClient throws before warning),
		// we must re-evaluate the module with NODE_ENV=production via local
		// resetModules + dynamic import. Note: withRedisClient catches the
		// internal throw, so the exported function returns null — but unlike
		// dev mode, no console.warn is emitted.

		it("returns null without warning when env vars are missing", async () => {
			vi.stubEnv("NODE_ENV", "production")
			clearRedisEnv()
			resetGlobalSingleton()
			vi.resetModules()

			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
			const mod = await import("@/lib/cache/client")
			const result = await mod.incr("key")

			// Production path: getClient() throws internally (caught by withRedisClient).
			// Unlike dev mode, no console.warn is emitted before the throw.
			expect(result).toBeNull()
			expect(warnSpy).not.toHaveBeenCalled()
		})

		it("returns null without warning when only partial env vars set", async () => {
			vi.stubEnv("NODE_ENV", "production")
			process.env.CACHE_KV_REST_API_URL = "https://redis.example.com"
			delete process.env.CACHE_KV_REST_API_TOKEN
			resetGlobalSingleton()
			vi.resetModules()

			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
			const mod = await import("@/lib/cache/client")
			const result = await mod.incr("key")

			expect(result).toBeNull()
			expect(warnSpy).not.toHaveBeenCalled()
		})
	})

	describe("without Redis in development", () => {
		it("warns once and returns null for incr", async () => {
			clearRedisEnv()
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

			const result = await incr("key")

			expect(result).toBeNull()
			expect(warnSpy).toHaveBeenCalledOnce()
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("CACHE_KV_REST_API_URL"))
		})

		it("warns only once across multiple calls", async () => {
			clearRedisEnv()
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

			await incr("key-1")
			await incr("key-2")
			await ping()

			// The warning is set via a globalThis flag, so it only fires once per module load
			expect(warnSpy).toHaveBeenCalledOnce()
		})

		it("returns null for expire", async () => {
			clearRedisEnv()
			vi.spyOn(console, "warn").mockImplementation(() => undefined)

			const result = await expire("key", 60)

			expect(result).toBeNull()
		})

		it("returns null for ping", async () => {
			clearRedisEnv()
			vi.spyOn(console, "warn").mockImplementation(() => undefined)

			const result = await ping()

			expect(result).toBeNull()
		})
	})

	describe("Redis client error handling", () => {
		it("returns null when Redis operation throws", async () => {
			setRedisEnv()
			mockIncr.mockRejectedValue(new Error("connection refused"))

			const result = await incr("key")

			expect(result).toBeNull()
		})
	})
})
