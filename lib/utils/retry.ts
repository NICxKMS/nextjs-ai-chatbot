/**
 * Generic Retry Utility
 * Exponential backoff retry logic for any async operation.
 *
 * @module lib/utils/retry
 * @see OPT-017
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay in ms before first retry (default: 1000) */
    baseDelay?: number;
    /** Maximum delay in ms between retries (default: 30000) */
    maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** Whether to add jitter to delays (default: true) */
    jitter?: boolean;
    /** Function to determine if error is retryable (default: all errors) */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Callback invoked before each retry attempt */
    onRetry?: (error: unknown, attempt: number, delay: number) => void;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
}

export interface RetryResult<T> {
    /** Whether the operation succeeded */
    success: boolean;
    /** Result data if successful */
    data?: T;
    /** Final error if all retries failed */
    error?: unknown;
    /** Number of attempts made */
    attempts: number;
    /** Total time spent including retries (ms) */
    totalTime: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<
    Omit<RetryOptions, "shouldRetry" | "onRetry" | "signal">
> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30_000,
    backoffFactor: 2,
    jitter: true,
};

// =============================================================================
// UTILITIES
// =============================================================================

interface DelayConfig {
    attempt: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
    jitter: boolean;
}

/**
 * Calculate delay for exponential backoff with optional jitter.
 */
function calculateDelay(config: DelayConfig): number {
    const { attempt, baseDelay, maxDelay, backoffFactor, jitter } = config;

    // Exponential backoff: delay = base * (factor ^ attempt)
    const exponentialDelay = baseDelay * backoffFactor ** attempt;

    // Add jitter (±25%) to prevent thundering herd
    const jitterFactor = jitter ? 0.25 * (Math.random() * 2 - 1) : 0;
    const delayWithJitter = exponentialDelay * (1 + jitterFactor);

    // Clamp to maxDelay
    return Math.min(delayWithJitter, maxDelay);
}

/**
 * Sleep for a specified duration with abort support.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        let resolved = false;
        const timeoutId = setTimeout(() => {
            resolved = true;
            resolve();
        }, ms);

        const abortHandler = () => {
            if (!resolved) {
                clearTimeout(timeoutId);
                reject(new DOMException("Aborted", "AbortError"));
            }
        };

        signal?.addEventListener("abort", abortHandler, { once: true });
    });
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Execute an async function with automatic retry on failure.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Cancellation support via AbortSignal
 * - Retry callbacks for logging/UI updates
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Last error if all retries fail
 *
 * @example
 * ```ts
 * // Basic usage
 * const result = await withRetry(() => fetchData());
 *
 * // With custom options
 * const result = await withRetry(
 *   () => callExternalApi(),
 *   {
 *     maxAttempts: 5,
 *     baseDelay: 500,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} in ${delay}ms: ${error}`);
 *     },
 *   }
 * );
 *
 * // With cancellation
 * const controller = new AbortController();
 * const result = await withRetry(
 *   () => longOperation(),
 *   { signal: controller.signal }
 * );
 * // Later: controller.abort();
 *
 * // With selective retry
 * const result = await withRetry(
 *   () => riskyOperation(),
 *   {
 *     shouldRetry: (error) => {
 *       if (error instanceof ValidationError) return false;
 *       return true;
 *     },
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const {
        maxAttempts,
        baseDelay,
        maxDelay,
        backoffFactor,
        jitter,
        shouldRetry,
        onRetry,
        signal,
    } = { ...DEFAULT_OPTIONS, ...options };

    let lastError: unknown;
    let attempt = 0;

    while (attempt < maxAttempts) {
        // Check for abort before each attempt
        if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        try {
            return await fn();
        } catch (error) {
            lastError = error;
            attempt++;

            // Check if we should retry
            const canRetry = shouldRetry ? shouldRetry(error, attempt) : true;

            // If this was the last attempt or shouldn't retry, throw
            if (attempt >= maxAttempts || !canRetry) {
                throw error;
            }

            // Calculate delay for next retry
            const delay = calculateDelay({
                attempt: attempt - 1,
                baseDelay,
                maxDelay,
                backoffFactor,
                jitter,
            });

            // Invoke retry callback
            onRetry?.(error, attempt, delay);

            // Wait before next attempt
            await sleep(delay, signal);
        }
    }

    // Should not reach here, but TypeScript needs this
    throw lastError;
}

/**
 * Execute an async function with retry and return detailed result.
 *
 * Unlike `withRetry`, this function never throws and returns
 * a result object with success status and metadata.
 *
 * @example
 * ```ts
 * const result = await withRetryResult(() => fetchData());
 *
 * if (result.success) {
 *   console.log('Data:', result.data);
 *   console.log(`Completed in ${result.attempts} attempts`);
 * } else {
 *   console.error('Failed after', result.attempts, 'attempts:', result.error);
 * }
 * ```
 */
export async function withRetryResult<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<RetryResult<T>> {
    const startTime = performance.now();
    let attempts = 0;

    const trackingOptions: RetryOptions = {
        ...options,
        onRetry: (error, attempt, delay) => {
            attempts = attempt;
            options?.onRetry?.(error, attempt, delay);
        },
    };

    try {
        const data = await withRetry(fn, trackingOptions);
        return {
            success: true,
            data,
            attempts: attempts + 1,
            totalTime: performance.now() - startTime,
        };
    } catch (error) {
        return {
            success: false,
            error,
            attempts: Math.max(attempts, 1),
            totalTime: performance.now() - startTime,
        };
    }
}

/**
 * Create a retryable version of an async function.
 *
 * @example
 * ```ts
 * const fetchWithRetry = createRetryable(fetchData, { maxAttempts: 5 });
 *
 * // Now use it like the original function
 * const data = await fetchWithRetry();
 * ```
 */
export function createRetryable<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    defaultOptions?: RetryOptions
): (...args: TArgs) => Promise<TResult> {
    return (...args: TArgs) => withRetry(() => fn(...args), defaultOptions);
}
