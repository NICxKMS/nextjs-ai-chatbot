/**
 * Single Chat API Route
 *
 * Handles operations on individual chats: GET, DELETE.
 *
 * @module app/api/chat/[id]/route
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSessionCached } from "@/lib/auth";
import { createContext, deleteChatCached, getChatCached } from "@/lib/data";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

type RouteParams = {
    params: Promise<{ id: string }>;
};

/**
 * GET /api/chat/[id]
 * Retrieve a single chat by ID
 */
export async function GET(
    _request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: chatId } = await params;
        const ctx = createContext(session.user.id, session.user.type);

        const chat = await getChatCached(chatId, ctx);

        if (!chat) {
            return NextResponse.json(
                { error: "Chat not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
            visibility: chat.visibility,
            userId: chat.userId,
        });
    } catch (error) {
        logger.error("[Chat API GET]", { error });
        if (error instanceof AppError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * DELETE /api/chat/[id]
 * Delete a chat by ID
 *
 * Returns:
 * - 204 No Content on success
 * - 401 Unauthorized if not logged in
 * - 404 Not Found if chat doesn't exist or not owned by user
 */
export async function DELETE(
    _request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: chatId } = await params;
        const ctx = createContext(session.user.id, session.user.type);

        // deleteChatCached handles:
        // 1. Ownership verification (via DB query with userId)
        // 2. Deletion of related entities (messages, votes)
        // 3. Cache invalidation
        const deleted = await deleteChatCached(chatId, ctx);

        if (!deleted) {
            // Chat not found or not owned by user
            return NextResponse.json(
                { error: "Chat not found" },
                { status: 404 }
            );
        }

        // 204 No Content - successful deletion
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        logger.error("[Chat API DELETE]", { error });
        if (error instanceof AppError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
