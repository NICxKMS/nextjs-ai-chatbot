import { z } from "zod"

/** Chat visibility — either publicly shared or private to the owner. */
export type VisibilityType = "public" | "private"

/**
 * Zod schema for visibility update request validation.
 * chatId must be a valid UUID, visibility is "public" or "private".
 */
export const updateVisibilitySchema = z.object({
	chatId: z.string().uuid(),
	visibility: z.enum(["public", "private"]),
})

/** Inferred type for visibility update requests (validated input). */
export type UpdateVisibilityRequest = z.infer<typeof updateVisibilitySchema>
