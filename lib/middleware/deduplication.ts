/**
 * Request Deduplication System
 *
 * Prevents duplicate request processing for identical operations.
 * Essential for preventing race conditions and wasted resources.
 *
 * Features:
 * - Automatic request fingerprinting
 * - Configurable deduplication windows
 * - Response caching for duplicates
 * - In-flight request tracking
 * - OpenTelemetry integration
 *
 * Use cases:
 * - Prevent double-submit on slow networks
 * - Avoid race conditions in concurrent requests
 * - Reduce database load for identical queries
 * - Idempotent operations (payment processing, etc.)
 *
 * @module lib/middleware/deduplication
 */

import "server-only"

import { trace } from "@opentelemetry/api"
import { getRedisClient, type Redis } from "@/lib/cache"
import { logDebug, logInfo, logWarn } from "@/lib/log"

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for request deduplication.
 */
export interface DeduplicationConfig {
	/** Unique key for this operation */
	key: string
	/** Deduplication window in seconds */
	windowSeconds: number
	/** Whether to cache and return previous response */
	cacheResponse?: boolean
	/** Custom metadata for debugging */
	metadata?: Record<string, unknown>
}

/**
 * Result of a deduplication check.
 */
export interface DeduplicationResult<T> {
	/** Whether this is the first request (should process) */
	isFirst: boolean
	/** Whether this is a duplicate (should skip) */
	isDuplicate: boolean
	/** Cached response if available */
	cachedResponse: T | undefined
	/** Time until deduplication window expires */
	expiresIn: number
}

/**
 * Result of a deduplicated request handler.
 */
export interface DeduplicatedRequestResult<T> {
	/** Whether the request was a duplicate */
	wasDuplicate: boolean
	/** The response (either cached or fresh) */
	response: T
}

/**
 * Pre-configured deduplication preset.
 */
export interface DeduplicationPreset {
	/** Deduplication window in seconds */
	windowSeconds: number
	/** Whether to cache responses */
	cacheResponse: boolean
}

// =============================================================================
// Request Deduplicator Class
// =============================================================================

/**
 * Request Deduplicator
 *
 * Manages request deduplication using both in-process tracking (for same-process
 * concurrent requests) and Redis (for distributed deduplication across instances).
 */
class RequestDeduplicator {
	/**
	 * In-flight requests map for same-process deduplication.
	 * Tracks promises that are currently being executed.
	 */
	private readonly inFlightRequests = new Map<
		string,
		{
			promise: Promise<unknown>
			timestamp: number
		}
	>()

	/**
	 * Check if request is duplicate and handle accordingly.
	 *
	 * @param config - Deduplication configuration
	 * @returns Result indicating whether to process or skip
	 */
	async checkDuplication<T>(
		config: DeduplicationConfig,
	): Promise<DeduplicationResult<T>> {
		const redis = getRedisClient()
		const span = trace.getActiveSpan()

		// Add OpenTelemetry attributes
		if (span) {
			span.setAttribute("dedup.key", config.key)
			span.setAttribute("dedup.window_seconds", config.windowSeconds)
		}

		// Check in-flight requests first (same process)
		const inFlight = this.inFlightRequests.get(config.key)
		if (inFlight) {
			const age = (Date.now() - inFlight.timestamp) / 1000

			if (age < config.windowSeconds) {
				if (span) {
					span.setAttribute("dedup.result", "in_flight")
				}

				logWarn("Duplicate request detected (in-flight)", {
					key: config.key,
					age,
				})

				return {
					isFirst: false,
					isDuplicate: true,
					cachedResponse: undefined,
					expiresIn: Math.ceil(config.windowSeconds - age),
				}
			}
		}

		// Check Redis (distributed)
		if (redis) {
			const result = await this.checkRedisDuplication<T>(
				redis,
				config,
				span,
			)
			if (result) {
				return result
			}

			// Mark as in-progress in Redis
			await this.markInProgress(redis, config)
		}

		if (span) {
			span.setAttribute("dedup.result", "first")
		}

		return {
			isFirst: true,
			isDuplicate: false,
			cachedResponse: undefined,
			expiresIn: config.windowSeconds,
		}
	}

	/**
	 * Check Redis for existing deduplication entry.
	 */
	private async checkRedisDuplication<T>(
		redis: Redis,
		config: DeduplicationConfig,
		span: ReturnType<typeof trace.getActiveSpan>,
	): Promise<DeduplicationResult<T> | null> {
		const dedupKey = `dedup:${config.key}`
		const existing = await redis.get<{
			timestamp: number
			response?: T
		}>(dedupKey)

		if (existing) {
			const age = (Date.now() - existing.timestamp) / 1000

			if (age < config.windowSeconds) {
				if (span) {
					span.setAttribute("dedup.result", "cached")
				}

				logWarn("Duplicate request detected (cached)", {
					key: config.key,
					age,
				})

				return {
					isFirst: false,
					isDuplicate: true,
					cachedResponse: existing.response,
					expiresIn: Math.ceil(config.windowSeconds - age),
				}
			}
		}

		return null
	}

	/**
	 * Mark a request as in-progress in Redis.
	 */
	private async markInProgress(
		redis: Redis,
		config: DeduplicationConfig,
	): Promise<void> {
		const dedupKey = `dedup:${config.key}`

		await redis.set(
			dedupKey,
			{
				timestamp: Date.now(),
				metadata: config.metadata,
			},
			{ ex: config.windowSeconds },
		)
	}

	/**
	 * Store response for future duplicate requests.
	 *
	 * @param key - Deduplication key
	 * @param response - Response to cache
	 * @param windowSeconds - Cache duration in seconds
	 */
	async storeResponse<T>(
		key: string,
		response: T,
		windowSeconds: number,
	): Promise<void> {
		const redis = getRedisClient()
		if (!redis) {
			return
		}

		const dedupKey = `dedup:${key}`

		await redis.set(
			dedupKey,
			{
				timestamp: Date.now(),
				response,
			},
			{ ex: windowSeconds },
		)

		logDebug("Stored response for deduplication", { key, windowSeconds })
	}

	/**
	 * Register in-flight request for same-process deduplication.
	 *
	 * @param key - Deduplication key
	 * @param promise - Promise representing the in-flight request
	 */
	registerInFlight(key: string, promise: Promise<unknown>): void {
		this.inFlightRequests.set(key, {
			promise,
			timestamp: Date.now(),
		})

		// Cleanup when done
		promise
			.finally(() => {
				this.inFlightRequests.delete(key)
			})
			.catch(() => {
				// Silent catch to prevent unhandled rejection
			})
	}

	/**
	 * Clear deduplication for a key.
	 *
	 * @param key - Deduplication key to clear
	 */
	async clear(key: string): Promise<void> {
		const redis = getRedisClient()
		if (redis) {
			await redis.del(`dedup:${key}`)
		}
		this.inFlightRequests.delete(key)
	}
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Singleton instance of the RequestDeduplicator.
 */
export const deduplicator = new RequestDeduplicator()

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Deduplicate requests with automatic response caching.
 *
 * This is the primary entry point for request deduplication. It handles
 * both in-flight tracking and response caching automatically.
 *
 * @param config - Deduplication configuration
 * @param handler - Async function to execute if this is the first request
 * @returns Object indicating whether request was duplicate and the response
 *
 * @example
 * ```typescript
 * const result = await deduplicateRequest(
 *   {
 *     key: `user_profile_${userId}`,
 *     windowSeconds: 5,
 *     cacheResponse: true
 *   },
 *   async () => {
 *     return await db.select().from(users).where(eq(users.id, userId));
 *   }
 * );
 *
 * if (result.wasDuplicate) {
 *   return result.response; // Cached response
 * }
 *
 * return result.response; // Fresh response
 * ```
 */
export async function deduplicateRequest<T>(
	config: DeduplicationConfig,
	handler: () => Promise<T>,
): Promise<DeduplicatedRequestResult<T>> {
	const check = await deduplicator.checkDuplication<T>(config)

	if (check.isDuplicate) {
		if (check.cachedResponse !== undefined) {
			logInfo("Returning cached response for duplicate request", {
				key: config.key,
			})

			return {
				wasDuplicate: true,
				response: check.cachedResponse,
			}
		}

		// Wait for in-flight request if no cached response
		// This is a fallback - should rarely happen
		await new Promise((resolve) =>
			setTimeout(resolve, Math.min(check.expiresIn * 1000, 5000)),
		)

		// Try to get cached response again
		const redis = getRedisClient()
		if (redis) {
			const cached = await redis.get<{
				response?: T
			}>(`dedup:${config.key}`)

			if (cached?.response) {
				return {
					wasDuplicate: true,
					response: cached.response,
				}
			}
		}
	}

	// Execute handler
	const promise = handler()
	deduplicator.registerInFlight(config.key, promise)

	try {
		const response = await promise

		// Cache response if requested
		if (config.cacheResponse) {
			await deduplicator.storeResponse(
				config.key,
				response,
				config.windowSeconds,
			)
		}

		return {
			wasDuplicate: false,
			response,
		}
	} catch (error) {
		// Clear deduplication on error
		await deduplicator.clear(config.key)
		throw error
	}
}

/**
 * Generate fingerprint for request.
 *
 * Creates a unique identifier for a request based on method, URL, body, and user ID.
 * Use this to create deduplication keys for HTTP requests.
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @param url - Request URL
 * @param body - Optional request body (will be hashed)
 * @param userId - Optional user ID for user-specific deduplication
 * @returns Fingerprint string for use as deduplication key
 *
 * @example
 * ```typescript
 * const fingerprint = generateRequestFingerprint(
 *   "POST",
 *   request.url,
 *   body,
 *   userId
 * );
 *
 * const result = await deduplicateRequest(
 *   { key: fingerprint, windowSeconds: 10 },
 *   async () => processRequest(body)
 * );
 * ```
 */
export function generateRequestFingerprint(
	method: string,
	url: string,
	body?: unknown,
	userId?: string,
): string {
	const parts = [method.toUpperCase(), url]

	if (userId) {
		parts.push(`user:${userId}`)
	}

	if (body) {
		// Hash body for consistent key
		const bodyStr = JSON.stringify(body)
		parts.push(`body:${bodyStr.length}:${bodyStr.substring(0, 100)}`)
	}

	return parts.join("|")
}

/**
 * Middleware wrapper for automatic request deduplication.
 *
 * Wraps a handler function with deduplication logic. This is a convenience
 * wrapper around deduplicateRequest for use in API routes.
 *
 * @param config - Deduplication configuration
 * @param handler - Async function to execute if this is the first request
 * @returns Object indicating whether request was duplicate and the response
 *
 * @example
 * ```typescript
 * // app/api/chat/route.ts
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *
 *   const result = await withDeduplication(
 *     {
 *       key: generateRequestFingerprint("POST", request.url, body, userId),
 *       windowSeconds: 10,
 *       cacheResponse: true
 *     },
 *     async () => {
 *       return await processChat(body);
 *     }
 *   );
 *
 *   return Response.json(result.response, {
 *     headers: {
 *       "X-Deduplication-Applied": result.wasDuplicate.toString()
 *     }
 *   });
 * }
 * ```
 */
export function withDeduplication<T>(
	config: DeduplicationConfig,
	handler: () => Promise<T>,
): Promise<DeduplicatedRequestResult<T>> {
	return deduplicateRequest(config, handler)
}

// =============================================================================
// Pre-configured Presets
// =============================================================================

/**
 * Pre-configured deduplication presets for common use cases.
 *
 * @example
 * ```typescript
 * // Short window for quick operations
 * const result = await deduplicateRequest(
 *   { key: 'quick_op', ...DeduplicationPresets.short },
 *   async () => performQuickOp()
 * );
 *
 * // Standard window for typical API calls
 * const result = await deduplicateRequest(
 *   { key: 'api_call', ...DeduplicationPresets.standard },
 *   async () => apiCall()
 * );
 *
 * // Long window for expensive operations
 * const result = await deduplicateRequest(
 *   { key: 'expensive_op', ...DeduplicationPresets.long },
 *   async () => expensiveOperation()
 * );
 *
 * // Idempotent operations (payment processing, etc.)
 * const result = await deduplicateRequest(
 *   { key: 'payment', ...DeduplicationPresets.idempotent },
 *   async () => processPayment()
 * );
 * ```
 */
export const DeduplicationPresets = {
	/**
	 * Short window: 5 seconds
	 * Use for quick operations that may be double-clicked.
	 */
	short: {
		windowSeconds: 5,
		cacheResponse: true,
	} satisfies DeduplicationPreset,

	/**
	 * Standard window: 30 seconds
	 * Use for typical API calls that shouldn't be repeated.
	 */
	standard: {
		windowSeconds: 30,
		cacheResponse: true,
	} satisfies DeduplicationPreset,

	/**
	 * Long window: 60 seconds
	 * Use for expensive operations that take time to complete.
	 */
	long: {
		windowSeconds: 60,
		cacheResponse: true,
	} satisfies DeduplicationPreset,

	/**
	 * Idempotent operations: 300 seconds (5 minutes)
	 * Use for operations that must not be repeated (payments, etc.).
	 */
	idempotent: {
		windowSeconds: 300,
		cacheResponse: true,
	} satisfies DeduplicationPreset,
} as const
