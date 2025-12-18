"use server";

import { generateText, type UIMessage } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEFAULT_CHAT_MODEL_ID } from "../../lib/ai";
import {
    createChat,
    deleteChat as deleteChatData,
    getChatById as getChatByIdData,
    getChatsByUserId as getChatsByUserIdData,
    updateChatVisibility as updateChatVisibilityData,
} from "../../lib/data/chat";
import {
    deleteMessagesAfterTimestamp,
    getMessagesByChatId as getMessagesByChatIdData,
} from "../../lib/data/message";
import type { Chat, Message } from "../../lib/data/types";
import {
    type ActionResult,
    AppError,
    ErrorCodes,
    err,
    ok,
} from "../../lib/errors";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const getChatByIdSchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
});

const getChatsByUserIdSchema = z.object({
    userId: z.string().uuid("Invalid user ID format"),
    limit: z.number().int().positive().max(100).optional().default(50),
});

const getMessagesByChatIdSchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
});

const saveChatSchema = z.object({
    id: z.string().uuid("Invalid chat ID format").optional(),
    userId: z.string().uuid("Invalid user ID format"),
    title: z.string().max(200).optional(),
    visibility: z.enum(["public", "private"]).optional(),
});

const deleteChatSchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
    userId: z.string().uuid("Invalid user ID format"),
});

const deleteTrailingMessagesSchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
    createdAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
        message: "Invalid timestamp format",
    }),
});

const updateChatVisibilitySchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
    userId: z.string().uuid("Invalid user ID format"),
    visibility: z.enum(["public", "private"]),
});

const saveChatModelSchema = z.object({
    modelId: z.string().min(1, "Model ID is required"),
});

const generateTitleSchema = z.object({
    message: z.custom<UIMessage>((val) => val && typeof val === "object", {
        message: "Invalid message format",
    }),
});

// =============================================================================
// CHAT QUERIES
// =============================================================================

/**
 * Get a chat by its ID.
 */
export async function getChatById(
    chatId: string
): Promise<ActionResult<Chat | null>> {
    const parsed = getChatByIdSchema.safeParse({ chatId });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await getChatByIdData(parsed.data.chatId);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Get all chats for a user, ordered by most recent first.
 */
export async function getChatsByUserId(
    userId: string,
    limit = 50
): Promise<ActionResult<Chat[]>> {
    const parsed = getChatsByUserIdSchema.safeParse({ userId, limit });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await getChatsByUserIdData(
            parsed.data.userId,
            parsed.data.limit
        );
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Get all messages for a chat.
 */
export async function getMessagesByChatId(
    chatId: string
): Promise<ActionResult<Message[]>> {
    const parsed = getMessagesByChatIdSchema.safeParse({ chatId });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await getMessagesByChatIdData(parsed.data.chatId);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

// =============================================================================
// CHAT MUTATIONS
// =============================================================================

/**
 * Save (create) a new chat.
 */
export async function saveChat(input: {
    id?: string;
    userId: string;
    title?: string;
    visibility?: "public" | "private";
}): Promise<ActionResult<Chat>> {
    const parsed = saveChatSchema.safeParse(input);
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await createChat(parsed.data);
        revalidatePath("/");
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Delete a chat and all its messages.
 */
export async function deleteChat(
    chatId: string,
    userId: string
): Promise<ActionResult<boolean>> {
    const parsed = deleteChatSchema.safeParse({ chatId, userId });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await deleteChatData(
            parsed.data.chatId,
            parsed.data.userId
        );
        revalidatePath("/");
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Delete messages after a specific timestamp.
 * Used for regenerating responses from a specific point.
 */
export async function deleteTrailingMessages({
    chatId,
    createdAt,
}: {
    chatId: string;
    createdAt: string;
}): Promise<ActionResult<void>> {
    const parsed = deleteTrailingMessagesSchema.safeParse({
        chatId,
        createdAt,
    });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const timestamp = new Date(parsed.data.createdAt);
        await deleteMessagesAfterTimestamp(parsed.data.chatId, timestamp);
        revalidatePath(`/chat/${parsed.data.chatId}`);
        return ok(undefined);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Update chat visibility (public/private).
 */
export async function updateChatVisibility({
    chatId,
    userId,
    visibility,
}: {
    chatId: string;
    userId: string;
    visibility: "public" | "private";
}): Promise<ActionResult<Chat | null>> {
    const parsed = updateChatVisibilitySchema.safeParse({
        chatId,
        userId,
        visibility,
    });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const result = await updateChatVisibilityData(
            parsed.data.chatId,
            parsed.data.userId,
            parsed.data.visibility
        );
        revalidatePath(`/chat/${parsed.data.chatId}`);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

// =============================================================================
// MODEL PREFERENCE
// =============================================================================

/**
 * Save the user's preferred chat model.
 * Stores in cookie for persistence across sessions.
 */
export async function saveChatModel(
    modelId: string
): Promise<ActionResult<void>> {
    const parsed = saveChatModelSchema.safeParse({ modelId });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        cookieStore.set("chat-model", parsed.data.modelId, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: "lax",
        });
        return ok(undefined);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.INTERNAL_ERROR));
    }
}

// =============================================================================
// AI TITLE GENERATION
// =============================================================================

/**
 * Generate a chat title from the first user message.
 * Uses AI to create a short, descriptive title.
 */
export async function generateTitleFromUserMessage({
    message,
}: {
    message: UIMessage;
}): Promise<ActionResult<string>> {
    const parsed = generateTitleSchema.safeParse({ message });
    if (!parsed.success) {
        return err(
            new AppError(ErrorCodes.VALIDATION_ERROR, {
                message: parsed.error.errors[0]?.message ?? "Invalid input",
            })
        );
    }

    try {
        // Import provider dynamically to avoid circular dependencies
        const { myProvider } = await import("../../../lib/ai/providers");

        const { text: title } = await generateText({
            model: myProvider.languageModel(DEFAULT_CHAT_MODEL_ID),
            system: `You will generate a short title based on the first message a user begins a conversation with.
- Ensure it is not more than 80 characters long
- The title should be a summary of the user's message
- Do not use quotes or colons`,
            prompt: JSON.stringify(message),
        });

        return ok(title || "New Chat");
    } catch {
        // Fallback: extract first part of message text
        const textPart = message.parts?.find(
            (p): p is { type: "text"; text: string } =>
                p.type === "text" &&
                typeof (p as { text?: string }).text === "string"
        );
        const fallbackTitle = textPart?.text?.slice(0, 80).trim() || "New Chat";
        return ok(fallbackTitle);
    }
}
