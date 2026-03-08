// Flow: rate-limiting | Step: rate-check

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Mock @upstash/ratelimit ──────────────────────────────────────

const mockLimit = vi.fn()

vi.mock("@upstash/ratelimit", () => ({
	Ratelimit: Object.assign(
		vi.fn().mockImplementation(() => ({
			limit: mockLimit,
		})),
		{
			slidingWindow: vi.fn().mockReturnValue("sliding-window-config"),
		},
	),
}))

vi.mock("@upstash/redis", () => ({
	Redis: vi.fn().mockImplementation(() => ({})),
}))

// Access mock constructors to re-establish after global vi.restoreAllMocks()
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const MockRatelimit = vi.mocked(Ratelimit)
const MockRedis = vi.mocked(Redis)

// Static import — no vi.resetModules(), module evaluates once
import { checkRateLimit, checkRateLimitWithInfo } from "@/lib/cache/rate-limit"

// ── Helpers ──────────────────────────────────────────────────────

function resetGlobalSingleton() {
	const g = globalThis as Record<string, unknown>
	delete g.__rateLimitRedis
	delete g.__rateLimitRedisInitFailed
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

describe("rate-limit", () => {
	beforeEach(() => {
		resetGlobalSingleton()
		clearRedisEnv()
		// Re-establish mock implementations (cleared by global vi.restoreAllMocks in setup.ts)
		MockRedis.mockImplementation(() => ({}) as any)
		MockRatelimit.mockImplementation(() => ({ limit: mockLimit }) as any)
	})

	afterEach(() => {
		clearRedisEnv()
		resetGlobalSingleton()
	})

	describe("checkRateLimit", () => {
		it("returns true when under the limit", async () => {
			setRedisEnv()
			mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 })

			const result = await checkRateLimit("user:123", 10, 60)

			expect(result).toBe(true)
		})

		it("returns false when at the limit", async () => {
			setRedisEnv()
			mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 30000 })

			const result = await checkRateLimit("user:123", 10, 60)

			expect(result).toBe(false)
		})

		it("returns true (graceful degradation) when Redis is unavailable", async () => {
			clearRedisEnv()

			const result = await checkRateLimit("user:123", 10, 60)

			expect(result).toBe(true)
		})

		it("returns true (graceful degradation) when limiter.limit throws", async () => {
			setRedisEnv()
			mockLimit.mockRejectedValue(new Error("Redis connection error"))

			const result = await checkRateLimit("user:123", 10, 60)

			expect(result).toBe(true)
		})
	})

	describe("checkRateLimitWithInfo", () => {
		it("returns { allowed: true } when under the limit", async () => {
			setRedisEnv()
			mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 60000 })

			const result = await checkRateLimitWithInfo("user:456", 5, 30)

			expect(result).toEqual({ allowed: true })
		})

		it("returns { allowed: false, retryAfter } when at the limit", async () => {
			setRedisEnv()
			const resetTime = Date.now() + 15000 // 15 seconds from now
			mockLimit.mockResolvedValue({ success: false, reset: resetTime })

			const result = await checkRateLimitWithInfo("user:456", 5, 30)

			expect(result.allowed).toBe(false)
			expect(result.retryAfter).toBeGreaterThanOrEqual(1)
			expect(result.retryAfter).toBeLessThanOrEqual(15)
		})

		it("returns retryAfter of at least 1 even when reset is very close", async () => {
			setRedisEnv()
			// Reset time is in the past or exactly now
			mockLimit.mockResolvedValue({ success: false, reset: Date.now() - 100 })

			const result = await checkRateLimitWithInfo("user:456", 5, 30)

			expect(result.allowed).toBe(false)
			expect(result.retryAfter).toBe(1)
		})

		it("returns { allowed: true } when Redis is unavailable", async () => {
			clearRedisEnv()

			const result = await checkRateLimitWithInfo("user:456", 5, 30)

			expect(result).toEqual({ allowed: true })
			expect(result.retryAfter).toBeUndefined()
		})

		it("returns { allowed: true } on SDK errors (graceful degradation)", async () => {
			setRedisEnv()
			mockLimit.mockRejectedValue(new Error("timeout"))

			const result = await checkRateLimitWithInfo("user:456", 5, 30)

			expect(result).toEqual({ allowed: true })
		})
	})
})
