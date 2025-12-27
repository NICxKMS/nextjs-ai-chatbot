/**
 * Client-Side Rate Limiting
 *
 * Provides rate limiting for client-side operations to prevent abuse
 * and improve UX by preventing accidental rapid-fire requests.
 *
 * @module lib/utils/rate-limit-client
 */

/**
 * Rate limiter configuration
 */
export type RateLimitConfig = {
    /** Maximum number of requests allowed */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
};

/**
 * Rate limit check result
 */
export type RateLimitResult = {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Number of remaining requests in the window */
    remaining: number;
    /** Milliseconds until the rate limit resets */
    resetIn: number;
};

/**
 * Creates a client-side rate limiter using sliding window algorithm.
 * Tracks request timestamps and cleans up expired entries.
 *
 * @param config - Rate limit configuration
 * @returns Rate limiter instance with check and reset methods
 *
 * @example
 * ```ts
 * const submitLimiter = createRateLimiter({
 *   maxRequests: 5,
 *   windowMs: 60000 // 5 requests per minute
 * });
 *
 * function handleSubmit() {
 *   const result = submitLimiter.check();
 *   if (!result.allowed) {
 *     toast.error(`Too many requests. Try again in ${Math.ceil(result.resetIn / 1000)}s`);
 *     return;
 *   }
 *   // Proceed with submit
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
    const { maxRequests, windowMs } = config;
    const timestamps: number[] = [];

    /**
     * Remove expired timestamps from the window
     * Uses in-place splice to maintain array reference while removing expired entries
     */
    const cleanup = () => {
        const now = Date.now();
        const cutoff = now - windowMs;
        // Find first valid timestamp index and remove all expired ones
        const validIndex = timestamps.findIndex((ts) => ts >= cutoff);
        if (validIndex === -1) {
            // All expired
            timestamps.length = 0;
        } else if (validIndex > 0) {
            // Remove expired entries from start
            timestamps.splice(0, validIndex);
        }
    };

    /**
     * Check if a request is allowed under the rate limit
     */
    const check = (): RateLimitResult => {
        cleanup();
        const now = Date.now();

        if (timestamps.length < maxRequests) {
            timestamps.push(now);
            const firstTimestamp = timestamps[0];
            return {
                allowed: true,
                remaining: maxRequests - timestamps.length,
                resetIn:
                    firstTimestamp !== undefined
                        ? firstTimestamp + windowMs - now
                        : 0,
            };
        }

        const oldestTimestamp = timestamps[0];
        if (oldestTimestamp === undefined) {
            // Should not happen, but handle for type safety
            return {
                allowed: false,
                remaining: 0,
                resetIn: 0,
            };
        }
        const resetIn = oldestTimestamp + windowMs - now;

        return {
            allowed: false,
            remaining: 0,
            resetIn: Math.max(0, resetIn),
        };
    };

    /**
     * Reset the rate limiter (clear all timestamps)
     */
    const reset = () => {
        timestamps.length = 0;
    };

    /**
     * Get current state without consuming a request
     */
    const peek = (): Omit<RateLimitResult, "allowed"> => {
        cleanup();
        const now = Date.now();
        const firstTimestamp = timestamps[0];
        return {
            remaining: Math.max(0, maxRequests - timestamps.length),
            resetIn:
                firstTimestamp !== undefined
                    ? Math.max(0, firstTimestamp + windowMs - now)
                    : 0,
        };
    };

    return { check, reset, peek };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
    /** Chat message submission: 10 messages per minute */
    chatSubmit: createRateLimiter({ maxRequests: 10, windowMs: 60_000 }),

    /** Suggested action clicks: 5 per 10 seconds */
    suggestionClick: createRateLimiter({ maxRequests: 5, windowMs: 10_000 }),

    /** File uploads: 5 per minute */
    fileUpload: createRateLimiter({ maxRequests: 5, windowMs: 60_000 }),

    /** Visibility changes: 3 per 10 seconds */
    visibilityChange: createRateLimiter({ maxRequests: 3, windowMs: 10_000 }),

    /** Delete operations: 5 per minute */
    deleteAction: createRateLimiter({ maxRequests: 5, windowMs: 60_000 }),
};

/**
 * Higher-order function that wraps a callback with rate limiting
 *
 * @param fn - Function to rate limit
 * @param limiter - Rate limiter instance
 * @param onLimited - Callback when rate limited
 * @returns Rate-limited function
 *
 * @example
 * ```ts
 * const rateLimitedSubmit = withRateLimit(
 *   handleSubmit,
 *   RateLimiters.chatSubmit,
 *   (result) => toast.error(`Rate limited. Try again in ${result.resetIn}ms`)
 * );
 * ```
 */
export function withRateLimit<
    T extends (...args: Parameters<T>) => ReturnType<T>,
>(
    fn: T,
    limiter: ReturnType<typeof createRateLimiter>,
    onLimited?: (result: RateLimitResult) => void
): (...args: Parameters<T>) => ReturnType<T> | undefined {
    return (...args: Parameters<T>) => {
        const result = limiter.check();
        if (!result.allowed) {
            onLimited?.(result);
            return;
        }
        return fn(...args);
    };
}
