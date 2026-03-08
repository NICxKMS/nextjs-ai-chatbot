// Flow: error-handling | Step: error-construction
import { describe, expect, it } from "vitest"

import { AppError } from "@/lib/errors/app-error"
import { ERROR_STATUS_MAP } from "@/lib/errors/codes"

describe("AppError", () => {
	describe("constructor", () => {
		it("sets name, code, message, statusCode, and details", () => {
			const err = new AppError("not_found:chat:chat_not_found", "Chat missing", {
				id: "abc",
			})

			expect(err).toBeInstanceOf(Error)
			expect(err).toBeInstanceOf(AppError)
			expect(err.name).toBe("AppError")
			expect(err.code).toBe("not_found:chat:chat_not_found")
			expect(err.message).toBe("Chat missing")
			expect(err.statusCode).toBe(404)
			expect(err.details).toEqual({ id: "abc" })
		})

		it("resolves statusCode from ERROR_STATUS_MAP", () => {
			const err = new AppError("rate_limit:chat:too_many_requests", "slow down")
			expect(err.statusCode).toBe(ERROR_STATUS_MAP["rate_limit:chat:too_many_requests"])
		})

		it("leaves details undefined when not provided", () => {
			const err = new AppError("unauthorized:auth:no_session", "no session")
			expect(err.details).toBeUndefined()
		})
	})

	describe("toResponse()", () => {
		it("returns a NextResponse with correct status and JSON body", async () => {
			const err = new AppError("forbidden:auth:guest_restricted", "No guests")
			const res = err.toResponse()

			expect(res.status).toBe(403)

			const body = await res.json()
			expect(body).toEqual({
				code: "forbidden:auth:guest_restricted",
				message: "No guests",
			})
		})

		it("attaches Retry-After header for rate-limited responses with retryAfter detail", async () => {
			const err = new AppError("rate_limit:chat:too_many_requests", "Too fast", {
				retryAfter: 30,
			})
			const res = err.toResponse()

			expect(res.status).toBe(429)
			expect(res.headers.get("Retry-After")).toBe("30")
		})

		it("omits Retry-After when statusCode is 429 but retryAfter is missing", async () => {
			const err = new AppError("rate_limit:chat:too_many_requests", "Too fast", {
				other: "data",
			})
			const res = err.toResponse()

			expect(res.status).toBe(429)
			expect(res.headers.get("Retry-After")).toBeNull()
		})

		it("omits Retry-After when retryAfter is zero or negative", async () => {
			const errZero = new AppError("rate_limit:chat:too_many_requests", "wait", {
				retryAfter: 0,
			})
			expect(errZero.toResponse().headers.get("Retry-After")).toBeNull()

			const errNeg = new AppError("rate_limit:chat:too_many_requests", "wait", {
				retryAfter: -5,
			})
			expect(errNeg.toResponse().headers.get("Retry-After")).toBeNull()
		})

		it("omits Retry-After when details is null", async () => {
			const err = new AppError("rate_limit:chat:too_many_requests", "wait", null)
			const res = err.toResponse()

			expect(res.status).toBe(429)
			expect(res.headers.get("Retry-After")).toBeNull()
		})
	})

	describe("factory: unauthorized()", () => {
		it("creates an AppError with 401 status", () => {
			const err = AppError.unauthorized("unauthorized:auth:no_session")
			expect(err.code).toBe("unauthorized:auth:no_session")
			expect(err.statusCode).toBe(401)
			expect(err.message).toBe("Unauthorized")
		})

		it("uses custom message when provided", () => {
			const err = AppError.unauthorized("unauthorized:auth:expired_token", "Token expired")
			expect(err.message).toBe("Token expired")
		})

		it("passes details through", () => {
			const err = AppError.unauthorized("unauthorized:chat:auth_required", undefined, {
				hint: "login",
			})
			expect(err.details).toEqual({ hint: "login" })
		})
	})

	describe("factory: notFound()", () => {
		it("creates an AppError with 404 status and default message", () => {
			const err = AppError.notFound("not_found:chat:chat_not_found")
			expect(err.statusCode).toBe(404)
			expect(err.message).toBe("Not found")
		})

		it("uses custom message when provided", () => {
			const err = AppError.notFound("not_found:artifact:artifact_not_found", "Artifact gone")
			expect(err.message).toBe("Artifact gone")
		})
	})

	describe("factory: forbidden()", () => {
		it("creates an AppError with 403 status and default message", () => {
			const err = AppError.forbidden("forbidden:auth:guest_restricted")
			expect(err.statusCode).toBe(403)
			expect(err.message).toBe("Forbidden")
		})
	})

	describe("factory: badRequest()", () => {
		it("creates an AppError with 400 status and default message", () => {
			const err = AppError.badRequest("bad_request:api:invalid_request_body")
			expect(err.statusCode).toBe(400)
			expect(err.message).toBe("Bad request")
		})

		it("uses custom message when provided", () => {
			const err = AppError.badRequest("bad_request:chat:invalid_model_id", "Unknown model")
			expect(err.message).toBe("Unknown model")
		})
	})

	describe("factory: rateLimited()", () => {
		it("creates an AppError with 429 status and default message", () => {
			const err = AppError.rateLimited("rate_limit:chat:too_many_requests")
			expect(err.statusCode).toBe(429)
			expect(err.message).toBe("Too many requests")
			expect(err.details).toBeUndefined()
		})

		it("attaches retryAfter in details when provided", () => {
			const err = AppError.rateLimited("rate_limit:upload:too_many_requests", "Slow down", 60)
			expect(err.message).toBe("Slow down")
			expect(err.details).toEqual({ retryAfter: 60 })
		})
	})

	describe("factory: internal()", () => {
		it("creates an AppError with 500 status and default message", () => {
			const err = AppError.internal("internal_error:database:query_failed")
			expect(err.statusCode).toBe(500)
			expect(err.message).toBe("Internal server error")
		})
	})

	describe("factory: serviceUnavailable()", () => {
		it("creates an AppError with 503 status and default message", () => {
			const err = AppError.serviceUnavailable("offline:api:service_unavailable")
			expect(err.statusCode).toBe(503)
			expect(err.message).toBe("Service unavailable")
		})
	})

	describe("factory: aiError()", () => {
		it("creates an AppError with 502 status and default message", () => {
			const err = AppError.aiError("ai_error:provider:failed")
			expect(err.statusCode).toBe(502)
			expect(err.message).toBe("AI provider error")
		})

		it("uses custom message and details when provided", () => {
			const err = AppError.aiError("ai_error:artifact:empty_output", "Empty response", {
				model: "gpt-4",
			})
			expect(err.message).toBe("Empty response")
			expect(err.details).toEqual({ model: "gpt-4" })
		})
	})
})
