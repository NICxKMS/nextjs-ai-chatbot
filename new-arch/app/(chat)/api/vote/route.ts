/**
 * Vote Route
 * @module new-arch/app/(chat)/api/vote/route
 *
 * API routes for message voting operations.
 */

import { z } from "zod";
import { createRouteHandler, forbidden, json, notFound } from "@/lib/api";
import { getChatWithMessages } from "@/lib/data/chat/queries";
import { upsertVote } from "@/lib/data/vote/mutations";

// ============================================================================
// Schemas
// ============================================================================

const voteBodySchema = z.object({
    chatId: z.string().uuid(),
    messageId: z.string().uuid(),
    type: z.enum(["up", "down"]),
});

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * POST /api/vote
 *
 * Create a new vote on a message.
 */
export const POST = createRouteHandler(
    {
        surface: "vote",
        method: "POST",
        auth: "required",
        rateLimit: "standard",
        guestAllowed: false,
        bodySchema: voteBodySchema,
    },
    async ({ session, body }) => {
        const { chatId, messageId, type } = body;

        // Verify chat exists and user has access
        const chat = await getChatWithMessages(chatId);
        if (!chat) {
            return notFound("Chat not found");
        }

        if (chat.userId !== session?.user.id) {
            return forbidden("Access denied");
        }

        // Verify message belongs to chat
        const messageExists = chat.messages.some((m) => m.id === messageId);
        if (!messageExists) {
            return notFound("Message not found in this chat");
        }

        // Create vote (upsert handles create/update)
        await upsertVote({
            chatId,
            messageId,
            type,
            userId: session?.user.id,
        });

        return json({ success: true, messageId, type });
    }
);

/**
 * PATCH /api/vote
 *
 * Update an existing vote.
 */
export const PATCH = createRouteHandler(
    {
        surface: "vote",
        method: "PATCH",
        auth: "required",
        rateLimit: "standard",
        guestAllowed: false,
        bodySchema: voteBodySchema,
    },
    async ({ session, body }) => {
        const { chatId, messageId, type } = body;

        // Verify chat exists and user has access
        const chat = await getChatWithMessages(chatId);
        if (!chat) {
            return notFound("Chat not found");
        }

        if (chat.userId !== session?.user.id) {
            return forbidden("Access denied");
        }

        // Verify message belongs to chat
        const messageExists = chat.messages.some((m) => m.id === messageId);
        if (!messageExists) {
            return notFound("Message not found in this chat");
        }

        // Update vote (upsert handles create/update)
        await upsertVote({
            chatId,
            messageId,
            type,
            userId: session?.user.id,
        });

        return json({ success: true, messageId, type });
    }
);
