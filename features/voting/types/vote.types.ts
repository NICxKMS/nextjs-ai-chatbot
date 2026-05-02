import { z } from "zod"

/**
 * Zod schema for vote request validation.
 * chatId and messageId must be valid UUIDs, type is "up" or "down".
 */
export const voteSchema = z.object({
	chatId: z.string().uuid(),
	messageId: z.string().uuid(),
	type: z.enum(["up", "down"]),
})

/** Inferred type for vote requests (validated input). */
export type VoteRequest = z.infer<typeof voteSchema>
