/**
 * History API Route
 *
 * Handles chat history pagination and bulk deletion.
 *
 * @module app/api/history/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chatData, createContext } from "@/lib/data";
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

        // Get pagination params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "20", 10);

        // Fetch chats using the data layer
        const result = await chatData.list(ctx, { limit });

        return NextResponse.json({
            chats: result.items.map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
                userId: chat.userId,
            })),
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
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

export async function DELETE(request: NextRequest) {
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
        await chatData.deleteAll(ctx);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[History API]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
