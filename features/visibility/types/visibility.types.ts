import { z } from "zod"

import type { Visibility } from "@/lib/types/entity.types"

/** Chat visibility — aliased from the canonical Visibility type. */
export type VisibilityType = Visibility

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
