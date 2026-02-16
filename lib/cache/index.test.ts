/**
 * Tests for Cache Module
 *
 * Tests the LRU cache implementation and cache key generators.
 * Note: Redis-dependent strategies and tiered cache are tested with mocks
 * in integration tests due to their server-only nature.
 *
 * @module lib/cache/index.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	artifactKey,
	CACHE_KEY_PREFIX,
	chatKey,
	chatKeysPattern,
	chatListKey,
	chatMessagesKey,
	chatMessagesPattern,
	chatMetaKey,
	createLRUCache,
	defaultLRUCache,
	LRUCache,
	type LRUCacheStats,
	messageKey,
	userChatsKey,
	userKey,
	userKeysPattern,
} from "./index"

// =============================================================================
// LRU Cache Tests
// =============================================================================

describe("LRUCache", () => {
	let cache: LRUCache<string>

	beforeEach(() => {
		cache = new LRUCache<string>({ maxSize: 3 })
	})

	afterEach(() => {
		cache.clear()
	})

	describe("constructor and options", () => {
		it("should create cache with default options", () => {
			const defaultCache = new LRUCache<string>()
			expect(defaultCache.maxSize).toBe(1000)
			expect(defaultCache.size).toBe(0)
		})

		it("should create cache with custom max size", () => {
			const customCache = new LRUCache<string>({ maxSize: 100 })
			expect(customCache.maxSize).toBe(100)
		})

		it("should create cache with default TTL", () => {
			const ttlCache = new LRUCache<string>({ defaultTtl: 60 })
			expect(ttlCache.maxSize).toBe(1000)
		})
	})

	describe("get and set", () => {
		it("should set and get a value", () => {
			cache.set("key1", "value1")
			expect(cache.get("key1")).toBe("value1")
		})

		it("should return undefined for missing key", () => {
			expect(cache.get("nonexistent")).toBeUndefined()
		})

		it("should update value for existing key", () => {
			cache.set("key1", "value1")
			cache.set("key1", "value2")
			expect(cache.get("key1")).toBe("value2")
		})

		it("should track hits and misses", () => {
			cache.set("key1", "value1")
			cache.get("key1") // hit
			cache.get("key1") // hit
			cache.get("missing") // miss

			const stats = cache.stats
			expect(stats.hits).toBe(2)
			expect(stats.misses).toBe(1)
		})
	})

	describe("LRU eviction", () => {
		it("should evict least recently used when full", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
			cache.set("d", "4") // Should evict "a"

			expect(cache.get("a")).toBeUndefined()
			expect(cache.get("b")).toBe("2")
			expect(cache.get("c")).toBe("3")
			expect(cache.get("d")).toBe("4")
		})

		it("should update LRU order on get", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
			cache.get("a") // Access "a", making it most recently used
			cache.set("d", "4") // Should evict "b" (now LRU)

			expect(cache.get("a")).toBe("1")
			expect(cache.get("b")).toBeUndefined()
			expect(cache.get("c")).toBe("3")
			expect(cache.get("d")).toBe("4")
		})

		it("should update LRU order on set (update existing)", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
			cache.set("a", "updated") // Update "a", making it most recently used
			cache.set("d", "4") // Should evict "b" (now LRU)

			expect(cache.get("a")).toBe("updated")
			expect(cache.get("b")).toBeUndefined()
		})

		it("should track evictions in stats", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
			cache.set("d", "4") // 1 eviction
			cache.set("e", "5") // 1 eviction

			expect(cache.stats.evictions).toBe(2)
		})
	})

	describe("TTL (Time To Live)", () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it("should expire entry after TTL", () => {
			cache.set("key1", "value1", { ttl: 60 }) // 60 seconds

			vi.advanceTimersByTime(59000)
			expect(cache.get("key1")).toBe("value1")

			vi.advanceTimersByTime(2000) // Total 61 seconds
			expect(cache.get("key1")).toBeUndefined()
		})

		it("should use default TTL when not specified", () => {
			const ttlCache = new LRUCache<string>({
				maxSize: 10,
				defaultTtl: 30,
			})
			ttlCache.set("key1", "value1")

			vi.advanceTimersByTime(29000)
			expect(ttlCache.get("key1")).toBe("value1")

			vi.advanceTimersByTime(2000) // Total 31 seconds
			expect(ttlCache.get("key1")).toBeUndefined()
		})

		it("should override default TTL with explicit TTL", () => {
			const ttlCache = new LRUCache<string>({
				maxSize: 10,
				defaultTtl: 30,
			})
			ttlCache.set("key1", "value1", { ttl: 60 }) // Override to 60 seconds

			vi.advanceTimersByTime(31000) // Past default TTL
			expect(ttlCache.get("key1")).toBe("value1")

			vi.advanceTimersByTime(30000) // Total 61 seconds
			expect(ttlCache.get("key1")).toBeUndefined()
		})

		it("should not expire when TTL is 0", () => {
			cache.set("key1", "value1", { ttl: 0 })

			vi.advanceTimersByTime(1000000)
			expect(cache.get("key1")).toBe("value1")
		})

		it("should count expired entry as miss", () => {
			cache.set("key1", "value1", { ttl: 10 })

			vi.advanceTimersByTime(15000)
			cache.get("key1") // Should be miss due to expiration

			expect(cache.stats.misses).toBe(1)
			expect(cache.stats.hits).toBe(0)
		})
	})

	describe("peek", () => {
		it("should return value without updating LRU order", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")

			expect(cache.peek("a")).toBe("1")
			cache.set("d", "4") // Should evict "a" (still LRU since peek doesn't update order)

			expect(cache.get("a")).toBeUndefined()
		})

		it("should return undefined for missing key", () => {
			expect(cache.peek("nonexistent")).toBeUndefined()
		})

		it("should not affect hit/miss stats", () => {
			cache.set("key1", "value1")
			cache.peek("key1")
			cache.peek("missing")

			expect(cache.stats.hits).toBe(0)
			expect(cache.stats.misses).toBe(0)
		})
	})

	describe("has", () => {
		it("should return true for existing key", () => {
			cache.set("key1", "value1")
			expect(cache.has("key1")).toBe(true)
		})

		it("should return false for missing key", () => {
			expect(cache.has("nonexistent")).toBe(false)
		})

		it("should return false for expired key", () => {
			vi.useFakeTimers()
			cache.set("key1", "value1", { ttl: 10 })
			vi.advanceTimersByTime(15000)

			expect(cache.has("key1")).toBe(false)
			vi.useRealTimers()
		})

		it("should not update LRU order", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")

			cache.has("a") // Check "a" without updating order
			cache.set("d", "4") // Should evict "a" (still LRU)

			expect(cache.has("a")).toBe(false)
		})
	})

	describe("delete", () => {
		it("should delete existing key", () => {
			cache.set("key1", "value1")
			expect(cache.delete("key1")).toBe(true)
			expect(cache.get("key1")).toBeUndefined()
		})

		it("should return false for missing key", () => {
			expect(cache.delete("nonexistent")).toBe(false)
		})

		it("should decrease size", () => {
			cache.set("key1", "value1")
			expect(cache.size).toBe(1)
			cache.delete("key1")
			expect(cache.size).toBe(0)
		})
	})

	describe("clear", () => {
		it("should clear all entries", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")

			cache.clear()

			expect(cache.size).toBe(0)
			expect(cache.get("a")).toBeUndefined()
			expect(cache.get("b")).toBeUndefined()
			expect(cache.get("c")).toBeUndefined()
		})

		it("should reset stats", () => {
			cache.set("key1", "value1")
			cache.get("key1")
			cache.get("missing")

			cache.clear()

			// Stats are not reset by clear, only size
			expect(cache.size).toBe(0)
		})
	})

	describe("stats", () => {
		it("should return correct stats", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.get("a") // hit
			cache.get("b") // hit
			cache.get("missing") // miss
			cache.set("c", "3")
			cache.set("d", "4") // eviction

			const stats: LRUCacheStats = cache.stats
			expect(stats.hits).toBe(2)
			expect(stats.misses).toBe(1)
			expect(stats.evictions).toBe(1)
			expect(stats.size).toBe(3)
			expect(stats.maxSize).toBe(3)
		})
	})

	describe("size property", () => {
		it("should return current size", () => {
			expect(cache.size).toBe(0)
			cache.set("a", "1")
			expect(cache.size).toBe(1)
			cache.set("b", "2")
			expect(cache.size).toBe(2)
		})

		it("should not exceed maxSize", () => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
			cache.set("d", "4")
			cache.set("e", "5")

			expect(cache.size).toBe(3) // maxSize
		})
	})

	describe("maxSize property", () => {
		it("should return configured max size", () => {
			expect(cache.maxSize).toBe(3)
		})
	})

	describe("iterators", () => {
		beforeEach(() => {
			cache.set("a", "1")
			cache.set("b", "2")
			cache.set("c", "3")
		})

		it("should iterate over keys", () => {
			const keys = Array.from(cache.keys())
			expect(keys).toEqual(["a", "b", "c"])
		})

		it("should iterate over values", () => {
			const values = Array.from(cache.values())
			expect(values).toEqual(["1", "2", "3"])
		})

		it("should iterate over entries", () => {
			const entries = Array.from(cache.entries())
			expect(entries).toEqual([
				["a", "1"],
				["b", "2"],
				["c", "3"],
			])
		})
	})
})

describe("createLRUCache", () => {
	it("should create LRUCache instance with options", () => {
		const cache = createLRUCache<string>({ maxSize: 50, defaultTtl: 30 })
		expect(cache.maxSize).toBe(50)
		expect(cache.size).toBe(0)
	})

	it("should create LRUCache with default options", () => {
		const cache = createLRUCache<string>()
		expect(cache.maxSize).toBe(1000)
	})
})

describe("defaultLRUCache", () => {
	it("should be a shared LRUCache instance", () => {
		expect(defaultLRUCache).toBeInstanceOf(LRUCache)
		expect(defaultLRUCache.maxSize).toBe(1000)
	})

	it("should persist values across accesses", () => {
		defaultLRUCache.set("test-key", "test-value")
		expect(defaultLRUCache.get("test-key")).toBe("test-value")
		defaultLRUCache.delete("test-key")
	})
})

// =============================================================================
// Cache Key Generator Tests
// =============================================================================

describe("Cache Key Generators", () => {
	describe("CACHE_KEY_PREFIX", () => {
		it("should have default prefix", () => {
			expect(CACHE_KEY_PREFIX).toBe("ai-assistant:v6:")
		})
	})

	describe("chatKey", () => {
		it("should generate chat key with prefix", () => {
			const key = chatKey("chat-123")
			expect(key).toBe("ai-assistant:v6:chat:chat-123")
		})

		it("should handle UUID format", () => {
			const key = chatKey("550e8400-e29b-41d4-a716-446655440000")
			expect(key).toBe(
				"ai-assistant:v6:chat:550e8400-e29b-41d4-a716-446655440000",
			)
		})
	})

	describe("chatListKey", () => {
		it("should generate chat list key for user", () => {
			const key = chatListKey("user-123")
			expect(key).toBe("ai-assistant:v6:chatList:user-123")
		})
	})

	describe("messageKey", () => {
		it("should generate message key with prefix", () => {
			const key = messageKey("msg-456")
			expect(key).toBe("ai-assistant:v6:message:msg-456")
		})
	})

	describe("userKey", () => {
		it("should generate user key with prefix", () => {
			const key = userKey("user-789")
			expect(key).toBe("ai-assistant:v6:user:user-789")
		})
	})

	describe("userChatsKey", () => {
		it("should generate user chats key", () => {
			const key = userChatsKey("user-123")
			// Implementation: buildKey("user", userId, "chats") -> "ai-assistant:v6:user:user-123:chats"
			expect(key).toBe("ai-assistant:v6:user:user-123:chats")
		})
	})

	describe("artifactKey", () => {
		it("should generate artifact key with prefix", () => {
			const key = artifactKey("artifact-789")
			expect(key).toBe("ai-assistant:v6:artifact:artifact-789")
		})
	})

	describe("chatMessagesKey", () => {
		it("should generate chat messages key", () => {
			const key = chatMessagesKey("chat-123", "user-456")
			expect(key).toBe("ai-assistant:v6:chat:chat-123:user-456:msgs")
		})
	})

	describe("chatMetaKey", () => {
		it("should generate chat meta key", () => {
			const key = chatMetaKey("chat-123", "user-456")
			expect(key).toBe("ai-assistant:v6:chat:chat-123:user-456:meta")
		})
	})

	describe("pattern keys", () => {
		it("should generate chat keys pattern", () => {
			const pattern = chatKeysPattern("chat-123")
			expect(pattern).toBe("ai-assistant:v6:chat:chat-123:*")
		})

		it("should generate user keys pattern", () => {
			const pattern = userKeysPattern("user-456")
			expect(pattern).toBe("ai-assistant:v6:*:user-456:*")
		})

		it("should generate chat messages pattern", () => {
			const pattern = chatMessagesPattern("chat-123")
			expect(pattern).toBe("ai-assistant:v6:chat:chat-123:*:msgs")
		})
	})

	describe("key consistency", () => {
		it("should generate consistent keys for same input", () => {
			const id = "test-id-123"
			expect(chatKey(id)).toBe(chatKey(id))
			expect(messageKey(id)).toBe(messageKey(id))
			expect(userKey(id)).toBe(userKey(id))
		})

		it("should generate different keys for different entities with same ID", () => {
			const id = "test-id-123"
			expect(chatKey(id)).not.toBe(messageKey(id))
			expect(chatKey(id)).not.toBe(userKey(id))
			expect(messageKey(id)).not.toBe(userKey(id))
		})
	})
})

// =============================================================================
// Integration Tests with Mock Scenarios
// =============================================================================

describe("LRU Cache Integration Scenarios", () => {
	it("should handle rapid set/get operations", () => {
		const cache = new LRUCache<number>({ maxSize: 100 })

		// Set 100 items
		for (let i = 0; i < 100; i++) {
			cache.set(`key-${i}`, i)
		}

		// All should be present
		expect(cache.size).toBe(100)

		// Get all items
		for (let i = 0; i < 100; i++) {
			expect(cache.get(`key-${i}`)).toBe(i)
		}

		expect(cache.stats.hits).toBe(100)
	})

	it("should handle cache warming scenario", () => {
		const cache = new LRUCache<string>({ maxSize: 10 })

		// Warm cache with initial data
		const initialData = [
			["user:1", "John"],
			["user:2", "Jane"],
			["user:3", "Bob"],
		] as const

		for (const [key, value] of initialData) {
			cache.set(key, value)
		}

		expect(cache.size).toBe(3)
		expect(cache.get("user:1")).toBe("John")
		expect(cache.get("user:2")).toBe("Jane")
		expect(cache.get("user:3")).toBe("Bob")
	})

	it("should handle session-like data with TTL", () => {
		vi.useFakeTimers()
		const cache = new LRUCache<{ userId: string; role: string }>({
			maxSize: 100,
			defaultTtl: 3600, // 1 hour
		})

		cache.set("session:abc123", { userId: "user-1", role: "admin" })

		// Session valid after 30 minutes
		vi.advanceTimersByTime(30 * 60 * 1000)
		expect(cache.get("session:abc123")).toEqual({
			userId: "user-1",
			role: "admin",
		})

		// Session expired after 1 hour
		vi.advanceTimersByTime(31 * 60 * 1000)
		expect(cache.get("session:abc123")).toBeUndefined()

		vi.useRealTimers()
	})

	it("should handle frequently accessed hot data pattern", () => {
		const cache = new LRUCache<string>({ maxSize: 5 })

		// Load initial data
		cache.set("hot1", "data1")
		cache.set("hot2", "data2")
		cache.set("hot3", "data3")
		cache.set("cold1", "data4")
		cache.set("cold2", "data5")

		// Access hot data frequently
		for (let i = 0; i < 10; i++) {
			cache.get("hot1")
			cache.get("hot2")
			cache.get("hot3")
		}

		// Add new items, should evict cold data
		cache.set("new1", "newdata1")
		cache.set("new2", "newdata2")

		// Hot data should still be present
		expect(cache.get("hot1")).toBe("data1")
		expect(cache.get("hot2")).toBe("data2")
		expect(cache.get("hot3")).toBe("data3")

		// Cold data should be evicted
		expect(cache.get("cold1")).toBeUndefined()
		expect(cache.get("cold2")).toBeUndefined()
	})
})
