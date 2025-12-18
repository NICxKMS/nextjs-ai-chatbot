/**
 * Chat Route
 * @module new-arch/app/api/chat/route
 *
 * API routes for chat operations (list and create).
 */

import { z } from "zod";
import { created, createRouteHandler, paginated } from "@/lib/api";
import { createChat, getChatsByUserId } from "@/lib/data/chat";

// ============================================================================
// Schemas
// ============================================================================

const listChatsQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    startingAfter: z.string().uuid().optional(),
});

const createChatBodySchema = z.object({
    title: z.string().min(1).max(200).optional(),
    visibility: z.enum(["public", "private"]).default("private"),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/chat
 *
 * List chats for the authenticated user.
 * Supports cursor-based pagination.
 */
export const GET = createRouteHandler(
    {
        surface: "chat",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        querySchema: listChatsQuerySchema,
        cachePolicy: "private-short",
    },
    async ({ session, query }) => {
        // Session is guaranteed by auth: "required"
        if (!session) {
            throw new Error("Session required");
        }
        const userId = session.user.id;
        const limit = query.limit ?? 20;

        // Fetch one extra to determine hasMore
        const chats = await getChatsByUserId(userId, limit + 1);

        // Check if there are more results
        const hasMore = chats.length > limit;
        const result = hasMore ? chats.slice(0, -1) : chats;
        const cursor = hasMore ? result.at(-1)?.id : undefined;

        return paginated(result.map(chatToResponse), {
            ...(cursor !== undefined && { cursor }),
            hasMore,
            cache: "private-short",
        });
    }
);

/**
 * POST /api/chat
 *
 * Create a new chat.
 */
export const POST = createRouteHandler(
    {
        surface: "chat",
        method: "POST",
        auth: "required",
        rateLimit: "standard",
        guestAllowed: false,
        bodySchema: createChatBodySchema,
    },
    async ({ session, body }) => {
        // Session is guaranteed by auth: "required"
        if (!session) {
            throw new Error("Session required");
        }
        const userId = session.user.id;

        // Create new chat
        const chat = await createChat({
            userId,
            title: body.title ?? "New Chat",
            ...(body.visibility !== undefined && {
                visibility: body.visibility,
            }),
        });

        return created(chatToResponse(chat), {
            location: `/api/chat/${chat.id}`,
        });
    }
);

// ============================================================================
// Helpers
// ============================================================================

type ChatResponse = {
    id: string;
    title: string;
    visibility: "public" | "private";
    userId: string;
    createdAt: string;
    updatedAt: string;
};

function chatToResponse(chat: {
    id: string;
    title: string;
    visibility: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}): ChatResponse {
    return {
        id: chat.id,
        title: chat.title,
        visibility: chat.visibility as "public" | "private",
        userId: chat.userId,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
    };
}
