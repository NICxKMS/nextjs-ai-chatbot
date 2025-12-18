/**
 * Request Validation
 * @module new-arch/lib/api/validation
 *
 * Zod-based validation utilities for API requests.
 */

import type { z } from "zod";
import { AppError } from "../errors";
import { ErrorCodes } from "../errors/codes";
import type {
    GuardResult,
    Surface,
    ValidationError,
    ValidationResult,
} from "./types";

// ============================================================================
// Body Validation
// ============================================================================

/**
 * Parse and validate JSON request body
 */
export async function parseJsonBody<T>(
    request: Request,
    schema: z.ZodType<T>,
    surface: Surface
): Promise<GuardResult<T>> {
    try {
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
            return {
                ok: false,
                error: new AppError(ErrorCodes.BAD_REQUEST, {
                    message: "Content-Type must be application/json",
                    context: { surface },
                }),
            };
        }

        const text = await request.text();
        if (!text) {
            return {
                ok: false,
                error: new AppError(ErrorCodes.BAD_REQUEST, {
                    message: "Request body is empty",
                    context: { surface },
                }),
            };
        }

        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch {
            return {
                ok: false,
                error: new AppError(ErrorCodes.BAD_REQUEST, {
                    message: "Invalid JSON in request body",
                    context: { surface },
                }),
            };
        }

        const result = schema.safeParse(json);
        if (!result.success) {
            const errors = formatZodErrors(result.error);
            return {
                ok: false,
                error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                    message: errors[0]?.message ?? "Validation failed",
                    context: { surface, validationErrors: errors },
                }),
            };
        }

        return { ok: true, value: result.data };
    } catch (err) {
        return {
            ok: false,
            error: AppError.from(err, ErrorCodes.BAD_REQUEST),
        };
    }
}

/**
 * Parse and validate form data
 */
export async function parseFormData<T>(
    request: Request,
    schema: z.ZodType<T>,
    surface: Surface
): Promise<GuardResult<T>> {
    try {
        const contentType = request.headers.get("content-type");
        if (
            !(
                contentType?.includes("multipart/form-data") ||
                contentType?.includes("application/x-www-form-urlencoded")
            )
        ) {
            return {
                ok: false,
                error: new AppError(ErrorCodes.BAD_REQUEST, {
                    message:
                        "Content-Type must be multipart/form-data or application/x-www-form-urlencoded",
                    context: { surface },
                }),
            };
        }

        const formData = await request.formData();
        const data: Record<string, unknown> = {};

        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                data[key] = value;
            } else if (key.endsWith("[]")) {
                // Handle array fields (key[])
                const arrayKey = key.slice(0, -2);
                if (!Array.isArray(data[arrayKey])) {
                    data[arrayKey] = [];
                }
                (data[arrayKey] as unknown[]).push(value);
            } else {
                data[key] = value;
            }
        }

        const result = schema.safeParse(data);
        if (!result.success) {
            const errors = formatZodErrors(result.error);
            return {
                ok: false,
                error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                    message: errors[0]?.message ?? "Validation failed",
                    context: { surface, validationErrors: errors },
                }),
            };
        }

        return { ok: true, value: result.data };
    } catch (err) {
        return {
            ok: false,
            error: AppError.from(err, ErrorCodes.BAD_REQUEST),
        };
    }
}

// ============================================================================
// Query Validation
// ============================================================================

/**
 * Parse and validate query parameters
 */
export function parseQuery<T>(
    searchParams: URLSearchParams,
    schema: z.ZodType<T>,
    surface: Surface
): GuardResult<T> {
    const params: Record<string, string | string[]> = {};

    for (const [key, value] of searchParams.entries()) {
        const existing = params[key];
        if (existing !== undefined) {
            // Convert to array for multiple values
            if (Array.isArray(existing)) {
                existing.push(value);
            } else {
                params[key] = [existing, value];
            }
        } else {
            params[key] = value;
        }
    }

    const result = schema.safeParse(params);
    if (!result.success) {
        const errors = formatZodErrors(result.error);
        return {
            ok: false,
            error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: errors[0]?.message ?? "Invalid query parameters",
                context: { surface, validationErrors: errors },
            }),
        };
    }

    return { ok: true, value: result.data };
}

/**
 * Get required query parameter
 */
export function requireQueryParam(
    searchParams: URLSearchParams,
    name: string,
    surface: Surface
): GuardResult<string> {
    const value = searchParams.get(name);
    if (!value) {
        return {
            ok: false,
            error: new AppError(ErrorCodes.BAD_REQUEST, {
                message: `Missing required query parameter: ${name}`,
                context: { surface, param: name },
            }),
        };
    }
    return { ok: true, value };
}

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function validateUUID(
    value: string,
    surface: Surface,
    fieldName = "id"
): GuardResult<string> {
    if (!UUID_REGEX.test(value)) {
        return {
            ok: false,
            error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: `Invalid UUID format for ${fieldName}`,
                context: { surface, field: fieldName },
            }),
        };
    }
    return { ok: true, value };
}

// ============================================================================
// Timestamp Validation
// ============================================================================

/**
 * Parse and validate timestamp
 */
export function parseTimestamp(
    value: string,
    surface: Surface,
    fieldName = "timestamp"
): GuardResult<Date> {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return {
            ok: false,
            error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: `Invalid timestamp format for ${fieldName}`,
                context: { surface, field: fieldName },
            }),
        };
    }
    return { ok: true, value: date };
}

// ============================================================================
// File Validation
// ============================================================================

type FileValidationOptions = {
    maxSize?: number; // bytes
    allowedTypes?: string[]; // MIME types
};

/**
 * Validate uploaded file
 */
export function validateFile(
    file: File,
    surface: Surface,
    options?: FileValidationOptions
): GuardResult<File> {
    const maxSize = options?.maxSize ?? 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options?.allowedTypes;

    if (file.size > maxSize) {
        return {
            ok: false,
            error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`,
                context: { surface, fileSize: file.size, maxSize },
            }),
        };
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
        return {
            ok: false,
            error: new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
                context: { surface, fileType: file.type, allowedTypes },
            }),
        };
    }

    return { ok: true, value: file };
}

// ============================================================================
// Sync Validation Helpers
// ============================================================================

/**
 * Validate data synchronously and return ValidationResult
 */
export function validate<T>(
    data: unknown,
    schema: z.ZodType<T>
): ValidationResult<T> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { valid: true, data: result.data };
    }
    return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Assert validation passes (throws on failure)
 */
export function assertValid<T>(
    data: unknown,
    schema: z.ZodType<T>,
    surface: Surface
): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = formatZodErrors(result.error);
        throw new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: errors[0]?.message ?? "Validation failed",
            context: { surface, validationErrors: errors },
        });
    }
    return result.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format Zod errors into ValidationError array
 */
function formatZodErrors(error: z.ZodError): ValidationError[] {
    return error.errors.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
    }));
}

/**
 * Extract search params from request URL
 */
export function getSearchParams(request: Request): URLSearchParams {
    return new URL(request.url).searchParams;
}
