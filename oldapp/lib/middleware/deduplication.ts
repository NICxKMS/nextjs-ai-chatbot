import "server-only";

import { trace } from "@opentelemetry/api";
import { getRedisClient } from "@/lib/cache/redis";
import { logInfo, logWarn } from "@/lib/log";

/**
 * ==============================================================================
 * REQUEST DEDUPLICATION
 * ==============================================================================
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
 */

export type DeduplicationConfig = {
    /** Unique key for this operation */
    key: string;
    /** Deduplication window in seconds */
    windowSeconds: number;
    /** Whether to cache and return previous response */
    cacheResponse?: boolean;
    /** Custom metadata */
    metadata?: Record<string, unknown>;
};

export type DeduplicationResult<T> = {
    /** Whether this is the first request (should process) */
    isFirst: boolean;
    /** Whether this is a duplicate (should skip) */
    isDuplicate: boolean;
    /** Cached response if available */
    cachedResponse?: T;
    /** Time until deduplication window expires */
    expiresIn: number;
};

class RequestDeduplicator {
    private readonly inFlightRequests = new Map<
        string,
        {
            promise: Promise<unknown>;
            timestamp: number;
        }
    >();

    /**
     * Check if request is duplicate and handle accordingly
     */
    async checkDuplication<T>(
        config: DeduplicationConfig
    ): Promise<DeduplicationResult<T>> {
        const redis = getRedisClient();
        const span = trace.getActiveSpan();

        if (span) {
            span.setAttribute("dedup.key", config.key);
            span.setAttribute("dedup.window_seconds", config.windowSeconds);
        }

        // Check in-flight requests first (same process)
        const inFlight = this.inFlightRequests.get(config.key);
        if (inFlight) {
            const age = (Date.now() - inFlight.timestamp) / 1000;

            if (age < config.windowSeconds) {
                if (span) {
                    span.setAttribute("dedup.result", "in_flight");
                }

                logWarn("Duplicate request detected (in-flight)", {
                    key: config.key,
                    age,
                });

                return {
                    isFirst: false,
                    isDuplicate: true,
                    expiresIn: Math.ceil(config.windowSeconds - age),
                };
            }
        }

        // Check Redis (distributed)
        if (redis) {
            const dedupKey = `dedup:${config.key}`;
            const existing = await redis.get<{
                timestamp: number;
                response?: T;
            }>(dedupKey);

            if (existing) {
                const age = (Date.now() - existing.timestamp) / 1000;

                if (age < config.windowSeconds) {
                    if (span) {
                        span.setAttribute("dedup.result", "cached");
                    }

                    logWarn("Duplicate request detected (cached)", {
                        key: config.key,
                        age,
                    });

                    return {
                        isFirst: false,
                        isDuplicate: true,
                        cachedResponse: existing.response,
                        expiresIn: Math.ceil(config.windowSeconds - age),
                    };
                }
            }

            // Mark as in-progress
            await redis.set(
                dedupKey,
                {
                    timestamp: Date.now(),
                    metadata: config.metadata,
                },
                { ex: config.windowSeconds }
            );
        }

        if (span) {
            span.setAttribute("dedup.result", "first");
        }

        return {
            isFirst: true,
            isDuplicate: false,
            expiresIn: config.windowSeconds,
        };
    }

    /**
     * Store response for future duplicate requests
     */
    async storeResponse<T>(key: string, response: T, windowSeconds: number) {
        const redis = getRedisClient();
        if (!redis) {
            return;
        }

        const dedupKey = `dedup:${key}`;

        await redis.set(
            dedupKey,
            {
                timestamp: Date.now(),
                response,
            },
            { ex: windowSeconds }
        );
    }

    /**
     * Register in-flight request
     */
    registerInFlight(key: string, promise: Promise<unknown>) {
        this.inFlightRequests.set(key, {
            promise,
            timestamp: Date.now(),
        });

        // Cleanup when done
        promise
            .finally(() => {
                this.inFlightRequests.delete(key);
            })
            .catch(() => {
                // Silent catch to prevent unhandled rejection
            });
    }

    /**
     * Clear deduplication for a key
     */
    async clear(key: string) {
        const redis = getRedisClient();
        if (redis) {
            await redis.del(`dedup:${key}`);
        }
        this.inFlightRequests.delete(key);
    }
}

// Singleton instance
export const deduplicator = new RequestDeduplicator();

/**
 * Deduplicate requests with automatic response caching
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
    handler: () => Promise<T>
): Promise<{
    wasDuplicate: boolean;
    response: T;
}> {
    const check = await deduplicator.checkDuplication<T>(config);

    if (check.isDuplicate) {
        if (check.cachedResponse !== undefined) {
            logInfo("Returning cached response for duplicate request", {
                key: config.key,
            });

            return {
                wasDuplicate: true,
                response: check.cachedResponse,
            };
        }

        // Wait for in-flight request if no cached response
        // This is a fallback - should rarely happen
        await new Promise((resolve) =>
            setTimeout(resolve, Math.min(check.expiresIn * 1000, 5000))
        );

        // Try to get cached response again
        const redis = getRedisClient();
        if (redis) {
            const cached = await redis.get<{
                response?: T;
            }>(`dedup:${config.key}`);

            if (cached?.response) {
                return {
                    wasDuplicate: true,
                    response: cached.response,
                };
            }
        }
    }

    // Execute handler
    const promise = handler();
    deduplicator.registerInFlight(config.key, promise);

    try {
        const response = await promise;

        // Cache response if requested
        if (config.cacheResponse) {
            await deduplicator.storeResponse(
                config.key,
                response,
                config.windowSeconds
            );
        }

        return {
            wasDuplicate: false,
            response,
        };
    } catch (error) {
        // Clear deduplication on error
        await deduplicator.clear(config.key);
        throw error;
    }
}

/**
 * Generate fingerprint for request
 */
export function generateRequestFingerprint(
    method: string,
    url: string,
    body?: unknown,
    userId?: string
): string {
    const parts = [method.toUpperCase(), url];

    if (userId) {
        parts.push(`user:${userId}`);
    }

    if (body) {
        // Hash body for consistent key
        const bodyStr = JSON.stringify(body);
        parts.push(`body:${bodyStr.length}:${bodyStr.substring(0, 100)}`);
    }

    return parts.join("|");
}

/**
 * Middleware for automatic request deduplication
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
    handler: () => Promise<T>
): Promise<{
    wasDuplicate: boolean;
    response: T;
}> {
    return deduplicateRequest(config, handler);
}

/**
 * Pre-configured deduplication presets
 */
export const DeduplicationPresets = {
    /** Short window: 2 seconds */
    short: {
        windowSeconds: 2,
        cacheResponse: true,
    },

    /** Standard window: 5 seconds */
    standard: {
        windowSeconds: 5,
        cacheResponse: true,
    },

    /** Long window: 30 seconds */
    long: {
        windowSeconds: 30,
        cacheResponse: true,
    },

    /** Idempotent operations: 60 seconds */
    idempotent: {
        windowSeconds: 60,
        cacheResponse: true,
    },
};
