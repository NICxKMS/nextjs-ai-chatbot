import { z } from "zod";

/**
 * ==============================================================================
 * SHARED ZOD SCHEMA UTILITIES
 * ==============================================================================
 *
 * Centralized Zod schema validators for reuse across API routes.
 * Use these for consistent validation patterns.
 *
 * Usage:
 * - uuidSchema: Validates UUID format
 * - requiredStringSchema: Non-empty string with optional max length
 * - createUUIDSchema: Creates a UUID schema with custom error message
 */

/**
 * UUID validation schema using Zod's built-in uuid() validator.
 * Standardized across all API routes for consistency.
 */
export const uuidSchema = z.string().uuid();

/**
 * Create a UUID schema with a custom field name for error messages.
 *
 * @param fieldName - Name of the field for error messages
 * @returns Zod schema for UUID validation
 *
 * @example
 * ```typescript
 * const chatIdSchema = createUUIDSchema("chatId");
 * ```
 */
export function createUUIDSchema(fieldName: string) {
    return z
        .string()
        .min(1, `${fieldName} is required`)
        .uuid(`${fieldName} must be a valid UUID`);
}

/**
 * Create a required string schema with optional max length.
 *
 * @param fieldName - Name of the field for error messages
 * @param maxLength - Optional maximum length
 * @returns Zod schema for string validation
 */
export function createRequiredStringSchema(
    fieldName: string,
    maxLength?: number
) {
    let schema = z.string().min(1, `${fieldName} is required`);
    if (maxLength !== undefined) {
        schema = schema.max(
            maxLength,
            `${fieldName} must be at most ${maxLength} characters`
        );
    }
    return schema;
}

/**
 * Visibility type schema for chat visibility.
 */
export const visibilitySchema = z.enum(["public", "private"]);

/**
 * Vote type schema for message voting.
 */
export const voteTypeSchema = z.enum(["up", "down"], {
    errorMap: () => ({ message: "type must be 'up' or 'down'" }),
});

/**
 * Artifact kind schema for document types.
 */
export const artifactKindSchema = z.enum(["text", "code", "image", "sheet"]);
