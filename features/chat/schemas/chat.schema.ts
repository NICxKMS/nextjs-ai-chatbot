/**
 * Chat Validation Schemas
 *
 * Zod validation schemas for chat operations including message validation,
 * chat creation, and chat updates.
 *
 * @module features/chat/schemas
 */

import { z } from "zod"

import {
	ALLOWED_MIME_TYPES,
	ATTACHMENT_MAX_FILE_SIZE,
	isValidMimeType,
} from "@/lib/utils/file-validation"

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * Chat visibility types
 */
export const VisibilitySchema = z.enum(["public", "private"])

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid()

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1, "This field is required")

/**
 * Message role schema
 */
export const MessageRoleSchema = z.enum(["user", "assistant", "system"])

// =============================================================================
// Message Schemas
// =============================================================================

/**
 * Message content schema
 */
export const MessageContentSchema = z.string().max(100000, "Message too long")

/**
 * Text part schema for message content
 */
export const TextPartSchema = z.object({
	type: z.literal("text"),
	text: z.string().min(1, "Text cannot be empty").max(2000, "Text too long"),
})

/**
 * File part schema for message attachments.
 *
 * Validates:
 * - MIME type must be in allowed list (images, audio, video, documents)
 * - File name must be 1-100 characters
 * - URL must be valid URL format
 */
export const FilePartSchema = z.object({
	type: z.literal("file"),
	mediaType: z.string().refine(isValidMimeType, {
		message: `Unsupported file type. Allowed: images, audio, video, PDF, text, and common document formats`,
	}),
	name: z
		.string()
		.min(1, "File name required")
		.max(100, "File name too long"),
	url: z.string().url("Invalid file URL"),
})

/**
 * Message part schema - union of text and file parts
 */
export const MessagePartSchema = z.union([TextPartSchema, FilePartSchema])

/**
 * Message creation schema
 */
export const CreateMessageSchema = z.object({
	/** Chat ID this message belongs to */
	chatId: UUIDSchema,
	/** Message role */
	role: MessageRoleSchema,
	/** Message content */
	content: MessageContentSchema,
	/** Optional attachments with validated MIME types */
	attachments: z
		.array(
			z.object({
				name: z.string().min(1).max(100),
				contentType: z.string().refine(isValidMimeType, {
					message: "Unsupported attachment type",
				}),
				url: z.string().url(),
				size: z
					.number()
					.int()
					.nonnegative()
					.max(ATTACHMENT_MAX_FILE_SIZE)
					.optional(),
			}),
		)
		.max(5, "Maximum 5 attachments allowed")
		.optional(),
})

/**
 * Message update schema
 */
export const UpdateMessageSchema = z.object({
	/** Message ID */
	id: UUIDSchema,
	/** Chat ID this message belongs to */
	chatId: UUIDSchema,
	/** New content */
	content: MessageContentSchema,
})

// =============================================================================
// Chat Schemas
// =============================================================================

/**
 * Chat creation schema
 */
export const CreateChatSchema = z.object({
	/** Optional chat ID (auto-generated if not provided */
	id: UUIDSchema.optional(),
	/** Initial message content (optional) */
	initialMessage: MessageContentSchema.optional(),
	/** Chat visibility */
	visibility: VisibilitySchema.optional().default("private"),
	/** AI model to use */
	model: NonEmptyStringSchema.optional(),
})

/**
 * Chat update schema
 */
export const UpdateChatSchema = z.object({
	/** Chat ID */
	id: UUIDSchema,
	/** New title */
	title: z.string().min(1).max(500).optional(),
	/** New visibility */
	visibility: VisibilitySchema.optional(),
})

/**
 * Chat ID parameter schema
 */
export const ChatIdSchema = z.object({
	/** Chat ID */
	chatId: UUIDSchema,
})

// =============================================================================
// Pagination Schemas
// =============================================================================

/**
 * Pagination parameters schema
 */
export const PaginationSchema = z.object({
	/** Number of items per page */
	limit: z.coerce.number().int().min(1).max(100).default(20),
	/** Cursor for pagination (starting after this ID) */
	startingAfter: UUIDSchema.optional(),
	/** Cursor for pagination (ending before this ID) */
	endingBefore: UUIDSchema.optional(),
})

// =============================================================================
// Vote Schemas
// =============================================================================

/**
 * Vote type schema
 */
export const VoteTypeSchema = z.enum(["up", "down"])

/**
 * Message vote schema
 */
export const VoteMessageSchema = z.object({
	/** Chat ID */
	chatId: UUIDSchema,
	/** Message ID */
	messageId: UUIDSchema,
	/** Vote type */
	vote: VoteTypeSchema,
})

// =============================================================================
// Settings Schemas
// =============================================================================

/**
 * Sampling parameters for AI model configuration
 */
export const SamplingSettingsSchema = z.object({
	/** Temperature for response randomness (0-2, higher = more creative) */
	temperature: z.number().min(0).max(2).optional(),
	/** Top-p (nucleus) sampling (0-1) */
	topP: z.number().min(0).max(1).optional(),
	/** Maximum output tokens (256-1,000,000) */
	maxOutputTokens: z.number().min(256).max(1_000_000).optional(),
})

/**
 * Chat settings schema for customizing AI behavior
 */
export const ChatSettingsSchema = z.object({
	/** Sampling parameters for model configuration */
	sampling: SamplingSettingsSchema.optional(),
	/** Custom system prompt (max 8192 characters) */
	systemPrompt: z.string().max(8192).optional(),
	/** Enable reasoning/chain-of-thought mode */
	enableReasoning: z.boolean().optional(),
	/** Enable artifact streaming */
	streamArtifacts: z.boolean().optional(),
	/** Enable auto-scroll in chat UI */
	autoScroll: z.boolean().optional(),
})

// =============================================================================
// Stream Schemas
// =============================================================================

/**
 * Stream chat input schema
 */
export const StreamChatSchema = z.object({
	/** Chat ID */
	id: UUIDSchema.optional(),
	/** Message to send */
	message: z.object({
		id: UUIDSchema.optional(),
		content: MessageContentSchema,
		role: MessageRoleSchema,
	}),
	/** Selected AI model */
	selectedChatModel: NonEmptyStringSchema,
	/** Visibility type */
	selectedVisibilityType: VisibilitySchema.optional().default("private"),
	/** Optional chat settings for customizing AI behavior */
	settings: ChatSettingsSchema.optional(),
})

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Inferred types from schemas
 */
export type TextPart = z.infer<typeof TextPartSchema>
export type FilePart = z.infer<typeof FilePartSchema>
export type MessagePart = z.infer<typeof MessagePartSchema>
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>
export type CreateChatInput = z.infer<typeof CreateChatSchema>
export type UpdateChatInput = z.infer<typeof UpdateChatSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
export type VoteMessageInput = z.infer<typeof VoteMessageSchema>
export type StreamChatInput = z.infer<typeof StreamChatSchema>
export type SamplingSettings = z.infer<typeof SamplingSettingsSchema>
export type ChatSettings = z.infer<typeof ChatSettingsSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
export type MessageRole = z.infer<typeof MessageRoleSchema>
export type VoteType = z.infer<typeof VoteTypeSchema>

// Re-export file validation constants for convenience
export { ATTACHMENT_MAX_FILE_SIZE, ALLOWED_MIME_TYPES, isValidMimeType }
