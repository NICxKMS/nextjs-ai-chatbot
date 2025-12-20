/**
 * PostgreSQL Error Mapper
 * @module lib/errors/mappers/postgres
 * 
 * Maps PostgreSQL/Drizzle database errors to AppError instances.
 */

import { AppError } from '../app-error';
import { getMessage } from '../messages';

/**
 * PostgreSQL error codes we handle
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  CONNECTION_ERROR: '08000',
  CONNECTION_REFUSED: '08006',
} as const;

/**
 * Shape of PostgreSQL/Drizzle errors
 */
interface PostgresErrorLike {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
}

/**
 * Check if error has PostgreSQL error shape
 */
export function isPostgresError(error: unknown): error is PostgresErrorLike {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const err = error as Record<string, unknown>;
  return typeof err.code === 'string' && /^\d{5}$/.test(err.code);
}

/**
 * Map PostgreSQL errors to AppError
 * @param error - Unknown error to map
 * @returns AppError instance with appropriate code and context
 */
export function mapPostgresError(error: unknown): AppError {
  if (!isPostgresError(error)) {
    return new AppError({
      code: 'internal:database',
      message: getMessage('internal:database'),
      cause: error instanceof Error ? error : undefined,
      isOperational: false,
    });
  }

  const context = {
    pgCode: error.code,
    constraint: error.constraint,
    table: error.table,
    column: error.column,
  };

  switch (error.code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      return new AppError({
        code: 'resource:conflict',
        message: 'A record with this value already exists',
        context,
        cause: error instanceof Error ? error : undefined,
      });

    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return new AppError({
        code: 'validation:invalid_input',
        message: 'Referenced record does not exist',
        context,
        cause: error instanceof Error ? error : undefined,
      });

    case PG_ERROR_CODES.NOT_NULL_VIOLATION:
      return new AppError({
        code: 'validation:invalid_input',
        message: `Required field "${error.column ?? 'unknown'}" is missing`,
        context,
        cause: error instanceof Error ? error : undefined,
      });

    case PG_ERROR_CODES.CHECK_VIOLATION:
      return new AppError({
        code: 'validation:invalid_input',
        message: 'Value violates check constraint',
        context,
        cause: error instanceof Error ? error : undefined,
      });

    case PG_ERROR_CODES.CONNECTION_ERROR:
    case PG_ERROR_CODES.CONNECTION_REFUSED:
      return new AppError({
        code: 'internal:database',
        message: 'Database connection failed',
        severity: 'fatal',
        isOperational: false,
        context,
        cause: error instanceof Error ? error : undefined,
      });

    default:
      return new AppError({
        code: 'internal:database',
        message: getMessage('internal:database'),
        context,
        cause: error instanceof Error ? error : undefined,
        isOperational: false,
      });
  }
}
