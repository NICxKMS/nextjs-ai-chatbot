import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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

vi.mock("@/lib/cache/client", () => ({
	incr: vi.fn(),
	expire: vi.fn(),
	ping: vi.fn(),
}))

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
})

describe("lib/cache/keys", () => {
	it("builds cache tag keys", () => {
		expect(keysModule.cacheKeys.chat("chat-1")).toBe("chat:chat-1")
		expect(keysModule.cacheKeys.chats("user-1")).toBe("chats:user-1")
		expect(keysModule.cacheKeys.votes("chat-1")).toBe("votes:chat-1")
		expect(keysModule.cacheKeys.artifact("artifact-1")).toBe("artifact:artifact-1")
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
		revalidateModule.refreshArtifact("artifact-1")

		expect(mockRevalidateTag).toHaveBeenCalledWith("chat:chat-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledWith("chats:user-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledWith("votes:chat-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledWith("artifact:artifact-1", "max")
		expect(mockRevalidateTag).toHaveBeenCalledTimes(4)
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
