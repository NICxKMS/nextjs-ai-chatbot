import { z } from "zod";
import { artifactKindSchema } from "@/lib/api/schemas";

// Maximum content size (1MB)
export const MAX_DOCUMENT_CONTENT_SIZE = 1024 * 1024;

/**
 * Zod schema for document POST request body validation
 */
export const documentPostSchema = z.object({
    content: z
        .string()
        .max(MAX_DOCUMENT_CONTENT_SIZE, "Content exceeds maximum size"),
    title: z.string().min(1).max(500),
    kind: artifactKindSchema,
});

export type DocumentPostBody = z.infer<typeof documentPostSchema>;
