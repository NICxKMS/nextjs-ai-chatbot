/**
 * Chat History Route
 * @module new-arch/app/(chat)/api/history/route
 *
 * API route for retrieving chat history with pagination.
 */

import { z } from "zod";
import { createRouteHandler, paginated } from "@/lib/api";
import { getChatsByUserId } from "@/lib/data/chat/queries";

// ============================================================================
// Schemas
// ============================================================================

const historyQuerySchema = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    startingAfter: z.string().uuid().optional(),
    endingBefore: z.string().uuid().optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

export const maxDuration = 10;

/**
 * GET /api/history
 *
 * Get chat history for the authenticated user.
 * Supports cursor-based pagination.
 */
export const GET = createRouteHandler(
    {
        surface: "history",
        method: "GET",
        auth: "required",
        rateLimit: "standard",
        querySchema: historyQuerySchema,
        cachePolicy: "private-short",
    },
    async ({ session, query }) => {
        // Validate pagination params
        if (query.startingAfter && query.endingBefore) {
            return new Response(
                JSON.stringify({
                    error: "Only one of starting_after or ending_before can be provided",
                }),
                { status: 400 }
            );
        }

        if (!session?.user?.id) {
            // This should never happen with auth: required, but satisfies TypeScript
            return new Response("Unauthorized", { status: 401 });
        }
        const userId = session.user.id;
        const limit = query.limit ?? 20;

        const chats = await getChatsByUserId(userId, limit + 1);

        const hasMore = chats.length > limit;
        const history = hasMore ? chats.slice(0, -1) : chats;
        const cursor = hasMore ? history.at(-1)?.id : undefined;

        return paginated(history, {
            cursor,
            hasMore,
            cache: "private-short",
        });
    }
);
