// Flow: error-handling | Step: status-resolution
import { describe, expect, it } from "vitest"

import { ERROR_STATUS_MAP, type ErrorCode } from "@/lib/errors/codes"

describe("ERROR_STATUS_MAP", () => {
	it("maps all unauthorized codes to 401", () => {
		const codes: ErrorCode[] = [
			"unauthorized:auth:no_session",
			"unauthorized:auth:expired_token",
			"unauthorized:chat:auth_required",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(401)
		}
	})

	it("maps all forbidden codes to 403", () => {
		const codes: ErrorCode[] = [
			"forbidden:auth:guest_restricted",
			"forbidden:artifact:owner_mismatch",
			"forbidden:chat:owner_mismatch",
			"forbidden:api:csrf_failed",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(403)
		}
	})

	it("maps all bad_request codes to 400", () => {
		const codes: ErrorCode[] = [
			"bad_request:api:invalid_request_body",
			"bad_request:api:file_too_large",
			"bad_request:api:file_type_unsupported",
			"bad_request:api:no_file_uploaded",
			"bad_request:chat:invalid_model_id",
			"bad_request:validation:invalid_input",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(400)
		}
	})

	it("maps all not_found codes to 404", () => {
		const codes: ErrorCode[] = [
			"not_found:chat:chat_not_found",
			"not_found:artifact:artifact_not_found",
			"not_found:vote:message_not_in_chat",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(404)
		}
	})

	it("maps all rate_limit codes to 429", () => {
		const codes: ErrorCode[] = [
			"rate_limit:artifact:too_many_requests",
			"rate_limit:chat:too_many_requests",
			"rate_limit:history:too_many_requests",
			"rate_limit:suggestions:too_many_requests",
			"rate_limit:upload:too_many_requests",
			"rate_limit:vote:too_many_requests",
			"rate_limit:auth:login_too_many",
			"rate_limit:auth:register_too_many",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(429)
		}
	})

	it("maps ai_error codes to 502", () => {
		const codes: ErrorCode[] = ["ai_error:artifact:empty_output", "ai_error:provider:failed"]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(502)
		}
	})

	it("maps offline codes to 503", () => {
		const codes: ErrorCode[] = [
			"offline:api:service_unavailable",
			"offline:upload:storage_unavailable",
		]
		for (const code of codes) {
			expect(ERROR_STATUS_MAP[code]).toBe(503)
		}
	})

	it("maps internal_error codes to 500", () => {
		expect(ERROR_STATUS_MAP["internal_error:database:query_failed"]).toBe(500)
	})

	it("covers all defined error codes (no missing mappings)", () => {
		// Every entry should map to a positive integer HTTP status
		const entries = Object.entries(ERROR_STATUS_MAP)
		expect(entries.length).toBeGreaterThan(0)

		for (const [_code, status] of entries) {
			expect(typeof status).toBe("number")
			expect(status).toBeGreaterThanOrEqual(400)
			expect(status).toBeLessThan(600)
		}
	})

	it("has exactly 29 error codes", () => {
		expect(Object.keys(ERROR_STATUS_MAP)).toHaveLength(29)
	})
})
