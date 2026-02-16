/**
 * Cache Key Generators
 *
 * Type-safe cache key generators for consistent key naming across the application.
 * All keys include a configurable prefix for namespace isolation.
 *
 * @module lib/cache/keys
 */

// =============================================================================
// Cache Key Prefix
// =============================================================================

/**
 * Cache key prefix for namespace isolation.
 * Allows multiple environments to share the same Redis instance.
 * Can be overridden via CACHE_KEY_PREFIX environment variable.
 */
export const CACHE_KEY_PREFIX =
	process.env.CACHE_KEY_PREFIX || "ai-assistant:v6:"

// =============================================================================
// Key Builder Utility
// =============================================================================

/**
 * Build a cache key with the configured prefix.
 *
 * @param parts - Key parts to join
 * @returns Prefixed cache key
 *
 * @example
 * ```typescript
 * buildKey('chat', '123') // 'ai-assistant:v6:chat:123'
 * ```
 */
function buildKey(...parts: string[]): string {
	return `${CACHE_KEY_PREFIX}${parts.join(":")}`
}

// =============================================================================
// Entity Cache Keys
// =============================================================================

/**
 * Generate cache key for a single chat entity.
 *
 * @param chatId - Chat UUID
 * @returns Cache key for chat data
 *
 * @example
 * ```typescript
 * const key = chatKey('550e8400-e29b-41d4-a716-446655440000');
 * // 'ai-assistant:v6:chat:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function chatKey(chatId: string): string {
	return buildKey("chat", chatId)
}

/**
 * Generate cache key for a user's chat list.
 *
 * @param userId - User UUID
 * @returns Cache key for user's chat list
 *
 * @example
 * ```typescript
 * const key = chatListKey('550e8400-e29b-41d4-a716-446655440000');
 * // 'ai-assistant:v6:chatList:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function chatListKey(userId: string): string {
	return buildKey("chatList", userId)
}

/**
 * Generate cache key for a single message entity.
 *
 * @param messageId - Message UUID
 * @returns Cache key for message data
 *
 * @example
 * ```typescript
 * const key = messageKey('550e8400-e29b-41d4-a716-446655440000');
 * // 'ai-assistant:v6:message:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function messageKey(messageId: string): string {
	return buildKey("message", messageId)
}

/**
 * Generate cache key for a user entity.
 *
 * @param userId - User UUID
 * @returns Cache key for user data
 *
 * @example
 * ```typescript
 * const key = userKey('550e8400-e29b-41d4-a716-446655440000');
 * // 'ai-assistant:v6:user:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function userKey(userId: string): string {
	return buildKey("user", userId)
}

/**
 * Generate cache key for an artifact entity.
 *
 * @param artifactId - Artifact UUID
 * @returns Cache key for artifact data
 *
 * @example
 * ```typescript
 * const key = artifactKey('550e8400-e29b-41d4-a716-446655440000');
 * // 'ai-assistant:v6:artifact:550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function artifactKey(artifactId: string): string {
	return buildKey("artifact", artifactId)
}

// =============================================================================
// Composite Cache Keys
// =============================================================================

/**
 * Generate cache key for chat metadata (without messages).
 * Used for storing chat details separately from message list.
 *
 * @param chatId - Chat UUID
 * @param userId - User UUID for ownership verification
 * @returns Cache key for chat metadata
 *
 * @example
 * ```typescript
 * const key = chatMetaKey('chat-123', 'user-456');
 * // 'ai-assistant:v6:chat:chat-123:user-456:meta'
 * ```
 */
export function chatMetaKey(chatId: string, userId: string): string {
	return buildKey("chat", chatId, userId, "meta")
}

/**
 * Generate cache key for chat messages sorted set.
 * Used for storing messages in a Redis ZSET with timestamp scores.
 *
 * @param chatId - Chat UUID
 * @param userId - User UUID for ownership verification
 * @returns Cache key for chat messages ZSET
 *
 * @example
 * ```typescript
 * const key = chatMessagesKey('chat-123', 'user-456');
 * // 'ai-assistant:v6:chat:chat-123:user-456:msgs'
 * ```
 */
export function chatMessagesKey(chatId: string, userId: string): string {
	return buildKey("chat", chatId, userId, "msgs")
}

/**
 * Generate cache key for user's chats sorted set.
 * Used for storing user's chat list with update timestamps as scores.
 *
 * @param userId - User UUID
 * @returns Cache key for user chats ZSET
 *
 * @example
 * ```typescript
 * const key = userChatsKey('user-456');
 * // 'ai-assistant:v6:user:user-456:chats'
 * ```
 */
export function userChatsKey(userId: string): string {
	return buildKey("user", userId, "chats")
}

// =============================================================================
// Pattern Keys for Batch Operations
// =============================================================================

/**
 * Generate pattern for matching all messages in a chat.
 * Use with Redis SCAN or KEYS for batch operations.
 *
 * @param chatId - Chat UUID
 * @returns Pattern string for matching chat messages
 *
 * @example
 * ```typescript
 * const pattern = chatMessagesPattern('chat-123');
 * // 'ai-assistant:v6:chat:chat-123:*:msgs'
 *
 * // Use with Redis SCAN
 * const keys = await redis.keys(chatMessagesPattern('chat-123'));
 * ```
 */
export function chatMessagesPattern(chatId: string): string {
	return buildKey("chat", chatId, "*", "msgs")
}

/**
 * Generate pattern for matching all keys for a specific user.
 * Use with Redis SCAN or KEYS for user-specific batch operations.
 *
 * @param userId - User UUID
 * @returns Pattern string for matching user's keys
 *
 * @example
 * ```typescript
 * const pattern = userKeysPattern('user-456');
 * // 'ai-assistant:v6:*:user-456:*'
 * ```
 */
export function userKeysPattern(userId: string): string {
	return `${CACHE_KEY_PREFIX}*:${userId}:*`
}

/**
 * Generate pattern for matching all chat-related keys.
 * Use with Redis SCAN or KEYS for chat-specific batch operations.
 *
 * @param chatId - Chat UUID
 * @returns Pattern string for matching chat's keys
 *
 * @example
 * ```typescript
 * const pattern = chatKeysPattern('chat-123');
 * // 'ai-assistant:v6:chat:chat-123:*'
 * ```
 */
export function chatKeysPattern(chatId: string): string {
	return buildKey("chat", chatId, "*")
}

// =============================================================================
// Cache Keys Object (for compatibility with legacy patterns)
// =============================================================================

/**
 * Cache key generators object.
 * Provides a structured interface for cache key generation.
 */
export const CacheKeys = {
	/** Single chat entity */
	chat: chatKey,
	/** User's chat list */
	chatList: chatListKey,
	/** Single message entity */
	message: messageKey,
	/** User entity */
	user: userKey,
	/** Artifact entity */
	artifact: artifactKey,
	/** Chat metadata (without messages) */
	chatMeta: chatMetaKey,
	/** Chat messages ZSET */
	chatMessages: chatMessagesKey,
	/** User's chats ZSET */
	userChats: userChatsKey,
	/** Pattern for chat messages */
	chatMessagesPattern,
	/** Pattern for user keys */
	userKeysPattern,
	/** Pattern for chat keys */
	chatKeysPattern,
} as const

/**
 * Type for CacheKeys object
 */
export type CacheKeysType = typeof CacheKeys
