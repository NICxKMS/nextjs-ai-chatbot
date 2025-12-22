/**
 * Fetch with Retry
 *
 * Fetch wrapper with exponential backoff retry logic for resilient API calls.
 *
 * @module lib/utils/fetch-with-retry
 */

import { AppError } from "@/lib/errors";

// =============================================================================
// TYPES
// =============================================================================

export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in ms before first retry (default: 1000) */
    initialDelay?: number;
    /** Maximum delay in ms between retries (default: 10000) */
    maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryStatusCodes?: number[];
    /** Whether to retry on network errors (default: true) */
    retryOnNetworkError?: boolean;
    /** Callback invoked before each retry attempt */
    onRetry?: (attempt: number, error: Error, delay: number) => void;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
}

export interface FetchWithRetryOptions extends RequestInit {
    /** Retry configuration */
    retry?: RetryConfig;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, "onRetry" | "signal">> =
    {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10_000,
        backoffFactor: 2,
        retryStatusCodes: [408, 429, 500, 502, 503, 504],
        retryOnNetworkError: true,
    };

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate delay for exponential backoff with jitter.
 */
function calculateBackoffDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    backoffFactor: number
): number {
    // Exponential backoff: delay = initial * (factor ^ attempt)
    const exponentialDelay = initialDelay * backoffFactor ** attempt;

    // Add jitter (±25%) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

    // Clamp to maxDelay
    return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        const timeoutId = setTimeout(resolve, ms);

        signal?.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
}

/**
 * Check if an error is a network error (fetch failed to connect).
 */
function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
        // "Failed to fetch" typically indicates network error
        return error.message.toLowerCase().includes("fetch");
    }
    return false;
}

/**
 * Check if a status code should trigger retry.
 */
function shouldRetryStatus(
    status: number,
    retryStatusCodes: number[]
): boolean {
    return retryStatusCodes.includes(status);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Fetch with automatic retry on failure.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Cancellation support via AbortSignal
 * - Network error detection
 * - Retry callbacks for logging/UI updates
 *
 * @param url - The URL to fetch
 * @param options - Fetch options with retry configuration
 * @returns Promise resolving to the Response
 * @throws AppError if all retries fail
 *
 * @example
 * ```ts
 * // Basic usage
 * const response = await fetchWithRetry('/api/data');
 *
 * // With custom retry config
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' }),
 *   retry: {
 *     maxRetries: 5,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     },
 *   },
 * });
 *
 * // With cancellation
 * const controller = new AbortController();
 * const response = await fetchWithRetry('/api/data', {
 *   signal: controller.signal,
 *   retry: { signal: controller.signal },
 * });
 * // Later: controller.abort();
 * ```
 */
export async function fetchWithRetry(
    url: RequestInfo | URL,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const { retry = {}, ...fetchOptions } = options;

    const config = {
        ...DEFAULT_RETRY_CONFIG,
        ...retry,
    };

    const {
        maxRetries,
        initialDelay,
        maxDelay,
        backoffFactor,
        retryStatusCodes,
        retryOnNetworkError,
        onRetry,
        signal,
    } = config;

    // Combine abort signals if both provided
    const combinedSignal = signal ?? fetchOptions.signal;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
        // Check for abort before each attempt
        if (combinedSignal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        try {
            // Check if we're offline first (client-side only)
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                throw new AppError({
                    code: "external:network_offline",
                    message: "You are offline. Please check your connection.",
                    statusCode: 0,
                    isOperational: true,
                });
            }

            const response = await fetch(url, {
                ...fetchOptions,
                signal: combinedSignal,
            });

            // Check if we should retry based on status code
            if (shouldRetryStatus(response.status, retryStatusCodes)) {
                if (attempt < maxRetries) {
                    const delay = calculateBackoffDelay(
                        attempt,
                        initialDelay,
                        maxDelay,
                        backoffFactor
                    );

                    const retryError = new Error(
                        `HTTP ${response.status}: ${response.statusText}`
                    );

                    onRetry?.(attempt + 1, retryError, delay);

                    await sleep(delay, combinedSignal ?? undefined);
                    attempt++;
                    continue;
                }

                // Max retries exceeded - throw error
                throw new AppError({
                    code: "external:api_error",
                    message: `Request failed after ${maxRetries + 1} attempts (HTTP ${response.status})`,
                    statusCode: response.status,
                    isOperational: true,
                    context: {
                        url: typeof url === "string" ? url : url.toString(),
                        attempts: attempt + 1,
                    },
                });
            }

            // Success or non-retryable error status
            return response;
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));

            // Don't retry on abort
            if (lastError.name === "AbortError") {
                throw lastError;
            }

            // Don't retry on AppError (already processed)
            if (error instanceof AppError) {
                throw error;
            }

            // Retry on network errors if configured
            if (
                isNetworkError(error) &&
                retryOnNetworkError &&
                attempt < maxRetries
            ) {
                const delay = calculateBackoffDelay(
                    attempt,
                    initialDelay,
                    maxDelay,
                    backoffFactor
                );

                onRetry?.(attempt + 1, lastError, delay);

                await sleep(delay, combinedSignal ?? undefined);
                attempt++;
                continue;
            }

            // Non-retryable error or max retries exceeded
            if (attempt >= maxRetries) {
                throw new AppError({
                    code: "external:network_error",
                    message: `Network request failed after ${maxRetries + 1} attempts`,
                    statusCode: 0,
                    isOperational: true,
                    context: {
                        url: typeof url === "string" ? url : url.toString(),
                        attempts: attempt + 1,
                        originalError: lastError.message,
                    },
                });
            }

            throw lastError;
        }
    }

    // Should not reach here, but TypeScript needs this
    throw lastError ?? new Error("Unknown fetch error");
}

/**
 * Create a fetch function with pre-configured retry options.
 *
 * @param defaultRetryConfig - Default retry configuration
 * @returns Configured fetch function
 *
 * @example
 * ```ts
 * const apiFetch = createRetryFetch({
 *   maxRetries: 5,
 *   onRetry: (attempt) => console.log(`Retrying... (${attempt})`),
 * });
 *
 * const response = await apiFetch('/api/data');
 * ```
 */
export function createRetryFetch(
    defaultRetryConfig: RetryConfig
): (
    url: RequestInfo | URL,
    options?: FetchWithRetryOptions
) => Promise<Response> {
    return (url, options = {}) => {
        return fetchWithRetry(url, {
            ...options,
            retry: {
                ...defaultRetryConfig,
                ...options.retry,
            },
        });
    };
}

/**
 * Create an AbortController with automatic timeout.
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController that will abort after timeout
 *
 * @example
 * ```ts
 * const controller = createTimeoutController(5000);
 * const response = await fetchWithRetry('/api/data', {
 *   signal: controller.signal,
 * });
 * ```
 */
export function createTimeoutController(timeoutMs: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller;
}
