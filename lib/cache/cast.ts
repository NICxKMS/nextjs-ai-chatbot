/**
 * Type-Safe Cache Data Casting Utilities
 *
 * Provides safe casting functions for cache data with validation.
 * These utilities ensure type safety when reading/writing to cache
 * by validating data structures before casting.
 *
 * @module lib/cache/cast
 */

/**
 * v6 auth note:
 * Cache entities are keyed by application `userId` from NextAuth session state.
 * Unlike legacy Supabase-auth flows, cache casting does not decode provider JWT
 * payloads; it validates data against strongly typed app-level cache contracts.
 */

import type { AppUsage } from "@/lib/ai"
import type {
	CachedChat,
	CachedChatMeta,
	CachedMessage,
	UserChatListItem,
} from "./types"
import { isCachedChatMeta, isCachedMessage, isUserChatListItem } from "./types"

// =============================================================================
// Cast Result Types
// =============================================================================

/**
 * Result of a safe cast operation.
 * Uses discriminated union for type-safe error handling.
 */
export type CastResult<T> =
	| { success: true; data: T }
	| { success: false; error: CastError }

/**
 * Error information for failed cast operations.
 */
export interface CastError {
	/** Error code for programmatic handling */
	code: "INVALID_TYPE" | "MISSING_FIELD" | "INVALID_VALUE" | "PARSE_ERROR"
	/** Human-readable error message */
	message: string
	/** Field that caused the error (if applicable) */
	field?: string
	/** Expected type or format */
	expected?: string
	/** Actual value or type received */
	actual?: unknown
}

// =============================================================================
// AppUsage Casting
// =============================================================================

/**
 * Validates if a value looks like an AppUsage object.
 * AppUsage is a combination of LanguageModelV2Usage and UsageData.
 */
function isValidAppUsage(value: unknown): value is AppUsage {
	if (typeof value !== "object" || value === null) return false

	const usage = value as Record<string, unknown>

	// Check for valid numeric fields (all optional but must be numbers if present)
	const numericFields = [
		"inputTokens",
		"outputTokens",
		"totalTokens",
		"promptTokens",
		"completionTokens",
		"cachedTokens",
		"inputCost",
		"outputCost",
		"totalCost",
	]

	for (const field of numericFields) {
		if (
			usage[field] !== undefined &&
			typeof usage[field] !== "number" &&
			usage[field] !== null
		) {
			return false
		}
	}

	// modelId must be a string if present
	if (
		usage.modelId !== undefined &&
		typeof usage.modelId !== "string" &&
		usage.modelId !== null
	) {
		return false
	}

	// model must be a string if present (from UsageData)
	if (
		usage.model !== undefined &&
		typeof usage.model !== "string" &&
		usage.model !== null
	) {
		return false
	}

	return true
}

/**
 * Safely casts a value to AppUsage with validation.
 *
 * @param value - The value to cast
 * @returns CastResult with validated AppUsage or error
 *
 * @example
 * ```typescript
 * const result = castToAppUsage(cachedData.lastContext)
 * if (result.success) {
 *   console.log('Usage tokens:', result.data.totalTokens)
 * } else {
 *   console.error('Cast failed:', result.error.message)
 * }
 * ```
 */
export function castToAppUsage(value: unknown): CastResult<AppUsage> {
	if (value === null) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Value is null",
				expected: "AppUsage",
				actual: null,
			},
		}
	}

	if (value === undefined) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Value is undefined",
				expected: "AppUsage",
				actual: undefined,
			},
		}
	}

	if (!isValidAppUsage(value)) {
		return {
			success: false,
			error: {
				code: "INVALID_VALUE",
				message: "Invalid AppUsage structure",
				expected: "AppUsage",
				actual: value,
			},
		}
	}

	return { success: true, data: value }
}

/**
 * Safely casts a value to AppUsage | null with validation.
 * Allows null values for optional lastContext field.
 *
 * @param value - The value to cast
 * @returns CastResult with validated AppUsage, null, or error
 */
export function castToAppUsageOrNull(
	value: unknown,
): CastResult<AppUsage | null> {
	if (value === null) {
		return { success: true, data: null }
	}

	return castToAppUsage(value)
}

// =============================================================================
// CachedChatMeta Casting
// =============================================================================

/**
 * Safely casts a value to CachedChatMeta with validation.
 *
 * @param value - The value to cast
 * @returns CastResult with validated CachedChatMeta or error
 *
 * @example
 * ```typescript
 * const result = castToCachedChatMeta(parsedJson)
 * if (result.success) {
 *   console.log('Chat title:', result.data.title)
 * }
 * ```
 */
export function castToCachedChatMeta(
	value: unknown,
): CastResult<CachedChatMeta> {
	if (!isCachedChatMeta(value)) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Invalid CachedChatMeta structure",
				expected: "CachedChatMeta",
				actual: typeof value,
			},
		}
	}

	// Validate lastContext if present
	if (value.lastContext !== null && !isValidAppUsage(value.lastContext)) {
		return {
			success: false,
			error: {
				code: "INVALID_VALUE",
				message: "Invalid lastContext in CachedChatMeta",
				field: "lastContext",
				expected: "AppUsage | null",
				actual: value.lastContext,
			},
		}
	}

	return { success: true, data: value }
}

// =============================================================================
// CachedMessage Casting
// =============================================================================

/**
 * Safely casts a value to CachedMessage with validation.
 *
 * @param value - The value to cast
 * @returns CastResult with validated CachedMessage or error
 */
export function castToCachedMessage(value: unknown): CastResult<CachedMessage> {
	if (!isCachedMessage(value)) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Invalid CachedMessage structure",
				expected: "CachedMessage",
				actual: typeof value,
			},
		}
	}

	return { success: true, data: value }
}

/**
 * Safely casts an array of values to CachedMessage[] with validation.
 * Returns partial results - valid messages and errors for invalid ones.
 *
 * @param values - Array of values to cast
 * @returns Object with valid messages and errors
 */
export function castToCachedMessages(values: unknown[]): {
	messages: CachedMessage[]
	errors: Array<{ index: number; error: CastError }>
} {
	const messages: CachedMessage[] = []
	const errors: Array<{ index: number; error: CastError }> = []

	for (let i = 0; i < values.length; i++) {
		const result = castToCachedMessage(values[i])
		if (result.success) {
			messages.push(result.data)
		} else {
			errors.push({ index: i, error: result.error })
		}
	}

	return { messages, errors }
}

// =============================================================================
// CachedChat Casting
// =============================================================================

/**
 * Safely casts a value to CachedChat with validation.
 * Validates both metadata and messages array.
 *
 * @param value - The value to cast
 * @returns CastResult with validated CachedChat or error
 */
export function castToCachedChat(value: unknown): CastResult<CachedChat> {
	if (typeof value !== "object" || value === null) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Value is not an object",
				expected: "CachedChat",
				actual: typeof value,
			},
		}
	}

	const obj = value as Record<string, unknown>

	// Check for messages array
	if (!Array.isArray(obj.messages)) {
		return {
			success: false,
			error: {
				code: "MISSING_FIELD",
				message: "CachedChat must have a messages array",
				field: "messages",
				expected: "CachedMessage[]",
				actual: typeof obj.messages,
			},
		}
	}

	// Validate metadata fields (excluding messages)
	const { messages, ...meta } = obj
	const metaResult = castToCachedChatMeta(meta)

	if (!metaResult.success) {
		return metaResult
	}

	// Validate all messages
	const messagesResult = castToCachedMessages(messages)
	if (messagesResult.errors.length > 0) {
		return {
			success: false,
			error: {
				code: "INVALID_VALUE",
				message: `Invalid messages at indices: ${messagesResult.errors.map((e) => e.index).join(", ")}`,
				field: "messages",
				expected: "CachedMessage[]",
				actual: `${messagesResult.errors.length} invalid messages`,
			},
		}
	}

	return {
		success: true,
		data: {
			...metaResult.data,
			messages: messagesResult.messages,
		},
	}
}

// =============================================================================
// UserChatListItem Casting
// =============================================================================

/**
 * Safely casts a value to UserChatListItem with validation.
 *
 * @param value - The value to cast
 * @returns CastResult with validated UserChatListItem or error
 */
export function castToUserChatListItem(
	value: unknown,
): CastResult<UserChatListItem> {
	if (!isUserChatListItem(value)) {
		return {
			success: false,
			error: {
				code: "INVALID_TYPE",
				message: "Invalid UserChatListItem structure",
				expected: "UserChatListItem",
				actual: typeof value,
			},
		}
	}

	return { success: true, data: value }
}

/**
 * Safely casts an array of values to UserChatListItem[] with validation.
 *
 * @param values - Array of values to cast
 * @returns Object with valid items and errors
 */
export function castToUserChatListItems(values: unknown[]): {
	items: UserChatListItem[]
	errors: Array<{ index: number; error: CastError }>
} {
	const items: UserChatListItem[] = []
	const errors: Array<{ index: number; error: CastError }> = []

	for (let i = 0; i < values.length; i++) {
		const result = castToUserChatListItem(values[i])
		if (result.success) {
			items.push(result.data)
		} else {
			errors.push({ index: i, error: result.error })
		}
	}

	return { items, errors }
}

// =============================================================================
// JSON Parsing with Cast
// =============================================================================

/**
 * Parses JSON string and casts to specified type with validation.
 *
 * @param jsonString - JSON string to parse
 * @param castFn - Cast function to validate the parsed value
 * @returns CastResult with validated data or error
 *
 * @example
 * ```typescript
 * const result = parseAndCast(jsonString, castToCachedChatMeta)
 * if (result.success) {
 *   console.log('Parsed chat:', result.data.title)
 * }
 * ```
 */
export function parseAndCast<T>(
	jsonString: string,
	castFn: (value: unknown) => CastResult<T>,
): CastResult<T> {
	try {
		const parsed = JSON.parse(jsonString)
		return castFn(parsed)
	} catch (e) {
		return {
			success: false,
			error: {
				code: "PARSE_ERROR",
				message:
					e instanceof Error ? e.message : "Failed to parse JSON",
				actual: jsonString.slice(0, 100),
			},
		}
	}
}

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Serializes a value to JSON string with type checking.
 * Returns null for values that cannot be serialized.
 *
 * @param value - Value to serialize
 * @returns JSON string or null if serialization fails
 */
export function safeSerialize(value: unknown): string | null {
	try {
		return JSON.stringify(value)
	} catch {
		return null
	}
}

/**
 * Deserializes a JSON string with validation.
 *
 * @param jsonString - JSON string to deserialize
 * @returns Parsed value or null if parsing fails
 */
export function safeDeserialize(jsonString: string): unknown {
	try {
		return JSON.parse(jsonString)
	} catch {
		return null
	}
}

// =============================================================================
// Date Handling for Cache
// =============================================================================

/**
 * Converts a Date to ISO string for cache storage.
 *
 * @param date - Date to convert
 * @returns ISO string representation
 */
export function dateToCacheString(date: Date): string {
	return date.toISOString()
}

/**
 * Parses a cache date string to Date object.
 *
 * @param dateString - ISO date string from cache
 * @returns Date object or null if invalid
 */
export function cacheStringToDate(dateString: string): Date | null {
	const date = new Date(dateString)
	if (Number.isNaN(date.getTime())) {
		return null
	}
	return date
}

/**
 * Converts a timestamp (ms) to ISO string for cache storage.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns ISO string representation
 */
export function timestampToCacheString(timestamp: number): string {
	return new Date(timestamp).toISOString()
}

/**
 * Converts an ISO string to timestamp (ms) for ZSET scores.
 *
 * @param dateString - ISO date string
 * @returns Unix timestamp in milliseconds
 */
export function cacheStringToTimestamp(dateString: string): number {
	return new Date(dateString).getTime()
}
