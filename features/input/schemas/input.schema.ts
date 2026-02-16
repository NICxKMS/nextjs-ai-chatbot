/**
 * Input Feature Schemas
 *
 * Zod validation schemas for input feature.
 *
 * @module features/input/schemas/input.schema
 */

import { z } from "zod"

// =============================================================================
// Attachment Schemas
// =============================================================================

/**
 * Attachment type schema
 */
export const AttachmentTypeSchema = z.enum([
	"image",
	"document",
	"code",
	"audio",
	"video",
])

/**
 * Attachment status schema
 */
export const AttachmentStatusSchema = z.enum([
	"uploading",
	"processing",
	"ready",
	"error",
])

/**
 * Attachment schema
 */
export const AttachmentSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	url: z.string().url(),
	contentType: z.string().min(1),
	type: AttachmentTypeSchema,
	status: AttachmentStatusSchema,
	uploadProgress: z.number().min(0).max(100).optional(),
	previewUrl: z.string().url().optional(),
})

// =============================================================================
// Upload Schemas
// =============================================================================

/**
 * Upload configuration schema
 */
export const UploadConfigSchema = z.object({
	maxFileSize: z.number().positive(),
	maxFiles: z.number().int().positive(),
	allowedTypes: z.array(z.string()),
	uploadEndpoint: z.string(),
})

/**
 * Upload result schema
 */
export const UploadResultSchema = z.object({
	success: z.boolean(),
	attachment: AttachmentSchema.optional(),
	error: z.string().optional(),
})

/**
 * Upload progress schema
 */
export const UploadProgressSchema = z.object({
	loaded: z.number().nonnegative(),
	total: z.number().positive(),
	percentage: z.number().min(0).max(100),
})

// =============================================================================
// Input Schemas
// =============================================================================

/**
 * Input state schema
 */
export const InputStateSchema = z.object({
	value: z.string(),
	attachments: z.array(AttachmentSchema),
	isSubmitting: z.boolean(),
	isUploading: z.boolean(),
})

/**
 * Suggested action schema
 */
export const SuggestedActionSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	description: z.string().optional(),
	prompt: z.string().min(1),
	icon: z.string().optional(),
	category: z.enum(["continue", "clarify", "explore", "task"]),
})

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate file size
 */
export function validateFileSize(
	file: File,
	maxSize: number,
): { valid: boolean; error?: string } {
	if (file.size > maxSize) {
		return {
			valid: false,
			error: `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
		}
	}
	return { valid: true }
}

/**
 * Validate file type
 */
export function validateFileType(
	file: File,
	allowedTypes: string[],
): { valid: boolean; error?: string } {
	if (allowedTypes.length === 0) return { valid: true }

	if (!allowedTypes.includes(file.type)) {
		return {
			valid: false,
			error: "File type not allowed",
		}
	}
	return { valid: true }
}

/**
 * Validate input before submission
 */
export function validateInput(
	value: string,
	attachments: z.infer<typeof AttachmentSchema>[],
): { valid: boolean; error?: string } {
	// Must have either text or attachments
	if (!value.trim() && attachments.length === 0) {
		return {
			valid: false,
			error: "Please enter a message or attach a file",
		}
	}

	// Check for attachments still uploading
	const uploadingCount = attachments.filter(
		(a) => a.status === "uploading",
	).length
	if (uploadingCount > 0) {
		return {
			valid: false,
			error: "Please wait for attachments to finish uploading",
		}
	}

	return { valid: true }
}

// =============================================================================
// Type Exports
// =============================================================================

export type AttachmentType = z.infer<typeof AttachmentTypeSchema>
export type AttachmentStatus = z.infer<typeof AttachmentStatusSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type UploadConfig = z.infer<typeof UploadConfigSchema>
export type UploadResult = z.infer<typeof UploadResultSchema>
export type UploadProgress = z.infer<typeof UploadProgressSchema>
export type InputState = z.infer<typeof InputStateSchema>
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>
