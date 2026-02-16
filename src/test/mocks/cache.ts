/**
 * Cache Mocks for Testing
 *
 * Provides mock implementations of cache operations for unit tests.
 * Uses in-memory Map storage for fast, isolated test execution.
 *
 * @module src/test/mocks/cache
 */

import { vi } from "vitest"

// =============================================================================
// In-Memory Cache Storage
// =============================================================================

/**
 * In-memory cache storage for tests
 * Simulates Redis-like key-value storage with TTL support
 */
export const mockCacheStorage = new Map<
	string,
	{
		value: unknown
		expiresAt?: number
	}
>()

// =============================================================================
// Mock Redis Client
// =============================================================================

/**
 * Create a mock Redis client with standard operations
 */
export function createMockRedisClient() {
	return {
		// Basic operations
		get: vi.fn(async (key: string): Promise<string | null> => {
			const entry = mockCacheStorage.get(key)
			if (!entry) return null
			if (entry.expiresAt && Date.now() > entry.expiresAt) {
				mockCacheStorage.delete(key)
				return null
			}
			return JSON.stringify(entry.value)
		}),

		set: vi.fn(
			async (
				key: string,
				value: string,
				options?: { ex?: number; px?: number },
			): Promise<"OK"> => {
				const entry: { value: unknown; expiresAt?: number } = {
					value: JSON.parse(value),
				}
				if (options?.ex) {
					entry.expiresAt = Date.now() + options.ex * 1000
				} else if (options?.px) {
					entry.expiresAt = Date.now() + options.px
				}
				mockCacheStorage.set(key, entry)
				return "OK"
			},
		),

		del: vi.fn(async (...keys: string[]): Promise<number> => {
			let deleted = 0
			for (const key of keys) {
				if (mockCacheStorage.delete(key)) deleted++
			}
			return deleted
		}),

		exists: vi.fn(async (...keys: string[]): Promise<number> => {
			let count = 0
			for (const key of keys) {
				if (mockCacheStorage.has(key)) count++
			}
			return count
		}),

		// Expiration
		expire: vi.fn(async (key: string, seconds: number): Promise<number> => {
			const entry = mockCacheStorage.get(key)
			if (!entry) return 0
			entry.expiresAt = Date.now() + seconds * 1000
			return 1
		}),

		ttl: vi.fn(async (key: string): Promise<number> => {
			const entry = mockCacheStorage.get(key)
			if (!entry) return -2
			if (!entry.expiresAt) return -1
			const ttl = Math.floor((entry.expiresAt - Date.now()) / 1000)
			return ttl > 0 ? ttl : -2
		}),

		// Hash operations
		hget: vi.fn(
			async (key: string, field: string): Promise<string | null> => {
				const entry = mockCacheStorage.get(key)
				if (!entry) return null
				const hash = entry.value as Record<string, unknown>
				const value = hash[field]
				return value !== undefined ? JSON.stringify(value) : null
			},
		),

		hset: vi.fn(
			async (
				key: string,
				field: string,
				value: string,
			): Promise<number> => {
				let entry = mockCacheStorage.get(key)
				if (!entry) {
					entry = { value: {} }
					mockCacheStorage.set(key, entry)
				}
				const hash = entry.value as Record<string, unknown>
				const isNew = !(field in hash)
				hash[field] = JSON.parse(value)
				return isNew ? 1 : 0
			},
		),

		hdel: vi.fn(
			async (key: string, ...fields: string[]): Promise<number> => {
				const entry = mockCacheStorage.get(key)
				if (!entry) return 0
				const hash = entry.value as Record<string, unknown>
				let deleted = 0
				for (const field of fields) {
					if (field in hash) {
						delete hash[field]
						deleted++
					}
				}
				return deleted
			},
		),

		hgetall: vi.fn(async (key: string): Promise<Record<string, string>> => {
			const entry = mockCacheStorage.get(key)
			if (!entry) return {}
			const hash = entry.value as Record<string, unknown>
			const result: Record<string, string> = {}
			for (const [field, value] of Object.entries(hash)) {
				result[field] = JSON.stringify(value)
			}
			return result
		}),

		// List operations
		lpush: vi.fn(
			async (key: string, ...values: string[]): Promise<number> => {
				let entry = mockCacheStorage.get(key)
				if (!entry) {
					entry = { value: [] }
					mockCacheStorage.set(key, entry)
				}
				const list = entry.value as string[]
				list.unshift(...values)
				return list.length
			},
		),

		rpush: vi.fn(
			async (key: string, ...values: string[]): Promise<number> => {
				let entry = mockCacheStorage.get(key)
				if (!entry) {
					entry = { value: [] }
					mockCacheStorage.set(key, entry)
				}
				const list = entry.value as string[]
				list.push(...values)
				return list.length
			},
		),

		lrange: vi.fn(
			async (
				key: string,
				start: number,
				stop: number,
			): Promise<string[]> => {
				const entry = mockCacheStorage.get(key)
				if (!entry) return []
				const list = entry.value as string[]
				const end = stop === -1 ? list.length : stop + 1
				return list.slice(start, end)
			},
		),

		// Set operations
		sadd: vi.fn(
			async (key: string, ...members: string[]): Promise<number> => {
				let entry = mockCacheStorage.get(key)
				if (!entry) {
					entry = { value: new Set<string>() }
					mockCacheStorage.set(key, entry)
				}
				const set = entry.value as Set<string>
				let added = 0
				for (const member of members) {
					if (!set.has(member)) {
						set.add(member)
						added++
					}
				}
				return added
			},
		),

		smembers: vi.fn(async (key: string): Promise<string[]> => {
			const entry = mockCacheStorage.get(key)
			if (!entry) return []
			const set = entry.value as Set<string>
			return Array.from(set)
		}),

		sismember: vi.fn(
			async (key: string, member: string): Promise<number> => {
				const entry = mockCacheStorage.get(key)
				if (!entry) return 0
				const set = entry.value as Set<string>
				return set.has(member) ? 1 : 0
			},
		),

		// Utility
		ping: vi.fn(async (): Promise<"PONG"> => "PONG"),

		flushall: vi.fn(async (): Promise<"OK"> => {
			mockCacheStorage.clear()
			return "OK"
		}),

		keys: vi.fn(async (pattern: string): Promise<string[]> => {
			// Simple pattern matching (supports * wildcard only)
			const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`)
			return Array.from(mockCacheStorage.keys()).filter((key) =>
				regex.test(key),
			)
		}),

		// Scan for large datasets
		scan: vi.fn(
			async (
				cursor: number,
				options?: { match?: string; count?: number },
			): Promise<[number, string[]]> => {
				const keys = Array.from(mockCacheStorage.keys())
				const count = options?.count ?? 10
				const start = cursor
				const end = Math.min(start + count, keys.length)

				let matchedKeys = keys.slice(start, end)
				if (options?.match) {
					const regex = new RegExp(
						`^${options.match.replace(/\*/g, ".*")}$`,
					)
					matchedKeys = matchedKeys.filter((key) => regex.test(key))
				}

				const nextCursor = end >= keys.length ? 0 : end
				return [nextCursor, matchedKeys]
			},
		),
	}
}

// =============================================================================
// Mock Cache Key Generators
// =============================================================================

/**
 * Mock cache key generators matching lib/cache/keys.ts
 */
export const mockCacheKeys = {
	chat: (id: string) => `chat:${id}`,
	chatList: (userId: string) => `chats:${userId}`,
	message: (id: string) => `message:${id}`,
	messages: (chatId: string) => `messages:${chatId}`,
	user: (id: string) => `user:${id}`,
	userByEmail: (email: string) => `user:email:${email}`,
	artifact: (id: string) => `artifact:${id}`,
	artifacts: (chatId: string) => `artifacts:${chatId}`,
	session: (token: string) => `session:${token}`,
	rateLimit: (key: string) => `ratelimit:${key}`,
}

// =============================================================================
// Mock Cache Strategies
// =============================================================================

/**
 * Mock cache-through strategy (read from cache, fallback to DB, cache result)
 */
export const mockCacheThrough = vi.fn(
	async <T>(
		key: string,
		fetchFn: () => Promise<T>,
		ttl?: number,
	): Promise<T> => {
		const entry = mockCacheStorage.get(key)
		if (entry && (!entry.expiresAt || Date.now() < entry.expiresAt)) {
			return entry.value as T
		}

		const value = await fetchFn()
		const cacheEntry: { value: T; expiresAt?: number } = { value }
		if (ttl !== undefined) {
			cacheEntry.expiresAt = Date.now() + ttl * 1000
		}
		mockCacheStorage.set(
			key,
			cacheEntry as { value: unknown; expiresAt?: number },
		)
		return value
	},
)

/**
 * Mock write-through strategy (write to DB and cache)
 */
export const mockWriteThrough = vi.fn(
	async <T>(key: string, value: T, ttl?: number): Promise<T> => {
		const cacheEntry: { value: T; expiresAt?: number } = { value }
		if (ttl !== undefined) {
			cacheEntry.expiresAt = Date.now() + ttl * 1000
		}
		mockCacheStorage.set(
			key,
			cacheEntry as { value: unknown; expiresAt?: number },
		)
		return value
	},
)

/**
 * Mock cache invalidation
 */
export const mockInvalidate = vi.fn(async (key: string): Promise<boolean> => {
	return mockCacheStorage.delete(key)
})

/**
 * Mock cache invalidation by pattern
 */
export const mockInvalidatePattern = vi.fn(
	async (pattern: string): Promise<number> => {
		const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`)
		let count = 0
		for (const key of mockCacheStorage.keys()) {
			if (regex.test(key)) {
				mockCacheStorage.delete(key)
				count++
			}
		}
		return count
	},
)

// =============================================================================
// Mock Tiered Cache
// =============================================================================

/**
 * Mock tiered cache (L1 memory + L2 Redis)
 */
export function createMockTieredCache() {
	const l1Cache = new Map<string, { value: unknown; expiresAt?: number }>()

	return {
		// L1 (memory) operations
		l1: {
			get: vi.fn((key: string) => {
				const entry = l1Cache.get(key)
				if (!entry) return null
				if (entry.expiresAt && Date.now() > entry.expiresAt) {
					l1Cache.delete(key)
					return null
				}
				return entry.value
			}),
			set: vi.fn((key: string, value: unknown, ttl?: number) => {
				const cacheEntry: { value: unknown; expiresAt?: number } = {
					value,
				}
				if (ttl !== undefined) {
					cacheEntry.expiresAt = Date.now() + ttl * 1000
				}
				l1Cache.set(key, cacheEntry)
			}),
			delete: vi.fn((key: string) => l1Cache.delete(key)),
			clear: vi.fn(() => l1Cache.clear()),
		},

		// L2 (Redis) operations - uses mockCacheStorage
		l2: createMockRedisClient(),

		// Combined tiered operations
		get: vi.fn(async <T>(key: string): Promise<T | null> => {
			// Check L1 first
			const l1Entry = l1Cache.get(key)
			if (
				l1Entry &&
				(!l1Entry.expiresAt || Date.now() < l1Entry.expiresAt)
			) {
				return l1Entry.value as T
			}

			// Fall back to L2
			const entry = mockCacheStorage.get(key)
			if (!entry) return null
			if (entry.expiresAt && Date.now() > entry.expiresAt) {
				mockCacheStorage.delete(key)
				return null
			}

			// Promote to L1
			l1Cache.set(key, entry as { value: T; expiresAt?: number })
			return entry.value as T
		}),

		set: vi.fn(
			async <T>(key: string, value: T, ttl?: number): Promise<void> => {
				const entry: { value: T; expiresAt?: number } = { value }
				if (ttl !== undefined) {
					entry.expiresAt = Date.now() + ttl * 1000
				}
				l1Cache.set(
					key,
					entry as { value: unknown; expiresAt?: number },
				)
				mockCacheStorage.set(
					key,
					entry as { value: unknown; expiresAt?: number },
				)
			},
		),

		delete: vi.fn(async (key: string): Promise<boolean> => {
			l1Cache.delete(key)
			return mockCacheStorage.delete(key)
		}),

		clear: vi.fn(async (): Promise<void> => {
			l1Cache.clear()
			mockCacheStorage.clear()
		}),
	}
}

// =============================================================================
// Reset Utilities
// =============================================================================

/**
 * Reset all mock cache storage
 * Call this in beforeEach or afterEach to ensure test isolation
 */
export function resetMockCache(): void {
	mockCacheStorage.clear()
	vi.clearAllMocks()
}

// =============================================================================
// Mock Module Exports
// =============================================================================

/**
 * Mock the entire lib/cache module
 */
export function mockCacheModule() {
	return {
		getRedisClient: vi.fn(() => createMockRedisClient()),
		isRedisAvailable: vi.fn(() => true),
		checkRedisHealth: vi.fn(async () => true),
		cacheKeys: mockCacheKeys,
		cacheThrough: mockCacheThrough,
		writeThrough: mockWriteThrough,
		invalidate: mockInvalidate,
		invalidatePattern: mockInvalidatePattern,
		createTieredCache: vi.fn(() => createMockTieredCache()),
	}
}
