"use server";

import type { UIMessage } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { VisibilityType } from "@/components/visibility-selector";
import { generateTitleFromUserMessage as generateTitle } from "@/lib/ai/title-generation";
import {
    requireAuth,
    requireRateLimit,
    requireResource,
    verifyOwnership,
} from "@/lib/api/guards";
import { visibilitySchema } from "@/lib/api/schemas";
import { parseTimestamp, validateUUID } from "@/lib/api/validators";
import { chatData, messageData } from "@/lib/data/chat";
import { ChatSDKError } from "@/lib/errors";

/**
 * Task 6.5: Input validation schema for UIMessage
 * Validates message structure to prevent malformed input
 */
const uiMessageSchema = z.object({
    id: z.string().min(1, "Message ID is required"),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string().max(100_000, "Message content too long"), // 100KB limit
    parts: z.array(z.unknown()).optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
});

export async function generateTitleFromUserMessage({
    message,
}: {
    message: UIMessage;
}): Promise<string> {
    // Validate session before consuming AI resources
    const { session } = await requireAuth("api");

    // Apply strict rate limiting for AI resource (10 req/min)
    await requireRateLimit("strict", session.user.id, "api");

    // Task 6.5: Validate message input before passing to AI
    const messageResult = uiMessageSchema.safeParse(message);
    if (!messageResult.success) {
        throw new ChatSDKError(
            "bad_request:api:invalid_message",
            `Invalid message format: ${messageResult.error.errors.map((e) => e.message).join(", ")}`
        );
    }

    return await generateTitle({ message });
}

export async function deleteTrailingMessages({
    chatId,
    createdAt,
}: {
    chatId: string;
    createdAt: string;
}): Promise<void> {
    // Validate session and create context
    const { session, ctx } = await requireAuth("chat");

    // Apply rate limiting for mutation operations (100 req/min)
    await requireRateLimit("standard", session.user.id, "chat");

    // Validate chatId is a valid UUID
    validateUUID(chatId, "chatId", "chat");

    // Validate createdAt is a valid date
    const timestamp = parseTimestamp(createdAt, "createdAt", "chat");

    // Verify ownership: fetch chat and check userId
    const chat = requireResource(
        await chatData.get(chatId, ctx, { warmCache: false }),
        "chat"
    );
    verifyOwnership(chat, session, "chat");

    await messageData.deleteAfterTimestamp(chatId, timestamp, ctx);

    // Task 6.6: Revalidate chat page after mutation
    revalidatePath(`/chat/${chatId}`);
}

export async function updateChatVisibility({
    chatId,
    visibility,
}: {
    chatId: string;
    visibility: VisibilityType;
}): Promise<void> {
    // Validate session and create context
    const { session, ctx } = await requireAuth("chat");

    // Apply rate limiting for mutation operations (100 req/min)
    await requireRateLimit("standard", session.user.id, "chat");

    // Validate chatId is a valid UUID
    validateUUID(chatId, "chatId", "chat");

    // Validate visibility type
    const visibilityResult = visibilitySchema.safeParse(visibility);
    if (!visibilityResult.success) {
        throw new ChatSDKError(
            "bad_request:chat:invalid_visibility",
            "Invalid visibility type"
        );
    }

    // Verify ownership: fetch chat and check userId
    const chat = requireResource(
        await chatData.get(chatId, ctx, { warmCache: false }),
        "chat"
    );
    verifyOwnership(chat, session, "chat");

    await chatData.updateVisibility(chatId, visibility, ctx);

    // Task 6.7: Revalidate chat page after visibility change
    revalidatePath(`/chat/${chatId}`);
}
