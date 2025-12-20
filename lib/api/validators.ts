/**
 * API Validators
 * @module lib/api/validators
 *
 * Request validation utilities using Zod:
 * - Body parsing and validation
 * - Search parameter validation
 * - Path parameter validation
 *
 * All validators return parsed data or throw AppError.
 */

import 'server-only';

import type { z, ZodError, ZodSchema } from 'zod';
import { AppError } from '@/lib/errors';

/**
 * Format Zod errors into a readable message
 */
function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return issues.join('; ');
}

/**
 * Get the first field with an error from ZodError
 */
function getFirstErrorField(error: ZodError): string | undefined {
  const firstIssue = error.issues[0];
  if (firstIssue && firstIssue.path.length > 0) {
    return String(firstIssue.path[0]);
  }
  return undefined;
}

/**
 * Validate and parse request JSON body
 * @param request - Incoming request
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 * @throws AppError if body is invalid or doesn't match schema
 *
 * @example
 * ```ts
 * const data = await validateBody(request, createChatSchema);
 * // data is now typed as z.infer<typeof createChatSchema>
 * ```
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new AppError({
      code: 'validation:invalid_input',
      message: 'Invalid JSON body',
    });
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: formatZodError(result.error),
      context: {
        field: getFirstErrorField(result.error),
        errors: result.error.issues,
      },
    });
  }

  return result.data;
}

/**
 * Validate and parse URL search parameters
 * @param request - Incoming request (or URL)
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 * @throws AppError if parameters don't match schema
 *
 * @example
 * ```ts
 * const params = validateSearchParams(request, paginationSchema);
 * // params is now typed as { page: number, limit: number }
 * ```
 */
export function validateSearchParams<T extends ZodSchema>(
  request: Request | URL,
  schema: T
): z.infer<T> {
  const url = request instanceof URL ? request : new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const result = schema.safeParse(params);

  if (!result.success) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: formatZodError(result.error),
      context: {
        field: getFirstErrorField(result.error),
        params,
        errors: result.error.issues,
      },
    });
  }

  return result.data;
}

/**
 * Validate and parse a path parameter
 * @param value - Raw path parameter value
 * @param schema - Zod schema to validate against
 * @param paramName - Parameter name for error messages
 * @returns Parsed and validated value
 * @throws AppError if parameter doesn't match schema
 *
 * @example
 * ```ts
 * const chatId = validatePathParam(params.id, uuidSchema, 'chatId');
 * // chatId is now a validated UUID string
 * ```
 */
export function validatePathParam<T extends ZodSchema>(
  value: string | undefined,
  schema: T,
  paramName: string = 'id'
): z.infer<T> {
  if (value === undefined) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: `Missing path parameter: ${paramName}`,
      context: { param: paramName },
    });
  }

  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError({
      code: 'validation:invalid_input',
      message: `Invalid ${paramName}: ${formatZodError(result.error)}`,
      context: {
        param: paramName,
        value,
        errors: result.error.issues,
      },
    });
  }

  return result.data;
}
