/**
 * Network API Client
 *
 * Client-side utilities for network connectivity checks.
 *
 * @module shared/services/network-api
 */

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Ping an endpoint to check connectivity.
 *
 * @param endpoint - Endpoint URL to ping
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns True if endpoint is reachable
 */
export async function pingEndpoint(
    endpoint: string,
    timeoutMs = 5000
): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(endpoint, {
            method: "HEAD",
            cache: "no-store",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}
