/**
 * Network Utilities
 *
 * Custom fetch wrapper with error handling for client-side requests.
 *
 * @module lib/utils/network
 */

import { AppError } from "@/lib/errors";

/**
 * Fetch wrapper with built-in error handling.
 *
 * Features:
 * - Offline detection
 * - HTTP error status conversion to AppError
 * - JSON error body parsing
 *
 * @example
 * ```ts
 * const response = await fetchWithErrorHandlers('/api/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' })
 * });
 * ```
 */
export const fetchWithErrorHandlers: typeof fetch = async (url, init) => {
    // Check if we're offline first (client-side only)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new AppError({
            code: "external:network_offline",
            message: "You are offline. Please check your connection.",
            statusCode: 0,
            isOperational: true,
        });
    }

    const response = await fetch(url, init);

    if (!response.ok) {
        // Try to parse error response body
        const errorData = await response.json().catch(() => ({}));

        throw new AppError({
            code: errorData.code ?? "external:api_error",
            message:
                errorData.message ?? `API request failed (${response.status})`,
            statusCode: response.status,
            isOperational: true,
            context: {
                url: typeof url === "string" ? url : url.toString(),
                status: response.status,
                statusText: response.statusText,
            },
        });
    }

    return response;
};
