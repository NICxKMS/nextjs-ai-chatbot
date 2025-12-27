/**
 * API Utilities
 *
 * Public API for fetch client, request deduplication, and response handling.
 *
 * @module lib/api
 *
 * NOTE (P4-017): This barrel exports only commonly-used utilities.
 * For advanced utilities (ResponseCache, RequestDeduplicator, etc.),
 * import directly from the submodule:
 * - `@/lib/api/fetch-client` - Low-level fetch utilities
 * - `@/lib/api/request-dedup` - Request deduplication
 * - `@/lib/api/response` - Response builders
 * - `@/lib/api/response-cache` - Response caching
 */

// =============================================================================
// FETCH CLIENT (Primary Export)
// =============================================================================

export {
    type ApiErrorResponse,
    type ApiSuccessResponse,
    apiClient,
    type FetchClientConfig,
    type FetchOptions,
    type RequestContext,
} from "./fetch-client";

// =============================================================================
// RESPONSE UTILITIES
// =============================================================================

export {
    createApiResponse,
    createErrorResponse,
    handleApiError,
    type PaginationMeta,
    withApiErrorHandling,
} from "./response";
