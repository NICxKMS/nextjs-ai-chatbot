/**
 * Streaming Utilities
 * Ref: PERF-003 - Streaming Optimization
 *
 * Provides utilities for optimal SSE (Server-Sent Events) streaming configuration.
 * These utilities ensure low TTFB, prevent buffering, and handle client disconnects.
 *
 * @module lib/utils/streaming
 */

// =============================================================================
// PERF-003: STREAMING CONSTANTS
// =============================================================================

/**
 * Optimal chunk size for streaming (4KB)
 * Balances network efficiency with responsiveness
 */
export const OPTIMAL_CHUNK_SIZE = 4096;

/**
 * Default timeout for streaming operations (55 seconds)
 * Stays under typical serverless function limits (60s)
 */
export const STREAM_TIMEOUT_MS = 55_000;

// =============================================================================
// PERF-003: STREAMING HEADERS
// =============================================================================

/**
 * Optimized headers for SSE (Server-Sent Events) streaming.
 *
 * PERF-003: These headers ensure:
 * - Proper content type for SSE parsing
 * - No caching of stream responses
 * - Disabled nginx/proxy buffering (X-Accel-Buffering)
 * - No compression that could cause buffering (Content-Encoding: identity)
 * - Keep-alive for long-running connections
 *
 * @example
 * ```typescript
 * return new Response(stream, { headers: SSE_HEADERS });
 * ```
 */
export const SSE_HEADERS: HeadersInit = {
    // Required: SSE content type for proper parsing
    "Content-Type": "text/event-stream",

    // Prevent caching and transformation of streamed data
    "Cache-Control": "no-cache, no-transform",

    // PERF-003: Disable nginx buffering for real-time streaming
    // This is critical for proxied environments (Vercel, nginx, etc.)
    "X-Accel-Buffering": "no",

    // PERF-003: Disable compression to prevent buffering
    // gzip/brotli can buffer chunks before sending, causing latency spikes
    "Content-Encoding": "identity",

    // Keep connection alive for long-running streams
    Connection: "keep-alive",
} as const;

// =============================================================================
// PERF-003: ABORT SIGNAL UTILITIES
// =============================================================================

/**
 * Creates a combined abort signal that triggers on either:
 * 1. Client disconnect (request.signal)
 * 2. Timeout expiration
 *
 * PERF-003: Properly handling client disconnects prevents:
 * - Wasted compute on abandoned requests
 * - Memory leaks from orphaned streams
 * - Unnecessary API costs
 *
 * @param request - The incoming request with abort signal
 * @param timeoutMs - Timeout in milliseconds (default: STREAM_TIMEOUT_MS)
 * @returns AbortSignal that triggers on disconnect or timeout
 *
 * @example
 * ```typescript
 * const signal = createStreamAbortSignal(request);
 * const result = streamText({
 *     model,
 *     messages,
 *     abortSignal: signal,
 * });
 * ```
 */
export function createStreamAbortSignal(
    request: Request,
    timeoutMs: number = STREAM_TIMEOUT_MS
): AbortSignal {
    // Create timeout signal
    const timeoutSignal = AbortSignal.timeout(timeoutMs);

    // Combine with request signal for client disconnect handling
    // AbortSignal.any() triggers when ANY signal aborts
    return AbortSignal.any([request.signal, timeoutSignal]);
}

/**
 * Checks if a request has been aborted (client disconnected).
 *
 * PERF-003: Use this to early-exit from processing when client disconnects.
 *
 * @param request - The incoming request
 * @returns true if the request has been aborted
 *
 * @example
 * ```typescript
 * if (isRequestAborted(request)) {
 *     return new Response(null, { status: 499 }); // Client Closed Request
 * }
 * ```
 */
export function isRequestAborted(request: Request): boolean {
    return request.signal.aborted;
}

// =============================================================================
// PERF-003: STREAM CREATION HELPERS
// =============================================================================

/**
 * Creates a streaming Response with optimal SSE headers.
 *
 * PERF-003: Combines stream with optimized headers in one call.
 *
 * @param stream - The ReadableStream to send
 * @param additionalHeaders - Optional additional headers to merge
 * @returns Response configured for optimal streaming
 *
 * @example
 * ```typescript
 * const stream = createUIMessageStream({ ... });
 * return createStreamResponse(stream.pipeThrough(new JsonToSseTransformStream()));
 * ```
 */
export function createStreamResponse(
    stream: ReadableStream,
    additionalHeaders?: HeadersInit
): Response {
    const headers = additionalHeaders
        ? { ...SSE_HEADERS, ...additionalHeaders }
        : SSE_HEADERS;

    return new Response(stream, { headers });
}

/**
 * Configuration options for stream processing
 */
export interface StreamConfig {
    /** Timeout in milliseconds (default: STREAM_TIMEOUT_MS) */
    timeoutMs?: number;
    /** Whether to handle client disconnects (default: true) */
    handleDisconnect?: boolean;
}

/**
 * Builds streaming configuration for AI SDK streamText calls.
 *
 * PERF-003: Provides consistent streaming config across all endpoints.
 *
 * @param request - The incoming request (for abort signal)
 * @param config - Optional configuration overrides
 * @returns Configuration object to spread into streamText options
 *
 * @example
 * ```typescript
 * const streamConfig = buildStreamConfig(request);
 * const result = streamText({
 *     model,
 *     messages,
 *     ...streamConfig,
 * });
 * ```
 */
export function buildStreamConfig(
    request: Request,
    config: StreamConfig = {}
): { abortSignal: AbortSignal } {
    const { timeoutMs = STREAM_TIMEOUT_MS, handleDisconnect = true } = config;

    const abortSignal = handleDisconnect
        ? createStreamAbortSignal(request, timeoutMs)
        : AbortSignal.timeout(timeoutMs);

    return { abortSignal };
}
