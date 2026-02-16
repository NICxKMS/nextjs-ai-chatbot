/**
 * Tests for error handling system
 *
 * @module lib/errors.test
 */

import { describe, expect, it } from "vitest"
import {
	AppError,
	createEntityNotFoundError,
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
} from "./errors"
import type { ApiError, ApiResponse } from "./types"

describe("ErrorCodes", () => {
	it("should have validation error codes", () => {
		expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR")
		expect(ErrorCodes.INVALID_INPUT).toBe("INVALID_INPUT")
		expect(ErrorCodes.MISSING_PARAMETER).toBe("MISSING_PARAMETER")
		expect(ErrorCodes.INVALID_FORMAT).toBe("INVALID_FORMAT")
	})

	it("should have authentication error codes", () => {
		expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED")
		expect(ErrorCodes.SESSION_EXPIRED).toBe("SESSION_EXPIRED")
		expect(ErrorCodes.INVALID_CREDENTIALS).toBe("INVALID_CREDENTIALS")
	})

	it("should have authorization error codes", () => {
		expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN")
		expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe(
			"INSUFFICIENT_PERMISSIONS",
		)
		expect(ErrorCodes.OWNER_MISMATCH).toBe("OWNER_MISMATCH")
	})

	it("should have not found error codes", () => {
		expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND")
		expect(ErrorCodes.CHAT_NOT_FOUND).toBe("CHAT_NOT_FOUND")
		expect(ErrorCodes.USER_NOT_FOUND).toBe("USER_NOT_FOUND")
		expect(ErrorCodes.MESSAGE_NOT_FOUND).toBe("MESSAGE_NOT_FOUND")
		expect(ErrorCodes.ARTIFACT_NOT_FOUND).toBe("ARTIFACT_NOT_FOUND")
	})

	it("should have rate limit error codes", () => {
		expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe("RATE_LIMIT_EXCEEDED")
		expect(ErrorCodes.DAILY_LIMIT_EXCEEDED).toBe("DAILY_LIMIT_EXCEEDED")
	})

	it("should have server error codes", () => {
		expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR")
		expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR")
		expect(ErrorCodes.CONFIGURATION_ERROR).toBe("CONFIGURATION_ERROR")
	})

	it("should have service unavailable error codes", () => {
		expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE")
		expect(ErrorCodes.OFFLINE).toBe("OFFLINE")
	})
})

describe("AppError", () => {
	describe("constructor", () => {
		it("should create error with all properties", () => {
			const error = new AppError(
				"TEST_ERROR",
				"Test error message",
				400,
				{ field: "test" },
			)

			expect(error.name).toBe("AppError")
			expect(error.code).toBe("TEST_ERROR")
			expect(error.message).toBe("Test error message")
			expect(error.statusCode).toBe(400)
			expect(error.details).toEqual({ field: "test" })
			expect(error.timestamp).toBeInstanceOf(Date)
		})

		it("should create error without details", () => {
			const error = new AppError("TEST_ERROR", "Test message", 500)

			expect(error.details).toBeUndefined()
		})

		it("should maintain stack trace", () => {
			const error = new AppError("TEST_ERROR", "Test message", 500)

			expect(error.stack).toBeDefined()
			expect(error.stack).toContain("AppError")
		})
	})

	describe("toApiError", () => {
		it("should convert to ApiError format", () => {
			const error = new AppError(
				"VALIDATION_ERROR",
				"Invalid input",
				400,
				{ field: "email" },
			)
			const apiError: ApiError = error.toApiError()

			expect(apiError.code).toBe("VALIDATION_ERROR")
			expect(apiError.message).toBe("Invalid input")
			expect(apiError.statusCode).toBe(400)
			expect(apiError.details).toEqual({ field: "email" })
		})

		it("should not include details when undefined", () => {
			const error = new AppError("TEST_ERROR", "Test message", 500)
			const apiError = error.toApiError()

			expect("details" in apiError).toBe(false)
		})
	})

	describe("toApiResponse", () => {
		it("should convert to ApiResponse format", () => {
			const error = new AppError("NOT_FOUND", "Resource not found", 404)
			const response: ApiResponse<never> = error.toApiResponse()

			expect(response.success).toBe(false)
			expect(response.error?.code).toBe("NOT_FOUND")
			expect(response.error?.message).toBe("Resource not found")
			expect(response.error?.statusCode).toBe(404)
		})
	})

	describe("toResponse", () => {
		it("should create JSON Response with correct status", async () => {
			const error = new AppError("UNAUTHORIZED", "Not authenticated", 401)
			const response = error.toResponse()

			expect(response.status).toBe(401)
			expect(response.headers.get("content-type")).toBe(
				"application/json",
			)

			const body = (await response.json()) as ApiError
			expect(body.code).toBe("UNAUTHORIZED")
			expect(body.message).toBe("Not authenticated")
		})
	})

	describe("toJSON", () => {
		it("should return JSON-serializable object", () => {
			const error = new AppError("TEST_ERROR", "Test message", 400, {
				key: "value",
			})
			const json = error.toJSON()

			expect(json.name).toBe("AppError")
			expect(json.code).toBe("TEST_ERROR")
			expect(json.message).toBe("Test message")
			expect(json.statusCode).toBe(400)
			expect(json.details).toEqual({ key: "value" })
			expect(typeof json.timestamp).toBe("string")
		})
	})
})

describe("ValidationError", () => {
	it("should create validation error with correct properties", () => {
		const error = new ValidationError("Email is required", {
			field: "email",
		})

		expect(error.name).toBe("ValidationError")
		expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR)
		expect(error.message).toBe("Email is required")
		expect(error.statusCode).toBe(400)
		expect(error.details).toEqual({ field: "email" })
	})

	it("should create validation error without details", () => {
		const error = new ValidationError("Invalid input")

		expect(error.details).toBeUndefined()
	})

	it("should be instance of AppError", () => {
		const error = new ValidationError("Test")

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("NotFoundError", () => {
	it("should create not found error with resource name", () => {
		const error = new NotFoundError("Chat")

		expect(error.name).toBe("NotFoundError")
		expect(error.code).toBe(ErrorCodes.NOT_FOUND)
		expect(error.message).toBe("Chat not found")
		expect(error.statusCode).toBe(404)
		expect(error.details).toEqual({ resource: "Chat" })
	})

	it("should create not found error with identifier", () => {
		const error = new NotFoundError("Chat", "chat-123")

		expect(error.message).toBe("Chat not found: chat-123")
		expect(error.details).toEqual({
			resource: "Chat",
			identifier: "chat-123",
		})
	})

	it("should create not found error with additional details", () => {
		const error = new NotFoundError("User", "user-456", {
			reason: "deleted",
		})

		expect(error.details).toEqual({
			resource: "User",
			identifier: "user-456",
			reason: "deleted",
		})
	})

	it("should be instance of AppError", () => {
		const error = new NotFoundError("Test")

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("UnauthorizedError", () => {
	it("should create unauthorized error with default message", () => {
		const error = new UnauthorizedError()

		expect(error.name).toBe("UnauthorizedError")
		expect(error.code).toBe(ErrorCodes.UNAUTHORIZED)
		expect(error.message).toBe("Authentication required")
		expect(error.statusCode).toBe(401)
	})

	it("should create unauthorized error with custom message", () => {
		const error = new UnauthorizedError("Session expired")

		expect(error.message).toBe("Session expired")
	})

	it("should create unauthorized error with details", () => {
		const error = new UnauthorizedError("Invalid token", {
			tokenType: "refresh",
		})

		expect(error.details).toEqual({ tokenType: "refresh" })
	})

	it("should be instance of AppError", () => {
		const error = new UnauthorizedError()

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("ForbiddenError", () => {
	it("should create forbidden error with default message", () => {
		const error = new ForbiddenError()

		expect(error.name).toBe("ForbiddenError")
		expect(error.code).toBe(ErrorCodes.FORBIDDEN)
		expect(error.message).toBe("Access denied")
		expect(error.statusCode).toBe(403)
	})

	it("should create forbidden error with custom message", () => {
		const error = new ForbiddenError("You do not own this resource")

		expect(error.message).toBe("You do not own this resource")
	})

	it("should create forbidden error with details", () => {
		const error = new ForbiddenError("Not authorized", {
			requiredRole: "admin",
		})

		expect(error.details).toEqual({ requiredRole: "admin" })
	})

	it("should be instance of AppError", () => {
		const error = new ForbiddenError()

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("RateLimitError", () => {
	it("should create rate limit error with default message", () => {
		const error = new RateLimitError()

		expect(error.name).toBe("RateLimitError")
		expect(error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED)
		expect(error.message).toBe("Rate limit exceeded")
		expect(error.statusCode).toBe(429)
	})

	it("should create rate limit error with custom message", () => {
		const error = new RateLimitError("Too many requests")

		expect(error.message).toBe("Too many requests")
	})

	it("should create rate limit error with reset details", () => {
		const resetAt = new Date("2026-02-13T13:00:00Z")
		const error = new RateLimitError("Daily limit exceeded", {
			limit: 100,
			resetAt: resetAt.toISOString(),
		})

		expect(error.details).toEqual({
			limit: 100,
			resetAt: resetAt.toISOString(),
		})
	})

	it("should be instance of AppError", () => {
		const error = new RateLimitError()

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("InternalServerError", () => {
	it("should create internal server error with default message", () => {
		const error = new InternalServerError()

		expect(error.name).toBe("InternalServerError")
		expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR)
		expect(error.message).toBe("An unexpected error occurred")
		expect(error.statusCode).toBe(500)
	})

	it("should create internal server error with custom message", () => {
		const error = new InternalServerError("Database connection failed")

		expect(error.message).toBe("Database connection failed")
	})

	it("should create internal server error with details", () => {
		const error = new InternalServerError("Query failed", {
			query: "SELECT *",
		})

		expect(error.details).toEqual({ query: "SELECT *" })
	})

	it("should be instance of AppError", () => {
		const error = new InternalServerError()

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("ServiceUnavailableError", () => {
	it("should create service unavailable error with default message", () => {
		const error = new ServiceUnavailableError()

		expect(error.name).toBe("ServiceUnavailableError")
		expect(error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE)
		expect(error.message).toBe("Service temporarily unavailable")
		expect(error.statusCode).toBe(503)
	})

	it("should create service unavailable error with custom message", () => {
		const error = new ServiceUnavailableError("AI service is down")

		expect(error.message).toBe("AI service is down")
	})

	it("should create service unavailable error with details", () => {
		const error = new ServiceUnavailableError("Maintenance mode", {
			estimatedRecovery: "2026-02-13T14:00:00Z",
		})

		expect(error.details).toEqual({
			estimatedRecovery: "2026-02-13T14:00:00Z",
		})
	})

	it("should be instance of AppError", () => {
		const error = new ServiceUnavailableError()

		expect(error).toBeInstanceOf(AppError)
	})
})

describe("isAppError", () => {
	it("should return true for AppError instances", () => {
		expect(isAppError(new AppError("TEST", "message", 500))).toBe(true)
		expect(isAppError(new ValidationError("test"))).toBe(true)
		expect(isAppError(new NotFoundError("Test"))).toBe(true)
		expect(isAppError(new UnauthorizedError())).toBe(true)
		expect(isAppError(new ForbiddenError())).toBe(true)
		expect(isAppError(new RateLimitError())).toBe(true)
		expect(isAppError(new InternalServerError())).toBe(true)
		expect(isAppError(new ServiceUnavailableError())).toBe(true)
	})

	it("should return false for non-AppError errors", () => {
		expect(isAppError(new Error("test"))).toBe(false)
		expect(isAppError(new TypeError("test"))).toBe(false)
		expect(isAppError({})).toBe(false)
		expect(isAppError(null)).toBe(false)
		expect(isAppError(undefined)).toBe(false)
		expect(isAppError("error")).toBe(false)
		expect(isAppError(123)).toBe(false)
	})
})

describe("hasErrorCode", () => {
	it("should return true for matching error code", () => {
		const error = new ValidationError("test")
		expect(hasErrorCode(error, ErrorCodes.VALIDATION_ERROR)).toBe(true)
	})

	it("should return false for non-matching error code", () => {
		const error = new ValidationError("test")
		expect(hasErrorCode(error, ErrorCodes.NOT_FOUND)).toBe(false)
	})

	it("should return false for non-AppError", () => {
		expect(hasErrorCode(new Error("test"), "TEST")).toBe(false)
		expect(hasErrorCode(null, "TEST")).toBe(false)
	})

	it("should work with custom error codes", () => {
		const error = new AppError("CUSTOM_CODE", "message", 400)
		expect(hasErrorCode(error, "CUSTOM_CODE")).toBe(true)
		expect(hasErrorCode(error, "OTHER_CODE")).toBe(false)
	})
})

describe("fromUnknownError", () => {
	it("should return AppError unchanged", () => {
		const originalError = new ValidationError("Original error")
		const result = fromUnknownError(originalError)

		expect(result).toBe(originalError)
	})

	it("should wrap Error in InternalServerError", () => {
		const originalError = new Error("Something went wrong")
		const result = fromUnknownError(originalError)

		expect(result.name).toBe("InternalServerError")
		expect(result.message).toBe("Something went wrong")
		expect(result.details?.originalName).toBe("Error")
		expect(result.details?.stack).toBeDefined()
	})

	it("should wrap TypeError in InternalServerError", () => {
		const originalError = new TypeError("Cannot read property")
		const result = fromUnknownError(originalError)

		expect(result.name).toBe("InternalServerError")
		expect(result.details?.originalName).toBe("TypeError")
	})

	it("should handle non-Error values", () => {
		const result = fromUnknownError("string error")

		expect(result.name).toBe("InternalServerError")
		expect(result.message).toBe("An unexpected error occurred")
		expect(result.details?.originalError).toBe("string error")
	})

	it("should handle null", () => {
		const result = fromUnknownError(null, "Custom default")

		expect(result.message).toBe("Custom default")
		expect(result.details?.originalError).toBe("null")
	})

	it("should handle undefined", () => {
		const result = fromUnknownError(undefined)

		expect(result.details?.originalError).toBe("undefined")
	})

	it("should handle numbers", () => {
		const result = fromUnknownError(42)

		expect(result.details?.originalError).toBe("42")
	})

	it("should use custom default message", () => {
		const result = fromUnknownError(null, "Operation failed")

		expect(result.message).toBe("Operation failed")
	})
})

describe("createEntityNotFoundError", () => {
	it("should create Chat not found error with specific code", () => {
		const error = createEntityNotFoundError("Chat", "chat-123")

		expect(error.code).toBe(ErrorCodes.CHAT_NOT_FOUND)
		expect(error.message).toBe("Chat not found: chat-123")
		expect(error.statusCode).toBe(404)
	})

	it("should create User not found error with specific code", () => {
		const error = createEntityNotFoundError("User", "user-456")

		expect(error.code).toBe(ErrorCodes.USER_NOT_FOUND)
	})

	it("should create Message not found error with specific code", () => {
		const error = createEntityNotFoundError("Message", "msg-789")

		expect(error.code).toBe(ErrorCodes.MESSAGE_NOT_FOUND)
	})

	it("should create Artifact not found error with specific code", () => {
		const error = createEntityNotFoundError("Artifact", "artifact-abc")

		expect(error.code).toBe(ErrorCodes.ARTIFACT_NOT_FOUND)
	})

	it("should use generic NOT_FOUND for unknown entities", () => {
		const error = createEntityNotFoundError("UnknownEntity", "id-123")

		expect(error.code).toBe(ErrorCodes.NOT_FOUND)
	})

	it("should work without identifier", () => {
		const error = createEntityNotFoundError("Chat")

		expect(error.message).toBe("Chat not found")
		expect(error.details?.identifier).toBeUndefined()
	})
})

describe("getErrorMessage", () => {
	it("should return message from AppError", () => {
		const error = new ValidationError("Invalid email")
		expect(getErrorMessage(error)).toBe("Invalid email")
	})

	it("should return message from Error", () => {
		const error = new Error("Standard error")
		expect(getErrorMessage(error)).toBe("Standard error")
	})

	it("should return string representation for non-Error", () => {
		expect(getErrorMessage("string error")).toBe("string error")
		expect(getErrorMessage(123)).toBe("123")
		expect(getErrorMessage(null)).toBe("null")
		expect(getErrorMessage(undefined)).toBe("undefined")
		expect(getErrorMessage({ key: "value" })).toBe("[object Object]")
	})
})

describe("error inheritance chain", () => {
	it("should maintain proper instanceof chain for ValidationError", () => {
		const error = new ValidationError("test")

		expect(error).toBeInstanceOf(ValidationError)
		expect(error).toBeInstanceOf(AppError)
		expect(error).toBeInstanceOf(Error)
	})

	it("should maintain proper instanceof chain for NotFoundError", () => {
		const error = new NotFoundError("Test")

		expect(error).toBeInstanceOf(NotFoundError)
		expect(error).toBeInstanceOf(AppError)
		expect(error).toBeInstanceOf(Error)
	})

	it("should maintain proper instanceof chain for all error types", () => {
		const errors = [
			new ValidationError("test"),
			new NotFoundError("Test"),
			new UnauthorizedError(),
			new ForbiddenError(),
			new RateLimitError(),
			new InternalServerError(),
			new ServiceUnavailableError(),
		]

		for (const error of errors) {
			expect(error).toBeInstanceOf(AppError)
			expect(error).toBeInstanceOf(Error)
		}
	})
})
