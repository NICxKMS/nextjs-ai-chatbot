import "server-only";

import { extractRequestContext, logger } from "./logger";

/**
 * ==============================================================================
 * API ROUTE PERFORMANCE TRACKING
 * ==============================================================================
 *
 * Middleware-style wrappers for Next.js API routes with automatic:
 * - Performance timing
 * - Error handling
 * - Request/response logging
 * - New Relic transaction tracking
 *
 * Usage:
 * ```typescript
 * import { withPerformanceTracking } from '@/lib/monitoring/performance';
 *
 * export const POST = withPerformanceTracking(
 *   'POST /api/chat',
 *   async (request: Request) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */

export type PerformanceMetadata = {
    userId?: string;
    chatId?: string;
    model?: string;
    [key: string]: unknown;
};

/**
 * Wrap API route handler with performance tracking
 * Automatically logs duration, errors, and sends metrics to New Relic
 */
export function withPerformanceTracking<T = Response>(
    operationName: string,
    handler: (request: Request, context?: unknown) => Promise<T>,
    options?: {
        extractMetadata?: (
            request: Request
        ) => Promise<PerformanceMetadata> | PerformanceMetadata;
        logRequest?: boolean;
        logResponse?: boolean;
    }
): (request: Request, context?: unknown) => Promise<T> {
    return async (request: Request, context?: unknown) => {
        const startTime = performance.now();
        const requestContext = extractRequestContext(request);

        // Extract additional metadata if provided
        let metadata: PerformanceMetadata = {};
        if (options?.extractMetadata) {
            try {
                metadata = await options.extractMetadata(request);
            } catch (error) {
                logger.warn("Failed to extract metadata", {
                    operationName,
                    error,
                });
            }
        }

        // Log request if enabled
        if (options?.logRequest) {
            logger.info(`${operationName} started`, {
                ...requestContext,
                ...metadata,
            });
        }

        try {
            // Execute handler
            const response = await handler(request, context);

            // Calculate duration
            const duration = performance.now() - startTime;

            // Log successful completion
            logger.perf(operationName, duration, {
                ...requestContext,
                ...metadata,
                success: true,
                statusCode:
                    response instanceof Response ? response.status : undefined,
            });

            // Log response if enabled
            if (options?.logResponse && response instanceof Response) {
                logger.debug(`${operationName} completed`, {
                    ...requestContext,
                    ...metadata,
                    statusCode: response.status,
                    duration,
                });
            }

            return response;
        } catch (error) {
            // Calculate duration even on error
            const duration = performance.now() - startTime;

            // Log error with full context
            logger.error(`${operationName} failed`, error, {
                ...requestContext,
                ...metadata,
                success: false,
                duration,
            });

            // Re-throw to allow Next.js error handling
            throw error;
        }
    };
}

/**
 * Simple timer utility for measuring code blocks
 * Returns function to end timing and log result
 */
export function startTimer(operation: string, context?: PerformanceMetadata) {
    const start = performance.now();

    return (additionalContext?: PerformanceMetadata) => {
        const duration = performance.now() - start;
        logger.perf(operation, duration, {
            ...context,
            ...additionalContext,
        });

        return duration;
    };
}

/**
 * Measure async operation and return result + duration
 */
export async function measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: PerformanceMetadata
): Promise<{ result: T; duration: number }> {
    const start = performance.now();

    try {
        const result = await fn();
        const duration = performance.now() - start;

        logger.perf(operation, duration, {
            ...context,
            success: true,
        });

        return { result, duration };
    } catch (error) {
        const duration = performance.now() - start;

        logger.error(`${operation} failed`, error, {
            ...context,
            success: false,
            duration,
        });

        throw error;
    }
}

/**
 * Track database query performance
 */
export async function trackQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    metadata?: PerformanceMetadata
): Promise<T> {
    const { result } = await measureAsync(
        `DatabaseQuery/${queryName}`,
        query,
        metadata
    );
    return result;
}

/**
 * Track cache operation performance
 */
export async function trackCacheOp<T>(
    operation: "get" | "set" | "delete",
    key: string,
    fn: () => Promise<T>,
    metadata?: PerformanceMetadata
): Promise<T> {
    const { result, duration } = await measureAsync(`Cache/${operation}`, fn, {
        ...metadata,
        cacheKey: key,
    });

    // Also log hit/miss for get operations
    if (operation === "get") {
        const isHit = result !== null && result !== undefined;
        logger.debug(`Cache ${isHit ? "hit" : "miss"}`, {
            cacheKey: key,
            duration,
            ...metadata,
        });
    }

    return result;
}

/**
 * Track AI model completion performance
 */
export async function trackAICompletion<T>(
    model: string,
    completion: () => Promise<T>,
    metadata?: PerformanceMetadata
): Promise<T> {
    const { result, duration } = await measureAsync(
        `AICompletion/${model}`,
        completion,
        {
            ...metadata,
            model,
        }
    );

    // Log token usage if available in metadata
    if (metadata?.tokens) {
        logger.info(`AI completion: ${model}`, {
            model,
            tokens: metadata.tokens,
            duration,
            tokensPerSecond: (
                (metadata.tokens as number) /
                (duration / 1000)
            ).toFixed(2),
        });
    }

    return result;
}
