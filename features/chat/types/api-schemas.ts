/**
 * API Response Schemas
 *
 * Zod schemas for validating API responses in chat feature.
 * Ensures type safety at runtime for API data.
 *
 * @module features/chat/types/api-schemas
 */

import { z } from "zod";

// =============================================================================
// FILE UPLOAD SCHEMA
// =============================================================================

/**
 * Schema for file upload API response.
 * Matches the response from /api/files/upload endpoint.
 */
export const fileUploadResponseSchema = z.object({
    /** Public URL of the uploaded file */
    url: z.string().url(),
    /** Storage pathname of the file */
    pathname: z.string(),
    /** MIME content type of the file */
    contentType: z.string(),
    /** Sanitized filename */
    filename: z.string(),
});

/**
 * Inferred type from the file upload response schema.
 */
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;

/**
 * Schema for file upload error response.
 */
export const fileUploadErrorSchema = z.object({
    /** Error message from the API */
    error: z.string().optional(),
});

/**
 * Inferred type from the file upload error schema.
 */
export type FileUploadError = z.infer<typeof fileUploadErrorSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Result type for API response validation.
 */
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: z.ZodError };

/**
 * Validate a file upload response.
 *
 * @param data - Raw response data to validate
 * @returns Validation result with typed data or error
 */
export function validateFileUploadResponse(
    data: unknown
): ValidationResult<FileUploadResponse> {
    const result = fileUploadResponseSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}
