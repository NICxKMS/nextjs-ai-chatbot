/**
 * Circuit Breaker for Redis Cache Operations
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * during Redis outages. After a threshold of consecutive failures,
 * the circuit opens and cache operations fast-fail until a cooldown period passes.
 *
 * @module lib/cache/circuit-breaker
 */

import "server-only"

import { logError, logWarn } from "@/lib/log"

// =============================================================================
// Configuration Constants
// =============================================================================

/**
 * Number of consecutive failures before opening the circuit.
 */
export const CIRCUIT_BREAKER_THRESHOLD = 5

/**
 * Time in milliseconds before attempting to reset the circuit.
 */
export const CIRCUIT_BREAKER_RESET_MS = 30_000 // 30 seconds

// =============================================================================
// Circuit Breaker State (Module-level singleton)
// =============================================================================

/**
 * Count of consecutive cache operation failures.
 */
let consecutiveFailures = 0

/**
 * Timestamp when the circuit was opened.
 * Null when circuit is closed.
 */
let circuitOpenedAt: number | null = null

// =============================================================================
// Circuit Breaker Functions
// =============================================================================

/**
 * Check if the circuit breaker is open (cache operations should be skipped).
 *
 * When open, the circuit will auto-reset after CIRCUIT_BREAKER_RESET_MS,
 * allowing one retry attempt.
 *
 * @returns true if circuit is open (skip cache), false if circuit is closed (proceed)
 *
 * @example
 * ```typescript
 * if (isCircuitOpen()) {
 *   // Skip cache, return null immediately (fast-fail)
 *   return null;
 * }
 * // Proceed with cache operation
 * ```
 */
export function isCircuitOpen(): boolean {
	if (!circuitOpenedAt) {
		return false
	}

	// Check if cooldown period has elapsed
	if (Date.now() - circuitOpenedAt > CIRCUIT_BREAKER_RESET_MS) {
		// Reset circuit breaker after timeout
		circuitOpenedAt = null
		consecutiveFailures = 0
		logWarn("Redis circuit breaker reset - retrying cache operations")
		return false
	}

	return true
}

/**
 * Record a cache operation failure.
 * Opens the circuit breaker after CIRCUIT_BREAKER_THRESHOLD consecutive failures.
 *
 * @param operation - Name of the cache operation that failed (e.g., "get", "set")
 * @param error - The error that occurred
 *
 * @example
 * ```typescript
 * try {
 *   await redis.get(key);
 * } catch (error) {
 *   recordCacheFailure("get", error);
 *   return null;
 * }
 * ```
 */
export function recordCacheFailure(operation: string, error: unknown): void {
	consecutiveFailures++
	logError(
		`Redis ${operation} error (failure ${consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD})`,
		error as Error,
	)

	if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpenedAt) {
		circuitOpenedAt = Date.now()
		logError(
			"Redis circuit breaker OPENED - cache operations will be skipped",
			{
				consecutiveFailures,
				resetAfterMs: CIRCUIT_BREAKER_RESET_MS,
			},
		)
	}
}

/**
 * Record a successful cache operation.
 * Resets the consecutive failure count.
 *
 * @example
 * ```typescript
 * try {
 *   await redis.set(key, value);
 *   recordCacheSuccess();
 * } catch (error) {
 *   recordCacheFailure("set", error);
 * }
 * ```
 */
export function recordCacheSuccess(): void {
	if (consecutiveFailures > 0) {
		consecutiveFailures = 0
	}
}

/**
 * Get current circuit breaker state for monitoring/debugging.
 *
 * @returns Object containing current circuit breaker state
 */
export function getCircuitBreakerState(): {
	consecutiveFailures: number
	isOpen: boolean
	openedAt: number | null
	resetAfterMs: number | null
} {
	return {
		consecutiveFailures,
		isOpen: circuitOpenedAt !== null,
		openedAt: circuitOpenedAt,
		resetAfterMs: circuitOpenedAt
			? CIRCUIT_BREAKER_RESET_MS - (Date.now() - circuitOpenedAt)
			: null,
	}
}

/**
 * Force reset the circuit breaker.
 * Primarily for testing or administrative purposes.
 */
export function resetCircuitBreaker(): void {
	consecutiveFailures = 0
	circuitOpenedAt = null
	logWarn("Redis circuit breaker manually reset")
}
