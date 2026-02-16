/**
 * Chat Validation Schemas
 *
 * Zod validation schemas for chat operations including message validation,
 * chat creation, and chat updates.
 *
 * @module features/chat/schemas
 */

import { z } from "zod"

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
 * Message creation schema
 */
export const CreateMessageSchema = z.object({
	/** Chat ID this message belongs to */
	chatId: UUIDSchema,
	/** Message role */
	role: MessageRoleSchema,
	/** Message content */
	content: MessageContentSchema,
	/** Optional attachments */
	attachments: z
		.array(
			z.object({
				name: z.string(),
				contentType: z.string(),
				url: z.string().url(),
			}),
		)
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
})

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Inferred types from schemas
 */
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>
export type CreateChatInput = z.infer<typeof CreateChatSchema>
export type UpdateChatInput = z.infer<typeof UpdateChatSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
export type VoteMessageInput = z.infer<typeof VoteMessageSchema>
export type StreamChatInput = z.infer<typeof StreamChatSchema>
export type Visibility = z.infer<typeof VisibilitySchema>
export type MessageRole = z.infer<typeof MessageRoleSchema>
export type VoteType = z.infer<typeof VoteTypeSchema>
