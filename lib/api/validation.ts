/**
 * API Validation Helpers
 *
 * Zod schema validation helpers for request body, query params, and route params.
 * Provides consistent validation with typed results and error handling.
 *
 * @module lib/api/validation
 */

import type { ZodError, ZodSchema } from "zod"
import { z } from "zod"
import { ValidationError } from "@/lib/errors"

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of a validation operation.
 * Either contains the validated data or an error.
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; error: ZodError }

// =============================================================================
// Request Body Validation
// =============================================================================

/**
 * Validates and parses a request body with a Zod schema.
 * Throws ValidationError if parsing fails.
 *
 * @template T - The type of the parsed body
 * @param request - The Request object to parse
 * @param schema - Zod schema for validation
 * @returns Promise resolving to the validated and parsed body
 * @throws ValidationError if JSON parsing or schema validation fails
 *
 * @example
 * ```typescript
 * const body = await validateBody(request, z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * }));
 * // body.email and body.password are typed
 * ```
 */
export async function validateBody<T>(
	request: Request,
	schema: ZodSchema<T>,
): Promise<T> {
	let json: unknown

	try {
		json = await request.json()
	} catch {
		throw new ValidationError("Request body must be valid JSON", {
			type: "invalid_json",
		})
	}

	const result = schema.safeParse(json)
	if (!result.success) {
		throw new ValidationError(formatZodErrors(result.error), {
			errors: result.error.flatten().fieldErrors,
		})
	}

	return result.data
}

/**
 * Validates and parses a request body, returning a result object.
 * Does not throw - useful when you want to handle errors explicitly.
 *
 * @template T - The type of the parsed body
 * @param request - The Request object to parse
 * @param schema - Zod schema for validation
 * @returns Promise resolving to a ValidationResult
 *
 * @example
 * ```typescript
 * const result = await validateBodySafe(request, schema);
 * if (!result.success) {
 *   return validationError('Invalid input', result.error.flatten().fieldErrors);
 * }
 * const body = result.data;
 * ```
 */
export async function validateBodySafe<T>(
	request: Request,
	schema: ZodSchema<T>,
): Promise<ValidationResult<T>> {
	let json: unknown

	try {
		json = await request.json()
	} catch {
		return {
			success: false,
			error: new z.ZodError([
				{
					code: "custom",
					message: "Request body must be valid JSON",
					path: [],
				},
			]),
		}
	}

	const result = schema.safeParse(json)
	return result
}

// =============================================================================
// Query Parameter Validation
// =============================================================================

/**
 * Validates URL search params with a Zod schema.
 * Throws ValidationError if validation fails.
 *
 * @template T - The type of the parsed query params
 * @param searchParams - URLSearchParams or Request object
 * @param schema - Zod schema for validation
 * @returns The validated and parsed query params
 * @throws ValidationError if schema validation fails
 *
 * @example
 * ```typescript
 * // In an API route
 * const { page, limit } = validateQuery(request, z.object({
 *   page: z.coerce.number().int().min(1).default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 * }));
 * ```
 */
export function validateQuery<T>(
	searchParams: URLSearchParams | Request,
	schema: ZodSchema<T>,
): T {
	const params =
		searchParams instanceof Request
			? new URL(searchParams.url).searchParams
			: searchParams

	// Convert URLSearchParams to a plain object
	const queryObject: Record<string, string | string[]> = {}
	for (const [key, value] of params.entries()) {
		// Handle multiple values for the same key
		const existing = queryObject[key]
		if (existing) {
			if (Array.isArray(existing)) {
				existing.push(value)
			} else {
				queryObject[key] = [existing, value]
			}
		} else {
			queryObject[key] = value
		}
	}

	const result = schema.safeParse(queryObject)
	if (!result.success) {
		throw new ValidationError(formatZodErrors(result.error), {
			errors: result.error.flatten().fieldErrors,
		})
	}

	return result.data
}

/**
 * Validates URL search params, returning a result object.
 * Does not throw - useful when you want to handle errors explicitly.
 *
 * @template T - The type of the parsed query params
 * @param searchParams - URLSearchParams or Request object
 * @param schema - Zod schema for validation
 * @returns ValidationResult containing data or error
 */
export function validateQuerySafe<T>(
	searchParams: URLSearchParams | Request,
	schema: ZodSchema<T>,
): ValidationResult<T> {
	try {
		const data = validateQuery(searchParams, schema)
		return { success: true, data }
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, error }
		}
		// Re-throw unexpected errors
		throw error
	}
}

// =============================================================================
// Route Parameter Validation
// =============================================================================

/**
 * Validates route params with a Zod schema.
 * Throws ValidationError if validation fails.
 *
 * @template T - The type of the parsed route params
 * @param params - Route params object (from Next.js dynamic routes)
 * @param schema - Zod schema for validation
 * @returns The validated and parsed route params
 * @throws ValidationError if schema validation fails
 *
 * @example
 * ```typescript
 * // In a dynamic route: /api/chat/[id]
 * export async function GET(
 *   request: Request,
 *   { params }: { params: { id: string } }
 * ) {
 *   const { id } = validateParams(params, z.object({
 *     id: z.string().uuid(),
 *   }));
 *   // id is validated as UUID
 * }
 * ```
 */
export function validateParams<T>(
	params: Record<string, string | string[] | undefined>,
	schema: ZodSchema<T>,
): T {
	const result = schema.safeParse(params)
	if (!result.success) {
		throw new ValidationError(formatZodErrors(result.error), {
			errors: result.error.flatten().fieldErrors,
		})
	}

	return result.data
}

/**
 * Validates route params, returning a result object.
 * Does not throw - useful when you want to handle errors explicitly.
 *
 * @template T - The type of the parsed route params
 * @param params - Route params object
 * @param schema - Zod schema for validation
 * @returns ValidationResult containing data or error
 */
export function validateParamsSafe<T>(
	params: Record<string, string | string[] | undefined>,
	schema: ZodSchema<T>,
): ValidationResult<T> {
	const result = schema.safeParse(params)
	return result
}

// =============================================================================
// Form Data Validation
// =============================================================================

/**
 * Validates form data with a Zod schema.
 * Throws ValidationError if validation fails.
 *
 * @template T - The type of the parsed form data
 * @param request - The Request object containing form data
 * @param schema - Zod schema for validation
 * @returns Promise resolving to the validated and parsed form data
 * @throws ValidationError if parsing or schema validation fails
 *
 * @example
 * ```typescript
 * const { file, description } = await validateFormData(request, z.object({
 *   file: z.instanceof(File),
 *   description: z.string().optional(),
 * }));
 * ```
 */
export async function validateFormData<T>(
	request: Request,
	schema: ZodSchema<T>,
): Promise<T> {
	let formData: FormData

	try {
		formData = await request.formData()
	} catch {
		throw new ValidationError("Request body must be valid form data", {
			type: "invalid_form_data",
		})
	}

	// Convert FormData to a plain object
	const formObject: Record<
		string,
		FormDataEntryValue | FormDataEntryValue[]
	> = {}
	for (const [key, value] of formData.entries()) {
		const existing = formObject[key]
		if (existing) {
			if (Array.isArray(existing)) {
				existing.push(value)
			} else {
				formObject[key] = [existing, value]
			}
		} else {
			formObject[key] = value
		}
	}

	const result = schema.safeParse(formObject)
	if (!result.success) {
		throw new ValidationError(formatZodErrors(result.error), {
			errors: result.error.flatten().fieldErrors,
		})
	}

	return result.data
}

// =============================================================================
// Common Schema Helpers
// =============================================================================

/**
 * UUID validation schema.
 * Use for validating UUID path parameters.
 */
export const uuidSchema = z.string().uuid()

/**
 * Creates a UUID schema with a custom field name for error messages.
 *
 * @param fieldName - Name of the field for error messages
 * @returns Zod schema for UUID validation
 */
export function createUUIDSchema(fieldName: string) {
	return z
		.string()
		.min(1, `${fieldName} is required`)
		.uuid(`${fieldName} must be a valid UUID`)
}

/**
 * Creates a required string schema with optional max length.
 *
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Optional maximum length
 * @returns Zod schema for string validation
 */
export function createRequiredStringSchema(
	fieldName: string,
	maxLength?: number,
) {
	let schema = z.string().min(1, `${fieldName} is required`)
	if (maxLength !== undefined) {
		schema = schema.max(
			maxLength,
			`${fieldName} must be at most ${maxLength} characters`,
		)
	}
	return schema
}

/**
 * Pagination query schema with page and limit.
 */
export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Visibility type schema for chat visibility.
 */
export const visibilitySchema = z.enum(["public", "private"])

/**
 * Vote type schema for message voting.
 */
export const voteTypeSchema = z.enum(["up", "down"], {
	errorMap: () => ({ message: "type must be 'up' or 'down'" }),
})

/**
 * Artifact kind schema for document types.
 */
export const artifactKindSchema = z.enum(["text", "code", "image", "sheet"])

/**
 * ID parameter schema for route params.
 */
export const idParamSchema = z.object({
	id: z.string().uuid("ID must be a valid UUID"),
})

/**
 * Chat ID parameter schema for route params.
 */
export const chatIdParamSchema = z.object({
	chatId: z.string().uuid("Chat ID must be a valid UUID"),
})

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Formats Zod errors into a human-readable message.
 *
 * @param error - ZodError to format
 * @returns Formatted error message string
 */
function formatZodErrors(error: ZodError): string {
	const issues = error.issues
	if (issues.length === 0) {
		return "Validation failed"
	}

	if (issues.length === 1) {
		const issue = issues[0]
		if (!issue) return "Validation failed"
		const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
		return `${path}${issue.message}`
	}

	// Multiple errors - summarize
	const messages = issues.slice(0, 3).map((issue) => {
		const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""
		return `${path}${issue.message}`
	})

	const remaining = issues.length - 3
	if (remaining > 0) {
		messages.push(`...and ${remaining} more errors`)
	}

	return messages.join("; ")
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if a value is a valid UUID.
 *
 * @param value - Value to check
 * @returns True if the value is a valid UUID
 */
export function isValidUUID(value: string): boolean {
	return uuidSchema.safeParse(value).success
}

/**
 * Checks if a value is a valid email.
 *
 * @param value - Value to check
 * @returns True if the value is a valid email
 */
export function isValidEmail(value: string): boolean {
	return z.string().email().safeParse(value).success
}

/**
 * Checks if a value is a valid URL.
 *
 * @param value - Value to check
 * @returns True if the value is a valid URL
 */
export function isValidUrl(value: string): boolean {
	return z.string().url().safeParse(value).success
}
