import { z } from "zod"
import { settingsSchema } from "@/features/settings/schemas/settings.schema"

// ── Message part schemas ─────────────────────────────────────
// Reusable sub-schemas for message content parts.

const textPartSchema = z.object({
	type: z.literal("text"),
	text: z.string().min(1).max(2000),
})

const filePartSchema = z.object({
	type: z.literal("file"),
	mediaType: z.string().min(1),
	name: z.string().min(1).max(100),
	url: z.string().url(),
})

const partSchema = z.union([textPartSchema, filePartSchema])

// ── Chat request schema (POST /api/chat) ─────────────────────
// Validates the request body for the streaming chat API route.
// All 5 fields: id, message, selectedChatModel, selectedVisibilityType, settings.

export const chatRequestSchema = z.object({
	/** Chat UUID — new or existing */
	id: z.string().uuid(),
	/** The user message to send */
	message: z.object({
		id: z.string().uuid(),
		role: z.literal("user"),
		parts: z.array(partSchema).min(1),
	}),
	/** Selected model ID (e.g., "google:gemma-3-4b-it") */
	selectedChatModel: z.string().min(1),
	/** Chat visibility setting */
	selectedVisibilityType: z.enum(["public", "private"]),
	/** Optional chat settings (temperature, reasoning, etc.) */
	settings: settingsSchema.optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

// ── Delete messages schema ──────────────────────────────────
// Validates input for deleting trailing messages.
// Deletes the target message and all messages after it in the conversation.
// Used by deleteTrailingMessages server action (P3-T22).

export const deleteMessagesSchema = z.object({
	chatId: z.string().uuid(),
	messageId: z.string().uuid(),
})

export type DeleteMessagesInput = z.infer<typeof deleteMessagesSchema>
