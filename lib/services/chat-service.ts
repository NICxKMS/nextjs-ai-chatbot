/**
 * Chat Service
 *
 * Business logic layer for chat operations. Provides a clean abstraction
 * over the data layer with validation, authorization, and business rules.
 *
 * @module lib/services/chat-service
 */
import "server-only";

import { getChatConfig, isFeatureEnabled } from "@/lib/config/app-config";
import {
    createChatCached,
    deleteChatCached,
    getChatCached,
    getChatWithMessagesCached,
    getUserChatsCached,
    updateChatTitleCached,
    updateChatVisibilityCached,
} from "@/lib/data/cached";
import type { DataContext, PaginationParams } from "@/lib/data/types";
import type { Chat, Message, Visibility } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Chat creation parameters
 */
export interface CreateChatParams {
    /** Chat ID (optional, generated if not provided) */
    id?: string;
    /** Initial chat title */
    title?: string;
    /** Chat visibility */
    visibility?: Visibility;
}

/**
 * Chat update parameters
 */
export interface UpdateChatParams {
    /** New title */
    title?: string;
    /** New visibility */
    visibility?: Visibility;
}

/**
 * Chat list options
 */
export interface ListChatsOptions extends Partial<PaginationParams> {
    /** Filter by visibility */
    visibility?: Visibility;
}

/**
 * Chat with computed properties
 */
export interface ChatWithMeta extends Chat {
    /** Whether the chat has messages */
    hasMessages?: boolean;
    /** Message count */
    messageCount?: number;
}

/**
 * Chat service result
 */
export type ChatServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: string };

// =============================================================================
// CHAT SERVICE
// =============================================================================

/**
 * Chat Service
 *
 * Provides business logic for chat operations with proper validation,
 * authorization, and error handling.
 */
export const ChatService = {
    /**
     * Create a new chat
     *
     * @param params - Chat creation parameters
     * @param ctx - Data context with user info
     * @returns Created chat or error
     */
    async create(
        params: CreateChatParams,
        ctx: DataContext
    ): Promise<ChatServiceResult<Chat>> {
        try {
            const config = getChatConfig();
            const id = params.id ?? crypto.randomUUID();
            const title = params.title ?? "New Chat";

            // Validate title length
            if (title.length > config.titleMaxLength) {
                return {
                    success: false,
                    error: `Title exceeds maximum length of ${config.titleMaxLength}`,
                    code: "validation:title_too_long",
                };
            }

            const chat = await createChatCached(
                {
                    id,
                    title,
                    visibility: params.visibility ?? "private",
                },
                ctx
            );

            return { success: true, data: chat };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to create chat",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get a chat by ID
     *
     * @param chatId - Chat ID
     * @param ctx - Data context with user info
     * @returns Chat or null if not found
     */
    async get(
        chatId: string,
        ctx: DataContext
    ): Promise<ChatServiceResult<Chat | null>> {
        try {
            const chat = await getChatCached(chatId, ctx);
            return { success: true, data: chat };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get chat",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get a chat with its messages
     *
     * @param chatId - Chat ID
     * @param ctx - Data context with user info
     * @returns Chat with messages or null
     */
    async getWithMessages(
        chatId: string,
        ctx: DataContext
    ): Promise<ChatServiceResult<{ chat: Chat; messages: Message[] } | null>> {
        try {
            if (!isFeatureEnabled("chatHistory")) {
                return { success: true, data: null };
            }

            const result = await getChatWithMessagesCached(chatId, ctx);
            return { success: true, data: result };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get chat with messages",
                code: "internal:unknown",
            };
        }
    },

    /**
     * List user's chats with pagination
     *
     * @param options - List options including pagination
     * @param ctx - Data context with user info
     * @returns Paginated list of chats
     */
    async list(
        options: ListChatsOptions,
        ctx: DataContext
    ): Promise<ChatServiceResult<{ chats: Chat[]; hasMore: boolean }>> {
        try {
            if (!isFeatureEnabled("chatHistory")) {
                return { success: true, data: { chats: [], hasMore: false } };
            }

            const config = getChatConfig();
            const limit = Math.min(
                options.limit ?? config.defaultPageSize,
                config.maxPageSize
            );

            const chats = await getUserChatsCached(ctx);

            // Apply pagination client-side (cached function returns all)
            const startIndex = options.startingAfter
                ? chats.findIndex((c) => c.id === options.startingAfter) + 1
                : 0;
            const sliced = chats.slice(startIndex, startIndex + limit);
            const hasMore = startIndex + limit < chats.length;

            return {
                success: true,
                data: {
                    chats: sliced,
                    hasMore,
                },
            };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to list chats",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Update a chat
     *
     * @param chatId - Chat ID
     * @param params - Update parameters
     * @param ctx - Data context with user info
     * @returns Updated chat or error
     */
    async update(
        chatId: string,
        params: UpdateChatParams,
        ctx: DataContext
    ): Promise<ChatServiceResult<Chat>> {
        try {
            const config = getChatConfig();

            // Validate title if provided
            if (params.title !== undefined) {
                if (params.title.length < config.titleMinLength) {
                    return {
                        success: false,
                        error: `Title must be at least ${config.titleMinLength} characters`,
                        code: "validation:title_too_short",
                    };
                }
                if (params.title.length > config.titleMaxLength) {
                    return {
                        success: false,
                        error: `Title exceeds maximum length of ${config.titleMaxLength}`,
                        code: "validation:title_too_long",
                    };
                }
            }

            let chat: Chat | null = null;

            // Update title
            if (params.title !== undefined) {
                chat = await updateChatTitleCached(chatId, params.title, ctx);
            }

            // Update visibility
            if (params.visibility !== undefined) {
                chat = await updateChatVisibilityCached(
                    chatId,
                    params.visibility,
                    ctx
                );
            }

            if (!chat) {
                return {
                    success: false,
                    error: "No updates provided",
                    code: "validation:no_updates",
                };
            }

            return { success: true, data: chat };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to update chat",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Delete a chat
     *
     * @param chatId - Chat ID
     * @param ctx - Data context with user info
     * @returns Success or error
     */
    async delete(
        chatId: string,
        ctx: DataContext
    ): Promise<ChatServiceResult<void>> {
        try {
            await deleteChatCached(chatId, ctx);
            return { success: true, data: undefined };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to delete chat",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Verify chat ownership
     *
     * @param chatId - Chat ID
     * @param ctx - Data context with user info
     * @returns Whether the user owns the chat
     */
    async verifyOwnership(chatId: string, ctx: DataContext): Promise<boolean> {
        try {
            const chat = await getChatCached(chatId, ctx);
            return chat !== null && chat.userId === ctx.userId;
        } catch {
            return false;
        }
    },

    /**
     * Generate a title for a chat based on first message
     *
     * @param firstMessage - First message content
     * @returns Generated title
     */
    generateTitle(firstMessage: string): string {
        const config = getChatConfig();

        // Clean and truncate
        const cleaned = firstMessage
            .replace(/\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (cleaned.length <= config.titleMaxLength) {
            return cleaned;
        }

        // Truncate at word boundary
        const truncated = cleaned.substring(0, config.titleMaxLength - 3);
        const lastSpace = truncated.lastIndexOf(" ");

        if (lastSpace > config.titleMinLength) {
            return `${truncated.substring(0, lastSpace)}...`;
        }

        return `${truncated}...`;
    },
} as const;

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const createChat = ChatService.create;
export const getChat = ChatService.get;
export const getChatWithMessages = ChatService.getWithMessages;
export const listChats = ChatService.list;
export const updateChat = ChatService.update;
export const deleteChat = ChatService.delete;
export const verifyChatOwnership = ChatService.verifyOwnership;
export const generateChatTitle = ChatService.generateTitle;
