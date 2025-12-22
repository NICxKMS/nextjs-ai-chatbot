/**
 * Enhanced Fetch Client
 *
 * Production-grade fetch wrapper with:
 * - Standardized API error responses
 * - Request timeout support
 * - Response validation with type guards
 * - Request deduplication
 * - Retry support integration
 *
 * @module lib/api/fetch-client
 */

import { AppError } from "@/lib/errors";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard API error response structure.
 */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        timestamp: number;
        requestId?: string;
    };
}

/**
 * Standard API success response structure.
 */
export interface ApiSuccessResponse<T> {
    data: T;
    meta?: {
        timestamp: number;
        requestId?: string;
    };
}

/**
 * Type guard function signature.
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Fetch client configuration.
 */
export interface FetchClientConfig {
    /** Base URL for all requests (optional) */
    baseUrl?: string;
    /** Default timeout in milliseconds (default: 30000) */
    defaultTimeout?: number;
    /** Default headers to include in all requests */
    defaultHeaders?: Record<string, string>;
    /** Whether to deduplicate concurrent identical requests (default: true) */
    deduplicateRequests?: boolean;
    /** Callback for logging errors */
    onError?: (error: AppError, context: RequestContext) => void;
}

/**
 * Request context for logging and debugging.
 */
export interface RequestContext {
    url: string;
    method: string;
    startTime: number;
    requestId?: string;
    [key: string]: unknown;
}

/**
 * Options for individual fetch requests.
 */
export interface FetchOptions<T = unknown> extends Omit<RequestInit, "body"> {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Type guard for response validation */
    validator?: TypeGuard<T>;
    /** Skip request deduplication for this request */
    skipDedup?: boolean;
    /** Request body (will be JSON stringified if object) */
    body?: BodyInit | Record<string, unknown> | null;
    /** Unique request identifier for deduplication override */
    requestKey?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TIMEOUT_MS = 30_000;
const REQUEST_ID_HEADER = "x-request-id";

// =============================================================================
// REQUEST DEDUPLICATION
// =============================================================================

/** In-flight request cache for deduplication */
const inflightRequests = new Map<string, Promise<Response>>();

/**
 * Generate a unique key for request deduplication.
 */
function generateRequestKey(url: string, options: RequestInit): string {
    const method = options.method?.toUpperCase() ?? "GET";
    const body = options.body ? String(options.body) : "";
    return `${method}:${url}:${body}`;
}

/**
 * Wrap a fetch promise with deduplication support.
 */
function withDeduplication(
    key: string,
    fetchFn: () => Promise<Response>
): Promise<Response> {
    const existing = inflightRequests.get(key);
    if (existing) {
        // Clone the response so each consumer gets their own copy
        return existing.then((r) => r.clone());
    }

    const promise = fetchFn().finally(() => {
        inflightRequests.delete(key);
    });

    inflightRequests.set(key, promise);
    return promise;
}

// =============================================================================
// TIMEOUT SUPPORT
// =============================================================================

/**
 * Create an AbortSignal that times out after specified milliseconds.
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
    return AbortSignal.timeout(timeoutMs);
}

/**
 * Combine multiple abort signals into one.
 */
function combineSignals(
    ...signals: (AbortSignal | null | undefined)[]
): AbortSignal {
    const validSignals = signals.filter((s): s is AbortSignal => s != null);

    if (validSignals.length === 0) {
        return new AbortController().signal;
    }
    if (validSignals.length === 1) {
        // We know validSignals[0] exists because length === 1
        return validSignals[0] as AbortSignal;
    }

    const controller = new AbortController();

    for (const signal of validSignals) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            break;
        }
        signal.addEventListener("abort", () => controller.abort(signal.reason));
    }

    return controller.signal;
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

/**
 * Validate response data against a type guard.
 */
function validateResponse<T>(
    data: unknown,
    validator: TypeGuard<T>,
    url: string
): T {
    if (!validator(data)) {
        throw new AppError({
            code: "validation:invalid_response",
            message: "API response validation failed",
            statusCode: 500,
            isOperational: true,
            context: {
                url,
                receivedType: typeof data,
                receivedValue:
                    typeof data === "object" ? Object.keys(data ?? {}) : data,
            },
        });
    }
    return data;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Parse error response body.
 */
async function parseErrorBody(response: Response): Promise<ApiErrorResponse> {
    try {
        const body = await response.json();
        // If body matches our error format, use it
        if (body && typeof body.error === "object" && body.error.message) {
            return body as ApiErrorResponse;
        }
        // Otherwise wrap it
        return {
            error: {
                code: body.code ?? `http:${response.status}`,
                message:
                    body.message ??
                    body.error ??
                    `Request failed with status ${response.status}`,
                details: body.details ?? body,
            },
            meta: { timestamp: Date.now() },
        };
    } catch {
        // JSON parsing failed
        return {
            error: {
                code: `http:${response.status}`,
                message: response.statusText || `HTTP ${response.status} Error`,
            },
            meta: { timestamp: Date.now() },
        };
    }
}

/**
 * Convert Response errors to AppError.
 */
async function handleResponseError(
    response: Response,
    context: RequestContext
): Promise<never> {
    const errorBody = await parseErrorBody(response);

    // Extract category from error code or default to external
    // ErrorCode must be one of: auth, validation, resource, rate_limit, external, internal
    const code = errorBody.error.code;
    const hasValidCategory =
        /^(auth|validation|resource|rate_limit|external|internal):/.test(code);
    const normalizedCode = hasValidCategory
        ? (code as
              | `auth:${string}`
              | `validation:${string}`
              | `resource:${string}`
              | `rate_limit:${string}`
              | `external:${string}`
              | `internal:${string}`)
        : (`external:${code}` as const);

    throw new AppError({
        code: normalizedCode,
        message: errorBody.error.message,
        statusCode: response.status,
        isOperational: true,
        context: {
            ...context,
            details: errorBody.error.details,
        },
    });
}

/**
 * Handle fetch errors (network, timeout, abort).
 */
function handleFetchError(error: unknown, context: RequestContext): never {
    if (error instanceof AppError) {
        throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
        throw new AppError({
            code: "external:request_aborted",
            message: "Request was aborted",
            statusCode: 0,
            isOperational: true,
            context,
        });
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new AppError({
            code: "external:request_timeout",
            message: "Request timed out",
            statusCode: 408,
            isOperational: true,
            context,
        });
    }

    // Network error
    if (error instanceof TypeError) {
        throw new AppError({
            code: "external:network_error",
            message: "Network request failed. Please check your connection.",
            statusCode: 0,
            isOperational: true,
            context: {
                ...context,
                originalError: error.message,
            },
        });
    }

    throw new AppError({
        code: "internal:unknown",
        message: error instanceof Error ? error.message : "Unknown fetch error",
        statusCode: 500,
        isOperational: false,
        context,
        cause: error,
    });
}

// =============================================================================
// FETCH CLIENT CLASS
// =============================================================================

/**
 * Enhanced fetch client with standardized error handling and response validation.
 *
 * @example
 * ```ts
 * const client = new FetchClient({
 *   baseUrl: '/api',
 *   defaultTimeout: 10000,
 * });
 *
 * // Basic GET request
 * const data = await client.get<User>('/users/1');
 *
 * // POST with validation
 * const user = await client.post<User>('/users', {
 *   body: { name: 'John' },
 *   validator: isUser,
 * });
 * ```
 */
export class FetchClient {
    private readonly config: Required<FetchClientConfig>;

    constructor(config: FetchClientConfig = {}) {
        this.config = {
            baseUrl: config.baseUrl ?? "",
            defaultTimeout: config.defaultTimeout ?? DEFAULT_TIMEOUT_MS,
            defaultHeaders: config.defaultHeaders ?? {},
            deduplicateRequests: config.deduplicateRequests ?? true,
            onError: config.onError ?? (() => {}),
        };
    }

    /**
     * Make a fetch request with all enhancements.
     */
    async request<T>(url: string, options: FetchOptions<T> = {}): Promise<T> {
        const {
            timeout = this.config.defaultTimeout,
            validator,
            skipDedup = false,
            body,
            requestKey,
            ...fetchInit
        } = options;

        // Build full URL
        const fullUrl = this.config.baseUrl
            ? `${this.config.baseUrl}${url}`
            : url;

        // Generate request ID for tracing
        const requestId = crypto.randomUUID();

        // Build request context
        const context: RequestContext = {
            url: fullUrl,
            method: fetchInit.method?.toUpperCase() ?? "GET",
            startTime: Date.now(),
            requestId,
        };

        // Prepare body
        const processedBody =
            body && typeof body === "object" && !(body instanceof FormData)
                ? JSON.stringify(body)
                : (body as BodyInit | null | undefined);

        // Build headers
        const headers = new Headers(fetchInit.headers);
        for (const [key, value] of Object.entries(this.config.defaultHeaders)) {
            if (!headers.has(key)) {
                headers.set(key, value);
            }
        }
        headers.set(REQUEST_ID_HEADER, requestId);

        // Add Content-Type for JSON bodies
        if (
            processedBody &&
            typeof body === "object" &&
            !headers.has("Content-Type")
        ) {
            headers.set("Content-Type", "application/json");
        }

        // Combine timeout and user-provided signals
        const timeoutSignal = createTimeoutSignal(timeout);
        const combinedSignal = combineSignals(timeoutSignal, fetchInit.signal);

        // Build final fetch options
        const finalOptions: RequestInit = {
            ...fetchInit,
            headers,
            body: processedBody,
            signal: combinedSignal,
        };

        try {
            // Execute fetch with optional deduplication
            const doFetch = () => fetch(fullUrl, finalOptions);

            const useDedup =
                this.config.deduplicateRequests &&
                !skipDedup &&
                (context.method === "GET" || context.method === "HEAD");

            const key = requestKey ?? generateRequestKey(fullUrl, finalOptions);
            const response = useDedup
                ? await withDeduplication(key, doFetch)
                : await doFetch();

            // Handle error responses
            if (!response.ok) {
                await handleResponseError(response, context);
            }

            // Parse response
            const data = await response.json();

            // Validate response if validator provided
            if (validator) {
                return validateResponse(data, validator, fullUrl);
            }

            return data as T;
        } catch (error) {
            const appError =
                error instanceof AppError
                    ? error
                    : handleFetchError(error, context);

            this.config.onError(appError as AppError, context);
            throw appError;
        }
    }

    /**
     * GET request.
     */
    get<T>(
        url: string,
        options?: Omit<FetchOptions<T>, "method" | "body">
    ): Promise<T> {
        return this.request<T>(url, { ...options, method: "GET" });
    }

    /**
     * POST request.
     */
    post<T>(
        url: string,
        options?: Omit<FetchOptions<T>, "method">
    ): Promise<T> {
        return this.request<T>(url, { ...options, method: "POST" });
    }

    /**
     * PUT request.
     */
    put<T>(url: string, options?: Omit<FetchOptions<T>, "method">): Promise<T> {
        return this.request<T>(url, { ...options, method: "PUT" });
    }

    /**
     * PATCH request.
     */
    patch<T>(
        url: string,
        options?: Omit<FetchOptions<T>, "method">
    ): Promise<T> {
        return this.request<T>(url, { ...options, method: "PATCH" });
    }

    /**
     * DELETE request.
     */
    delete<T>(
        url: string,
        options?: Omit<FetchOptions<T>, "method">
    ): Promise<T> {
        return this.request<T>(url, { ...options, method: "DELETE" });
    }
}

// =============================================================================
// DEFAULT INSTANCE
// =============================================================================

/**
 * Default fetch client instance for API requests.
 */
export const apiClient = new FetchClient({
    baseUrl: "",
    defaultTimeout: DEFAULT_TIMEOUT_MS,
    defaultHeaders: {
        Accept: "application/json",
    },
});

// =============================================================================
// STANDALONE FUNCTIONS
// =============================================================================

/**
 * Standalone fetch with timeout support.
 *
 * @example
 * ```ts
 * const response = await fetchWithTimeout('/api/data', { timeout: 5000 });
 * ```
 */
export async function fetchWithTimeout(
    url: string,
    options: Omit<FetchOptions, "body"> & { body?: BodyInit | null } = {}
): Promise<Response> {
    const {
        timeout = DEFAULT_TIMEOUT_MS,
        validator: _validator,
        skipDedup: _skipDedup,
        requestKey: _requestKey,
        ...fetchOptions
    } = options;

    const timeoutSignal = createTimeoutSignal(timeout);
    const combinedSignal = combineSignals(timeoutSignal, fetchOptions.signal);

    try {
        return await fetch(url, {
            ...fetchOptions,
            signal: combinedSignal,
        });
    } catch (error) {
        const context: RequestContext = {
            url,
            method: fetchOptions.method?.toUpperCase() ?? "GET",
            startTime: Date.now(),
        };
        handleFetchError(error, context);
    }
}

// =============================================================================
// TYPE GUARD FACTORIES
// =============================================================================

/**
 * Create a type guard that checks for specific object shape.
 *
 * @example
 * ```ts
 * const isUser = createObjectGuard<User>(['id', 'name', 'email']);
 * const user = await client.get<User>('/users/1', { validator: isUser });
 * ```
 */
export function createObjectGuard<T extends Record<string, unknown>>(
    requiredKeys: (keyof T)[]
): TypeGuard<T> {
    return (value: unknown): value is T => {
        if (typeof value !== "object" || value === null) {
            return false;
        }
        return requiredKeys.every((key) => key in value);
    };
}

/**
 * Create a type guard for arrays of a specific type.
 *
 * @example
 * ```ts
 * const isUserArray = createArrayGuard(isUser);
 * const users = await client.get<User[]>('/users', { validator: isUserArray });
 * ```
 */
export function createArrayGuard<T>(itemGuard: TypeGuard<T>): TypeGuard<T[]> {
    return (value: unknown): value is T[] => {
        return Array.isArray(value) && value.every(itemGuard);
    };
}

/**
 * Create a type guard for nullable values.
 */
export function createNullableGuard<T>(
    guard: TypeGuard<T>
): TypeGuard<T | null> {
    return (value: unknown): value is T | null => {
        return value === null || guard(value);
    };
}
