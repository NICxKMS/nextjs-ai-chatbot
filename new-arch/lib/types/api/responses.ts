/**
 * API Response Types
 * @module lib/types/api/responses
 *
 * Type definitions for API responses.
 */

import type { ApiError } from "./errors";

// =============================================================================
// BASE RESPONSE TYPES
// =============================================================================

/**
 * Successful API response
 */
export type SuccessResponse<T> = {
    success: true;
    data: T;
};

/**
 * Failed API response
 */
export type ErrorResponse = {
    success: false;
    error: ApiError;
};

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
    /** Response data items */
    data: T[];
    /** Whether more items exist */
    hasMore: boolean;
    /** Cursor for next page */
    cursor?: string;
    /** Total count (if available) */
    total?: number;
};

/**
 * Paginated API response
 */
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>;

// =============================================================================
// SPECIFIC RESPONSES
// =============================================================================

/**
 * Empty success response (for delete operations)
 */
export type EmptyResponse = {
    success: true;
};

/**
 * Created resource response
 */
export type CreatedResponse<T> = {
    success: true;
    data: T;
    /** Created resource ID */
    id: string;
};

/**
 * Batch operation response
 */
export type BatchResponse<T> = {
    /** Successfully processed items */
    succeeded: T[];
    /** Failed items with errors */
    failed: Array<{
        item: unknown;
        error: ApiError;
    }>;
    /** Total processed count */
    total: number;
};

// =============================================================================
// STREAMING RESPONSES
// =============================================================================

/**
 * Server-sent event types
 */
export type StreamEventType =
    | "message"
    | "delta"
    | "tool-call"
    | "tool-result"
    | "error"
    | "done";

/**
 * Stream event structure
 */
export type StreamEvent<T = unknown> = {
    /** Event type */
    type: StreamEventType;
    /** Event payload */
    data: T;
    /** Event timestamp */
    timestamp: number;
};

/**
 * Text delta event
 */
export type TextDeltaEvent = StreamEvent<{
    text: string;
}>;

/**
 * Tool call event
 */
export type ToolCallEvent = StreamEvent<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
}>;

/**
 * Stream completion event
 */
export type StreamDoneEvent = StreamEvent<{
    messageId: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}>;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(
    response: ApiResponse<T>
): response is SuccessResponse<T> {
    return response.success === true;
}

/**
 * Check if response is an error
 */
export function isErrorResponse<T>(
    response: ApiResponse<T>
): response is ErrorResponse {
    return response.success === false;
}
