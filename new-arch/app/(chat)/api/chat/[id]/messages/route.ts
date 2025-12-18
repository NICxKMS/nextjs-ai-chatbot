/**
 * Chat Messages Route
 * @module new-arch/app/(chat)/api/chat/[id]/messages/route
 *
 * API route for retrieving chat messages.
 */

import { z } from "zod";
import { createRouteHandler, forbidden, notFound, paginated } from "@/lib/api";
import { getChatById } from "@/lib/data/chat/queries";
import { getMessagesByChatId } from "@/lib/data/message/queries";

// ============================================================================
// Schemas
// ============================================================================

const getMessagesQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    cursor: z.string().uuid().optional(),
});

// ============================================================================\n// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * GET /api/chat/[id]/messages
 *
 * Get messages for a specific chat.
 */
export const GET = createRouteHandler(
    {
        surface: "chat",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        querySchema: getMessagesQuerySchema,
        cachePolicy: "private-short",
    },
    async ({ session, params, query }) => {
        const chatId = params.id;
        if (!chatId) {
            return notFound("Chat ID required");
        }

        // Verify chat exists and user has access
        const chat = await getChatById(chatId);
        if (!chat) {
            return notFound("Chat not found");
        }

        if (!session?.user?.id || chat.userId !== session.user.id) {
            return forbidden("Access denied");
        }

        // Fetch messages
        const allMessages = await getMessagesByChatId(chatId);

        // Apply pagination
        const limit = query.limit ?? 50;
        const startIndex = query.cursor
            ? allMessages.findIndex((m) => m.id === query.cursor) + 1
            : 0;
        const result = allMessages.slice(startIndex, startIndex + limit + 1);

        const hasMore = result.length > limit;
        const messages = hasMore ? result.slice(0, -1) : result;
        const cursor = hasMore ? messages.at(-1)?.id : undefined;

        return paginated(messages, {
            cursor,
            hasMore,
            cache: "private-short",
        });
    }
);
