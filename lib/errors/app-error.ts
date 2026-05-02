import { NextResponse } from "next/server"

import { ERROR_STATUS_MAP, type ErrorCode } from "@/lib/errors/codes"

/**
 * Application error class with typed error codes and HTTP status mapping.
 *
 * Factory methods require an explicit ErrorCode from the matching category,
 * ensuring granular error tracking at every call site.
 *
 * Usage in Route Handlers:
 *   throw AppError.unauthorized("unauthorized:auth:expired_token", "Session expired")
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
		const headers: Record<string, string> = {}

		// Attach Retry-After header for rate-limited responses
		if (
			this.statusCode === 429 &&
			this.details != null &&
			typeof this.details === "object" &&
			"retryAfter" in this.details
		) {
			const ra = (this.details as { retryAfter: number }).retryAfter
			if (typeof ra === "number" && ra > 0) {
				headers["Retry-After"] = String(ra)
			}
		}

		return NextResponse.json(
			{ code: this.code, message: this.message },
			{ status: this.statusCode, headers },
		)
	}

	// ── Factory methods ──
	// Each requires an explicit ErrorCode from its category — no hidden defaults.

	static unauthorized(
		code: Extract<ErrorCode, `unauthorized:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Unauthorized", details)
	}

	static notFound(
		code: Extract<ErrorCode, `not_found:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Not found", details)
	}

	static forbidden(
		code: Extract<ErrorCode, `forbidden:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Forbidden", details)
	}

	static badRequest(
		code: Extract<ErrorCode, `bad_request:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Bad request", details)
	}

	static rateLimited(
		code: Extract<ErrorCode, `rate_limit:${string}`>,
		message?: string,
		details?: number | unknown,
	): AppError {
		const normalizedDetails = typeof details === "number" ? { retryAfter: details } : details
		return new AppError(code, message ?? "Too many requests", normalizedDetails)
	}

	static internal(
		code: Extract<ErrorCode, `internal_error:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Internal server error", details)
	}

	static serviceUnavailable(
		code: Extract<ErrorCode, `offline:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "Service unavailable", details)
	}

	static aiError(
		code: Extract<ErrorCode, `ai_error:${string}`>,
		message?: string,
		details?: unknown,
	): AppError {
		return new AppError(code, message ?? "AI provider error", details)
	}
}
