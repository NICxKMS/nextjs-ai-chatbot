/**
 * Cache-Through Behavior Integration Tests
 *
 * Tests cross-module workflows for cache operations including:
 * - Cache hit/miss scenarios
 * - Cache invalidation patterns
 * - Tiered cache behavior (L1/L2)
 * - Cross-repository cache integration
 *
 * @module tests/integration/cache-through.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { chatFixtures, userFixtures } from "@/src/test/fixtures"
import {
	createMockRedisClient,
	createMockTieredCache,
	mockCacheKeys,
	mockCacheStorage,
	mockCacheThrough,
	mockInvalidate,
	mockInvalidatePattern,
	mockWriteThrough,
	resetMockCache,
} from "@/src/test/mocks/cache"
import {
	mockChatRepository,
	resetMockDatabase,
	seedMockDatabase,
} from "@/src/test/mocks/db"

// =============================================================================
// Mocks
// =============================================================================

// Mock server-only
vi.mock("server-only", () => ({
	default: {},
}))

// =============================================================================
// Tests
// =============================================================================

describe("Cache-Through Behavior Integration", () => {
	beforeEach(() => {
		resetMockCache()
		resetMockDatabase()
		seedMockDatabase({
			users: [
				{
					email: userFixtures.testUser.email,
					passwordHash: userFixtures.testUser.passwordHash ?? null,
				},
			],
			chats: [
				{
					title: chatFixtures.testChat.title,
					userId: userFixtures.testUser.id,
					visibility: "private",
				},
			],
		})
		vi.clearAllMocks()
	})

	afterEach(() => {
		resetMockCache()
		resetMockDatabase()
	})

	// ---------------------------------------------------------------------------
	// Cache Hit/Miss Scenarios
	// ---------------------------------------------------------------------------

	describe("Cache Hit/Miss Scenarios", () => {
		it("should return cached value on cache hit", async () => {
			const key = mockCacheKeys.chat("test-chat-id")
			const cachedData = { id: "test-chat-id", title: "Cached Chat" }

			// Pre-populate cache
			mockCacheStorage.set(key, {
				value: cachedData,
				expiresAt: Date.now() + 3600000,
			})

			// Cache-through should return cached value
			const result = await mockCacheThrough(
				key,
				async () => ({ id: "test-chat-id", title: "Fresh Chat" }),
				3600,
			)

			expect(result).toEqual(cachedData)
		})

		it("should fetch from source on cache miss", async () => {
			const key = mockCacheKeys.chat("new-chat-id")
			const freshData = { id: "new-chat-id", title: "Fresh Chat" }

			// Cache-through should fetch from source
			const result = await mockCacheThrough(
				key,
				async () => freshData,
				3600,
			)

			expect(result).toEqual(freshData)

			// Verify data is now cached
			const cached = mockCacheStorage.get(key)
			expect(cached).toBeDefined()
			expect((cached?.value as { id: string }).id).toBe("new-chat-id")
		})

		it("should handle cache miss with null result", async () => {
			const key = mockCacheKeys.chat("non-existent")

			const result = await mockCacheThrough(key, async () => null, 3600)

			expect(result).toBeNull()
		})

		it("should respect TTL on cached values", async () => {
			const key = mockCacheKeys.chat("ttl-test")
			const data = { id: "ttl-test", title: "TTL Test" }

			// Cache with short TTL
			await mockCacheThrough(key, async () => data, 1)

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Cache should be expired
			const redis = createMockRedisClient()
			const result = await redis.get(key)
			expect(result).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Cache Invalidation Patterns
	// ---------------------------------------------------------------------------

	describe("Cache Invalidation Patterns", () => {
		it("should invalidate single cache key", async () => {
			const key = mockCacheKeys.chat("chat-to-invalidate")

			// Cache some data
			mockCacheStorage.set(key, {
				value: { id: "chat-to-invalidate" },
				expiresAt: Date.now() + 3600000,
			})

			// Invalidate
			const result = await mockInvalidate(key)
			expect(result).toBe(true)

			// Verify cache is cleared
			const cached = mockCacheStorage.get(key)
			expect(cached).toBeUndefined()
		})

		it("should invalidate cache by pattern", async () => {
			const userId = userFixtures.testUser.id

			// Cache multiple related keys
			mockCacheStorage.set(mockCacheKeys.chat("chat-1"), {
				value: { id: "chat-1", userId },
				expiresAt: Date.now() + 3600000,
			})
			mockCacheStorage.set(mockCacheKeys.chat("chat-2"), {
				value: { id: "chat-2", userId },
				expiresAt: Date.now() + 3600000,
			})
			mockCacheStorage.set(mockCacheKeys.chatList(userId), {
				value: [{ id: "chat-1" }, { id: "chat-2" }],
				expiresAt: Date.now() + 3600000,
			})

			// Invalidate all chat-related keys for user
			const pattern = `chat:*`
			const count = await mockInvalidatePattern(pattern)

			expect(count).toBeGreaterThanOrEqual(2)
		})

		it("should cascade invalidation on entity update", async () => {
			const chatId = "chat-to-update"
			const userId = userFixtures.testUser.id

			// Cache chat and related list
			mockCacheStorage.set(mockCacheKeys.chat(chatId), {
				value: { id: chatId, title: "Old Title" },
				expiresAt: Date.now() + 3600000,
			})
			mockCacheStorage.set(mockCacheKeys.chatList(userId), {
				value: [{ id: chatId }],
				expiresAt: Date.now() + 3600000,
			})

			// Simulate update - invalidate both
			await mockInvalidate(mockCacheKeys.chat(chatId))
			await mockInvalidate(mockCacheKeys.chatList(userId))

			// Verify both are cleared
			expect(
				mockCacheStorage.get(mockCacheKeys.chat(chatId)),
			).toBeUndefined()
			expect(
				mockCacheStorage.get(mockCacheKeys.chatList(userId)),
			).toBeUndefined()
		})
	})

	// ---------------------------------------------------------------------------
	// Write-Through Behavior
	// ---------------------------------------------------------------------------

	describe("Write-Through Behavior", () => {
		it("should write to cache on data creation", async () => {
			const key = mockCacheKeys.chat("new-chat")
			const data = { id: "new-chat", title: "New Chat" }

			await mockWriteThrough(key, data, 3600)

			// Verify cache is populated
			const cached = mockCacheStorage.get(key)
			expect(cached).toBeDefined()
			expect((cached?.value as { id: string }).id).toBe("new-chat")
		})

		it("should update cache on data modification", async () => {
			const key = mockCacheKeys.chat("chat-to-modify")

			// Initial cache
			mockCacheStorage.set(key, {
				value: { id: "chat-to-modify", title: "Old Title" },
				expiresAt: Date.now() + 3600000,
			})

			// Update via write-through
			const updatedData = { id: "chat-to-modify", title: "New Title" }
			await mockWriteThrough(key, updatedData, 3600)

			// Verify cache is updated
			const cached = mockCacheStorage.get(key)
			expect((cached?.value as { title: string }).title).toBe("New Title")
		})
	})

	// ---------------------------------------------------------------------------
	// Tiered Cache Behavior
	// ---------------------------------------------------------------------------

	describe("Tiered Cache Behavior", () => {
		it("should check L1 before L2", async () => {
			const tieredCache = createMockTieredCache()
			const key = "test-key"
			const value = "test-value"

			// Set in L1 only
			tieredCache.l1.set(key, value)

			// Get should return from L1
			const result = await tieredCache.get(key)
			expect(result).toBe(value)
		})

		it("should fall back to L2 on L1 miss", async () => {
			const tieredCache = createMockTieredCache()
			const key = "l2-key"
			const value = "l2-value"

			// Set in L2 only
			await tieredCache.l2.set(key, JSON.stringify(value), { ex: 3600 })

			// Get should return from L2
			const result = await tieredCache.get(key)
			expect(result).toBe(value)
		})

		it("should promote L2 hit to L1", async () => {
			const tieredCache = createMockTieredCache()
			const key = "promote-key"
			const value = "promote-value"

			// Set in L2
			await tieredCache.l2.set(key, JSON.stringify(value), { ex: 3600 })

			// Get (should promote to L1)
			await tieredCache.get(key)

			// Verify L1 now has the value
			const l1Value = tieredCache.l1.get(key)
			expect(l1Value).toBe(value)
		})

		it("should write to both L1 and L2 on set", async () => {
			const tieredCache = createMockTieredCache()
			const key = "dual-write-key"
			const value = "dual-write-value"

			await tieredCache.set(key, value, 3600)

			// Verify L1 has value
			expect(tieredCache.l1.get(key)).toBe(value)

			// Verify L2 has value
			const l2Value = await tieredCache.l2.get(key)
			expect(l2Value).toBe(JSON.stringify(value))
		})

		it("should clear both L1 and L2", async () => {
			const tieredCache = createMockTieredCache()

			// Populate both tiers
			await tieredCache.set("key1", "value1", 3600)
			await tieredCache.set("key2", "value2", 3600)

			// Clear
			await tieredCache.clear()

			// Verify both are empty - L1 returns null after clear
			expect(tieredCache.l1.get("key1")).toBeNull()
			const l2Result = await tieredCache.l2.get("key1")
			expect(l2Result).toBeNull()
		})
	})

	// ---------------------------------------------------------------------------
	// Cross-Repository Cache Integration
	// ---------------------------------------------------------------------------

	describe("Cross-Repository Cache Integration", () => {
		it("should cache chat repository results", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = mockCacheKeys.chatList(userId)

			// Get chats from repository
			const chats = await mockChatRepository.findByUserId(userId)

			// Cache the results
			await mockWriteThrough(cacheKey, chats, 300)

			// Verify cache
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeDefined()
		})

		it("should invalidate cache on repository mutation", async () => {
			const userId = userFixtures.testUser.id
			const cacheKey = mockCacheKeys.chatList(userId)

			// Cache initial results
			const initialChats = await mockChatRepository.findByUserId(userId)
			await mockWriteThrough(cacheKey, initialChats, 300)

			// Create new chat (mutation)
			await mockChatRepository.create({
				title: "New Chat",
				userId,
				visibility: "private",
			})

			// Invalidate cache
			await mockInvalidate(cacheKey)

			// Verify cache is cleared
			const cached = mockCacheStorage.get(cacheKey)
			expect(cached).toBeUndefined()
		})

		it("should handle cache stampede with concurrent requests", async () => {
			const key = mockCacheKeys.chat("stampede-test")
			let fetchCount = 0

			// Simulate concurrent cache-through requests
			const requests = Array.from({ length: 10 }, () =>
				mockCacheThrough(
					key,
					async () => {
						fetchCount++
						await new Promise((resolve) => setTimeout(resolve, 100))
						return { id: "stampede-test", count: fetchCount }
					},
					3600,
				),
			)

			const results = await Promise.all(requests)

			// All results should be valid
			results.forEach((result) => {
				expect(result).toBeDefined()
			})
		})
	})

	// ---------------------------------------------------------------------------
	// Cache Key Generation
	// ---------------------------------------------------------------------------

	describe("Cache Key Generation", () => {
		it("should generate consistent cache keys", () => {
			const chatId = "chat-123"
			const userId = "user-456"

			expect(mockCacheKeys.chat(chatId)).toBe(`chat:${chatId}`)
			expect(mockCacheKeys.chatList(userId)).toBe(`chats:${userId}`)
			expect(mockCacheKeys.user(userId)).toBe(`user:${userId}`)
		})

		it("should generate unique keys for different entities", () => {
			const chatKey = mockCacheKeys.chat("123")
			const userKey = mockCacheKeys.user("123")
			const messageKey = mockCacheKeys.message("123")

			expect(chatKey).not.toBe(userKey)
			expect(chatKey).not.toBe(messageKey)
			expect(userKey).not.toBe(messageKey)
		})
	})

	// ---------------------------------------------------------------------------
	// Error Handling
	// ---------------------------------------------------------------------------

	describe("Error Handling", () => {
		it("should handle cache errors gracefully", async () => {
			const key = "error-test-key"

			// Fetcher that throws should propagate error
			await expect(
				mockCacheThrough(
					key,
					async () => {
						throw new Error("Fetcher error")
					},
					3600,
				),
			).rejects.toThrow("Fetcher error")
		})

		it("should handle invalidation of non-existent key", async () => {
			const result = await mockInvalidate("non-existent-key")
			expect(result).toBe(false)
		})

		it("should handle pattern invalidation with no matches", async () => {
			const count = await mockInvalidatePattern("nonexistent:*")
			expect(count).toBe(0)
		})
	})
})
