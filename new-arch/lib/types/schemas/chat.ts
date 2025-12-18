/**
 * Chat Zod Schemas
 * @module lib/types/schemas/chat
 *
 * Validation schemas for chat-related data.
 */

import { z } from "zod";

// =============================================================================
// BASE SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Visibility enum schema
 */
export const visibilitySchema = z.enum(["public", "private"]);

// =============================================================================
// CHAT SCHEMAS
// =============================================================================

/**
 * Chat ID parameter schema
 */
export const chatIdSchema = z.object({
    chatId: uuidSchema,
});

/**
 * Create chat request schema
 */
export const createChatSchema = z.object({
    title: z
        .string()
        .max(200, "Title must be 200 characters or less")
        .optional(),
    visibility: visibilitySchema.default("private"),
});

/**
 * Update chat request schema
 */
export const updateChatSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(200, "Title must be 200 characters or less")
        .optional(),
    visibility: visibilitySchema.optional(),
});

/**
 * Delete chat request schema
 */
export const deleteChatSchema = z.object({
    chatId: uuidSchema,
});

/**
 * List chats request schema
 */
export const listChatsSchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    cursor: z.string().optional(),
    visibility: visibilitySchema.optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
});

// =============================================================================
// INFERRED TYPES
// =============================================================================

export type ChatIdParams = z.infer<typeof chatIdSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type DeleteChatInput = z.infer<typeof deleteChatSchema>;
export type ListChatsInput = z.infer<typeof listChatsSchema>;
