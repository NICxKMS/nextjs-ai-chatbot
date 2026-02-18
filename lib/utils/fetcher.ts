/**
 * SWR-compatible Fetcher and Error Handler Utilities
 *
 * Provides fetcher functions for SWR data fetching with comprehensive error handling,
 * offline detection, and automatic redirect for not-found resources.
 *
 * @module lib/utils/fetcher
 */

import {
	AppError,
	type ErrorCode,
	ErrorCodes,
	isAppError,
	NotFoundError,
	ServiceUnavailableError,
} from "@/lib/errors"

// =============================================================================
// Types
// =============================================================================

/**
 * Error response structure from API endpoints.
 */
interface ApiErrorResponse {
	code?: string
	cause?: string
	message?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses error response from API, extracting code and cause.
 *
 * @param response - The fetch Response object
 * @returns Parsed error information
 */
async function parseErrorResponse(
	response: Response,
): Promise<{ code: ErrorCode | string; cause: string | undefined }> {
	let code: ErrorCode | string = ErrorCodes.VALIDATION_ERROR
	let cause: string | undefined

	try {
		const errorData: ApiErrorResponse = await response.json()
		if (errorData.code) {
			code = errorData.code
		}
		cause = errorData.cause ?? errorData.message
	} catch {
		// Response wasn't valid JSON, use defaults
	}

	return { code, cause }
}

/**
 * Maps error codes to appropriate AppError instances.
 *
 * @param code - The error code
 * @param cause - Optional cause/message
 * @returns AppError instance
 */
function createErrorFromCode(
	code: ErrorCode | string,
	cause: string | undefined,
): AppError {
	// Map specific error codes to appropriate error types
	switch (code) {
		case ErrorCodes.CHAT_NOT_FOUND:
			return new NotFoundError("Chat", cause)
		case ErrorCodes.USER_NOT_FOUND:
			return new NotFoundError("User", cause)
		case ErrorCodes.MESSAGE_NOT_FOUND:
			return new NotFoundError("Message", cause)
		case ErrorCodes.ARTIFACT_NOT_FOUND:
			return new NotFoundError("Artifact", cause)
		case ErrorCodes.NOT_FOUND:
			return new NotFoundError("Resource", cause)
		case ErrorCodes.OFFLINE:
		case ErrorCodes.SERVICE_UNAVAILABLE:
			return new ServiceUnavailableError(cause ?? "Service unavailable")
		default:
			// For other error codes, create a generic AppError
			return new AppError(code, cause ?? "An error occurred", 400)
	}
}

/**
 * Handles redirect for chat not found errors.
 * Only executes in browser environment.
 *
 * @param code - The error code to check
 */
function handleChatNotFoundRedirect(code: ErrorCode | string): void {
	if (
		typeof window !== "undefined" &&
		typeof code === "string" &&
		code === ErrorCodes.CHAT_NOT_FOUND
	) {
		window.location.replace("/?notice=chat_not_found")
	}
}

/**
 * Checks if the browser is offline.
 *
 * @returns true if offline
 */
function isOffline(): boolean {
	return typeof navigator !== "undefined" && !navigator.onLine
}

/**
 * Checks if an error is a fetch/network error.
 *
 * @param error - The error to check
 * @returns true if it's a network error
 */
function isNetworkError(error: unknown): boolean {
	return error instanceof TypeError && error.message.includes("fetch")
}

// =============================================================================
// SWR Fetcher
// =============================================================================

/**
 * SWR-compatible fetcher with comprehensive error handling.
 *
 * Features:
 * - Parses JSON error codes from API responses
 * - Wraps errors in AppError hierarchy
 * - Detects offline state via navigator.onLine
 * - Redirects for chat not found errors
 *
 * @template T - The expected response data type
 * @param url - The URL to fetch
 * @returns Promise resolving to the parsed JSON response
 * @throws AppError on fetch failure or non-OK response
 *
 * @example
 * ```typescript
 * import useSWR from 'swr';
 * import { fetcher } from '@/lib/utils';
 *
 * // In a React component
 * const { data, error } = useSWR<ChatData>('/api/chat/123', fetcher);
 * ```
 */
export async function fetcher<T>(url: string): Promise<T> {
	try {
		const response = await fetch(url)

		if (!response.ok) {
			const { code, cause } = await parseErrorResponse(response)
			const error = createErrorFromCode(code, cause)

			handleChatNotFoundRedirect(code)
			throw error
		}

		return response.json()
	} catch (error: unknown) {
		// Check if we're offline
		if (isOffline()) {
			throw new ServiceUnavailableError("No network connection")
		}

		// Re-throw AppError instances as-is
		if (isAppError(error)) {
			throw error
		}

		// Wrap fetch/network errors
		if (isNetworkError(error)) {
			throw new ServiceUnavailableError("Network request failed")
		}

		throw error
	}
}

// =============================================================================
// Fetch with Error Handlers
// =============================================================================

/**
 * Fetch wrapper with the same error handling pattern as fetcher.
 *
 * Unlike fetcher, this returns the Response object instead of parsing JSON,
 * making it suitable for cases where you need access to response headers
 * or want to handle the body differently.
 *
 * @param input - The URL or RequestInfo to fetch
 * @param init - Optional fetch init options
 * @returns Promise resolving to the Response object
 * @throws AppError on fetch failure or non-OK response
 *
 * @example
 * ```typescript
 * import { fetchWithErrorHandlers } from '@/lib/utils';
 *
 * const response = await fetchWithErrorHandlers('/api/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' }),
 * });
 * const data = await response.json();
 * ```
 */
export async function fetchWithErrorHandlers(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	try {
		const response = await fetch(input, init)

		if (!response.ok) {
			const { code, cause } = await parseErrorResponse(response)
			const error = createErrorFromCode(code, cause)

			handleChatNotFoundRedirect(code)
			throw error
		}

		return response
	} catch (error: unknown) {
		// Check if we're offline
		if (isOffline()) {
			throw new ServiceUnavailableError("No network connection")
		}

		// Re-throw AppError instances as-is
		if (isAppError(error)) {
			throw error
		}

		// Wrap fetch/network errors
		if (isNetworkError(error)) {
			throw new ServiceUnavailableError("Network request failed")
		}

		throw error
	}
}
