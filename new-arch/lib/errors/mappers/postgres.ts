import "server-only";

import { AppError } from "../app-error";
import { ErrorCodes } from "../codes";

/**
 * PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES = {
    // Class 23 — Integrity Constraint Violation
    UNIQUE_VIOLATION: "23505",
    FOREIGN_KEY_VIOLATION: "23503",
    NOT_NULL_VIOLATION: "23502",
    CHECK_VIOLATION: "23514",

    // Class 42 — Syntax Error or Access Rule Violation
    UNDEFINED_TABLE: "42P01",
    UNDEFINED_COLUMN: "42703",
    SYNTAX_ERROR: "42601",

    // Class 08 — Connection Exception
    CONNECTION_EXCEPTION: "08000",
    CONNECTION_FAILURE: "08006",
    SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION: "08001",

    // Class 53 — Insufficient Resources
    OUT_OF_MEMORY: "53200",
    DISK_FULL: "53100",
    TOO_MANY_CONNECTIONS: "53300",

    // Class 57 — Operator Intervention
    ADMIN_SHUTDOWN: "57P01",
    CRASH_SHUTDOWN: "57P02",
    CANNOT_CONNECT_NOW: "57P03",

    // Class 40 — Transaction Rollback
    DEADLOCK_DETECTED: "40P01",
    SERIALIZATION_FAILURE: "40001",
} as const;

type PostgresError = {
    code?: string;
    detail?: string;
    constraint?: string;
    table?: string;
    column?: string;
};

function isPostgresError(error: unknown): error is PostgresError & Error {
    return (
        error instanceof Error &&
        typeof (error as PostgresError).code === "string"
    );
}

/**
 * Maps PostgreSQL/Drizzle errors to AppError
 */
export function mapPostgresError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (!isPostgresError(error)) {
        const cause = error instanceof Error ? error : null;
        return new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown database error",
            ...(cause && { cause }),
        });
    }

    const pgCode = error.code;
    const context = {
        pgCode,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
    };

    // Unique violation - duplicate key
    if (pgCode === PG_ERROR_CODES.UNIQUE_VIOLATION) {
        return new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: error.constraint
                ? `Duplicate value violates constraint: ${error.constraint}`
                : "Duplicate value violates unique constraint",
            context,
            cause: error,
        });
    }

    // Foreign key violation - referenced record doesn't exist
    if (pgCode === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: "Referenced record does not exist",
            context,
            cause: error,
        });
    }

    // Not null violation
    if (pgCode === PG_ERROR_CODES.NOT_NULL_VIOLATION) {
        return new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: error.column
                ? `Required field missing: ${error.column}`
                : "Required field is missing",
            context,
            cause: error,
        });
    }

    // Connection errors
    if (
        pgCode === PG_ERROR_CODES.CONNECTION_EXCEPTION ||
        pgCode === PG_ERROR_CODES.CONNECTION_FAILURE ||
        pgCode === PG_ERROR_CODES.SQLCLIENT_UNABLE_TO_ESTABLISH_CONNECTION ||
        pgCode === PG_ERROR_CODES.CANNOT_CONNECT_NOW
    ) {
        return new AppError(ErrorCodes.DB_CONNECTION_ERROR, {
            message: "Database connection failed",
            severity: "fatal",
            context,
            cause: error,
        });
    }

    // Resource exhaustion
    if (
        pgCode === PG_ERROR_CODES.TOO_MANY_CONNECTIONS ||
        pgCode === PG_ERROR_CODES.OUT_OF_MEMORY ||
        pgCode === PG_ERROR_CODES.DISK_FULL
    ) {
        return new AppError(ErrorCodes.DB_CONNECTION_ERROR, {
            message: "Database resources exhausted",
            severity: "fatal",
            context,
            cause: error,
        });
    }

    // Deadlock or serialization failure - retryable
    if (
        pgCode === PG_ERROR_CODES.DEADLOCK_DETECTED ||
        pgCode === PG_ERROR_CODES.SERIALIZATION_FAILURE
    ) {
        return new AppError(ErrorCodes.DB_QUERY_ERROR, {
            message: "Transaction conflict, please retry",
            context: { ...context, retryable: true },
            cause: error,
        });
    }

    // Schema errors (undefined table/column)
    if (
        pgCode === PG_ERROR_CODES.UNDEFINED_TABLE ||
        pgCode === PG_ERROR_CODES.UNDEFINED_COLUMN
    ) {
        return new AppError(ErrorCodes.INTERNAL_ERROR, {
            message: "Database schema error",
            severity: "fatal",
            context,
            cause: error,
        });
    }

    // Default: generic query error
    return new AppError(ErrorCodes.DB_QUERY_ERROR, {
        message: error.message || "Database query failed",
        context,
        cause: error,
    });
}
