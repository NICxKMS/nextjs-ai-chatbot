/**
 * API Utilities
 *
 * Public API for fetch client, request deduplication, and response handling.
 *
 * @module lib/api
 */

// Fetch client
export {
    type ApiErrorResponse,
    type ApiSuccessResponse,
    apiClient,
    createArrayGuard,
    createNullableGuard,
    createObjectGuard,
    FetchClient,
    type FetchClientConfig,
    type FetchOptions,
    fetchWithTimeout,
    type RequestContext,
    type TypeGuard,
} from "./fetch-client";

// Request deduplication
export {
    cachedRequestDedup,
    createBatchLoader,
    createDedupFetcher,
    createSwrFetcher,
    type DedupConfig,
    RequestDeduplicator,
    requestDedup,
} from "./request-dedup";

// Response utilities
export {
    type ApiResponseHandler,
    createApiResponse,
    createErrorResponse,
    createPaginatedResponse,
    handleApiError,
    type PaginationMeta,
    withApiErrorHandling,
} from "./response";
