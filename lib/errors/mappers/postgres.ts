/**
 * PostgreSQL Error Mapper
 * Ref: 01-error-handling-optimal-design.md §7.1
 *
 * Extracted from OldApp: oldapp/lib/errors.ts
 */

import { AppError } from '../app-error';
import type { ErrorCode } from '../types';

interface PostgresError {
  code?: string;
  message?: string;
  detail?: string;
  constraint?: string;
}

/**
 * Map PostgreSQL error code to ErrorCode
 */
function mapPostgresCodeToErrorCode(code?: string): ErrorCode {
  switch (code) {
    // Integrity constraint violations
    case '23505':
      return 'resource:already_exists';
    case '23503':
      return 'validation:foreign_key_violation';
    case '23502':
      return 'validation:missing_field';
    case '23514':
      return 'validation:check_violation';

    // Transaction errors
    case '40P01':
      return 'internal:deadlock';
    case '40001':
      return 'internal:serialization_failure';

    // Permission errors
    case '42501':
      return 'auth:forbidden';

    // Syntax/schema errors
    case '42601':
      return 'internal:sql_syntax';
    case '42P01':
      return 'internal:undefined_table';

    // Connection errors
    case '08006':
    case '08001':
      return 'external:database:connection_failure';

    // Timeout
    case '57014':
    case '57000':
      return 'external:timeout';

    default:
      return 'internal:database';
  }
}

/**
 * Map PostgreSQL error to AppError
 */
export function mapPostgresError(error: unknown): AppError {
  const pgError = error as PostgresError;
  const code = mapPostgresCodeToErrorCode(pgError.code);

  return new AppError({
    code,
    context: {
      pgCode: pgError.code,
      detail: pgError.detail,
      constraint: pgError.constraint,
    },
    cause: error,
  });
}

/**
 * Check if error is a PostgreSQL error
 */
export function isPostgresError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PostgresError).code === 'string' &&
    /^\d{5}$/.test((error as PostgresError).code!)
  );
}
