import { AppError } from "@/lib/errors/app-error"

type DatabaseErrorDetails = Record<string, unknown>

const DATABASE_QUERY_FAILED = "internal_error:database:query_failed"

export function throwDatabaseError(
	error: unknown,
	message: string,
	details?: DatabaseErrorDetails,
): never {
	if (error instanceof AppError) {
		throw error
	}

	throw AppError.internal(
		DATABASE_QUERY_FAILED,
		message,
		details ? { ...details, cause: error } : error,
	)
}

export function requireDatabaseRow<T>(
	row: T | undefined,
	message: string,
	details?: DatabaseErrorDetails,
): T {
	if (row !== undefined) {
		return row
	}

	throw AppError.internal(DATABASE_QUERY_FAILED, message, details)
}
