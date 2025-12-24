/**
 * AI Provider Utilities - Circuit Breaker Pattern
 * Ref: REQ-015 (Circuit Breaker with Half-Open State)
 * Task: OPT-009
 *
 * Prevents cascading failures when AI providers experience outages.
 *
 * @module lib/ai/provider-utils
 */

// Circuit breaker states
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit. Default: 5 */
  failureThreshold?: number;
  /** Time in ms before attempting recovery. Default: 30000 */
  resetTimeout?: number;
  /** Max attempts in half-open state. Default: 1 */
  halfOpenMaxAttempts?: number;
}

export interface CircuitBreaker {
  /** Current circuit state */
  readonly state: CircuitState;
  /** Current failure count */
  readonly failures: number;
  /** Timestamp of last failure */
  readonly lastFailure: number | null;
  /** Execute a function through the circuit breaker */
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Record a successful operation */
  recordSuccess: () => void;
  /** Record a failed operation */
  recordFailure: () => void;
  /** Get current circuit state */
  getState: () => CircuitState;
  /** Reset the circuit breaker to initial state */
  reset: () => void;
}

/**
 * Error thrown when circuit breaker is in OPEN state
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message = "Circuit breaker is OPEN - AI provider unavailable") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Creates a circuit breaker instance for protecting AI provider calls.
 *
 * State Transitions:
 * - CLOSED --[failures >= threshold]--> OPEN
 * - OPEN --[timeout elapsed]--> HALF_OPEN
 * - HALF_OPEN --[success]--> CLOSED
 * - HALF_OPEN --[failure]--> OPEN
 *
 * @example
 * ```typescript
 * const aiCircuit = createCircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 });
 * const result = await aiCircuit.execute(() => callOpenAI(prompt));
 * ```
 *
 * Integration Points:
 * - Wrap AI SDK calls in `aiCircuit.execute()`
 * - Use in `app/api/chat/route.ts` for provider calls
 * - Can create per-provider circuits: `openaiCircuit`, `anthropicCircuit`
 *
 * @param options - Circuit breaker configuration
 * @returns CircuitBreaker instance
 */
export function createCircuitBreaker(
  options: CircuitBreakerOptions = {}
): CircuitBreaker {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    halfOpenMaxAttempts = 1,
  } = options;

  // Internal state (closure pattern for thread-safe updates)
  let state: CircuitState = "CLOSED";
  let failures = 0;
  let lastFailure: number | null = null;
  let halfOpenAttempts = 0;

  /**
   * Checks if the circuit should transition from OPEN to HALF_OPEN
   */
  const shouldAttemptReset = (): boolean => {
    if (state !== "OPEN" || lastFailure === null) {
      return false;
    }
    return Date.now() - lastFailure >= resetTimeout;
  };

  /**
   * Transitions the circuit to OPEN state
   */
  const tripCircuit = (): void => {
    state = "OPEN";
    lastFailure = Date.now();
    halfOpenAttempts = 0;
  };

  /**
   * Transitions the circuit to CLOSED state
   */
  const closeCircuit = (): void => {
    state = "CLOSED";
    failures = 0;
    lastFailure = null;
    halfOpenAttempts = 0;
  };

  /**
   * Transitions the circuit to HALF_OPEN state
   */
  const halfOpenCircuit = (): void => {
    state = "HALF_OPEN";
    halfOpenAttempts = 0;
  };

  /**
   * Records a successful operation
   */
  const recordSuccess = (): void => {
    if (state === "HALF_OPEN") {
      // Success in half-open state closes the circuit
      closeCircuit();
    } else if (state === "CLOSED") {
      // Reset failure count on success in closed state
      failures = 0;
    }
  };

  /**
   * Records a failed operation
   */
  const recordFailure = (): void => {
    failures++;
    lastFailure = Date.now();

    if (state === "HALF_OPEN") {
      // Failure in half-open state reopens the circuit
      tripCircuit();
    } else if (state === "CLOSED" && failures >= failureThreshold) {
      // Threshold reached in closed state opens the circuit
      tripCircuit();
    }
  };

  /**
   * Gets the current circuit state, checking for timeout transitions
   */
  const getState = (): CircuitState => {
    if (shouldAttemptReset()) {
      halfOpenCircuit();
    }
    return state;
  };

  /**
   * Resets the circuit breaker to initial CLOSED state
   */
  const reset = (): void => {
    closeCircuit();
  };

  /**
   * Executes a function through the circuit breaker
   */
  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    const currentState = getState();

    // Block requests when circuit is OPEN
    if (currentState === "OPEN") {
      throw new CircuitBreakerOpenError();
    }

    // In HALF_OPEN state, limit concurrent attempts
    if (currentState === "HALF_OPEN") {
      if (halfOpenAttempts >= halfOpenMaxAttempts) {
        throw new CircuitBreakerOpenError(
          "Circuit breaker is HALF_OPEN - max test attempts reached"
        );
      }
      halfOpenAttempts++;
    }

    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (error) {
      recordFailure();
      throw error;
    }
  };

  // Return circuit breaker instance with getter properties
  return {
    get state() {
      return getState();
    },
    get failures() {
      return failures;
    },
    get lastFailure() {
      return lastFailure;
    },
    execute,
    recordSuccess,
    recordFailure,
    getState,
    reset,
  };
}

/**
 * Pre-configured circuit breakers for common AI providers.
 * These are singletons - import and use directly.
 *
 * @example
 * ```typescript
 * import { openaiCircuit, anthropicCircuit } from '@/lib/ai/provider-utils';
 *
 * // Use provider-specific circuit
 * const response = await openaiCircuit.execute(() => openai.chat.completions.create({...}));
 * ```
 */
export const openaiCircuit = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 1,
});

export const anthropicCircuit = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 1,
});

export const googleCircuit = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 1,
});

export const openrouterCircuit = createCircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 1,
});
