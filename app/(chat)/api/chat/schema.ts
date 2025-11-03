import { z } from "zod";

import {
	getAllowedAttachmentMimeTypes,
	isAllowedAttachmentMimeType,
} from "@/lib/files";

const textPartSchema = z.object({
	type: z.enum(["text"]),
	text: z.string().min(1).max(2000),
});

const allowedMimeTypes = getAllowedAttachmentMimeTypes();

const filePartSchema = z.object({
	type: z.enum(["file"]),
	mediaType: z.string().refine(isAllowedAttachmentMimeType, {
		message: `Unsupported file type. Allowed: ${allowedMimeTypes.join(", ")}`,
	}),
	name: z.string().min(1).max(100),
	url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
	id: z.string().uuid(),
	message: z.object({
		id: z.string().uuid(),
		role: z.enum(["user"]),
		parts: z.array(partSchema),
	}),
	selectedChatModel: z.string().min(1),
	selectedVisibilityType: z.enum(["public", "private"]),
	settings: z
		.object({
			sampling: z.object({
				temperature: z.number().min(0).max(2),
				topP: z.number().min(0).max(1),
				maxOutputTokens: z.number().min(256).max(1_000_000),
			}),
			systemPrompt: z.string().max(8192),
			enableReasoning: z.boolean(),
			streamArtifacts: z.boolean(),
			autoScroll: z.boolean(),
		})
		.optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
