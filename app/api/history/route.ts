/**
 * History API Route
 *
 * Handles chat history pagination and bulk deletion.
 *
 * @module app/api/history/route
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createContext, getUserChatsCached, deleteAllUserChatsCached } from "@/lib/data";
import type { Chat } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const ctx = createContext(session.user.id, session.user.type);

        // Fetch chats using the cached data layer
        const chats = await getUserChatsCached(ctx);

        return NextResponse.json({
            chats: chats.map((chat: Chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
                userId: chat.userId,
            })),
            hasMore: false,
            nextCursor: null,
        });
    } catch (error) {
        console.error("[History API]", error);
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
        const session = await getSession();
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
        console.error("[History API]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
