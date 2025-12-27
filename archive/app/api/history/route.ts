/**
 * History API Route
 *
 * Handles chat history pagination and bulk deletion.
 *
 * @module app/api/history/route
 */

import { type NextRequest, NextResponse } from "next/server";
import { getSessionCached } from "@/lib/auth";
import { getChatConfig } from "@/lib/config/app-config";
import { createContext } from "@/lib/data";
import type { Chat } from "@/lib/db";
import { AppError, authError } from "@/lib/errors";
import { ChatService } from "@/lib/services";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest): Promise<Response> {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return authError("unauthorized", { route: "history" }).toResponse();
        }

        const ctx = createContext(session.user.id, session.user.type);
        const config = getChatConfig();

        // Parse pagination params from query string
        const searchParams = request.nextUrl.searchParams;
        const limitParam = searchParams.get("limit");
        const cursor = searchParams.get("cursor");

        const limit = Math.min(
            Math.max(
                1,
                Number.parseInt(limitParam ?? "", 10) || config.defaultPageSize
            ),
            config.maxPageSize
        );

        // Fetch chats with cursor-based pagination via service
        const result = await ChatService.list(
            {
                limit,
                startingAfter: cursor ?? undefined,
            },
            ctx
        );

        if (!result.success) {
            return new AppError({
                code: `internal:${result.code}`,
                message: result.error,
                statusCode: 500,
            }).toResponse();
        }

        return NextResponse.json({
            chats: result.data.chats.map((chat: Chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
                userId: chat.userId,
            })),
            hasMore: result.data.hasMore,
            nextCursor: result.data.nextCursor ?? null,
        });
    } catch (error) {
        logger.error("[History API]", { error });
        if (error instanceof AppError) {
            return error.toResponse();
        }
        return new AppError({
            code: "internal:error",
            message: "Failed to fetch chat history",
            cause: error instanceof Error ? error : undefined,
        }).toResponse();
    }
}

export async function DELETE(_request: NextRequest): Promise<Response> {
    try {
        const session = await getSessionCached();
        if (!session?.user?.id) {
            return authError("unauthorized", { route: "history" }).toResponse();
        }

        const ctx = createContext(session.user.id, session.user.type);

        // Delete all chats for user via service
        const result = await ChatService.deleteAll(ctx);

        if (!result.success) {
            return new AppError({
                code: `internal:${result.code}`,
                message: result.error,
                statusCode: 500,
            }).toResponse();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("[History API]", { error });
        return new AppError({
            code: "internal:error",
            message: "Failed to delete chat history",
            cause: error instanceof Error ? error : undefined,
        }).toResponse();
    }
}
