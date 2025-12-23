/**
 * History API Route
 *
 * Handles chat history pagination and bulk deletion.
 *
 * @module app/api/history/route
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSessionCached } from "@/lib/auth";
import { chatDb, createContext, deleteAllUserChatsCached } from "@/lib/data";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/data/types";
import type { Chat } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const ctx = createContext(session.user.id, session.user.type);

        // Parse pagination params from query string
        const searchParams = request.nextUrl.searchParams;
        const limitParam = searchParams.get("limit");
        const cursor = searchParams.get("cursor");

        const limit = Math.min(
            Math.max(
                1,
                Number.parseInt(limitParam ?? "", 10) || DEFAULT_PAGE_SIZE
            ),
            MAX_PAGE_SIZE
        );

        // Fetch chats with cursor-based pagination
        const result = await chatDb.listChats(ctx, {
            limit,
            startingAfter: cursor ?? undefined,
        });

        return NextResponse.json({
            chats: result.items.map((chat: Chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
                userId: chat.userId,
            })),
            hasMore: result.hasMore,
            nextCursor: result.nextCursor ?? null,
        });
    } catch (error) {
        logger.error("[History API]", { error });
        if (error instanceof AppError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            );
        }
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest) {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const ctx = createContext(session.user.id, session.user.type);

        // Delete all chats for user
        await deleteAllUserChatsCached(ctx);

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("[History API]", { error });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
