import { z } from "zod"

// ── Artifact CRUD schemas ───────────────────────────────────
// Validate requests to artifact API routes (P4-T15).
// Schema names: camelCase + Schema suffix per conventions.

const artifactIdSchema = z.string().uuid()
const artifactTimestampSchema = z.string().datetime()
const artifactTitleSchema = z.string().min(1).max(200)
const artifactViewSchema = z.enum(["latest", "versions"])
const createArtifactKindSchema = z.enum(["text", "code", "sheet"])
const saveArtifactKindSchema = z.enum(["text", "code", "image", "sheet"])

/**
 * Create a new artifact.
 * Kind constrained to text/code/sheet — image creation uses a separate flow.
 */
export const createArtifactSchema = z.object({
	title: artifactTitleSchema,
	kind: createArtifactKindSchema,
})

export type CreateArtifactInput = z.infer<typeof createArtifactSchema>

/**
 * Update an existing artifact with AI-generated content.
 */
export const updateArtifactSchema = z.object({
	id: artifactIdSchema,
	description: z.string().min(1).max(2000),
})

export type UpdateArtifactInput = z.infer<typeof updateArtifactSchema>

/**
 * Fetch artifact versions by ID.
 */
export const getArtifactSchema = z.object({
	id: artifactIdSchema,
	view: artifactViewSchema.optional(),
})

export type GetArtifactInput = z.infer<typeof getArtifactSchema>

/**
 * Delete a specific artifact version by ID + timestamp.
 */
export const deleteArtifactVersionSchema = z.object({
	id: artifactIdSchema,
	timestamp: artifactTimestampSchema,
})

export type DeleteArtifactVersionInput = z.infer<typeof deleteArtifactVersionSchema>

// ── Shared artifact route contracts ─────────────────────────

/**
 * Persist an artifact version from the artifact route.
 */
export const saveArtifactSchema = z.object({
	mode: z.literal("save"),
	id: artifactIdSchema,
	title: artifactTitleSchema,
	content: z.string(),
	kind: saveArtifactKindSchema,
	chatId: artifactIdSchema,
})

export type SaveArtifactInput = z.infer<typeof saveArtifactSchema>

/**
 * Restore an artifact back to a specific version timestamp.
 */
export const restoreArtifactSchema = z.object({
	mode: z.literal("restore"),
	id: artifactIdSchema,
	timestamp: artifactTimestampSchema,
})

export type RestoreArtifactInput = z.infer<typeof restoreArtifactSchema>

export const artifactPostBodySchema = z.discriminatedUnion("mode", [
	saveArtifactSchema,
	restoreArtifactSchema,
])

export type ArtifactPostBodyInput = z.infer<typeof artifactPostBodySchema>
