import "server-only";

import { type CacheConfig, DEFAULT_CACHE_CONFIG } from "./types";

/**
 * Circuit Breaker for Redis operations.
 *
 * Protects the system from cascade failures when Redis is unavailable:
 * - Opens after consecutive failures exceed threshold
 * - Auto-resets after timeout period
 * - Returns fallback values when open
 *
 * State transitions:
 * CLOSED → (failures >= threshold) → OPEN → (timeout elapsed) → CLOSED
 */

// -----------------------------------------------------------------------------
// State Management
// -----------------------------------------------------------------------------

type CircuitBreakerState = {
    /** Number of consecutive failures */
    failures: number;
    /** Timestamp when circuit was opened (null if closed) */
    openedAt: number | null;
};

/**
 * Global circuit breaker state.
 * Persists across requests in the same serverless container.
 */
const state: CircuitBreakerState = {
    failures: 0,
    openedAt: null,
};

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

let config: Pick<
    CacheConfig,
    "circuitBreakerThreshold" | "circuitBreakerResetMs"
> = {
    circuitBreakerThreshold: DEFAULT_CACHE_CONFIG.circuitBreakerThreshold,
    circuitBreakerResetMs: DEFAULT_CACHE_CONFIG.circuitBreakerResetMs,
};

/**
 * Configure circuit breaker thresholds.
 * Call once at application startup if custom values needed.
 */
export function configureCircuitBreaker(
    threshold: number,
    resetMs: number
): void {
    config = {
        circuitBreakerThreshold: threshold,
        circuitBreakerResetMs: resetMs,
    };
}

// -----------------------------------------------------------------------------
// Circuit Breaker Operations
// -----------------------------------------------------------------------------

/**
 * Check if circuit is currently open.
 * Automatically resets if timeout has elapsed.
 */
export function isCircuitOpen(): boolean {
    if (!state.openedAt) {
        return false;
    }

    const elapsed = Date.now() - state.openedAt;
    if (elapsed > config.circuitBreakerResetMs) {
        // Reset circuit after timeout
        state.openedAt = null;
        state.failures = 0;
        console.warn("[Cache] Circuit breaker reset - attempting reconnection");
        return false;
    }

    return true;
}

/**
 * Record a failed operation.
 * Opens circuit if failures exceed threshold.
 */
export function recordFailure(operation: string, error: unknown): void {
    state.failures++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
        `[Cache] ${operation} failed (${state.failures}/${config.circuitBreakerThreshold}): ${errorMessage}`
    );

    if (state.failures >= config.circuitBreakerThreshold && !state.openedAt) {
        state.openedAt = Date.now();
        console.error(
            `[Cache] Circuit breaker OPENED - Redis operations disabled for ${config.circuitBreakerResetMs}ms`
        );
    }
}

/**
 * Record a successful operation.
 * Resets failure count.
 */
export function recordSuccess(): void {
    if (state.failures > 0) {
        state.failures = 0;
    }
}

/**
 * Get current circuit breaker status.
 * Useful for health checks and monitoring.
 */
export function getCircuitStatus(): {
    isOpen: boolean;
    failures: number;
    openedAt: number | null;
} {
    return {
        isOpen: isCircuitOpen(),
        failures: state.failures,
        openedAt: state.openedAt,
    };
}

// -----------------------------------------------------------------------------
// Higher-Order Function Decorator
// -----------------------------------------------------------------------------

/**
 * Wrap a cache operation with circuit breaker protection.
 *
 * @param operation - Operation name for logging
 * @param fallback - Value to return when circuit is open or operation fails
 * @param fn - Async function to execute
 * @returns Result of fn or fallback on failure
 *
 * @example
 * ```ts
 * const chat = await withCircuitBreaker(
 *   "getChatFromCache",
 *   null,
 *   async () => redis.get<CachedChat>(key)
 * );
 * ```
 */
export async function withCircuitBreaker<T>(
    operation: string,
    fallback: T,
    fn: () => Promise<T>
): Promise<T> {
    // Fast path: return fallback if circuit is open
    if (isCircuitOpen()) {
        return fallback;
    }

    try {
        const result = await fn();
        recordSuccess();
        return result;
    } catch (error) {
        recordFailure(operation, error);
        return fallback;
    }
}

/**
 * Wrap a cache operation that may throw with circuit breaker.
 * Unlike withCircuitBreaker, this re-throws errors when circuit is closed.
 * Use for operations where failure should propagate.
 *
 * @param operation - Operation name for logging
 * @param fn - Async function to execute
 * @throws Re-throws error after recording failure
 */
export async function withCircuitBreakerThrow<T>(
    operation: string,
    fn: () => Promise<T>
): Promise<T> {
    if (isCircuitOpen()) {
        throw new Error(`[Cache] Circuit open - ${operation} skipped`);
    }

    try {
        const result = await fn();
        recordSuccess();
        return result;
    } catch (error) {
        recordFailure(operation, error);
        throw error;
    }
}

// -----------------------------------------------------------------------------
// Testing Utilities (Reset State)
// -----------------------------------------------------------------------------

/**
 * Reset circuit breaker state.
 * Only use in tests.
 */
export function __resetCircuitBreaker(): void {
    state.failures = 0;
    state.openedAt = null;
}
