/**
 * Error code definitions for the application.
 *
 * Codes follow `type:surface:detail` naming convention.
 * No ACTIVATE_GATEWAY or credit/quota error codes (removed per redesign).
 */

export type ErrorCode =
	// ── Auth errors ──
	| "unauthorized:auth:no_session"
	| "unauthorized:auth:expired_token"
	| "unauthorized:chat:auth_required"
	| "forbidden:auth:guest_restricted"
	| "forbidden:chat:owner_mismatch"
	// ── Request validation errors ──
	| "bad_request:api:invalid_request_body"
	| "bad_request:chat:invalid_model_id"
	| "bad_request:artifact:invalid_kind"
	| "bad_request:validation:invalid_input"
	// ── Not found errors ──
	| "not_found:chat:chat_not_found"
	| "not_found:artifact:artifact_not_found"
	// ── Rate limiting errors ──
	| "rate_limit:chat:too_many_requests"
	| "rate_limit:chat:daily_limit_exceeded"
	| "rate_limit:api:too_many_requests"
	// ── Infrastructure errors ──
	| "ai_error:provider:failed"
	| "offline:api:service_unavailable"
	| "internal_error:database:query_failed"
	| "internal_error:cache:operation_failed"

/** Maps each ErrorCode to its HTTP status number. */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
	"unauthorized:auth:no_session": 401,
	"unauthorized:auth:expired_token": 401,
	"unauthorized:chat:auth_required": 401,
	"forbidden:auth:guest_restricted": 403,
	"forbidden:chat:owner_mismatch": 403,
	"bad_request:api:invalid_request_body": 400,
	"bad_request:chat:invalid_model_id": 400,
	"bad_request:artifact:invalid_kind": 400,
	"bad_request:validation:invalid_input": 400,
	"not_found:chat:chat_not_found": 404,
	"not_found:artifact:artifact_not_found": 404,
	"rate_limit:chat:too_many_requests": 429,
	"rate_limit:chat:daily_limit_exceeded": 429,
	"rate_limit:api:too_many_requests": 429,
	"ai_error:provider:failed": 502,
	"offline:api:service_unavailable": 503,
	"internal_error:database:query_failed": 500,
	"internal_error:cache:operation_failed": 500,
}
