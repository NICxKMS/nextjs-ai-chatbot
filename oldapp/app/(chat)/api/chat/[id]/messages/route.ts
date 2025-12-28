import { asc, desc, eq, gt, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
    requireAuthForRoute,
    requireRateLimitForRoute,
    requireResourceForRoute,
    verifyOwnershipForRoute,
} from "@/lib/api/guards";
import { isRedisAvailable } from "@/lib/cache/redis";
import {
    MAX_PAGINATION_LIMIT,
    sortMessagesByTimeAndRole,
} from "@/lib/constants";
import { chatData } from "@/lib/data/chat";
import { db } from "@/lib/db/queries";
import { message } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";

export const maxDuration = 10;

/**
 * Cursor encoding/decoding for message pagination
 */
const CursorCodec = {
    encode(createdAt: Date): string {
        return Buffer.from(createdAt.toISOString()).toString("base64url");
    },

    decode(cursor: string): Date {
        try {
            const iso = Buffer.from(cursor, "base64url").toString("utf-8");
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) {
                throw new Error("Invalid date");
            }
            return date;
        } catch {
            throw new ChatSDKError(
                "bad_request:api:invalid_cursor",
                "Invalid cursor format"
            );
        }
    },
};

/**
 * GET /api/chat/[id]/messages
 *
 * Fetch messages for a chat with optional pagination support.
 *
 * Query Parameters:
 * - cursor: (optional) Pagination cursor (createdAt timestamp encoded)
 * - limit: (optional) Number of messages to return (1-100, default 50)
 * - direction: (optional) 'forward' | 'backward' (default: 'forward')
 *
 * Backwards Compatibility:
 * - If NO pagination params provided, returns ALL messages (existing behavior)
 * - If cursor OR limit provided, returns paginated response with cursor metadata
 *
 * Response (unpaginated - backwards compatible):
 * ```json
 * { "messages": [...] }
 * ```
 *
 * Response (paginated):
 * ```json
 * {
 *   "data": [...],
 *   "pagination": {
 *     "nextCursor": "string | null",
 *     "prevCursor": "string | null",
 *     "hasMore": boolean
 *   }
 * }
 * ```
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: chatId } = await params;

    if (!chatId) {
        return new ChatSDKError("bad_request:api:missing_chat_id").toResponse();
    }

    // Require authenticated session
    const authResult = await requireAuthForRoute("chat");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply rate limiting
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "chat"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursorParam = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const directionParam = searchParams.get("direction");

    // Determine if pagination is requested
    // If neither cursor nor limit is provided, use backwards-compatible mode
    const isPaginated = cursorParam !== null || limitParam !== null;

    // Validate and parse pagination parameters
    let limit = 50;
    if (limitParam) {
        const parsedLimit = Number.parseInt(limitParam, 10);
        if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
            return new ChatSDKError(
                "bad_request:api:invalid_limit",
                "Limit must be a positive integer"
            ).toResponse();
        }
        limit = Math.min(parsedLimit, MAX_PAGINATION_LIMIT);
    }

    const direction =
        directionParam === "backward" ? "backward" : ("forward" as const);

    // For backwards-compatible mode (no pagination), use existing getWithMessages
    if (!isPaginated) {
        const result = await chatData.getWithMessages(chatId, ctx);

        const chatResult = requireResourceForRoute(result, "chat");
        if (chatResult instanceof Response) {
            return chatResult;
        }

        const { chat: chatMeta, messages } = chatResult;

        // Verify ownership for private chats
        if (chatMeta.visibility === "private") {
            const ownershipCheck = verifyOwnershipForRoute(
                chatMeta,
                session,
                "chat"
            );
            if (ownershipCheck) {
                return ownershipCheck;
            }
        }

        // Return backwards-compatible response
        return NextResponse.json({ messages });
    }

    // Paginated mode: fetch chat first to verify access
    const chatResult = await chatData.get(chatId, ctx);

    const chat = requireResourceForRoute(chatResult, "chat");
    if (chat instanceof Response) {
        return chat;
    }

    // Verify ownership for private chats
    if (chat.visibility === "private") {
        const ownershipCheck = verifyOwnershipForRoute(chat, session, "chat");
        if (ownershipCheck) {
            return ownershipCheck;
        }
    }

    // For guest users without Redis, we can't paginate
    if (ctx.isGuest && !isRedisAvailable()) {
        return new ChatSDKError(
            "bad_request:api:guest_requires_cache",
            "Guest sessions require cache for pagination"
        ).toResponse();
    }

    // Build paginated query
    // Messages are ordered by createdAt ascending (oldest first)
    // Forward pagination: get messages AFTER cursor
    // Backward pagination: get messages BEFORE cursor
    let cursorDate: Date | undefined;
    if (cursorParam) {
        cursorDate = CursorCodec.decode(cursorParam);
    }

    // Fetch limit + 1 to check if there are more records
    const fetchLimit = limit + 1;

    let query = db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .$dynamic();

    if (cursorDate) {
        if (direction === "forward") {
            // Forward: get messages AFTER cursor (newer messages)
            query = query.where(gt(message.createdAt, cursorDate));
        } else {
            // Backward: get messages BEFORE cursor (older messages)
            query = query.where(lt(message.createdAt, cursorDate));
        }
    }

    // Order by createdAt
    // Forward: ascending (oldest to newest)
    // Backward: descending (newest to oldest), then reverse results
    if (direction === "forward") {
        query = query.orderBy(asc(message.createdAt));
    } else {
        query = query.orderBy(desc(message.createdAt));
    }

    query = query.limit(fetchLimit);

    const results = await query;

    // Check if there are more records
    const hasMore = results.length > limit;
    let data = hasMore ? results.slice(0, limit) : results;

    // For backward pagination, reverse results to maintain chronological order
    if (direction === "backward") {
        data = data.reverse();
    }

    // Sort messages using shared helper (timestamp + role tiebreaker)
    const sortedData = sortMessagesByTimeAndRole(data);

    // Generate cursors
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (sortedData.length > 0) {
        const firstMessage = sortedData[0];
        const lastMessage = sortedData.at(-1);

        // Previous cursor: first record in current page
        // Can go backward if we have a cursor (not at the start)
        if (firstMessage && cursorParam) {
            prevCursor = CursorCodec.encode(firstMessage.createdAt);
        }

        // Next cursor: last record in current page
        if (lastMessage && hasMore) {
            nextCursor = CursorCodec.encode(lastMessage.createdAt);
        }
    }

    // Return paginated response
    return NextResponse.json({
        data: sortedData,
        pagination: {
            nextCursor,
            prevCursor,
            hasMore,
        },
    });
}
