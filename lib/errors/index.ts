/**
 * Error Module Barrel Export
 *
 * Exports all error classes, types, and utilities from the errors module.
 *
 * @module lib/errors
 */

// Core error classes and utilities
export {
	AppError,
	createEntityNotFoundError,
	type ErrorCode,
	ErrorCodes,
	ForbiddenError,
	fromUnknownError,
	getErrorMessage,
	hasErrorCode,
	InternalServerError,
	isAppError,
	NotFoundError,
	RateLimitError,
	ServiceUnavailableError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors"
// ChatSDK compatibility layer (for backward compatibility)
export {
	ChatSDKError,
	createCompatErrorResponse,
	getLegacyErrorMessage,
	getLegacyStatusCode,
	isChatSDKError,
	type LegacyErrorCode,
	LegacyErrorMessages,
	type LegacyErrorType,
	type LegacySurface,
	LegacyToNewCodeMap,
	legacyCodeToAppError,
	mapLegacyToNewCode,
	mapNewToLegacyCode,
	NewToLegacyCodeMap,
	parseLegacyErrorCode,
} from "@/lib/errors/chat-sdk-compat"
// Database error utilities
export {
	DatabaseError,
	isConnectionError,
	isDatabaseError,
	isDeadlockError,
	isForeignKeyViolation,
	isPostgresError,
	isTimeoutError,
	isUniqueViolation,
	mapPostgresCodeToError,
	type PostgresError,
	type PostgresErrorCode,
	PostgresErrorCodes,
	toDatabaseError,
} from "@/lib/errors/database"
// Error messages with i18n support
export {
	DEFAULT_LOCALE,
	type ErrorMessageSet,
	type ErrorUserType,
	errorMessages,
	getErrorAction,
	getErrorActionWithContext,
	getErrorInfo,
	getErrorInfoWithContext,
	getErrorMessage as getErrorMessageFromCode,
	getErrorMessageWithContext,
	getErrorTitle,
	getErrorTitleWithContext,
	getMessageByErrorCode,
	getSupportedLocales,
	hasLocaleMessages,
	type LocaleMessages,
	type SupportedLocale,
} from "@/lib/errors/messages"
