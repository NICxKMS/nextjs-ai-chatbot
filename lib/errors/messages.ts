/**
 * User-Friendly Error Messages with i18n Support
 *
 * Maps technical error codes to user-friendly messages with internationalization structure.
 * Messages are organized by locale and error code for easy translation.
 *
 * @module lib/errors/messages
 */

import { type AppError, type ErrorCode, ErrorCodes } from "@/lib/errors"

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a single error message set with title, description, and optional action.
 */
export interface ErrorMessageSet {
	/** Short, user-friendly error title */
	title: string
	/** Detailed user-friendly error description */
	message: string
	/** Optional suggested action for the user */
	action: string | null
}

/**
 * Maps error codes to message sets for a specific locale.
 */
export type LocaleMessages = Record<string, ErrorMessageSet>

/**
 * Supported locales for error messages.
 */
export type SupportedLocale = "en" | string

// =============================================================================
// Error Message Constants
// =============================================================================

/**
 * Default locale used when no locale is specified.
 */
export const DEFAULT_LOCALE: SupportedLocale = "en"

/**
 * User-friendly error messages organized by locale and error code.
 *
 * Structure enables easy addition of new locales by adding a new top-level key.
 * Messages are keyed by error code for consistent lookup.
 *
 * @example
 * ```typescript
 * // Access English message for VALIDATION_ERROR
 * const messageSet = errorMessages.en[ErrorCodes.VALIDATION_ERROR];
 * console.log(messageSet.message); // "Please check your input and try again"
 *
 * // Add a new locale
 * errorMessages.es = {
 *   [ErrorCodes.VALIDATION_ERROR]: {
 *     title: "Error de validación",
 *     message: "Por favor, verifique su entrada e inténtelo de nuevo",
 *     action: "Corrija los campos marcados",
 *   },
 *   // ... other error codes
 * };
 * ```
 */
export const errorMessages: Record<SupportedLocale, LocaleMessages> = {
	en: {
		// Validation errors (400)
		[ErrorCodes.VALIDATION_ERROR]: {
			title: "Validation Error",
			message: "Please check your input and try again.",
			action: "Review the highlighted fields and correct any errors.",
		},
		[ErrorCodes.INVALID_INPUT]: {
			title: "Invalid Input",
			message: "The provided input is not valid.",
			action: "Please check the format of your input and try again.",
		},
		[ErrorCodes.MISSING_PARAMETER]: {
			title: "Missing Information",
			message: "Required information is missing.",
			action: "Please fill in all required fields.",
		},
		[ErrorCodes.INVALID_FORMAT]: {
			title: "Invalid Format",
			message: "The provided data format is not valid.",
			action: "Please check the expected format and try again.",
		},

		// Authentication errors (401)
		[ErrorCodes.UNAUTHORIZED]: {
			title: "Sign In Required",
			message: "Please sign in to continue.",
			action: "Sign in to your account to access this feature.",
		},
		[ErrorCodes.SESSION_EXPIRED]: {
			title: "Session Expired",
			message: "Your session has expired. Please sign in again.",
			action: "Sign in again to continue.",
		},
		[ErrorCodes.INVALID_CREDENTIALS]: {
			title: "Invalid Credentials",
			message: "The email or password you entered is incorrect.",
			action: "Please check your credentials and try again.",
		},

		// Authorization errors (403)
		[ErrorCodes.FORBIDDEN]: {
			title: "Access Denied",
			message: "You don't have permission to access this.",
			action: "Contact an administrator if you believe this is an error.",
		},
		[ErrorCodes.INSUFFICIENT_PERMISSIONS]: {
			title: "Insufficient Permissions",
			message: "You don't have the required permissions for this action.",
			action: "Contact an administrator to request access.",
		},
		[ErrorCodes.OWNER_MISMATCH]: {
			title: "Access Denied",
			message: "You don't have access to this resource.",
			action: "This resource belongs to another user.",
		},

		// Not found errors (404)
		[ErrorCodes.NOT_FOUND]: {
			title: "Not Found",
			message: "The requested resource was not found.",
			action: "Check the URL or identifier and try again.",
		},
		[ErrorCodes.CHAT_NOT_FOUND]: {
			title: "Chat Not Found",
			message: "The requested chat was not found.",
			action: "It may have been deleted or the ID is incorrect.",
		},
		[ErrorCodes.USER_NOT_FOUND]: {
			title: "User Not Found",
			message: "The requested user was not found.",
			action: "Check the user identifier and try again.",
		},
		[ErrorCodes.MESSAGE_NOT_FOUND]: {
			title: "Message Not Found",
			message: "The requested message was not found.",
			action: "It may have been deleted or the ID is incorrect.",
		},
		[ErrorCodes.ARTIFACT_NOT_FOUND]: {
			title: "Artifact Not Found",
			message: "The requested artifact was not found.",
			action: "It may have been deleted or the ID is incorrect.",
		},

		// Rate limiting errors (429)
		[ErrorCodes.RATE_LIMIT_EXCEEDED]: {
			title: "Too Many Requests",
			message: "Too many requests. Please wait a moment and try again.",
			action: "Wait a few seconds before making another request.",
		},
		[ErrorCodes.DAILY_LIMIT_EXCEEDED]: {
			title: "Daily Limit Exceeded",
			message: "You've reached your daily limit for this action.",
			action: "Try again tomorrow or upgrade your plan.",
		},

		// Server errors (500)
		[ErrorCodes.INTERNAL_ERROR]: {
			title: "Something Went Wrong",
			message: "Something went wrong. Please try again later.",
			action: "If the problem persists, contact support.",
		},
		[ErrorCodes.DATABASE_ERROR]: {
			title: "Database Error",
			message: "A database error occurred. Please try again.",
			action: "If the problem persists, contact support.",
		},
		[ErrorCodes.CONFIGURATION_ERROR]: {
			title: "Configuration Error",
			message: "A configuration error occurred.",
			action: "Please contact support if this problem persists.",
		},

		// Service unavailable (503)
		[ErrorCodes.SERVICE_UNAVAILABLE]: {
			title: "Service Unavailable",
			message: "Service temporarily unavailable. Please try again later.",
			action: "The service is experiencing issues. Try again in a few minutes.",
		},
		[ErrorCodes.OFFLINE]: {
			title: "You're Offline",
			message: "You appear to be offline. Please check your connection.",
			action: "Check your internet connection and try again.",
		},
	},
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the locale messages for a given locale, falling back to default if not found.
 *
 * @param locale - The requested locale
 * @returns The locale messages for the requested or default locale
 */
function getLocaleMessages(locale: SupportedLocale): LocaleMessages {
	return errorMessages[locale] ?? errorMessages[DEFAULT_LOCALE] ?? {}
}

/**
 * Gets the error message set for a specific error code and locale.
 *
 * @param code - The error code to look up
 * @param locale - The preferred locale (defaults to 'en')
 * @returns The error message set, or a generic fallback if not found
 */
function getErrorMessageSet(
	code: ErrorCode | string,
	locale?: SupportedLocale,
): ErrorMessageSet {
	const messages = getLocaleMessages(locale ?? DEFAULT_LOCALE)
	const messageSet = messages[code]

	if (messageSet) {
		return messageSet
	}

	// Fallback to generic internal error message
	return {
		title: "Error",
		message: "An unexpected error occurred. Please try again.",
		action: null,
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Gets the user-friendly error message for an AppError.
 *
 * @param error - The AppError instance
 * @param locale - Optional locale (defaults to 'en')
 * @returns The user-friendly error message
 *
 * @example
 * ```typescript
 * const error = new ValidationError('Invalid email');
 * const message = getErrorMessage(error); // "Please check your input and try again."
 * ```
 */
export function getErrorMessage(
	error: AppError,
	locale?: SupportedLocale,
): string {
	return getErrorMessageSet(error.code, locale).message
}

/**
 * Gets the user-friendly error title for an AppError.
 *
 * @param error - The AppError instance
 * @param locale - Optional locale (defaults to 'en')
 * @returns The user-friendly error title
 *
 * @example
 * ```typescript
 * const error = new UnauthorizedError();
 * const title = getErrorTitle(error); // "Sign In Required"
 * ```
 */
export function getErrorTitle(
	error: AppError,
	locale?: SupportedLocale,
): string {
	return getErrorMessageSet(error.code, locale).title
}

/**
 * Gets the suggested action for an AppError, if available.
 *
 * @param error - The AppError instance
 * @param locale - Optional locale (defaults to 'en')
 * @returns The suggested action, or null if none available
 *
 * @example
 * ```typescript
 * const error = new RateLimitError();
 * const action = getErrorAction(error); // "Wait a few seconds before making another request."
 * ```
 */
export function getErrorAction(
	error: AppError,
	locale?: SupportedLocale,
): string | null {
	return getErrorMessageSet(error.code, locale).action
}

/**
 * Gets all error information (title, message, action) for an AppError.
 *
 * @param error - The AppError instance
 * @param locale - Optional locale (defaults to 'en')
 * @returns The complete error message set
 *
 * @example
 * ```typescript
 * const error = new NotFoundError('Chat', '123');
 * const info = getErrorInfo(error);
 * // {
 * //   title: "Chat Not Found",
 * //   message: "The requested chat was not found.",
 * //   action: "It may have been deleted or the ID is incorrect."
 * // }
 * ```
 */
export function getErrorInfo(
	error: AppError,
	locale?: SupportedLocale,
): ErrorMessageSet {
	return getErrorMessageSet(error.code, locale)
}

/**
 * Checks if messages exist for a given locale.
 *
 * @param locale - The locale to check
 * @returns True if messages exist for the locale
 */
export function hasLocaleMessages(locale: SupportedLocale): boolean {
	return locale in errorMessages
}

/**
 * Gets a list of supported locales.
 *
 * @returns Array of supported locale codes
 */
export function getSupportedLocales(): SupportedLocale[] {
	return Object.keys(errorMessages)
}
