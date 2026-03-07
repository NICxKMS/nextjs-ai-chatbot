import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mockUpdateTag = vi.fn()
const mockRevalidateTag = vi.fn()
const mockCacheTag = vi.fn()
const mockCacheLife = vi.fn()

vi.mock("next/cache", () => ({
	updateTag: (...args: unknown[]) => mockUpdateTag(...args),
	revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
	cacheTag: (...args: unknown[]) => mockCacheTag(...args),
	cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}))

type RedisConfig = {
	url: string
	token: string
}

type RedisInstance = {
	config: RedisConfig
	incr: ReturnType<typeof vi.fn<(key: string) => Promise<number>>>
	expire: ReturnType<typeof vi.fn<(key: string, seconds: number) => Promise<number>>>
	ping: ReturnType<typeof vi.fn<() => Promise<string>>>
}

const upstashState = vi.hoisted(() => {
	const state = {
		shouldThrowOnInit: false,
		constructorSpy: vi.fn<(config: RedisConfig) => void>(),
		instances: [] as RedisInstance[],
	}

	class Redis {
		incr = vi.fn<(key: string) => Promise<number>>(async () => 1)
		expire = vi.fn<(key: string, seconds: number) => Promise<number>>(async () => 1)
		ping = vi.fn<() => Promise<string>>(async () => "PONG")

		constructor(config: RedisConfig) {
			state.constructorSpy(config)

			if (!config.url || !config.token) {
				throw new Error("Missing config")
			}

			if (state.shouldThrowOnInit) {
				throw new Error("Redis initialization failed")
			}

			state.instances.push({
				config,
				incr: this.incr,
				expire: this.expire,
				ping: this.ping,
			})
		}
	}

	return Object.assign(state, { Redis })
})

vi.mock("@upstash/redis", () => ({
	Redis: upstashState.Redis,
}))

const initialCacheUrl = process.env.CACHE_KV_REST_API_URL
const initialCacheToken = process.env.CACHE_KV_REST_API_TOKEN

function clearRedisSingleton(): void {
	const redisGlobal = globalThis as typeof globalThis & {
		__upstashRedis?: unknown
		__upstashRedisInitFailed?: boolean
	}

	delete redisGlobal.__upstashRedis
	delete redisGlobal.__upstashRedisInitFailed
}

async function importCacheClientModule(): Promise<typeof import("@/lib/cache/client")> {
	vi.resetModules()
	return import("@/lib/cache/client")
}

function getFirstRedisInstance(): RedisInstance {
	const instance = upstashState.instances[0]

	if (!instance) {
		throw new Error("Expected Redis mock instance to be initialized")
	}

	return instance
}

let keysModule: typeof import("@/lib/cache/keys")
let revalidateModule: typeof import("@/lib/cache/revalidate")
let withCacheModule: typeof import("@/lib/cache/with-cache")

beforeAll(async () => {
	;[keysModule, revalidateModule, withCacheModule] = await Promise.all([
		import("@/lib/cache/keys"),
		import("@/lib/cache/revalidate"),
		import("@/lib/cache/with-cache"),
	])
})

beforeEach(() => {
	vi.resetAllMocks()
	upstashState.shouldThrowOnInit = false
	upstashState.instances = []
	process.env.CACHE_KV_REST_API_URL = "http://localhost:6379"
	process.env.CACHE_KV_REST_API_TOKEN = "test-token"
	clearRedisSingleton()
})

afterAll(() => {
	if (initialCacheUrl === undefined) {
		delete process.env.CACHE_KV_REST_API_URL
	} else {
		process.env.CACHE_KV_REST_API_URL = initialCacheUrl
	}

	if (initialCacheToken === undefined) {
		delete process.env.CACHE_KV_REST_API_TOKEN
	} else {
		process.env.CACHE_KV_REST_API_TOKEN = initialCacheToken
	}

	clearRedisSingleton()
})

describe("lib/cache/keys", () => {
	it("builds cache tag keys", () => {
		expect(keysModule.cacheKeys.chat("chat-1")).toBe("chat:chat-1")
		expect(keysModule.cacheKeys.chats("user-1")).toBe("chats:user-1")
		expect(keysModule.cacheKeys.votes("chat-1")).toBe("votes:chat-1")
		expect(keysModule.cacheKeys.models()).toBe("models")
	})

	it("builds rate-limit redis keys", () => {
		expect(keysModule.rateLimitKeys.rateLimit("user-1")).toBe("rate-limit:user-1")
		expect(keysModule.rateLimitKeys.rateLimitDaily("user-1")).toBe("rate-limit-daily:user-1")
		expect(keysModule.rateLimitKeys.rateLimitChat("user-1")).toBe("rate-limit-chat:user-1")
		expect(keysModule.rateLimitKeys.rateLimitVote("user-1")).toBe("rate-limit-vote:user-1")
		expect(keysModule.rateLimitKeys.rateLimitUpload("user-1")).toBe("rate-limit-upload:user-1")
		expect(keysModule.rateLimitKeys.rateLimitLogin("127.0.0.1")).toBe(
			"rate-limit-login:127.0.0.1",
		)
		expect(keysModule.rateLimitKeys.rateLimitRegister("127.0.0.1")).toBe(
			"rate-limit-register:127.0.0.1",
		)
	})
})

describe("lib/cache/revalidate", () => {
	it("uses updateTag wrappers for server-action invalidation", () => {
		revalidateModule.invalidateChat("chat-1")
		revalidateModule.invalidateChatList("user-1")
		revalidateModule.invalidateVotes("chat-1")

		expect(mockUpdateTag).toHaveBeenCalledWith("chat:chat-1")
		expect(mockUpdateTag).toHaveBeenCalledWith("chats:user-1")
		expect(mockUpdateTag).toHaveBeenCalledWith("votes:chat-1")
		expect(mockUpdateTag).toHaveBeenCalledTimes(3)
	})

	it("uses revalidateTag wrappers for route-handler refresh", () => {
		revalidateModule.refreshChat("chat-1")
		revalidateModule.refreshChatList("user-1")
		revalidateModule.refreshVotes("chat-1")

		expect(mockRevalidateTag).toHaveBeenCalledWith("chat:chat-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledWith("chats:user-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledWith("votes:chat-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledTimes(3)
	})
})

describe("lib/cache/with-cache", () => {
	it("applies cache tag and executes fetcher", async () => {
		const fetcher = vi.fn().mockResolvedValue("payload")

		const result = await withCacheModule.withCache("chat:chat-1", fetcher)

		expect(result).toBe("payload")
		expect(mockCacheTag).toHaveBeenCalledWith("chat:chat-1")
		expect(mockCacheLife).not.toHaveBeenCalled()
		expect(fetcher).toHaveBeenCalledTimes(1)
	})

	it("applies preset cache life when provided", async () => {
		const fetcher = vi.fn().mockResolvedValue({ ok: true })

		await withCacheModule.withCache("models", fetcher, "seconds")

		expect(mockCacheTag).toHaveBeenCalledWith("models")
		expect(mockCacheLife).toHaveBeenCalledWith("seconds")
	})

	it("applies custom cache life config when provided", async () => {
		const fetcher = vi.fn().mockResolvedValue(["chat"])
		const life = { stale: 5, revalidate: 10, expire: 20 }

		await withCacheModule.withCache("chats:user-1", fetcher, life)

		expect(mockCacheTag).toHaveBeenCalledWith("chats:user-1")
		expect(mockCacheLife).toHaveBeenCalledWith(life)
	})

	it("propagates fetcher errors", async () => {
		const error = new Error("fetcher failed")
		const fetcher = vi.fn().mockRejectedValue(error)

		await expect(withCacheModule.withCache("chat:chat-1", fetcher)).rejects.toThrow(error)
		expect(mockCacheTag).toHaveBeenCalledWith("chat:chat-1")
	})
})

describe("lib/cache/client", () => {
	it("initializes redis with env config and reuses singleton instance", async () => {
		const cacheClientModule = await importCacheClientModule()

		expect(await cacheClientModule.incr("rate-limit:user-1")).toBe(1)
		expect(upstashState.constructorSpy).toHaveBeenCalledTimes(1)
		expect(upstashState.constructorSpy).toHaveBeenCalledWith({
			url: "http://localhost:6379",
			token: "test-token",
		})
		expect(upstashState.instances).toHaveLength(1)

		const instance = getFirstRedisInstance()
		instance.ping.mockResolvedValueOnce("PONG-SECOND")

		expect(await cacheClientModule.ping()).toBe("PONG-SECOND")
		expect(await cacheClientModule.expire("rate-limit:user-1", 60)).toBe(true)
		expect(upstashState.constructorSpy).toHaveBeenCalledTimes(1)
		expect(instance.incr).toHaveBeenCalledWith("rate-limit:user-1")
		expect(instance.expire).toHaveBeenCalledWith("rate-limit:user-1", 60)
	})

	it("returns null when cache env vars are missing", async () => {
		process.env.CACHE_KV_REST_API_URL = ""
		process.env.CACHE_KV_REST_API_TOKEN = ""

		const cacheClientModule = await importCacheClientModule()

		expect(await cacheClientModule.incr("rate-limit:user-1")).toBeNull()
		expect(await cacheClientModule.expire("rate-limit:user-1", 60)).toBeNull()
		expect(await cacheClientModule.ping()).toBeNull()
		expect(upstashState.constructorSpy).not.toHaveBeenCalled()
		expect(upstashState.instances).toHaveLength(0)
	})

	it("maps expire return codes to booleans", async () => {
		const cacheClientModule = await importCacheClientModule()

		expect(await cacheClientModule.ping()).toBe("PONG")
		expect(upstashState.instances).toHaveLength(1)

		const instance = getFirstRedisInstance()
		instance.expire.mockResolvedValueOnce(1)
		instance.expire.mockResolvedValueOnce(0)

		expect(await cacheClientModule.expire("rate-limit:user-1", 10)).toBe(true)
		expect(await cacheClientModule.expire("rate-limit:user-1", 20)).toBe(false)
		expect(instance.expire).toHaveBeenNthCalledWith(1, "rate-limit:user-1", 10)
		expect(instance.expire).toHaveBeenNthCalledWith(2, "rate-limit:user-1", 20)
	})

	it("returns null and memoizes redis initialization failure", async () => {
		upstashState.shouldThrowOnInit = true

		const cacheClientModule = await importCacheClientModule()

		expect(await cacheClientModule.incr("rate-limit:user-1")).toBeNull()
		expect(await cacheClientModule.expire("rate-limit:user-1", 60)).toBeNull()
		expect(await cacheClientModule.ping()).toBeNull()
		expect(upstashState.constructorSpy).toHaveBeenCalledTimes(1)
		expect(upstashState.instances).toHaveLength(0)
	})

	it("returns null when redis commands throw", async () => {
		const cacheClientModule = await importCacheClientModule()

		expect(await cacheClientModule.incr("warmup")).toBe(1)
		expect(upstashState.instances).toHaveLength(1)

		const instance = getFirstRedisInstance()
		instance.incr.mockRejectedValueOnce(new Error("incr failed"))
		instance.expire.mockRejectedValueOnce(new Error("expire failed"))
		instance.ping.mockRejectedValueOnce(new Error("ping failed"))

		expect(await cacheClientModule.incr("rate-limit:user-1")).toBeNull()
		expect(await cacheClientModule.expire("rate-limit:user-1", 60)).toBeNull()
		expect(await cacheClientModule.ping()).toBeNull()
		expect(upstashState.constructorSpy).toHaveBeenCalledTimes(1)
	})
})
