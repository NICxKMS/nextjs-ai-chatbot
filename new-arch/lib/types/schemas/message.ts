/**
 * Message Zod Schemas
 * @module lib/types/schemas/message
 *
 * Validation schemas for message-related data.
 */

import { z } from "zod";
import { uuidSchema } from "./chat";

// =============================================================================
// MESSAGE ROLE
// =============================================================================

/**
 * Message role enum schema
 */
export const messageRoleSchema = z.enum([
    "user",
    "assistant",
    "system",
    "tool",
]);

// =============================================================================
// MESSAGE PARTS
// =============================================================================

/**
 * Text part schema
 */
export const textPartSchema = z.object({
    type: z.literal("text"),
    text: z.string(),
});

/**
 * Tool call part schema
 */
export const toolCallPartSchema = z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
});

/**
 * Tool result part schema
 */
export const toolResultPartSchema = z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    result: z.unknown(),
    isError: z.boolean().optional(),
});

/**
 * Reasoning part schema
 */
export const reasoningPartSchema = z.object({
    type: z.literal("reasoning"),
    text: z.string(),
    isCollapsed: z.boolean().optional(),
});

/**
 * File part schema
 */
export const filePartSchema = z.object({
    type: z.literal("file"),
    url: z.string().url(),
    name: z.string().optional(),
    mediaType: z.string().optional(),
    size: z.number().optional(),
});

/**
 * Union of all message part schemas
 */
export const messagePartSchema = z.discriminatedUnion("type", [
    textPartSchema,
    toolCallPartSchema,
    toolResultPartSchema,
    reasoningPartSchema,
    filePartSchema,
]);

// =============================================================================
// ATTACHMENT
// =============================================================================

/**
 * Attachment schema
 */
export const attachmentSchema = z.object({
    url: z.string().url("Invalid attachment URL"),
    name: z.string().min(1, "Attachment name is required"),
    contentType: z.string().min(1, "Content type is required"),
    size: z.number().optional(),
});

// =============================================================================
// MESSAGE SCHEMAS
// =============================================================================

/**
 * Message ID parameter schema
 */
export const messageIdSchema = z.object({
    messageId: uuidSchema,
});

/**
 * Send message request schema
 */
export const sendMessageSchema = z.object({
    chatId: uuidSchema,
    content: z.string().min(1, "Message content is required"),
    attachments: z.array(attachmentSchema).optional(),
    model: z.string().optional(),
});

/**
 * Regenerate message request schema
 */
export const regenerateMessageSchema = z.object({
    chatId: uuidSchema,
    messageId: uuidSchema,
    model: z.string().optional(),
});

/**
 * List messages request schema
 */
export const listMessagesSchema = z.object({
    chatId: uuidSchema,
    limit: z.coerce.number().min(1).max(100).default(50),
    cursor: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
});

// =============================================================================
// INFERRED TYPES
// =============================================================================

export type MessageIdParams = z.infer<typeof messageIdSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type RegenerateMessageInput = z.infer<typeof regenerateMessageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
export type AttachmentInput = z.infer<typeof attachmentSchema>;
export type MessagePartInput = z.infer<typeof messagePartSchema>;
