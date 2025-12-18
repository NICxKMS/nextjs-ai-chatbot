/**
 * API Route Types
 * @module new-arch/lib/api/types
 *
 * Type definitions for route handlers, validation, and API responses.
 */

import type { z } from "zod";
import type { AppError } from "../errors";

// ============================================================================
// Surface Types
// ============================================================================

/** API surface identifier for error context */
export type Surface =
    | "api"
    | "chat"
    | "document"
    | "auth"
    | "history"
    | "vote"
    | "upload"
    | "suggestions"
    | "health";

// ============================================================================
// Authentication Types
// ============================================================================

/** Session user type */
export type UserType = "user" | "guest";

/** Minimal session interface for routes */
export type RouteSession = {
    readonly user: {
        readonly id: string;
        readonly email?: string;
        readonly name?: string;
        readonly type: UserType;
    };
};

/** Authentication result from guards */
export type AuthResult = {
    readonly session: RouteSession;
};

// ============================================================================
// Guard Result Types (Unified Pattern)
// ============================================================================

/** Discriminated union for guard results */
export type GuardResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: AppError };

/** Helper type for async guard functions */
export type AsyncGuardResult<T> = Promise<GuardResult<T>>;

// ============================================================================
// Route Configuration Types
// ============================================================================

/** HTTP methods supported by route handlers */
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

/** Rate limiting tiers */
export type RateLimitTier = "standard" | "strict" | "chat" | "upload";

/** Cache control policies */
export type CachePolicy =
    | "private-short" // private, max-age=60
    | "private-medium" // private, max-age=300
    | "private-revalidate" // private, max-age=0, s-maxage=10, stale-while-revalidate=30
    | "no-store" // no-store
    | "public-short" // public, max-age=60
    | "public-long"; // public, max-age=3600

/** Route handler configuration */
export type RouteConfig<TBody = unknown, TQuery = unknown> = {
    /** API surface for error context */
    readonly surface: Surface;
    /** HTTP method (for documentation/validation) */
    readonly method: HttpMethod;
    /** Authentication requirement */
    readonly auth: "required" | "optional" | "none";
    /** Rate limiting tier (requires auth) */
    readonly rateLimit?: RateLimitTier;
    /** Whether guests can access this route */
    readonly guestAllowed?: boolean;
    /** Zod schema for request body validation */
    readonly bodySchema?: z.ZodType<TBody>;
    /** Zod schema for query parameter validation */
    readonly querySchema?: z.ZodType<TQuery>;
    /** Cache control policy */
    readonly cachePolicy?: CachePolicy;
    /** Max execution duration (Vercel) */
    readonly maxDuration?: number;
};

// ============================================================================
// Route Context Types
// ============================================================================

/** Context passed to route handler function */
export type RouteContext<TBody = unknown, TQuery = unknown> = {
    /** Authenticated session (null if auth is "none" or "optional" without session) */
    readonly session: RouteSession | null;
    /** Validated request body */
    readonly body: TBody;
    /** Validated query parameters */
    readonly query: TQuery;
    /** Original request object */
    readonly request: Request;
    /** URL search params (convenience) */
    readonly searchParams: URLSearchParams;
    /** Route params from dynamic segments */
    readonly params: Record<string, string>;
};

/** Route handler function type */
export type RouteHandler<TBody = unknown, TQuery = unknown> = (
    context: RouteContext<TBody, TQuery>
) => Promise<Response>;

/** Next.js route handler export type */
export type NextRouteHandler = (
    request: Request,
    context?: { params?: Promise<Record<string, string>> }
) => Promise<Response>;

// ============================================================================
// Response Types
// ============================================================================

/** Standard API response envelope */
export type ApiResponse<T = unknown> = {
    readonly success: true;
    readonly data: T;
    readonly meta?: ResponseMeta;
};

/** Error response envelope */
export type ApiErrorResponse = {
    readonly success: false;
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
    };
};

/** Response metadata for pagination, etc. */
export type ResponseMeta = {
    readonly cursor?: string;
    readonly hasMore?: boolean;
    readonly total?: number;
};

// ============================================================================
// Pagination Types
// ============================================================================

/** Cursor-based pagination params */
export type PaginationParams = {
    readonly limit?: number;
    readonly startingAfter?: string;
    readonly endingBefore?: string;
};

/** Paginated response wrapper */
export type PaginatedResponse<T> = ApiResponse<T[]> & {
    readonly meta: {
        readonly cursor?: string;
        readonly hasMore: boolean;
    };
};

// ============================================================================
// Validation Types
// ============================================================================

/** Validation result for request parsing */
export type ValidationResult<T> =
    | { readonly valid: true; readonly data: T }
    | { readonly valid: false; readonly errors: ValidationError[] };

/** Single validation error */
export type ValidationError = {
    readonly path: string;
    readonly message: string;
    readonly code?: string;
};
