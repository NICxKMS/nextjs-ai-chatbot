/**
 * API Utilities
 * @module new-arch/lib/api
 *
 * Public exports for API route handling, validation, and response utilities.
 */

// Response helpers
export {
    badRequest,
    corsOptions,
    created,
    error,
    forbidden,
    fromError,
    json,
    noContent,
    notFound,
    paginated,
    rateLimited,
    serverError,
    stream,
    streamJson,
    unauthorized,
    withCors,
} from "./response";
// Route handler factory
export {
    createMethodHandlers,
    createRouteHandler,
    createStreamingHandler,
} from "./route-handler";
// Types
export type {
    ApiErrorResponse,
    ApiResponse,
    AsyncGuardResult,
    AuthResult,
    CachePolicy,
    GuardResult,
    HttpMethod,
    NextRouteHandler,
    PaginatedResponse,
    PaginationParams,
    RateLimitTier,
    ResponseMeta,
    RouteConfig,
    RouteContext,
    RouteHandler,
    RouteSession,
    Surface,
    UserType,
    ValidationError,
    ValidationResult,
} from "./types";
// Validation utilities
export {
    assertValid,
    getSearchParams,
    parseFormData,
    parseJsonBody,
    parseQuery,
    parseTimestamp,
    requireQueryParam,
    validate,
    validateFile,
    validateUUID,
} from "./validation";
