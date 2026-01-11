import { z } from "zod";
import { createUUIDSchema, voteTypeSchema } from "@/lib/api/schemas";

/**
 * Zod schema for vote request body validation
 */
export const voteRequestSchema = z.object({
    chatId: createUUIDSchema("chatId"),
    messageId: createUUIDSchema("messageId"),
    type: voteTypeSchema,
});

export type VoteRequestBody = z.infer<typeof voteRequestSchema>;
