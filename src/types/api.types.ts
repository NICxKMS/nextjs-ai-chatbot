/**
 * API Response Types
 * @module @/src/types/api.types
 *
 * Standardized response shapes for all API endpoints.
 */

export interface ApiMeta {
	timestamp: string;
	requestId?: string;
	duration?: number;
}

export interface ApiResponse<T> {
	success: true;
	data: T;
	meta?: ApiMeta;
}

export interface ApiErrorDetail {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	fieldErrors?: Record<string, string[]>;
}

export interface ApiErrorResponse {
	success: false;
	error: ApiErrorDetail;
	meta?: ApiMeta;
}

export interface PaginationInfo {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
	success: true;
	data: T[];
	pagination: PaginationInfo;
	meta?: ApiMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
export type PaginatedApiResult<T> = PaginatedResponse<T> | ApiErrorResponse;

// Factory Functions
export function apiSuccess<T>(
	data: T,
	meta?: Partial<ApiMeta>,
): ApiResponse<T> {
	return {
		success: true,
		data,
		meta: {
			timestamp: new Date().toISOString(),
			...meta,
		},
	};
}

export function apiError(
	code: string,
	message: string,
	details?: Record<string, unknown>,
): ApiErrorResponse {
	return {
		success: false,
		error: { code, message, details },
		meta: { timestamp: new Date().toISOString() },
	};
}

export function apiPaginated<T>(
	data: T[],
	pagination: PaginationInfo,
): PaginatedResponse<T> {
	return {
		success: true,
		data,
		pagination,
		meta: { timestamp: new Date().toISOString() },
	};
}

// Type Guards
export function isApiSuccess<T>(
	response: ApiResult<T>,
): response is ApiResponse<T> {
	return response.success === true;
}

export function isApiError<T>(
	response: ApiResult<T>,
): response is ApiErrorResponse {
	return response.success === false;
}

// Common Error Codes
export const API_ERROR_CODES = {
	BAD_REQUEST: "BAD_REQUEST",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	CONFLICT: "CONFLICT",
	RATE_LIMITED: "RATE_LIMITED",
	INTERNAL_ERROR: "INTERNAL_ERROR",
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
	CHAT_NOT_FOUND: "CHAT_NOT_FOUND",
	MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
	DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
	USER_NOT_FOUND: "USER_NOT_FOUND",
	INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
	USER_EXISTS: "USER_EXISTS",
} as const;

export type ApiErrorCode =
	(typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
