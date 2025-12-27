/**
 * Cache Key Definitions
 * @module @/lib/cache/keys
 *
 * Centralized cache key generators for type-safe cache operations.
 */

export const cacheKeys = {
	// User-scoped keys
	userChats: (userId: string) => `user:${userId}:chats` as const,
	userProfile: (userId: string) => `user:${userId}:profile` as const,

	// Chat-scoped keys
	chatDetail: (chatId: string) => `chat:${chatId}` as const,
	chatMessages: (chatId: string) => `chat:${chatId}:messages` as const,
	chatMeta: (chatId: string, userId: string) =>
		`chat:${chatId}:${userId}:meta` as const,

	// Document-scoped keys
	document: (docId: string) => `doc:${docId}` as const,
	documentsByUser: (userId: string) => `user:${userId}:docs` as const,

	// Suggestion keys
	suggestions: (docId: string) => `doc:${docId}:suggestions` as const,

	// Global keys
	models: () => "config:models" as const,
} as const;

export type CacheKey = ReturnType<(typeof cacheKeys)[keyof typeof cacheKeys]>;

// Default TTL values in seconds
export const cacheTTL = {
	short: 60, // 1 minute
	medium: 300, // 5 minutes
	long: 3600, // 1 hour
	day: 86400, // 24 hours
	week: 604800, // 7 days
} as const;

export type CacheTTL = (typeof cacheTTL)[keyof typeof cacheTTL];
