import { z } from "zod"

// ── Artifact CRUD schemas ───────────────────────────────────
// Validate requests to artifact API routes (P4-T15).
// Schema names: camelCase + Schema suffix per conventions.

/**
 * Create a new artifact.
 * Kind constrained to text/code/sheet — image creation uses a separate flow.
 */
export const createArtifactSchema = z.object({
	title: z.string().min(1).max(200),
	kind: z.enum(["text", "code", "sheet"]),
})

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>

/**
 * Update an existing artifact with AI-generated content.
 */
export const updateArtifactSchema = z.object({
	id: z.string().uuid(),
	description: z.string().min(1).max(2000),
})

export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>

/**
 * Fetch artifact versions by ID.
 */
export const getArtifactSchema = z.object({
	id: z.string().uuid(),
})

export type GetArtifactInput = z.infer<typeof getArtifactSchema>

/**
 * Delete a specific artifact version by ID + timestamp.
 */
export const deleteArtifactVersionSchema = z.object({
	id: z.string().uuid(),
	timestamp: z.string().datetime(),
})

export type DeleteArtifactVersionInput = z.infer<typeof deleteArtifactVersionSchema>

// ── Suggestion response schema ──────────────────────────────
// Validates AI-generated suggestions for text artifacts (P4-T16).
// Max 5 suggestions per response to keep UI manageable.

const suggestionItemSchema = z.object({
	originalText: z.string(),
	suggestedText: z.string(),
	description: z.string(),
})

export const suggestionResponseSchema = z.array(suggestionItemSchema).max(5)

export type SuggestionResponse = z.infer<typeof suggestionResponseSchema>
