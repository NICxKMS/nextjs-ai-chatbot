import "server-only";

import type { ZodSchema } from "zod";
import { isValidUUID } from "@/lib/constants";
import type { Surface } from "@/lib/errors";
import { ChatSDKError, type ErrorCode } from "@/lib/errors";
import { logWarn } from "@/lib/log";

/**
 * ==============================================================================
 * API VALIDATION UTILITIES
 * ==============================================================================
 *
 * Centralized validation helpers for API routes and server actions.
 * Provides consistent error handling and logging for common validations.
 *
 * Usage:
 * - validateUUID(): Validate UUID format
 * - parseTimestamp(): Parse and validate timestamp strings
 * - parseJsonBody(): Parse and validate JSON request bodies
 */

/**
 * Validate that a value is a valid UUID.
 * Throws ChatSDKError if validation fails.
 *
 * @param value - Value to validate
 * @param paramName - Parameter name for error messages
 * @param surface - Error surface (defaults to "api")
 * @throws ChatSDKError with bad_request:api:invalid_uuid_format
 *
 * @example
 * ```typescript
 * validateUUID(chatId, "chatId");
 * validateUUID(documentId, "documentId", "document");
 * ```
 */
export function validateUUID(
    value: string,
    paramName: string,
    surface: Surface = "api"
): void {
    if (!isValidUUID(value)) {
        throw new ChatSDKError(
            `bad_request:${surface}:invalid_uuid_format` as ErrorCode,
            `Parameter ${paramName} must be a valid UUID`
        );
    }
}

/**
 * Validate UUID for API routes (returns Response on error).
 *
 * @returns undefined if valid, or Response if invalid
 */
export function validateUUIDForRoute(
    value: string,
    paramName: string,
    surface: Surface = "api"
): Response | undefined {
    try {
        validateUUID(value, paramName, surface);
        return;
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Parse and validate a timestamp string.
 * Throws ChatSDKError if parsing fails.
 *
 * @param value - Timestamp string to parse
 * @param paramName - Parameter name for error messages
 * @param surface - Error surface (defaults to "api")
 * @returns Parsed Date object
 * @throws ChatSDKError with bad_request:{surface}:invalid_timestamp
 *
 * @example
 * ```typescript
 * const timestamp = parseTimestamp(createdAt, "createdAt", "chat");
 * ```
 */
export function parseTimestamp(
    value: string,
    paramName: string,
    surface: Surface = "api"
): Date {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        throw new ChatSDKError(
            `bad_request:${surface}:invalid_timestamp` as ErrorCode,
            `Parameter ${paramName} must be a valid date`
        );
    }
    return timestamp;
}

/**
 * Parse timestamp for API routes (returns Response on error).
 *
 * @returns Parsed Date if valid, or Response if invalid
 */
export function parseTimestampForRoute(
    value: string,
    paramName: string,
    surface: Surface = "api"
): Date | Response {
    try {
        return parseTimestamp(value, paramName, surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Parse and validate a required query parameter.
 * Throws ChatSDKError if parameter is missing.
 *
 * @param searchParams - URL search params
 * @param paramName - Parameter name to retrieve
 * @param surface - Error surface (defaults to "api")
 * @returns Parameter value
 * @throws ChatSDKError with bad_request:api:missing_{paramName}
 *
 * @example
 * ```typescript
 * const id = requireQueryParam(searchParams, "id");
 * ```
 */
export function requireQueryParam(
    searchParams: URLSearchParams,
    paramName: string,
    surface: Surface = "api"
): string {
    const value = searchParams.get(paramName);
    if (!value) {
        throw new ChatSDKError(
            `bad_request:${surface}:missing_${paramName}` as ErrorCode,
            `Parameter ${paramName} is required.`
        );
    }
    return value;
}

/**
 * Require query param for API routes (returns Response on error).
 *
 * @returns Parameter value if present, or Response if missing
 */
export function requireQueryParamForRoute(
    searchParams: URLSearchParams,
    paramName: string,
    surface: Surface = "api"
): string | Response {
    try {
        return requireQueryParam(searchParams, paramName, surface);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Parse and validate JSON request body with Zod schema.
 * Logs warning and throws ChatSDKError if parsing/validation fails.
 *
 * @param request - Request object
 * @param schema - Zod schema for validation
 * @param route - Route name for logging
 * @returns Parsed and validated body
 * @throws ChatSDKError with bad_request:api:invalid_json
 *
 * @example
 * ```typescript
 * const body = await parseJsonBody(request, mySchema, "chat");
 * ```
 */
export async function parseJsonBody<T>(
    request: Request,
    schema: ZodSchema<T>,
    route: string
): Promise<T> {
    let json: unknown;

    try {
        json = await request.json();
    } catch (error) {
        logWarn("parse_request_body", `Failed to parse JSON in ${route}`, {
            error,
            route,
        });
        throw new ChatSDKError(
            "bad_request:api:invalid_json",
            "Request body must be valid JSON"
        );
    }

    const result = schema.safeParse(json);
    if (!result.success) {
        const errorMessage = result.error.errors
            .map((e) => e.message)
            .join(", ");
        logWarn("parse_request_body", `Validation failed in ${route}`, {
            errors: result.error.errors,
            route,
        });
        throw new ChatSDKError(
            "bad_request:api:invalid_json",
            errorMessage || "Invalid request body"
        );
    }

    return result.data;
}

/**
 * Parse JSON body for API routes (returns Response on error).
 *
 * @returns Parsed body if valid, or Response if invalid
 */
export async function parseJsonBodyForRoute<T>(
    request: Request,
    schema: ZodSchema<T>,
    route: string
): Promise<T | Response> {
    try {
        return await parseJsonBody(request, schema, route);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}

/**
 * Parse form data from request.
 * Logs warning and throws ChatSDKError if parsing fails.
 *
 * @param request - Request object
 * @param route - Route name for logging
 * @returns Parsed FormData
 * @throws ChatSDKError with bad_request:api:invalid_form_payload
 *
 * @example
 * ```typescript
 * const formData = await parseFormData(request, "upload");
 * ```
 */
export async function parseFormData(
    request: Request,
    route: string
): Promise<FormData> {
    try {
        return await request.formData();
    } catch (error) {
        logWarn("parse_form_data", `Failed to parse form data in ${route}`, {
            error,
            route,
        });
        throw new ChatSDKError(
            "bad_request:api:invalid_form_payload",
            "Request body must be valid form data"
        );
    }
}

/**
 * Parse form data for API routes (returns Response on error).
 *
 * @returns FormData if valid, or Response if invalid
 */
export async function parseFormDataForRoute(
    request: Request,
    route: string
): Promise<FormData | Response> {
    try {
        return await parseFormData(request, route);
    } catch (error) {
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        throw error;
    }
}
