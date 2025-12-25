/**
 * Network Utilities
 *
 * Custom fetch wrapper with error handling for client-side requests.
 * Includes timeout support, abort handling, and user-friendly error messages.
 *
 * @module lib/utils/network
 * @see P3-070, P3-075, P3-079
 */

import { AppError } from "@/lib/errors";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout for network requests (30 seconds) */
export const DEFAULT_NETWORK_TIMEOUT_MS = 30_000;

// =============================================================================
// USER-FRIENDLY ERROR MESSAGES
// =============================================================================

/**
 * P4-043: Strategy pattern - Status code to user-friendly message mapping.
 * Using lookup table for cleaner maintenance and better performance.
 */
const STATUS_MESSAGE_MAP: Record<number, string> = {
    0: "Unable to connect. Please check your internet connection.",
    400: "The request was invalid. Please check your input and try again.",
    401: "Please sign in to continue.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    408: "The request timed out. Please try again.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Something went wrong on our end. Please try again later.",
    502: "The service is temporarily unavailable. Please try again later.",
    503: "The service is temporarily unavailable. Please try again later.",
    504: "The service is temporarily unavailable. Please try again later.",
};

const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

/**
 * Map technical error conditions to user-friendly messages.
 * P4-043: Uses strategy pattern lookup table instead of switch.
 */
function getUserFriendlyMessage(
    status: number,
    originalMessage?: string
): string {
    return (
        STATUS_MESSAGE_MAP[status] ?? originalMessage ?? DEFAULT_ERROR_MESSAGE
    );
}

// =============================================================================
// FETCH OPTIONS
// =============================================================================

export interface FetchWithHandlersOptions extends RequestInit {
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Fetch wrapper with built-in error handling, timeout, and abort support.
 *
 * Features:
 * - Offline detection
 * - Configurable timeout (P3-079)
 * - AbortController support (P3-070)
 * - User-friendly error messages (P3-075)
 * - HTTP error status conversion to AppError
 * - JSON error body parsing
 *
 * @example
 * ```ts
 * // Basic usage
 * const response = await fetchWithErrorHandlers('/api/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' })
 * });
 *
 * // With timeout and abort
 * const controller = new AbortController();
 * const response = await fetchWithErrorHandlers('/api/data', {
 *   signal: controller.signal,
 *   timeout: 10000, // 10 seconds
 * });
 * // Cancel if needed: controller.abort();
 * ```
 */
export async function fetchWithErrorHandlers(
    url: RequestInfo | URL,
    init?: FetchWithHandlersOptions
): Promise<Response> {
    const { timeout = DEFAULT_NETWORK_TIMEOUT_MS, ...fetchOptions } =
        init ?? {};

    // Check if we're offline first (client-side only)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new AppError({
            code: "external:network_offline",
            message: getUserFriendlyMessage(0),
            statusCode: 0,
            isOperational: true,
        });
    }

    // Combine user-provided signal with timeout signal
    const timeoutSignal = AbortSignal.timeout(timeout);
    const combinedSignal = fetchOptions.signal
        ? AbortSignal.any([fetchOptions.signal, timeoutSignal])
        : timeoutSignal;

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: combinedSignal,
        });

        if (!response.ok) {
            // Try to parse error response body
            const errorData = await response.json().catch(() => ({}));
            const technicalMessage =
                errorData.message ?? `API request failed (${response.status})`;

            throw new AppError({
                code: errorData.code ?? "external:api_error",
                message: getUserFriendlyMessage(
                    response.status,
                    technicalMessage
                ),
                statusCode: response.status,
                isOperational: true,
                context: {
                    url: typeof url === "string" ? url : url.toString(),
                    status: response.status,
                    statusText: response.statusText,
                    technicalMessage,
                },
            });
        }

        return response;
    } catch (error) {
        // Re-throw AppError as-is
        if (error instanceof AppError) {
            throw error;
        }

        // Handle abort
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new AppError({
                code: "external:request_aborted",
                message: "The request was cancelled.",
                statusCode: 0,
                isOperational: true,
            });
        }

        // Handle timeout
        if (error instanceof DOMException && error.name === "TimeoutError") {
            throw new AppError({
                code: "external:request_timeout",
                message: getUserFriendlyMessage(408),
                statusCode: 408,
                isOperational: true,
            });
        }

        // Handle network errors (e.g., ECONNREFUSED, DNS failures)
        if (error instanceof TypeError && error.message.includes("fetch")) {
            throw new AppError({
                code: "external:connection_failed",
                message: getUserFriendlyMessage(0),
                statusCode: 0,
                isOperational: true,
                context: {
                    originalError: error.message,
                },
            });
        }

        // Unknown error - wrap and throw
        throw new AppError({
            code: "external:unknown_error",
            message: "An unexpected network error occurred. Please try again.",
            statusCode: 0,
            isOperational: false,
            context: {
                originalError:
                    error instanceof Error ? error.message : String(error),
            },
        });
    }
}
