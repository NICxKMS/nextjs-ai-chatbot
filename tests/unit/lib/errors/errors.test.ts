import { describe, expect, it } from "vitest"

import { AppError } from "@/lib/errors/app-error"
import { ERROR_STATUS_MAP } from "@/lib/errors/codes"

describe("ERROR_STATUS_MAP", () => {
	it("maps each error code prefix to the expected HTTP status", () => {
		for (const [code, status] of Object.entries(ERROR_STATUS_MAP)) {
			if (code.startsWith("unauthorized:")) {
				expect(status).toBe(401)
				continue
			}

			if (code.startsWith("forbidden:")) {
				expect(status).toBe(403)
				continue
			}

			if (code.startsWith("bad_request:")) {
				expect(status).toBe(400)
				continue
			}

			if (code.startsWith("not_found:")) {
				expect(status).toBe(404)
				continue
			}

			if (code.startsWith("rate_limit:")) {
				expect(status).toBe(429)
				continue
			}

			if (code.startsWith("ai_error:")) {
				expect(status).toBe(502)
				continue
			}

			if (code.startsWith("offline:")) {
				expect(status).toBe(503)
				continue
			}

			if (code.startsWith("internal_error:")) {
				expect(status).toBe(500)
				continue
			}

			throw new Error(`Unhandled error code prefix in test: ${code}`)
		}
	})
})

describe("AppError", () => {
	it("creates an error with code, message, details, and mapped status", () => {
		const details = { field: "id" }
		const error = new AppError(
			"bad_request:api:invalid_request_body",
			"Invalid request body",
			details,
		)

		expect(error).toBeInstanceOf(Error)
		expect(error.name).toBe("AppError")
		expect(error.code).toBe("bad_request:api:invalid_request_body")
		expect(error.message).toBe("Invalid request body")
		expect(error.statusCode).toBe(400)
		expect(error.details).toBe(details)
	})

	it("converts the error to a JSON NextResponse", async () => {
		const error = AppError.forbidden("forbidden:api:csrf_failed", "CSRF check failed")

		const response = error.toResponse()

		expect(response.status).toBe(403)
		await expect(response.json()).resolves.toEqual({
			code: "forbidden:api:csrf_failed",
			message: "CSRF check failed",
		})
	})

	const factoryCases = [
		{
			name: "unauthorized",
			create: () => AppError.unauthorized("unauthorized:auth:no_session"),
			expectedCode: "unauthorized:auth:no_session",
			expectedMessage: "Unauthorized",
			expectedStatus: 401,
		},
		{
			name: "notFound",
			create: () => AppError.notFound("not_found:chat:chat_not_found"),
			expectedCode: "not_found:chat:chat_not_found",
			expectedMessage: "Not found",
			expectedStatus: 404,
		},
		{
			name: "forbidden",
			create: () => AppError.forbidden("forbidden:chat:owner_mismatch"),
			expectedCode: "forbidden:chat:owner_mismatch",
			expectedMessage: "Forbidden",
			expectedStatus: 403,
		},
		{
			name: "badRequest",
			create: () => AppError.badRequest("bad_request:validation:invalid_input"),
			expectedCode: "bad_request:validation:invalid_input",
			expectedMessage: "Bad request",
			expectedStatus: 400,
		},
		{
			name: "rateLimited",
			create: () => AppError.rateLimited("rate_limit:chat:too_many_requests"),
			expectedCode: "rate_limit:chat:too_many_requests",
			expectedMessage: "Too many requests",
			expectedStatus: 429,
		},
		{
			name: "internal",
			create: () => AppError.internal("internal_error:database:query_failed"),
			expectedCode: "internal_error:database:query_failed",
			expectedMessage: "Internal server error",
			expectedStatus: 500,
		},
		{
			name: "serviceUnavailable",
			create: () => AppError.serviceUnavailable("offline:api:service_unavailable"),
			expectedCode: "offline:api:service_unavailable",
			expectedMessage: "Service unavailable",
			expectedStatus: 503,
		},
		{
			name: "aiError",
			create: () => AppError.aiError("ai_error:provider:failed"),
			expectedCode: "ai_error:provider:failed",
			expectedMessage: "AI provider error",
			expectedStatus: 502,
		},
	] as const

	it.each(factoryCases)("creates $name with the correct default message and status", ({
		create,
		expectedCode,
		expectedMessage,
		expectedStatus,
	}) => {
		const error = create()

		expect(error.code).toBe(expectedCode)
		expect(error.message).toBe(expectedMessage)
		expect(error.statusCode).toBe(expectedStatus)
	})

	it("allows overriding message and details in factory methods", () => {
		const details = { attempt: 3 }
		const error = AppError.rateLimited("rate_limit:auth:login_too_many", "Slow down", details)

		expect(error.message).toBe("Slow down")
		expect(error.details).toBe(details)
		expect(error.statusCode).toBe(429)
	})
})
