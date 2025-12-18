/**
 * Chat Detail Route
 * @module new-arch/app/api/chat/[id]/route
 *
 * API routes for single chat operations (get, delete).
 */

import {
    badRequest,
    createRouteHandler,
    forbidden,
    json,
    noContent,
    notFound,
} from "@/lib/api";
import { deleteChat, getChatById } from "@/lib/data/chat";

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/chat/[id]
 *
 * Get a single chat by ID.
 * User must own the chat or it must be public.
 */
export const GET = createRouteHandler(
    {
        surface: "chat",
        method: "GET",
        auth: "optional",
        rateLimit: "standard",
        cachePolicy: "private-short",
    },
    async ({ session, params }) => {
        const chatId = params.id;

        if (!chatId) {
            return badRequest("Chat ID is required");
        }

        // Fetch chat from data layer
        const chat = await getChatById(chatId);

        if (!chat) {
            return notFound("Chat not found");
        }

        // Check access permissions
        const userId = session?.user?.id;
        const isOwner = userId && chat.userId === userId;
        const isPublic = chat.visibility === "public";

        if (!(isOwner || isPublic)) {
            return forbidden("You do not have access to this chat");
        }

        return json(chat, {
            cache: isPublic ? "public-short" : "private-short",
        });
    }
);

/**
 * DELETE /api/chat/[id]
 *
 * Delete a chat. Only the owner can delete.
 */
export const DELETE = createRouteHandler(
    {
        surface: "chat",
        method: "DELETE",
        auth: "required",
        rateLimit: "standard",
    },
    async ({ session, params }) => {
        const chatId = params.id;

        if (!chatId) {
            return badRequest("Chat ID is required");
        }

        if (!session?.user?.id) {
            return forbidden("Authentication required");
        }

        const userId = session.user.id;

        // Delete chat (returns false if not found or not authorized)
        const deleted = await deleteChat(chatId, userId);

        if (!deleted) {
            return notFound(
                "Chat not found or you don't have permission to delete it"
            );
        }

        return noContent();
    }
);
