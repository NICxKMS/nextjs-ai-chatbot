/**
 * Middleware Chain Composition
 *
 * Utilities for composing and optimizing middleware chains.
 * Provides early-exit patterns and efficient header parsing.
 *
 * @module lib/middleware/chain
 * @see OPT-027
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Middleware function signature.
 * Returns Response to short-circuit, null to continue chain.
 */
export type Middleware = (
    request: Request
) => Promise<Response | null> | Response | null;

/**
 * Middleware with context passing.
 */
export type ContextMiddleware<TContext = Record<string, unknown>> = (
    request: Request,
    context: TContext
) => Promise<MiddlewareResult<TContext> | Response | null>;

export interface MiddlewareResult<TContext = Record<string, unknown>> {
    /** Continue to next middleware */
    continue: true;
    /** Updated context */
    context?: Partial<TContext>;
    /** Headers to add to final response */
    headers?: Record<string, string>;
}

export interface ChainOptions {
    /** Continue on middleware error (default: false) */
    continueOnError?: boolean;
    /** Error handler */
    onError?: (error: Error, middleware: string) => Response | null;
    /** Log middleware execution times */
    timing?: boolean;
}

// =============================================================================
// MIDDLEWARE CHAIN
// =============================================================================

/**
 * Create a composed middleware chain with early-exit support.
 *
 * Middlewares are executed in order. If any middleware returns a Response,
 * the chain short-circuits and returns that response.
 *
 * @example
 * ```ts
 * const middleware = createMiddlewareChain([
 *   rateLimitMiddleware,
 *   authMiddleware,
 *   corsMiddleware,
 * ]);
 *
 * export async function handler(request: Request) {
 *   const result = await middleware(request);
 *   if (result) return result; // Early exit
 *
 *   // Continue with normal handling
 *   return new Response("OK");
 * }
 * ```
 */
export function createMiddlewareChain(
    middlewares: Middleware[],
    options: ChainOptions = {}
): Middleware {
    const { continueOnError = false, onError, timing = false } = options;

    return async (request: Request): Promise<Response | null> => {
        const timings: Array<{ name: string; duration: number }> = [];

        for (let i = 0; i < middlewares.length; i++) {
            const middleware = middlewares[i];
            if (!middleware) {
                continue;
            }

            const start = timing ? performance.now() : 0;

            try {
                const result = await middleware(request);

                if (timing) {
                    timings.push({
                        name: middleware.name || `middleware-${i}`,
                        duration: performance.now() - start,
                    });
                }

                if (result !== null) {
                    // Add timing header if enabled
                    if (timing && timings.length > 0) {
                        const headers = new Headers(result.headers);
                        headers.set(
                            "X-Middleware-Timing",
                            timings
                                .map(
                                    (t) =>
                                        `${t.name}=${t.duration.toFixed(2)}ms`
                                )
                                .join(", ")
                        );
                        return new Response(result.body, {
                            status: result.status,
                            statusText: result.statusText,
                            headers,
                        });
                    }
                    return result;
                }
            } catch (error) {
                if (onError) {
                    const errorResponse = onError(
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                        middleware.name || `middleware-${i}`
                    );
                    if (errorResponse) {
                        return errorResponse;
                    }
                }

                if (!continueOnError) {
                    throw error;
                }
            }
        }

        return null;
    };
}

/**
 * Create a middleware chain with context passing.
 *
 * Context is passed between middlewares, allowing them to share data.
 *
 * @example
 * ```ts
 * interface RequestContext {
 *   userId?: string;
 *   requestId: string;
 * }
 *
 * const middleware = createContextChain<RequestContext>([
 *   async (request, ctx) => {
 *     return { continue: true, context: { requestId: generateId() } };
 *   },
 *   async (request, ctx) => {
 *     console.log(ctx.requestId); // Access from previous middleware
 *     return null;
 *   },
 * ]);
 * ```
 */
export function createContextChain<TContext extends Record<string, unknown>>(
    middlewares: ContextMiddleware<TContext>[],
    initialContext: TContext
): (request: Request) => Promise<{
    response: Response | null;
    context: TContext;
    headers: Record<string, string>;
}> {
    return async (request: Request) => {
        let context = { ...initialContext };
        const headers: Record<string, string> = {};

        for (const middleware of middlewares) {
            const result = await middleware(request, context);

            if (result === null) {
                continue;
            }

            if (result instanceof Response) {
                return { response: result, context, headers };
            }

            if (result.continue) {
                if (result.context) {
                    context = { ...context, ...result.context };
                }
                if (result.headers) {
                    Object.assign(headers, result.headers);
                }
            }
        }

        return { response: null, context, headers };
    };
}

// =============================================================================
// HEADER UTILITIES
// =============================================================================

/**
 * Parsed cache control directives.
 */
export interface CacheControl {
    maxAge?: number;
    sMaxAge?: number;
    noCache?: boolean;
    noStore?: boolean;
    mustRevalidate?: boolean;
    private?: boolean;
    public?: boolean;
    immutable?: boolean;
}

const CACHE_CONTROL_REGEX =
    /(?:^|,)\s*(no-cache|no-store|must-revalidate|private|public|immutable|max-age=(\d+)|s-maxage=(\d+))/gi;

/**
 * Efficiently parse Cache-Control header.
 * Uses regex for single-pass parsing.
 */
export function parseCacheControl(header: string | null): CacheControl {
    if (!header) {
        return {};
    }

    const result: CacheControl = {};
    let match: RegExpExecArray | null;

    while ((match = CACHE_CONTROL_REGEX.exec(header)) !== null) {
        const directive = match[1]?.toLowerCase();
        if (!directive) {
            continue;
        }

        if (directive === "no-cache") {
            result.noCache = true;
        } else if (directive === "no-store") {
            result.noStore = true;
        } else if (directive === "must-revalidate") {
            result.mustRevalidate = true;
        } else if (directive === "private") {
            result.private = true;
        } else if (directive === "public") {
            result.public = true;
        } else if (directive === "immutable") {
            result.immutable = true;
        } else if (directive.startsWith("max-age=") && match[2]) {
            result.maxAge = Number.parseInt(match[2], 10);
        } else if (directive.startsWith("s-maxage=") && match[3]) {
            result.sMaxAge = Number.parseInt(match[3], 10);
        }
    }

    // Reset regex lastIndex for reuse
    CACHE_CONTROL_REGEX.lastIndex = 0;

    return result;
}

/**
 * Parsed Accept header with quality values.
 */
export interface AcceptValue {
    type: string;
    quality: number;
}

/**
 * Efficiently parse Accept header with quality values.
 * Returns types sorted by quality (highest first).
 */
export function parseAccept(header: string | null): AcceptValue[] {
    if (!header) {
        return [];
    }

    return header
        .split(",")
        .map((part) => {
            const [type, ...params] = part.trim().split(";");
            let quality = 1;

            for (const param of params) {
                const [key, value] = param.trim().split("=");
                if (key === "q" && value) {
                    quality = Number.parseFloat(value);
                }
            }

            return { type: type?.trim() ?? "", quality };
        })
        .filter((v) => v.type)
        .sort((a, b) => b.quality - a.quality);
}

/**
 * Check if Accept header matches a content type.
 */
export function acceptsContentType(
    acceptHeader: string | null,
    contentType: string
): boolean {
    const accepts = parseAccept(acceptHeader);
    if (accepts.length === 0) {
        return true; // No Accept = accept all
    }

    return accepts.some((a) => {
        if (a.type === "*/*") {
            return true;
        }
        if (a.type === contentType) {
            return true;
        }

        // Check for type/* matches (e.g., "text/*" matches "text/html")
        const [type] = a.type.split("/");
        const [contentMain] = contentType.split("/");
        if (a.type.endsWith("/*") && type === contentMain) {
            return true;
        }

        return false;
    });
}

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(header: string | null): string | null {
    if (!header) {
        return null;
    }
    if (!header.toLowerCase().startsWith("bearer ")) {
        return null;
    }
    return header.slice(7).trim() || null;
}

/**
 * Parse cookie header into a Map for efficient lookups.
 */
export function parseCookies(header: string | null): Map<string, string> {
    const cookies = new Map<string, string>();
    if (!header) {
        return cookies;
    }

    for (const pair of header.split(";")) {
        const idx = pair.indexOf("=");
        if (idx === -1) {
            continue;
        }

        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key) {
            cookies.set(key, decodeURIComponent(value));
        }
    }

    return cookies;
}

// =============================================================================
// EARLY EXIT HELPERS
// =============================================================================

/**
 * Create a conditional middleware that only runs for certain paths.
 */
export function whenPath(
    pattern: string | RegExp,
    middleware: Middleware
): Middleware {
    const regex =
        typeof pattern === "string" ? new RegExp(`^${pattern}`) : pattern;

    return async (request: Request) => {
        const pathname = new URL(request.url).pathname;
        if (!regex.test(pathname)) {
            return null; // Skip this middleware
        }
        return middleware(request);
    };
}

/**
 * Create a conditional middleware that only runs for certain methods.
 */
export function whenMethod(
    methods: string | string[],
    middleware: Middleware
): Middleware {
    const methodSet = new Set(
        (Array.isArray(methods) ? methods : [methods]).map((m) =>
            m.toUpperCase()
        )
    );

    return async (request: Request) => {
        if (!methodSet.has(request.method.toUpperCase())) {
            return null; // Skip this middleware
        }
        return middleware(request);
    };
}

/**
 * Create a middleware that skips certain paths.
 */
export function skipPath(
    pattern: string | RegExp,
    middleware: Middleware
): Middleware {
    const regex =
        typeof pattern === "string" ? new RegExp(`^${pattern}`) : pattern;

    return async (request: Request) => {
        const pathname = new URL(request.url).pathname;
        if (regex.test(pathname)) {
            return null; // Skip this middleware
        }
        return middleware(request);
    };
}
