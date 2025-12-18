/**
 * Chat Route
 * @module new-arch/app/(chat)/api/chat/route
 *
 * API routes for chat operations (list and create).
 */

import { z } from "zod";
import { created, createRouteHandler, paginated } from "@/lib/api";
import { createChat } from "@/lib/data/chat/mutations";
import { getChatsByUserId } from "@/lib/data/chat/queries";

// ============================================================================
// Schemas
// ============================================================================

const listChatsQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    startingAfter: z.string().uuid().optional(),
    endingBefore: z.string().uuid().optional(),
});

const createChatBodySchema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200).optional(),
    visibility: z.enum(["public", "private"]).default("private"),
});

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 60;

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
        if (!session?.user?.id) {
            // This should never happen with auth: required, but satisfies TypeScript
            return new Response("Unauthorized", { status: 401 });
        }
        const userId = session.user.id;
        const limit = query.limit ?? 20;

        const chats = await getChatsByUserId(userId, limit + 1);

        const hasMore = chats.length > limit;
        const result = hasMore ? chats.slice(0, -1) : chats;
        const cursor = hasMore ? result.at(-1)?.id : undefined;

        return paginated(result, {
            cursor,
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
        if (!session?.user?.id) {
            // This should never happen with auth: required, but satisfies TypeScript
            return new Response("Unauthorized", { status: 401 });
        }
        const userId = session.user.id;

        const chat = await createChat({
            userId,
            ...(body.id && { id: body.id }),
            title: body.title ?? "New Chat",
            ...(body.visibility && { visibility: body.visibility }),
        });

        return created(chat, {
            location: `/api/chat/${chat.id}`,
        });
    }
);
