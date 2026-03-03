import { NextResponse } from "next/server"

import { ERROR_STATUS_MAP, type ErrorCode } from "@/lib/errors/codes"

/**
 * Application error class with typed error codes and HTTP status mapping.
 *
 * Usage in Route Handlers:
 *   throw AppError.unauthorized("Session expired")
 *   // → catch → error.toResponse() → JSON { code, message } with 401
 *
 * Usage in Server Actions:
 *   return { success: false, error: { code: error.code, message: error.message } }
 */
export class AppError extends Error {
	readonly code: ErrorCode
	readonly statusCode: number
	readonly details?: unknown

	constructor(code: ErrorCode, message: string, details?: unknown) {
		super(message)
		this.name = "AppError"
		this.code = code
		this.statusCode = ERROR_STATUS_MAP[code]
		this.details = details
	}

	/** Convert to a JSON NextResponse for Route Handlers. */
	toResponse(): NextResponse {
		return NextResponse.json(
			{ code: this.code, message: this.message },
			{ status: this.statusCode },
		)
	}

	// ── Factory methods ──

	static unauthorized(message?: string, details?: unknown): AppError {
		return new AppError("unauthorized:auth:no_session", message ?? "Unauthorized", details)
	}

	static notFound(message?: string, details?: unknown): AppError {
		return new AppError("not_found:chat:chat_not_found", message ?? "Not found", details)
	}

	static forbidden(message?: string, details?: unknown): AppError {
		return new AppError("forbidden:chat:owner_mismatch", message ?? "Forbidden", details)
	}

	static badRequest(message?: string, details?: unknown): AppError {
		return new AppError(
			"bad_request:api:invalid_request_body",
			message ?? "Bad request",
			details,
		)
	}

	static rateLimited(message?: string, details?: unknown): AppError {
		return new AppError(
			"rate_limit:chat:too_many_requests",
			message ?? "Too many requests",
			details,
		)
	}

	static internal(message?: string, details?: unknown): AppError {
		return new AppError(
			"internal_error:database:query_failed",
			message ?? "Internal server error",
			details,
		)
	}

	static serviceUnavailable(message?: string, details?: unknown): AppError {
		return new AppError(
			"offline:api:service_unavailable",
			message ?? "Service unavailable",
			details,
		)
	}
}
