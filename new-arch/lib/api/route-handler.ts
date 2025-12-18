/**
 * Route Handler Factory
 * @module new-arch/lib/api/route-handler
 *
 * Factory function for creating consistent, type-safe API route handlers.
 */

import { sessionManager } from "../auth";
import type { AppSession } from "../auth/types";
import { AppError } from "../errors";
import { checkEdgeRateLimit } from "../middleware/rate-limit";
import {
    corsOptions,
    error as errorResponse,
    forbidden,
    rateLimited,
    serverError,
    unauthorized,
} from "./response";
import type {
    NextRouteHandler,
    RouteConfig,
    RouteContext,
    RouteHandler,
    RouteSession,
} from "./types";
import { getSearchParams, parseJsonBody, parseQuery } from "./validation";

// ============================================================================
// Route Handler Factory
// ============================================================================

/**
 * Create a type-safe route handler with built-in:
 * - Authentication (required/optional/none)
 * - Rate limiting
 * - Guest access control
 * - Request body validation
 * - Query parameter validation
 * - Consistent error handling
 * - Cache headers
 *
 * @example
 * ```typescript
 * export const GET = createRouteHandler(
 *   {
 *     surface: "chat",
 *     method: "GET",
 *     auth: "required",
 *     rateLimit: "standard",
 *     querySchema: z.object({ limit: z.coerce.number().optional() }),
 *     cachePolicy: "private-short",
 *   },
 *   async ({ session, query }) => {
 *     const chats = await getChatsByUserId(session.user.id, query.limit);
 *     return response.json(chats);
 *   }
 * );
 * ```
 */
export function createRouteHandler<TBody = unknown, TQuery = unknown>(
    config: RouteConfig<TBody, TQuery>,
    handler: RouteHandler<TBody, TQuery>
): NextRouteHandler {
    return async (
        request: Request,
        routeContext?: { params?: Promise<Record<string, string>> }
    ): Promise<Response> => {
        try {
            // 1. Resolve route params
            const params = (await routeContext?.params) ?? {};

            // 2. Authentication check
            let session: RouteSession | null = null;
            if (config.auth !== "none") {
                const authResult = await getSession();
                if (config.auth === "required" && !authResult) {
                    return unauthorized();
                }
                session = authResult;
            }

            // 3. Rate limiting (requires authenticated user)
            if (config.rateLimit && session) {
                const rateLimitResult = await checkRateLimit(
                    config.rateLimit,
                    session.user.id
                );
                if (!rateLimitResult.ok) {
                    return rateLimited(rateLimitResult.retryAfter);
                }
            }

            // 4. Guest access check
            if (!config.guestAllowed && session?.user.type === "guest") {
                return forbidden(
                    "This action is not available for guest users"
                );
            }

            // 5. Body validation
            let body: TBody = undefined as TBody;
            if (config.bodySchema) {
                const bodyResult = await parseJsonBody(
                    request,
                    config.bodySchema,
                    config.surface
                );
                if (!bodyResult.ok) {
                    return errorResponse(bodyResult.error);
                }
                body = bodyResult.value;
            }

            // 6. Query validation
            let query: TQuery = undefined as TQuery;
            const searchParams = getSearchParams(request);
            if (config.querySchema) {
                const queryResult = parseQuery(
                    searchParams,
                    config.querySchema,
                    config.surface
                );
                if (!queryResult.ok) {
                    return errorResponse(queryResult.error);
                }
                query = queryResult.value;
            }

            // 7. Execute handler
            const ctx: RouteContext<TBody, TQuery> = {
                session,
                body,
                query,
                request,
                searchParams,
                params,
            };

            const handlerResponse = await handler(ctx);

            // 8. Add cache headers if configured
            if (config.cachePolicy) {
                return addCacheHeaders(handlerResponse, config.cachePolicy);
            }

            return handlerResponse;
        } catch (err) {
            // Handle known errors
            if (err instanceof AppError) {
                return errorResponse(err);
            }

            // Log unexpected errors
            console.error(`[${config.surface}] Unhandled error:`, err);

            // Return generic error
            return serverError();
        }
    };
}

// ============================================================================
// Multi-Method Handler
// ============================================================================

type MethodHandlers = {
    GET?: NextRouteHandler;
    POST?: NextRouteHandler;
    PUT?: NextRouteHandler;
    PATCH?: NextRouteHandler;
    DELETE?: NextRouteHandler;
    OPTIONS?: NextRouteHandler;
};

/**
 * Create handlers for multiple HTTP methods
 *
 * @example
 * ```typescript
 * const handlers = createMethodHandlers({
 *   GET: createRouteHandler({ ... }, async (ctx) => { ... }),
 *   POST: createRouteHandler({ ... }, async (ctx) => { ... }),
 * });
 *
 * export const { GET, POST } = handlers;
 * ```
 */
export function createMethodHandlers(handlers: MethodHandlers): MethodHandlers {
    // Add default OPTIONS handler for CORS if not provided
    if (!handlers.OPTIONS) {
        handlers.OPTIONS = async () => corsOptions();
    }
    return handlers;
}

// ============================================================================
// Helper Functions (Stubs - Implement with actual auth/rate-limit logic)
// ============================================================================

/**
 * Get current session from SessionManager
 */
async function getSession(): Promise<RouteSession | null> {
    const appSession: AppSession | null = await sessionManager.getSession();
    if (!appSession) {
        return null;
    }

    // Map AppSession to RouteSession
    // AppSession.user.type is "guest" | "regular"
    // RouteSession.user.type is "user" | "guest"
    return {
        user: {
            id: appSession.user.id,
            ...(appSession.user.email && { email: appSession.user.email }),
            type: appSession.user.type === "regular" ? "user" : "guest",
        },
    };
}

/**
 * Check rate limit using Upstash Redis
 */
async function checkRateLimit(
    tier: string,
    userId: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
    const result = await checkEdgeRateLimit(userId, tier);

    if (result.allowed) {
        return { ok: true };
    }

    return { ok: false, retryAfter: result.retryAfter ?? 60 };
}

/**
 * Add cache headers to response
 */
function addCacheHeaders(
    res: Response,
    policy: NonNullable<RouteConfig["cachePolicy"]>
): Response {
    const cacheValues: Record<string, string> = {
        "private-short": "private, max-age=60",
        "private-medium": "private, max-age=300",
        "private-revalidate":
            "private, max-age=0, s-maxage=10, stale-while-revalidate=30",
        "no-store": "no-store",
        "public-short": "public, max-age=60",
        "public-long": "public, max-age=3600",
    };

    const headers = new Headers(res.headers);
    const cacheValue = cacheValues[policy];
    if (cacheValue) {
        headers.set("Cache-Control", cacheValue);
    }

    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
    });
}

// ============================================================================
// Streaming Handler Factory
// ============================================================================

type StreamConfig = Omit<
    RouteConfig,
    "bodySchema" | "querySchema" | "cachePolicy"
> & {
    maxDuration?: number;
};

type StreamHandler = (context: {
    session: RouteSession | null;
    request: Request;
    params: Record<string, string>;
}) => Promise<Response>;

/**
 * Create a streaming route handler (for SSE/AI responses)
 *
 * @example
 * ```typescript
 * export const POST = createStreamingHandler(
 *   {
 *     surface: "chat",
 *     method: "POST",
 *     auth: "required",
 *     rateLimit: "chat",
 *     maxDuration: 60,
 *   },
 *   async ({ session, request }) => {
 *     const body = await request.json();
 *     const stream = createChatStream(body.messages, session);
 *     return response.stream(stream);
 *   }
 * );
 *
 * export const maxDuration = 60;
 * ```
 */
export function createStreamingHandler(
    config: StreamConfig,
    handler: StreamHandler
): NextRouteHandler {
    return async (
        request: Request,
        routeContext?: { params?: Promise<Record<string, string>> }
    ): Promise<Response> => {
        try {
            const params = (await routeContext?.params) ?? {};

            // Auth check
            let session: RouteSession | null = null;
            if (config.auth !== "none") {
                const authResult = await getSession();
                if (config.auth === "required" && !authResult) {
                    return unauthorized();
                }
                session = authResult;
            }

            // Rate limiting
            if (config.rateLimit && session) {
                const rateLimitResult = await checkRateLimit(
                    config.rateLimit,
                    session.user.id
                );
                if (!rateLimitResult.ok) {
                    return rateLimited(rateLimitResult.retryAfter);
                }
            }

            // Guest check
            if (!config.guestAllowed && session?.user.type === "guest") {
                return forbidden(
                    "This action is not available for guest users"
                );
            }

            // Execute streaming handler
            return await handler({ session, request, params });
        } catch (err) {
            if (err instanceof AppError) {
                return errorResponse(err);
            }

            console.error(`[${config.surface}] Streaming error:`, err);
            return serverError();
        }
    };
}
