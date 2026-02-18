/**
 * ChatSDKError Compatibility Adapter
 *
 * Provides backward compatibility for legacy ChatSDKError codes by mapping them
 * to the new AppError hierarchy. This adapter ensures that:
 * 1. Legacy error codes from old clients are properly handled
 * 2. Error responses include actionable information
 * 3. Migration from old to new error codes is documented
 *
 * @module lib/errors/chat-sdk-compat
 */

import {
	AppError,
	ForbiddenError,
	InternalServerError,
	NotFoundError,
	RateLimitError,
	ServiceUnavailableError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors"

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

/**
 * Legacy error types from ChatSDKError.
 * @deprecated Use AppError subclasses instead
 */
export type LegacyErrorType =
	| "bad_request"
	| "unauthorized"
	| "forbidden"
	| "not_found"
	| "rate_limit"
	| "offline"

/**
 * Legacy error surfaces from ChatSDKError.
 * @deprecated Use specific error codes instead
 */
export type LegacySurface =
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
	| "ui"

/**
 * Legacy error code format: `${ErrorType}:${Surface}${"" | `:${string}`}`
 * @deprecated Use ErrorCodes constants instead
 */
export type LegacyErrorCode =
	`${LegacyErrorType}:${LegacySurface}${"" | `:${string}`}`

// =============================================================================
// Error Code Mapping
// =============================================================================

/**
 * Mapping from legacy ChatSDKError codes to new AppError codes.
 *
 * This mapping documents the migration path from old error codes to new ones.
 * The new system uses a DOMAIN_REASON naming convention for clarity.
 */
export const LegacyToNewCodeMap: Record<string, string> = {
	// Bad Request errors (400)
	"bad_request:api": "VALIDATION_ERROR",
	"bad_request:api:invalid_json": "VALIDATION_ERROR",
	"bad_request:api:invalid_model_id": "VALIDATION_ERROR",
	"bad_request:api:missing_chat_id": "MISSING_PARAMETER",
	"bad_request:api:missing_id": "MISSING_PARAMETER",
	"bad_request:api:missing_document_id": "MISSING_PARAMETER",
	"bad_request:api:missing_timestamp": "MISSING_PARAMETER",
	"bad_request:api:missing_vote_params": "MISSING_PARAMETER",
	"bad_request:api:conflicting_pagination_params": "VALIDATION_ERROR",
	"bad_request:api:invalid_uuid_format": "INVALID_FORMAT",
	"bad_request:api:invalid_timestamp": "INVALID_FORMAT",
	"bad_request:api:invalid_cursor": "INVALID_FORMAT",
	"bad_request:api:invalid_limit": "INVALID_FORMAT",
	"bad_request:api:invalid_vote_type": "INVALID_FORMAT",
	"bad_request:api:invalid_message": "VALIDATION_ERROR",
	"bad_request:api:no_file_uploaded": "MISSING_PARAMETER",
	"bad_request:api:file_too_large": "VALIDATION_ERROR",
	"bad_request:api:file_type_unsupported": "VALIDATION_ERROR",
	"bad_request:api:file_validation_failed": "VALIDATION_ERROR",
	"bad_request:api:storage_not_configured": "CONFIGURATION_ERROR",
	"bad_request:api:empty_body": "MISSING_PARAMETER",
	"bad_request:api:upload_failed": "INTERNAL_ERROR",
	"bad_request:api:guest_requires_cache": "SERVICE_UNAVAILABLE",
	"bad_request:api:discover_models_failed": "INTERNAL_ERROR",
	"bad_request:api:upstream_fetch_failed": "SERVICE_UNAVAILABLE",
	"bad_request:api:missing_openai_api_key": "CONFIGURATION_ERROR",
	"bad_request:api:missing_google_api_key": "CONFIGURATION_ERROR",
	"bad_request:api:missing_openrouter_api_key": "CONFIGURATION_ERROR",
	"bad_request:api:missing_cloudflare_credentials": "CONFIGURATION_ERROR",
	"bad_request:api:cloudflare_gateway_unsupported_model": "VALIDATION_ERROR",
	"bad_request:api:cloudflare_gateway_missing_google_provider":
		"CONFIGURATION_ERROR",
	"bad_request:api:unknown_mock_model": "VALIDATION_ERROR",

	// Auth errors
	"bad_request:auth:guest_unavailable": "CONFIGURATION_ERROR",
	"bad_request:activate_gateway": "CONFIGURATION_ERROR",

	// Chat errors
	"bad_request:chat:invalid_visibility": "VALIDATION_ERROR",

	// Database errors
	"bad_request:database": "DATABASE_ERROR",
	"bad_request:database:missing_postgres_url": "CONFIGURATION_ERROR",
	"bad_request:database:unique_violation": "DATABASE_ERROR",
	"bad_request:database:foreign_key_violation": "DATABASE_ERROR",
	"bad_request:database:not_null_violation": "DATABASE_ERROR",
	"bad_request:database:check_violation": "DATABASE_ERROR",
	"bad_request:database:deadlock_detected": "DATABASE_ERROR",
	"bad_request:database:serialization_failure": "DATABASE_ERROR",
	"bad_request:database:insufficient_privilege": "DATABASE_ERROR",
	"bad_request:database:syntax_error": "DATABASE_ERROR",
	"bad_request:database:undefined_table": "DATABASE_ERROR",

	// Document errors
	"bad_request:document": "VALIDATION_ERROR",
	"bad_request:document:no_handler_for_kind": "VALIDATION_ERROR",
	"bad_request:document:no_chat_context": "VALIDATION_ERROR",
	"bad_request:document:kind_mismatch": "VALIDATION_ERROR",
	"bad_request:document:invalid_timestamp": "INVALID_FORMAT",

	// UI errors
	"bad_request:ui:useSidebar_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:useSettings_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:useCarousel_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:dataStream_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:useOptimisticChats_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:webPreview_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:reasoning_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:branch_outside_provider": "VALIDATION_ERROR",
	"bad_request:ui:artifact_definition_not_found": "VALIDATION_ERROR",
	"bad_request:ui:clipboard_unavailable": "VALIDATION_ERROR",
	"bad_request:ui:clipboard_copy_failed": "VALIDATION_ERROR",

	// Unauthorized errors (401)
	"unauthorized:auth": "UNAUTHORIZED",
	"unauthorized:chat": "UNAUTHORIZED",
	"unauthorized:chat:missing_session": "SESSION_EXPIRED",
	"unauthorized:document": "UNAUTHORIZED",
	"unauthorized:document:missing_session": "SESSION_EXPIRED",
	"unauthorized:suggestions": "UNAUTHORIZED",
	"unauthorized:suggestions:missing_session": "SESSION_EXPIRED",
	"unauthorized:vote": "UNAUTHORIZED",
	"unauthorized:vote:missing_session": "SESSION_EXPIRED",
	"unauthorized:api:upload_unauthorized": "UNAUTHORIZED",
	"unauthorized:api:session_error": "SESSION_EXPIRED",

	// Forbidden errors (403)
	"forbidden:auth": "FORBIDDEN",
	"forbidden:auth:csrf": "FORBIDDEN",
	"forbidden:chat": "FORBIDDEN",
	"forbidden:chat:owner_mismatch": "OWNER_MISMATCH",
	"forbidden:document": "FORBIDDEN",
	"forbidden:vote": "FORBIDDEN",
	"forbidden:vote:owner_mismatch": "OWNER_MISMATCH",
	"forbidden:vote:guest_cannot_vote": "FORBIDDEN",
	"forbidden:api:owner_mismatch": "OWNER_MISMATCH",

	// Not Found errors (404)
	"not_found:chat": "CHAT_NOT_FOUND",
	"not_found:document": "ARTIFACT_NOT_FOUND",
	"not_found:vote": "NOT_FOUND",
	"not_found:auth:user": "USER_NOT_FOUND",
	"not_found:database": "NOT_FOUND",

	// Rate Limit errors (429)
	"rate_limit:chat": "RATE_LIMIT_EXCEEDED",
	"rate_limit:chat:too_many_requests": "RATE_LIMIT_EXCEEDED",
	"rate_limit:chat:daily_limit_exceeded": "DAILY_LIMIT_EXCEEDED",

	// Offline/Service Unavailable errors (503)
	"offline:api": "SERVICE_UNAVAILABLE",
	"offline:chat": "SERVICE_UNAVAILABLE",
	"offline:chat:unhandled": "SERVICE_UNAVAILABLE",
	"offline:auth:guest_failed": "SERVICE_UNAVAILABLE",
	"offline:database:connection_failure": "SERVICE_UNAVAILABLE",
	"offline:database:timeout": "SERVICE_UNAVAILABLE",
}

/**
 * Reverse mapping from new AppError codes to legacy ChatSDKError codes.
 * Used for generating backward-compatible error responses.
 */
export const NewToLegacyCodeMap: Record<string, LegacyErrorCode> = {
	VALIDATION_ERROR: "bad_request:api",
	INVALID_INPUT: "bad_request:api",
	MISSING_PARAMETER: "bad_request:api",
	INVALID_FORMAT: "bad_request:api",
	UNAUTHORIZED: "unauthorized:auth",
	SESSION_EXPIRED: "unauthorized:auth",
	INVALID_CREDENTIALS: "unauthorized:auth",
	FORBIDDEN: "forbidden:auth",
	INSUFFICIENT_PERMISSIONS: "forbidden:auth",
	OWNER_MISMATCH: "forbidden:chat:owner_mismatch",
	NOT_FOUND: "not_found:database",
	CHAT_NOT_FOUND: "not_found:chat",
	USER_NOT_FOUND: "not_found:auth:user",
	MESSAGE_NOT_FOUND: "not_found:database",
	ARTIFACT_NOT_FOUND: "not_found:document",
	RATE_LIMIT_EXCEEDED: "rate_limit:chat",
	DAILY_LIMIT_EXCEEDED: "rate_limit:chat:daily_limit_exceeded",
	INTERNAL_ERROR: "bad_request:api",
	DATABASE_ERROR: "bad_request:database",
	CONFIGURATION_ERROR: "bad_request:api",
	SERVICE_UNAVAILABLE: "offline:api",
	OFFLINE: "offline:api",
}

// =============================================================================
// Legacy Error Messages
// =============================================================================

/**
 * User-friendly error messages for legacy error codes.
 * These messages provide actionable information to users.
 */
export const LegacyErrorMessages: Record<string, string> = {
	// Bad Request errors
	"bad_request:api:invalid_json":
		"Invalid request format. Please check your input and try again.",
	"bad_request:api:invalid_model_id":
		"The selected AI model is not available. Please choose another model.",
	"bad_request:api:missing_chat_id":
		"Chat ID is required. Please refresh and try again.",
	"bad_request:api:conflicting_pagination_params":
		"Invalid pagination parameters. Please use only one pagination method.",
	"bad_request:api:file_too_large":
		"File size exceeds the allowed limit. Please choose a smaller file.",
	"bad_request:api:file_type_unsupported":
		"This file type is not supported. Please choose a different file.",
	"bad_request:api:storage_not_configured":
		"File upload is not available. Please contact support.",
	"bad_request:api:guest_requires_cache":
		"This feature requires signing in. Please create an account to continue.",

	// Auth errors
	"unauthorized:chat:missing_session":
		"Your session has expired. Please sign in to continue.",
	"unauthorized:auth": "Please sign in to access this feature.",
	"forbidden:auth:csrf":
		"Security verification failed. Please refresh the page and try again.",
	"forbidden:chat:owner_mismatch":
		"You don't have access to this chat. It may belong to another account.",
	"forbidden:vote:guest_cannot_vote":
		"Sign in to rate messages and help improve responses.",

	// Not Found errors
	"not_found:chat": "This chat no longer exists or has been deleted.",
	"not_found:document": "This document no longer exists or has been deleted.",
	"not_found:auth:user":
		"Account not found. Please register or continue as guest.",

	// Rate Limit errors
	"rate_limit:chat":
		"You've reached the message limit. Please wait before sending more messages.",
	"rate_limit:chat:daily_limit_exceeded":
		"Daily message limit reached. Sign in for higher limits or try again tomorrow.",

	// Offline errors
	"offline:api": "Connection lost. Please check your internet and try again.",
	"offline:chat": "Unable to connect. Please check your internet connection.",
	"offline:chat:unhandled":
		"Service temporarily unavailable. Please try again shortly.",

	// Database errors
	"bad_request:database:unique_violation":
		"This record already exists. Please use a different value.",
	"bad_request:database:foreign_key_violation":
		"This operation references a record that doesn't exist.",
	"bad_request:database:deadlock_detected":
		"A conflict occurred. Please try your request again.",
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps a legacy error code to the new AppError code.
 *
 * @param legacyCode - The legacy error code (e.g., "bad_request:api:invalid_json")
 * @returns The new error code or undefined if not found
 */
export function mapLegacyToNewCode(legacyCode: string): string | undefined {
	return LegacyToNewCodeMap[legacyCode]
}

/**
 * Maps a new AppError code to a legacy error code.
 *
 * @param newCode - The new error code (e.g., "VALIDATION_ERROR")
 * @returns The legacy error code or undefined if not found
 */
export function mapNewToLegacyCode(
	newCode: string,
): LegacyErrorCode | undefined {
	return NewToLegacyCodeMap[newCode]
}

/**
 * Gets a user-friendly error message for a legacy error code.
 *
 * @param legacyCode - The legacy error code
 * @returns User-friendly message with actionable information
 */
export function getLegacyErrorMessage(legacyCode: string): string {
	return (
		LegacyErrorMessages[legacyCode] ??
		"An unexpected error occurred. Please try again."
	)
}

/**
 * Gets the HTTP status code for a legacy error type.
 *
 * @param errorType - The legacy error type
 * @returns HTTP status code
 */
export function getLegacyStatusCode(errorType: LegacyErrorType): number {
	switch (errorType) {
		case "bad_request":
			return 400
		case "unauthorized":
			return 401
		case "forbidden":
			return 403
		case "not_found":
			return 404
		case "rate_limit":
			return 429
		case "offline":
			return 503
		default:
			return 500
	}
}

/**
 * Parses a legacy error code into its components.
 *
 * @param code - The legacy error code
 * @returns Parsed components or null if invalid format
 */
export function parseLegacyErrorCode(
	code: string,
): { type: LegacyErrorType; surface: LegacySurface; reason?: string } | null {
	const parts = code.split(":")
	if (parts.length < 2) return null

	const type = parts[0]
	const surface = parts[1]
	const reasonParts = parts.slice(2)

	if (!type || !surface) return null

	if (!isLegacyErrorType(type) || !isLegacySurface(surface)) {
		return null
	}

	const reason = reasonParts.length > 0 ? reasonParts.join(":") : undefined

	if (reason !== undefined) {
		return { type, surface, reason }
	}
	return { type, surface }
}

/**
 * Type guard for LegacyErrorType.
 */
function isLegacyErrorType(value: string): value is LegacyErrorType {
	return [
		"bad_request",
		"unauthorized",
		"forbidden",
		"not_found",
		"rate_limit",
		"offline",
	].includes(value)
}

/**
 * Type guard for LegacySurface.
 */
function isLegacySurface(value: string): value is LegacySurface {
	return [
		"chat",
		"auth",
		"api",
		"stream",
		"database",
		"history",
		"vote",
		"document",
		"suggestions",
		"activate_gateway",
		"ui",
	].includes(value)
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Converts a legacy error code to an AppError instance.
 *
 * @param legacyCode - The legacy error code
 * @param cause - Optional cause/message
 * @param details - Optional additional details
 * @returns AppError instance
 */
export function legacyCodeToAppError(
	legacyCode: string,
	cause?: string,
	details?: Record<string, unknown>,
): AppError {
	const parsed = parseLegacyErrorCode(legacyCode)
	if (!parsed) {
		return new InternalServerError(
			cause ?? "An unexpected error occurred",
			details,
		)
	}

	const message = cause ?? getLegacyErrorMessage(legacyCode)
	const statusCode = getLegacyStatusCode(parsed.type)

	switch (parsed.type) {
		case "bad_request":
			return new ValidationError(message, details)
		case "unauthorized":
			return new UnauthorizedError(message, details)
		case "forbidden":
			return new ForbiddenError(message, details)
		case "not_found":
			return new NotFoundError(
				parsed.surface.charAt(0).toUpperCase() +
					parsed.surface.slice(1),
				undefined,
				details,
			)
		case "rate_limit":
			return new RateLimitError(message, details)
		case "offline":
			return new ServiceUnavailableError(message, details)
		default:
			return new AppError(
				mapLegacyToNewCode(legacyCode) ?? "INTERNAL_ERROR",
				message,
				statusCode,
				details,
			)
	}
}

/**
 * Creates a backward-compatible error response.
 * Includes both new and legacy error codes for transition period.
 *
 * @param error - The AppError instance
 * @returns Response object with error information
 */
export function createCompatErrorResponse(error: AppError): Response {
	const legacyCode = mapNewToLegacyCode(error.code)
	const message = error.message

	return Response.json(
		{
			code: error.code,
			legacyCode,
			message,
			...(error.details && { details: error.details }),
		},
		{ status: error.statusCode },
	)
}

// =============================================================================
// ChatSDKError Compatibility Class
// =============================================================================

/**
 * ChatSDKError compatibility class for backward compatibility.
 *
 * @deprecated Use AppError subclasses instead. This class exists only to
 * support legacy code that hasn't been migrated yet.
 *
 * @example
 * ```typescript
 * // OLD (deprecated)
 * throw new ChatSDKError("bad_request:api:invalid_json", "Invalid JSON");
 *
 * // NEW (recommended)
 * throw new ValidationError("Invalid JSON in request body");
 * ```
 */
export class ChatSDKError extends Error {
	/** Legacy error type */
	readonly type: LegacyErrorType
	/** Legacy error surface */
	readonly surface: LegacySurface
	/** HTTP status code */
	readonly statusCode: number
	/** Full legacy error code */
	readonly code: LegacyErrorCode
	/** Optional cause (stored separately from Error.cause) */
	readonly legacyCause: string | undefined
	/** Converted AppError instance */
	readonly appError: AppError

	constructor(code: LegacyErrorCode, cause?: string) {
		const parsed = parseLegacyErrorCode(code)
		if (!parsed) {
			throw new Error(`Invalid legacy error code: ${code}`)
		}

		const message = cause ?? getLegacyErrorMessage(code)
		super(message)

		this.name = "ChatSDKError"
		this.type = parsed.type
		this.surface = parsed.surface
		this.code = code
		this.legacyCause = cause
		this.statusCode = getLegacyStatusCode(parsed.type)

		// Create the equivalent AppError
		this.appError = legacyCodeToAppError(code, cause)

		// Maintain stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor)
		}
	}

	/**
	 * Converts to a Response object for API routes.
	 * @returns JSON Response with error information
	 */
	toResponse(): Response {
		return createCompatErrorResponse(this.appError)
	}

	/**
	 * Converts to an AppError instance.
	 * @returns Equivalent AppError
	 */
	toAppError(): AppError {
		return this.appError
	}
}

/**
 * Type guard to check if an error is a ChatSDKError.
 *
 * @param error - The error to check
 * @returns True if the error is a ChatSDKError
 */
export function isChatSDKError(error: unknown): error is ChatSDKError {
	return error instanceof ChatSDKError
}
