import { z } from "zod"
import { settingsSchema } from "@/features/settings/schemas/settings.schema"

// ── Message part schemas ─────────────────────────────────────
// Reusable sub-schemas for message content parts.

const textPartSchema = z.object({
	type: z.literal("text"),
	text: z.string().min(1).max(2000),
})

const allowedFileMediaTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const

function isTrustedUploadUrl(value: string): boolean {
	try {
		const url = new URL(value)
		if (url.protocol !== "https:") return false
		if (!url.pathname.startsWith("/uploads/")) return false

		const configuredBlobUrl = process.env.BLOB_PUBLIC_BASE_URL
		if (configuredBlobUrl) {
			const configuredHostname = new URL(configuredBlobUrl).hostname
			if (url.hostname === configuredHostname) return true
		}

		return url.hostname.endsWith(".public.blob.vercel-storage.com")
	} catch {
		return false
	}
}

const filePartSchema = z
	.object({
		type: z.literal("file"),
		mediaType: z.enum(allowedFileMediaTypes),
		name: z.string().min(1).max(100).optional(),
		filename: z.string().min(1).max(100).optional(),
		url: z.string().url().refine(isTrustedUploadUrl, {
			message: "File URL must be a trusted uploaded Blob URL",
		}),
	})
	.refine((part) => part.name || part.filename, {
		message: "File parts must include a name or filename",
		path: ["name"],
	})

const partSchema = z.union([textPartSchema, filePartSchema])
export const messageSchema = z.object({
	id: z.string().uuid(),
	role: z.enum(["user", "assistant", "system"]),
	parts: z.array(partSchema),
})

export type ChatMessageInput = z.infer<typeof messageSchema>

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

export const editMessageSchema = z.object({
	chatId: z.string().uuid(),
	messageId: z.string().uuid(),
	content: z.string().min(1).max(10_000),
})

export type EditMessageInput = z.infer<typeof editMessageSchema>
