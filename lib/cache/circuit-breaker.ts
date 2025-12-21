/**
 * Circuit Breaker
 * Ref: 04-cache-layer-optimal-design.md §7
 *
 * Prevents cascade failures when Redis is unhealthy
 * Extracted from OldApp: oldapp/lib/cache/operations.ts
 */
import "server-only";

import {
    CIRCUIT_FAILURE_THRESHOLD,
    CIRCUIT_RESET_TIMEOUT_MS,
} from "./constants";
import type { CircuitBreakerState } from "./types";

// Global state for HMR safety
const globalForCircuit = globalThis as unknown as {
    circuitState: CircuitBreakerState;
};

// Initialize state
if (!globalForCircuit.circuitState) {
    globalForCircuit.circuitState = {
        failures: 0,
        lastFailure: null,
        isOpen: false,
    };
}

/**
 * Get current circuit breaker state
 */
export function getCircuitState(): CircuitBreakerState {
    return { ...globalForCircuit.circuitState };
}

/**
 * Check if circuit breaker is open (Redis unavailable)
 */
export function isCircuitOpen(): boolean {
    const state = globalForCircuit.circuitState;

    // If not open, allow requests
    if (!state.isOpen) {
        return false;
    }

    // Check if reset timeout has passed
    if (state.lastFailure) {
        const timeSinceFailure = Date.now() - state.lastFailure;
        if (timeSinceFailure >= CIRCUIT_RESET_TIMEOUT_MS) {
            // Half-open: allow one request to test
            return false;
        }
    }

    return true;
}

/**
 * Record a cache operation failure
 */
export function recordFailure(operation: string, error: unknown): void {
    const state = globalForCircuit.circuitState;

    state.failures++;
    state.lastFailure = Date.now();

    console.error(`Cache failure [${operation}]:`, error, {
        failures: state.failures,
        threshold: CIRCUIT_FAILURE_THRESHOLD,
    });

    // Open circuit if threshold reached
    if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
        state.isOpen = true;
        console.warn(`Circuit breaker OPEN after ${state.failures} failures`);
    }
}

/**
 * Record a cache operation success
 */
export function recordSuccess(): void {
    const state = globalForCircuit.circuitState;

    // Reset on success
    if (state.failures > 0 || state.isOpen) {
        state.failures = 0;
        state.isOpen = false;
        state.lastFailure = null;
        console.info("Circuit breaker CLOSED (success)");
    }
}

/**
 * Wrap a cache operation with circuit breaker
 */
export async function withCircuitBreaker<T>(
    operation: string,
    fn: () => Promise<T>,
    fallback: T
): Promise<T> {
    // Skip if circuit is open
    if (isCircuitOpen()) {
        console.debug(`Circuit open, skipping cache operation: ${operation}`);
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
