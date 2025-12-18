/**
 * API Types Barrel Export
 * @module lib/types/api
 *
 * Re-exports all API type definitions.
 */

// Error types
export type {
    ApiError,
    ApiErrorCode,
    AuthError,
    RateLimitError,
    ValidationError,
} from "./errors";
export {
    createApiError,
    createForbiddenError,
    createNotFoundError,
    createUnauthorizedError,
    createValidationError,
    ERROR_STATUS_MAP,
    getErrorStatusCode,
    isAuthError,
    isRateLimitError,
    isValidationError,
} from "./errors";
// Request types
export type {
    CreateChatRequest,
    CreateDocumentRequest,
    ListChatsRequest,
    ListMessagesRequest,
    PaginationParams,
    RegenerateMessageRequest,
    SendMessageRequest,
    UpdateChatRequest,
    UpdateDocumentRequest,
    VoteRequest,
} from "./requests";
// Response types
export type {
    ApiResponse,
    BatchResponse,
    CreatedResponse,
    EmptyResponse,
    ErrorResponse,
    PaginatedApiResponse,
    PaginatedResponse,
    StreamDoneEvent,
    StreamEvent,
    StreamEventType,
    SuccessResponse,
    TextDeltaEvent,
    ToolCallEvent,
} from "./responses";
export { isErrorResponse, isSuccessResponse } from "./responses";
