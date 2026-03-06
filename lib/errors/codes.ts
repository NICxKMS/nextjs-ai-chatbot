/**
 * Error code definitions for the application.
 *
 * Codes follow `type:surface:detail` naming convention.
 */

export type ErrorCode =
	// ── Auth errors ──
	| "unauthorized:auth:no_session"
	| "unauthorized:auth:expired_token"
	| "unauthorized:chat:auth_required"
	| "forbidden:auth:guest_restricted"
	| "forbidden:artifact:owner_mismatch"
	| "forbidden:chat:owner_mismatch"
	// ── Request validation errors ──
	| "bad_request:api:invalid_request_body"
	| "bad_request:api:file_too_large"
	| "bad_request:api:file_type_unsupported"
	| "bad_request:api:no_file_uploaded"
	| "bad_request:chat:invalid_model_id"
	| "bad_request:validation:invalid_input"
	// ── Not found errors ──
	| "not_found:chat:chat_not_found"
	| "not_found:artifact:artifact_not_found"
	| "not_found:vote:message_not_in_chat"
	// ── Rate limiting errors ──
	| "rate_limit:chat:too_many_requests"
	| "rate_limit:upload:too_many_requests"
	| "rate_limit:vote:too_many_requests"
	| "rate_limit:auth:login_too_many"
	| "rate_limit:auth:register_too_many"
	// ── CSRF errors ──
	| "forbidden:api:csrf_failed"
	// ── Infrastructure errors ──
	| "ai_error:artifact:empty_output"
	| "ai_error:provider:failed"
	| "offline:api:service_unavailable"
	| "internal_error:database:query_failed"

/** Maps each ErrorCode to its HTTP status number. */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
	"unauthorized:auth:no_session": 401,
	"unauthorized:auth:expired_token": 401,
	"unauthorized:chat:auth_required": 401,
	"forbidden:auth:guest_restricted": 403,
	"forbidden:artifact:owner_mismatch": 403,
	"forbidden:api:csrf_failed": 403,
	"forbidden:chat:owner_mismatch": 403,
	"bad_request:api:invalid_request_body": 400,
	"bad_request:api:file_too_large": 400,
	"bad_request:api:file_type_unsupported": 400,
	"bad_request:api:no_file_uploaded": 400,
	"bad_request:chat:invalid_model_id": 400,
	"bad_request:validation:invalid_input": 400,
	"not_found:chat:chat_not_found": 404,
	"not_found:artifact:artifact_not_found": 404,
	"not_found:vote:message_not_in_chat": 404,
	"rate_limit:chat:too_many_requests": 429,
	"rate_limit:upload:too_many_requests": 429,
	"rate_limit:vote:too_many_requests": 429,
	"rate_limit:auth:login_too_many": 429,
	"rate_limit:auth:register_too_many": 429,
	"ai_error:artifact:empty_output": 502,
	"ai_error:provider:failed": 502,
	"offline:api:service_unavailable": 503,
	"internal_error:database:query_failed": 500,
}
