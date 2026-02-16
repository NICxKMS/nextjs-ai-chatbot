/**
 * Artifact Validation Schemas
 *
 * Zod validation schemas for artifact operations including creation,
 * updates, version management, and suggestions.
 *
 * @module features/artifact/schemas
 */

import { z } from "zod"

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Artifact kind/type schema
 */
export const ArtifactKindSchema = z.enum(["text", "code", "image", "sheet"])

/**
 * Artifact status schema
 */
export const ArtifactStatusSchema = z.enum(["streaming", "idle"])

/**
 * UUID validation schema
 */
export const ArtifactUUIDSchema = z.string().uuid()

/**
 * Non-empty string schema
 */
export const ArtifactNonEmptyStringSchema = z
	.string()
	.min(1, "This field is required")

/**
 * Artifact title schema
 */
export const ArtifactTitleSchema = z
	.string()
	.min(1, "Title is required")
	.max(500, "Title must be 500 characters or less")

/**
 * Artifact content schema
 */
export const ArtifactContentSchema = z.string().max(1000000, "Content too long")

// =============================================================================
// Artifact Creation Schemas
// =============================================================================

/**
 * Create artifact schema
 */
export const CreateArtifactSchema = z.object({
	/** Chat ID this artifact belongs to */
	chatId: ArtifactUUIDSchema,
	/** Artifact title */
	title: ArtifactTitleSchema,
	/** Artifact kind/type */
	kind: ArtifactKindSchema,
	/** Artifact content */
	content: ArtifactContentSchema.optional().default(""),
})

/**
 * Artifact ID parameter schema
 */
export const ArtifactIdSchema = z.object({
	/** Artifact ID */
	artifactId: ArtifactUUIDSchema,
})

/**
 * Chat ID parameter schema (for listing artifacts by chat)
 */
export const ChatIdParamSchema = z.object({
	/** Chat ID */
	chatId: ArtifactUUIDSchema,
})

// =============================================================================
// Artifact Update Schemas
// =============================================================================

/**
 * Update artifact schema
 */
export const UpdateArtifactSchema = z.object({
	/** New title (optional) */
	title: ArtifactTitleSchema.optional(),
	/** New content (optional) */
	content: ArtifactContentSchema.optional(),
	/** New kind (optional) */
	kind: ArtifactKindSchema.optional(),
})

/**
 * Update artifact with ID schema (for server actions)
 */
export const UpdateArtifactWithIdSchema = z.object({
	/** Artifact ID to update */
	artifactId: ArtifactUUIDSchema,
	/** Update parameters */
	params: UpdateArtifactSchema,
})

// =============================================================================
// Version Schemas
// =============================================================================

/**
 * Version timestamp schema (for rollback)
 */
export const VersionTimestampSchema = z.object({
	/** Artifact ID */
	artifactId: ArtifactUUIDSchema,
	/** Timestamp to rollback to */
	createdAt: z.coerce.date(),
})

/**
 * Version index schema (for navigation)
 */
export const VersionIndexSchema = z.object({
	/** Artifact ID */
	artifactId: ArtifactUUIDSchema,
	/** Version index (0-based) */
	versionIndex: z.number().int().min(0),
})

/**
 * Version info response schema
 */
export const VersionInfoSchema = z.object({
	/** Artifact ID (same for all versions) */
	id: z.string().uuid(),
	/** Version creation timestamp */
	createdAt: z.coerce.date(),
	/** Title at this version */
	title: z.string(),
	/** Content at this version */
	content: z.string().nullable(),
	/** Kind at this version */
	kind: ArtifactKindSchema,
})

// =============================================================================
// Suggestion Schemas
// =============================================================================

/**
 * Add suggestion schema
 */
export const AddSuggestionSchema = z.object({
	/** Artifact ID */
	artifactId: ArtifactUUIDSchema,
	/** Original text being modified */
	originalText: z.string().min(1, "Original text is required"),
	/** Suggested replacement text */
	suggestedText: z.string().min(1, "Suggested text is required"),
	/** Suggestion description */
	description: z.string().max(1000).optional(),
})

/**
 * Apply suggestion schema
 */
export const ApplySuggestionSchema = z.object({
	/** Suggestion ID */
	suggestionId: ArtifactUUIDSchema,
})

/**
 * Reject suggestion schema
 */
export const RejectSuggestionSchema = z.object({
	/** Suggestion ID */
	suggestionId: ArtifactUUIDSchema,
})

/**
 * Suggestion response schema
 */
export const SuggestionSchema = z.object({
	/** Suggestion ID */
	id: z.string().uuid(),
	/** Artifact ID this suggestion belongs to */
	artifactId: z.string().uuid(),
	/** Original text */
	originalText: z.string(),
	/** Suggested text */
	suggestedText: z.string(),
	/** Description */
	description: z.string().nullable(),
	/** Creation timestamp */
	createdAt: z.coerce.date(),
})

// =============================================================================
// Bounding Box Schema
// =============================================================================

/**
 * Bounding box for artifact animation
 */
export const BoundingBoxSchema = z.object({
	/** Top position in pixels */
	top: z.number(),
	/** Left position in pixels */
	left: z.number(),
	/** Width in pixels */
	width: z.number(),
	/** Height in pixels */
	height: z.number(),
})

// =============================================================================
// UI Artifact Schema
// =============================================================================

/**
 * UI artifact schema (for client-side state)
 */
export const UIArtifactSchema = z.object({
	/** Artifact title */
	title: z.string(),
	/** Document ID */
	documentId: z.string(),
	/** Artifact kind */
	kind: ArtifactKindSchema,
	/** Artifact content */
	content: z.string(),
	/** Visibility state */
	isVisible: z.boolean(),
	/** Current status */
	status: ArtifactStatusSchema,
	/** Bounding box for animation */
	boundingBox: BoundingBoxSchema,
})

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Inferred types from schemas
 */
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>
export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>
export type UpdateArtifactInput = z.infer<typeof UpdateArtifactSchema>
export type UpdateArtifactWithIdInput = z.infer<
	typeof UpdateArtifactWithIdSchema
>
export type ArtifactIdInput = z.infer<typeof ArtifactIdSchema>
export type ChatIdParamInput = z.infer<typeof ChatIdParamSchema>
export type VersionTimestampInput = z.infer<typeof VersionTimestampSchema>
export type VersionIndexInput = z.infer<typeof VersionIndexSchema>
export type VersionInfoInput = z.infer<typeof VersionInfoSchema>
export type AddSuggestionInput = z.infer<typeof AddSuggestionSchema>
export type ApplySuggestionInput = z.infer<typeof ApplySuggestionSchema>
export type RejectSuggestionInput = z.infer<typeof RejectSuggestionSchema>
export type SuggestionInput = z.infer<typeof SuggestionSchema>
export type BoundingBoxInput = z.infer<typeof BoundingBoxSchema>
export type UIArtifactInput = z.infer<typeof UIArtifactSchema>
