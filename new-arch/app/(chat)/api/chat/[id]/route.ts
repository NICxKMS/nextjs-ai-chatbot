/**
 * Chat [id] Route
 * @module new-arch/app/(chat)/api/chat/[id]/route
 *
 * API routes for single chat operations (get and delete).
 */

import {
    createRouteHandler,
    forbidden,
    json,
    noContent,
    notFound,
} from "@/lib/api";
import { deleteChat } from "@/lib/data/chat/mutations";
import { getChatById } from "@/lib/data/chat/queries";

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * GET /api/chat/[id]
 *
 * Get a single chat by ID.
 */
export const GET = createRouteHandler(
    {
        surface: "chat",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        cachePolicy: "private-short",
    },
    async ({ session, params }) => {
        const chatId = params.id;
        if (!chatId) {
            return notFound("Chat ID required");
        }

        const chat = await getChatById(chatId);
        if (!chat) {
            return notFound("Chat not found");
        }

        if (!session?.user?.id || chat.userId !== session.user.id) {
            return forbidden("Access denied");
        }

        return json(chat);
    }
);

/**
 * DELETE /api/chat/[id]
 *
 * Delete a chat by ID.
 */
export const DELETE = createRouteHandler(
    {
        surface: "chat",
        method: "DELETE",
        auth: "required",
        rateLimit: "standard",
        guestAllowed: false,
    },
    async ({ session, params }) => {
        const chatId = params.id;
        if (!chatId) {
            return notFound("Chat ID required");
        }

        const chat = await getChatById(chatId);
        if (!chat) {
            return notFound("Chat not found");
        }

        if (!session?.user?.id) {
            return forbidden("Access denied");
        }
        const userId = session.user.id;
        if (chat.userId !== userId) {
            return forbidden("Access denied");
        }

        await deleteChat(chatId, userId);

        return noContent();
    }
);
