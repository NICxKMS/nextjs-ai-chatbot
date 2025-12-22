/**
 * Request Deduplication for Edge Functions
 * Prevents duplicate requests within a time window
 *
 * @module lib/middleware/deduplication
 */

// In-memory store (per-instance, Edge-compatible)
const requestStore = new Map<
    string,
    { timestamp: number; response?: Response }
>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60_000; // 1 minute
const DEFAULT_WINDOW = 5000; // 5 seconds

let lastCleanup = Date.now();

function cleanup(): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    lastCleanup = now;
    const cutoff = now - DEFAULT_WINDOW * 2;

    for (const [key, value] of requestStore.entries()) {
        if (value.timestamp < cutoff) {
            requestStore.delete(key);
        }
    }
}

/**
 * Simple hash function (Edge-compatible)
 * Uses Web Crypto API for SHA-256 hashing
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Generate request fingerprint from method, path, body, and user ID
 */
async function getRequestFingerprint(request: Request): Promise<string> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // For mutation requests, include body hash
    let bodyHash = "";
    if (method !== "GET" && method !== "HEAD") {
        try {
            const body = await request.clone().text();
            bodyHash = await hashString(body);
        } catch {
            bodyHash = "no-body";
        }
    }

    // Include user identifier if available
    const userId =
        request.headers.get("x-user-id") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        "anonymous";

    return `${method}:${path}:${bodyHash}:${userId}`;
}

export interface DeduplicationOptions {
    /** Time window in milliseconds (default: 5000) */
    window?: number;
    /** Cache and return same response for duplicates */
    cacheResponse?: boolean;
}

export interface DeduplicationResult {
    /** Whether this is a duplicate request */
    isDuplicate: boolean;
    /** Cached response from previous request (if cacheResponse was enabled) */
    cachedResponse?: Response;
}

/**
 * Check if a request is a duplicate within the time window
 *
 * @param request - The incoming request to check
 * @param options - Deduplication options
 * @returns Result indicating if duplicate and optional cached response
 */
export async function isDuplicateRequest(
    request: Request,
    options: DeduplicationOptions = {}
): Promise<DeduplicationResult> {
    cleanup();

    const { window = DEFAULT_WINDOW, cacheResponse = false } = options;
    const fingerprint = await getRequestFingerprint(request);
    const now = Date.now();

    const existing = requestStore.get(fingerprint);

    if (existing && now - existing.timestamp < window) {
        return {
            isDuplicate: true,
            cachedResponse: cacheResponse
                ? existing.response?.clone()
                : undefined,
        };
    }

    // Track this request
    requestStore.set(fingerprint, { timestamp: now });

    return { isDuplicate: false };
}

/**
 * Cache a response for future duplicate requests
 *
 * @param request - The original request
 * @param response - The response to cache
 */
export function cacheDeduplicationResponse(
    request: Request,
    response: Response
): void {
    // Store response for future duplicate requests
    getRequestFingerprint(request).then((fingerprint) => {
        const existing = requestStore.get(fingerprint);
        if (existing) {
            existing.response = response.clone();
        }
    });
}

/**
 * Create a duplicate request error response
 */
function createDuplicateResponse(): Response {
    return new Response(
        JSON.stringify({
            error: "Duplicate Request",
            message: "This request was already processed. Please wait.",
        }),
        {
            status: 409,
            headers: { "Content-Type": "application/json" },
        }
    );
}

/**
 * Higher-order function wrapper for request deduplication
 *
 * @param handler - The request handler to wrap
 * @param options - Deduplication options
 * @returns Wrapped handler with deduplication
 *
 * @example
 * ```typescript
 * const handler = withDeduplication(async (request) => {
 *   // Process request
 *   return new Response("OK");
 * }, { window: 5000 });
 * ```
 */
export function withDeduplication<
    T extends (request: Request, ...args: unknown[]) => Promise<Response>,
>(handler: T, options: DeduplicationOptions = {}): T {
    return (async (request: Request, ...args: unknown[]) => {
        const { isDuplicate, cachedResponse } = await isDuplicateRequest(
            request,
            options
        );

        if (isDuplicate) {
            if (cachedResponse) {
                return cachedResponse;
            }
            return createDuplicateResponse();
        }

        const response = await handler(request, ...args);

        if (options.cacheResponse && response.ok) {
            cacheDeduplicationResponse(request, response);
        }

        return response;
    }) as T;
}

/**
 * Clear all stored request fingerprints
 * Useful for testing
 */
export function clearDeduplicationStore(): void {
    requestStore.clear();
}

/**
 * Get the current size of the deduplication store
 * Useful for monitoring
 */
export function getDeduplicationStoreSize(): number {
    return requestStore.size;
}
