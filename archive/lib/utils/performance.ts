/**
 * Performance Utilities
 * Provides performance measurement helpers for key operations.
 *
 * Features:
 * - Performance marks and measures
 * - Timing utilities for async operations
 * - Server-side compatible (Node.js perf_hooks)
 *
 * @module lib/utils/performance
 * @see P3-072
 */

import { logger } from "./logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Performance measurement result
 */
export interface PerfMeasurement {
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
}

/**
 * Timing callback result
 */
export interface TimedResult<T> {
    result: T;
    duration: number;
}

// =============================================================================
// PERFORMANCE MARKS
// =============================================================================

/**
 * Standard performance mark names for consistency
 */
export const PerfMarks = {
    // Chat operations
    CHAT_REQUEST_START: "chat-request-start",
    CHAT_VALIDATION_END: "chat-validation-end",
    CHAT_STREAM_START: "chat-stream-start",
    CHAT_STREAM_END: "chat-stream-end",
    CHAT_PERSIST_START: "chat-persist-start",
    CHAT_PERSIST_END: "chat-persist-end",

    // Database operations
    DB_QUERY_START: "db-query-start",
    DB_QUERY_END: "db-query-end",

    // Cache operations
    CACHE_GET_START: "cache-get-start",
    CACHE_GET_END: "cache-get-end",
    CACHE_SET_START: "cache-set-start",
    CACHE_SET_END: "cache-set-end",

    // Auth operations
    AUTH_CHECK_START: "auth-check-start",
    AUTH_CHECK_END: "auth-check-end",

    // Document operations
    DOC_LOAD_START: "doc-load-start",
    DOC_LOAD_END: "doc-load-end",
    DOC_SAVE_START: "doc-save-start",
    DOC_SAVE_END: "doc-save-end",
} as const;

export type PerfMarkName = (typeof PerfMarks)[keyof typeof PerfMarks];

/**
 * Check if performance API is available (Node.js or browser)
 */
function isPerformanceAvailable(): boolean {
    return (
        typeof performance !== "undefined" &&
        typeof performance.mark === "function"
    );
}

/**
 * Create a unique mark name with timestamp to avoid collisions
 */
function uniqueMarkName(baseName: string, requestId?: string): string {
    const suffix = requestId ?? Date.now().toString(36);
    return `${baseName}-${suffix}`;
}

/**
 * Place a performance mark
 *
 * @example
 * ```ts
 * mark(PerfMarks.CHAT_REQUEST_START);
 * // ... operation
 * mark(PerfMarks.CHAT_VALIDATION_END);
 * measure('chat-validation', PerfMarks.CHAT_REQUEST_START, PerfMarks.CHAT_VALIDATION_END);
 * ```
 */
export function mark(name: string, requestId?: string): string {
    const markName = uniqueMarkName(name, requestId);

    if (isPerformanceAvailable()) {
        try {
            performance.mark(markName);
        } catch {
            // Mark may already exist, ignore
        }
    }

    return markName;
}

/**
 * Measure duration between two marks
 *
 * @returns Duration in milliseconds, or null if measurement failed
 */
export function measure(
    name: string,
    startMark: string,
    endMark: string
): PerfMeasurement | null {
    if (!isPerformanceAvailable()) {
        return null;
    }

    try {
        const entry = performance.measure(name, startMark, endMark);
        return {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
        };
    } catch {
        // Marks may not exist
        return null;
    }
}

/**
 * Clear performance marks and measures
 */
export function clearMarks(pattern?: string): void {
    if (!isPerformanceAvailable()) {
        return;
    }

    try {
        if (pattern) {
            const entries = performance.getEntriesByType("mark");
            for (const entry of entries) {
                if (entry.name.includes(pattern)) {
                    performance.clearMarks(entry.name);
                }
            }
        } else {
            performance.clearMarks();
        }
    } catch {
        // Ignore errors
    }
}

// =============================================================================
// TIMING UTILITIES
// =============================================================================

/**
 * Time an async operation and return both result and duration
 *
 * @example
 * ```ts
 * const { result, duration } = await timeAsync(
 *   () => fetchData(),
 *   'fetch-data'
 * );
 * logger.info('Fetch completed', { duration });
 * ```
 */
export async function timeAsync<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: { logResult?: boolean; requestId?: string }
): Promise<TimedResult<T>> {
    const startMark = mark(`${operationName}-start`, options?.requestId);
    const start = performance.now();

    try {
        const result = await operation();
        const duration = performance.now() - start;

        const endMark = mark(`${operationName}-end`, options?.requestId);
        measure(operationName, startMark, endMark);

        if (options?.logResult) {
            logger.debug(`[Perf] ${operationName}`, {
                duration: `${duration.toFixed(2)}ms`,
            });
        }

        return { result, duration };
    } catch (error) {
        const duration = performance.now() - start;
        logger.warn(`[Perf] ${operationName} failed`, {
            duration: `${duration.toFixed(2)}ms`,
        });
        throw error;
    }
}

/**
 * Time a sync operation
 */
export function timeSync<T>(
    operation: () => T,
    operationName: string
): TimedResult<T> {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;

    return { result, duration };
}

/**
 * Create a timer for manual start/stop tracking
 *
 * @example
 * ```ts
 * const timer = createTimer('db-query');
 * await db.query(...);
 * const duration = timer.stop();
 * logger.info('Query took', { duration });
 * ```
 */
export function createTimer(name: string, requestId?: string) {
    const startMark = mark(`${name}-start`, requestId);
    const startTime = performance.now();

    return {
        /**
         * Stop the timer and return duration in ms
         */
        stop(): number {
            const duration = performance.now() - startTime;
            const endMark = mark(`${name}-end`, requestId);
            measure(name, startMark, endMark);
            return duration;
        },

        /**
         * Get elapsed time without stopping
         */
        elapsed(): number {
            return performance.now() - startTime;
        },
    };
}

// =============================================================================
// API TIMING HELPER
// =============================================================================

/**
 * Wrap an API handler with timing and logging
 *
 * @example
 * ```ts
 * export const GET = withTiming('/api/history', async (request) => {
 *   // handler logic
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withTiming(
    endpoint: string,
    handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
        const timer = createTimer(`api-${endpoint.replace(/\//g, "-")}`);

        try {
            const response = await handler(request);
            const duration = timer.stop();

            logger.info("[API Timing]", {
                endpoint,
                method: request.method,
                status: response.status,
                duration: `${duration.toFixed(2)}ms`,
            });

            return response;
        } catch (error) {
            const duration = timer.stop();

            logger.error("[API Timing] Error", {
                endpoint,
                method: request.method,
                duration: `${duration.toFixed(2)}ms`,
                error,
            });

            throw error;
        }
    };
}

// =============================================================================
// PERFORMANCE OBSERVER (for aggregated metrics)
// =============================================================================

type PerfCallback = (entries: PerformanceEntryList) => void;
let observer: PerformanceObserver | null = null;

/**
 * Start observing performance entries
 *
 * @example
 * ```ts
 * startPerfObserver((entries) => {
 *   for (const entry of entries) {
 *     console.log(entry.name, entry.duration);
 *   }
 * });
 * ```
 */
export function startPerfObserver(callback: PerfCallback): void {
    if (typeof PerformanceObserver === "undefined") {
        return;
    }

    try {
        observer = new PerformanceObserver((list) => {
            callback(list.getEntries());
        });
        observer.observe({ entryTypes: ["measure"] });
    } catch {
        // Observer not supported
    }
}

/**
 * Stop observing performance entries
 */
export function stopPerfObserver(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}
