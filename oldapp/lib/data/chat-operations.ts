import type { UIMessage } from "ai";
import type { VisibilityType } from "@/components/visibility-selector";
import type { DataContext } from "@/lib/data/base";
import { chatData, messageData } from "@/lib/data/chat";
import type { DBMessage } from "@/lib/db/schema";
import { logWarn } from "@/lib/log";
import type { AppUsage } from "@/lib/usage";

export type SaveChatParams = {
    chatId: string;
    isNewChat: boolean;
    userMessage: UIMessage;
    assistantMessages: UIMessage[];
    selectedModelId: string;
    title: string;
    visibility: VisibilityType;
    createdAt?: Date;
    usage?: AppUsage;
    ctx: DataContext;
};

/**
 * Save chat and messages to database
 */
export async function saveChat(params: SaveChatParams): Promise<void> {
    const {
        chatId,
        isNewChat,
        userMessage,
        assistantMessages,
        selectedModelId,
        title,
        visibility,
        createdAt,
        usage,
        ctx,
    } = params;

    // Include the user message that was sent (not in messages from AI SDK)
    const userDBMessage: DBMessage = {
        id: userMessage.id,
        role: "user" as const,
        parts: [...userMessage.parts, { type: "model", id: selectedModelId }],
        createdAt: new Date(),
        attachments: [],
        chatId,
    };

    const messagesToSave: DBMessage[] = [
        userDBMessage,
        ...assistantMessages.map((currentMessage) => {
            const partsWithModel = [
                ...currentMessage.parts,
                { type: "model", id: selectedModelId },
            ];
            return {
                id: currentMessage.id,
                role: currentMessage.role as "user" | "assistant" | "system",
                parts: partsWithModel,
                createdAt: new Date(),
                attachments: [],
                chatId,
            };
        }),
    ];

    try {
        await messageData.saveWithContext(
            {
                messages: messagesToSave,
                chatId,
                lastContext: usage,
                isNewChat,
                title,
                visibility,
                createdAt,
            },
            ctx
        );
    } catch (err) {
        logWarn("Unable to persist messages and context for chat", {
            chatId,
            error: err,
        });
        throw err;
    }
}

export type UpdateTitleParams = {
    chatId: string;
    title: string;
    ctx: DataContext;
};

/**
 * Update chat title in background (fire-and-forget)
 */
export async function updateChatTitle(
    params: UpdateTitleParams
): Promise<void> {
    const { chatId, title, ctx } = params;

    try {
        await chatData.updateTitle(chatId, title, ctx);
    } catch (err) {
        logWarn("Background title update failed", {
            chatId,
            error: err,
        });
    }
}
