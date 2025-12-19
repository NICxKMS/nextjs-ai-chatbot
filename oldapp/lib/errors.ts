import { isProductionEnvironment } from "@/lib/constants";
import { logError } from "@/lib/log";

export type ErrorType =
    | "bad_request"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "rate_limit"
    | "offline";

export type Surface =
    | "chat"
    | "auth"
    | "api"
    | "stream"
    | "database"
    | "history"
    | "vote"
    | "document"
    | "suggestions"
    | "activate_gateway"
    | "ui";

// Allow a specific reason suffix for granular codes, while keeping type/surface parsing stable
export type ErrorCode = `${ErrorType}:${Surface}${"" | `:${string}`}`;

export type ErrorVisibility = "response" | "log" | "none";

// Task 9.15: User type for context-aware error messages
export type ErrorUserType = "guest" | "regular" | "unknown";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
    database: "response",
    chat: "response",
    auth: "response",
    stream: "response",
    api: "response",
    history: "response",
    vote: "response",
    document: "response",
    suggestions: "response",
    activate_gateway: "response",
    ui: "response",
};

export class ChatSDKError extends Error {
    type: ErrorType;
    surface: Surface;
    statusCode: number;
    code: ErrorCode;
    userType?: ErrorUserType;

    constructor(
        errorCode: ErrorCode,
        cause?: string,
        userType?: ErrorUserType
    ) {
        super();

        const [type, surface] = errorCode.split(":");

        this.type = type as ErrorType;
        this.cause = cause;
        this.surface = surface as Surface;
        this.code = errorCode;
        this.userType = userType;
        // Task 9.15: Pass userType for context-aware error messages
        this.message = getMessageByErrorCode(errorCode, userType);
        this.statusCode = getStatusCodeByType(this.type);
    }

    toResponse() {
        // Preserve the full, granular code (including reason suffixes)
        const code: ErrorCode = this.code;
        const visibility = visibilityBySurface[this.surface];

        const { message, statusCode } = this;
        // Sanitize cause in production to avoid leaking sensitive information
        const safeCause = isProductionEnvironment ? undefined : this.cause;

        // Log critical errors (server errors and offline errors)
        if (this.type === "offline" || statusCode >= 500) {
            logError("critical_error", {
                code: this.code,
                message: this.message,
            });
        }

        if (visibility === "log") {
            // Avoid logging per workspace rules; return safe, generic message for log-only surfaces
            return Response.json(
                {
                    code: "",
                    message: "Something went wrong. Please try again later.",
                },
                { status: statusCode }
            );
        }

        return Response.json(
            { code, message, ...(safeCause ? { cause: safeCause } : {}) },
            { status: statusCode }
        );
    }
}

// Postgres error-code mapping to focused ChatSDKError codes
// Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
function mapPostgresCodeToError(code?: string): ErrorCode {
    switch (code) {
        // Constraint violations
        case "23505":
            return "bad_request:database:unique_violation";
        case "23503":
            return "bad_request:database:foreign_key_violation";
        case "23502":
            return "bad_request:database:not_null_violation";
        case "23514":
            return "bad_request:database:check_violation";
        // Concurrency
        case "40P01":
            return "bad_request:database:deadlock_detected";
        case "40001":
            return "bad_request:database:serialization_failure";
        // Permissions / syntax
        case "42501":
            return "bad_request:database:insufficient_privilege";
        case "42601":
            return "bad_request:database:syntax_error";
        case "42P01":
            return "bad_request:database:undefined_table";
        // Connection / availability
        case "08006":
        case "08001":
            return "offline:database:connection_failure";
        case "57014":
        case "57000":
            return "offline:database:timeout";
        default:
            return "bad_request:database";
    }
}

/**
 * PostgreSQL error shape for type-safe error handling
 */
type PostgresError = {
    code?: string;
    message?: string;
    detail?: string;
    constraint?: string;
};

/**
 * Type guard to check if an error is a PostgreSQL error
 */
function isPostgresError(err: unknown): err is PostgresError {
    return (
        typeof err === "object" &&
        err !== null &&
        (typeof (err as PostgresError).code === "string" ||
            typeof (err as PostgresError).message === "string")
    );
}

export function toDatabaseError(
    operation: string,
    err?: unknown,
    cause?: string
): ChatSDKError {
    const pgErr = isPostgresError(err) ? err : undefined;
    const errorCode = mapPostgresCodeToError(pgErr?.code);
    const detailedCause =
        cause ??
        (operation
            ? `${operation}${pgErr?.message ? `: ${pgErr.message}` : ""}`
            : pgErr?.message);
    return new ChatSDKError(errorCode, detailedCause);
}

/**
 * Task 9.15: Get context-aware error message based on error code and user type
 * Guest users receive messages that explain guest-specific limitations
 */
export function getMessageByErrorCode(
    errorCode: ErrorCode,
    userType?: ErrorUserType
): string {
    // Task 9.15: Guest-specific error messages for common scenarios
    if (userType === "guest") {
        switch (errorCode) {
            case "not_found:chat":
                return "Chat not found. Guest chat history is temporary and may have expired. Sign in to save your chats permanently.";
            case "not_found:document":
                return "Document not found. Guest documents are temporary and may have expired. Sign in to save your work permanently.";
            case "rate_limit:chat":
            case "rate_limit:chat:daily_limit_exceeded":
                return "Daily message limit exceeded. Sign in to increase your message allowance.";
            case "offline:chat":
                return "Connection lost. Guest sessions are stored temporarily - sign in to ensure your chats are saved.";
            case "forbidden:vote:guest_cannot_vote":
                return "Guest users cannot vote on messages. Sign in to rate responses and help improve the AI.";
            case "bad_request:api:guest_requires_cache":
                return "Service temporarily unavailable for guest users. Please try again later or sign in.";
            default:
                // Fall through to standard error messages for non-guest-specific errors
                break;
        }
    }

    if (errorCode.includes("database")) {
        // Specific database error codes handled below; generic fallback here
        switch (errorCode) {
            case "bad_request:database:unique_violation":
                return "A record with the same value already exists.";
            case "bad_request:database:foreign_key_violation":
                return "This change would break a relationship to another record.";
            case "bad_request:database:not_null_violation":
                return "A required field is missing.";
            case "bad_request:database:check_violation":
                return "One or more fields failed validation.";
            case "bad_request:database:deadlock_detected":
                return "The database detected a deadlock. Please retry.";
            case "bad_request:database:serialization_failure":
                return "A concurrent update prevented this change. Please retry.";
            case "bad_request:database:insufficient_privilege":
                return "The database user is not permitted to perform this operation.";
            case "bad_request:database:syntax_error":
                return "A database syntax error occurred.";
            case "bad_request:database:undefined_table":
                return "A required database table is missing.";
            case "offline:database:connection_failure":
                return "Unable to connect to the database. Please try again later.";
            case "offline:database:timeout":
                return "The database took too long to respond. Please try again.";
            default:
                return "An error occurred while executing a database query.";
        }
    }

    switch (errorCode) {
        // API request/validation
        case "bad_request:api:invalid_json":
            return "Invalid JSON in request body.";
        case "bad_request:api:guest_requires_cache":
            return "Guest sessions require cache to be enabled.";
        case "bad_request:api:discover_models_failed":
            return "Unable to discover available models.";
        case "bad_request:api:upstream_fetch_failed":
            return "A required upstream service responded with an error.";
        case "bad_request:api:invalid_form_payload":
            return "Invalid form payload.";
        case "bad_request:api:no_file_uploaded":
            return "No file uploaded.";
        case "bad_request:api:file_too_large":
            return "File size exceeds the allowed limit.";
        case "bad_request:api:file_type_unsupported":
            return "Unsupported file type.";
        case "bad_request:api:file_validation_failed":
            return "File validation failed.";
        case "bad_request:api:storage_not_configured":
            return "File storage is not configured.";
        case "bad_request:api:empty_body":
            return "Request body is empty.";
        case "bad_request:api:upload_failed":
            return "File upload failed.";
        case "rate_limit:chat:daily_limit_exceeded":
            return "Daily message limit exceeded.";
        case "forbidden:chat:owner_mismatch":
            return "You don’t have access to this chat.";

        case "forbidden:vote:owner_mismatch":
            return "You don’t have access to vote on this chat.";
        case "forbidden:api:owner_mismatch":
            return "You don’t have access to this resource.";
        case "offline:chat:unhandled":
            return "The chat service is temporarily unavailable.";
        case "not_found:vote":
            return "The requested vote target was not found.";
        case "not_found:auth:user":
            return "Your account could not be found. Please Register before proceeding or proceed as a guest.";

        // Auth
        case "unauthorized:chat:missing_session":
            return "You need to sign in before continuing.";
        case "unauthorized:document:missing_session":
            return "You need to sign in before continuing.";
        case "unauthorized:suggestions:missing_session":
            return "You need to sign in before continuing.";
        case "unauthorized:vote:missing_session":
            return "You need to sign in before continuing.";
        case "unauthorized:api:upload_unauthorized":
            return "You need to sign in to upload files.";

        // Configuration / credentials
        case "bad_request:database:missing_postgres_url":
            return "Database connection is not configured.";
        case "bad_request:api:missing_openai_api_key":
            return "OPENAI_API_KEY is not configured.";
        case "bad_request:api:missing_google_api_key":
            return "GOOGLE_GENERATIVE_AI_API_KEY is not configured.";
        case "bad_request:api:missing_openrouter_api_key":
            return "OPENROUTER_API_KEY is not configured.";
        case "bad_request:api:missing_cloudflare_credentials":
            return "Cloudflare account credentials are not configured.";
        case "bad_request:api:cloudflare_gateway_missing_google_provider":
            return "Cloudflare AI Gateway requires Google provider to be configured for Gemini models.";
        case "bad_request:api:unknown_mock_model":
            return "Unknown mock model specified in test environment.";
        case "bad_request:api:invalid_model_id":
            return "The specified model ID is not valid or not available.";

        // Parameters
        case "bad_request:api:missing_id":
            return "Parameter id is required.";
        case "bad_request:api:missing_timestamp":
            return "Parameter timestamp is required.";
        case "bad_request:api:missing_document_id":
            return "Parameter documentId is required.";
        case "bad_request:api:missing_chat_id":
            return "Parameter chatId is required.";
        case "bad_request:api:missing_vote_params":
            return "Parameters chatId, messageId, and type are required.";
        case "bad_request:api:conflicting_pagination_params":
            return "Only one of starting_after or ending_before can be provided.";
        case "bad_request:api:invalid_uuid_format":
            return "The provided ID must be a valid UUID format.";
        case "bad_request:api:invalid_vote_type":
            return "Vote type must be 'up' or 'down'.";

        // Voting
        case "forbidden:vote:guest_cannot_vote":
            return "Guest users cannot vote on messages.";

        // UI hook usage
        case "bad_request:ui:useSidebar_outside_provider":
            return "useSidebar must be used within a SidebarProvider.";
        case "bad_request:ui:useSettings_outside_provider":
            return "useSettings must be used within a SettingsProvider.";
        case "bad_request:ui:useCarousel_outside_provider":
            return "useCarousel must be used within a <Carousel />.";
        case "bad_request:ui:dataStream_outside_provider":
            return "useDataStream must be used within a DataStreamProvider.";
        case "bad_request:ui:useOptimisticChats_outside_provider":
            return "useOptimisticChats must be used within OptimisticChatsProvider.";
        case "bad_request:ui:webPreview_outside_provider":
            return "WebPreview components must be used within a WebPreview.";
        case "bad_request:ui:reasoning_outside_provider":
            return "Reasoning components must be used within Reasoning.";
        case "bad_request:ui:branch_outside_provider":
            return "Branch components must be used within Branch.";
        case "bad_request:ui:artifact_definition_not_found":
            return "Artifact definition not found for the requested kind.";
        case "bad_request:ui:clipboard_unavailable":
            return "Clipboard API is not available in this environment.";
        case "bad_request:ui:clipboard_copy_failed":
            return "Failed to copy to clipboard.";

        // Existing base codes
        case "bad_request:api":
            return "The request couldn't be processed. Please check your input and try again.";

        case "bad_request:activate_gateway":
            return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";

        case "unauthorized:auth":
            return "You need to sign in before continuing.";
        case "forbidden:auth":
            return "Your account does not have access to this feature.";
        case "bad_request:auth:guest_unavailable":
            return "Guest authentication is not configured.";
        case "offline:auth:guest_failed":
            return "Failed to create a guest session. Please try again later.";

        case "rate_limit:chat":
            return "You have exceeded your maximum number of messages for the day. Please try again later.";
        case "not_found:chat":
            return "The requested chat was not found. Please check the chat ID and try again.";
        case "forbidden:chat":
            return "This chat belongs to another user. Please check the chat ID and try again.";
        case "unauthorized:chat":
            return "You need to sign in to view this chat. Please sign in and try again.";
        case "offline:chat":
            return "We're having trouble sending your message. Please check your internet connection and try again.";

        case "not_found:document":
            return "The requested document was not found. Please check the document ID and try again.";
        case "forbidden:document":
            return "This document belongs to another user. Please check the document ID and try again.";
        case "unauthorized:document":
            return "You need to sign in to view this document. Please sign in and try again.";
        case "bad_request:document":
            return "The request to create or update the document was invalid. Please check your input and try again.";
        case "bad_request:document:no_handler_for_kind":
            return "No document handler exists for the specified kind.";
        case "bad_request:document:no_chat_context":
            return "Cannot save document without existing chat context.";
        case "bad_request:document:kind_mismatch":
            return "Document kind cannot be changed after creation.";
        case "bad_request:document:invalid_timestamp":
            return "The provided timestamp is invalid or malformed.";
        case "bad_request:api:invalid_timestamp":
            return "The provided timestamp is invalid or malformed.";
        case "bad_request:chat:invalid_visibility":
            return "Invalid visibility value. Must be 'public' or 'private'.";
        case "bad_request:api:invalid_message":
            return "The message format is invalid or required fields are missing.";

        default:
            return "Something went wrong. Please try again later.";
    }
}

function getStatusCodeByType(type: ErrorType) {
    switch (type) {
        case "bad_request":
            return 400;
        case "unauthorized":
            return 401;
        case "forbidden":
            return 403;
        case "not_found":
            return 404;
        case "rate_limit":
            return 429;
        case "offline":
            return 503;
        default:
            return 500;
    }
}
