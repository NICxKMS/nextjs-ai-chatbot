/**
 * Vote API Route
 * Ref: POST/PATCH vote operations for chat messages
 *
 * @module app/api/vote/route
 */

import { z } from "zod";
import { requireAuthForRoute, isAuthResponse } from "@/lib/auth";
import { voteData } from "@/lib/data/votes";
import { chatData } from "@/lib/data/chat";
import {
    AppError,
    validationError,
    notFoundError,
    forbiddenError,
} from "@/lib/errors";

export const maxDuration = 10;

/**
 * Vote request validation schema
 */
const voteRequestSchema = z.object({
    chatId: z.string().uuid("Invalid chat ID format"),
    messageId: z.string().uuid("Invalid message ID format"),
    type: z.enum(["up", "down"], {
        errorMap: () => ({ message: 'Vote type must be "up" or "down"' }),
    }),
});

type VoteRequestBody = z.infer<typeof voteRequestSchema>;

/**
 * PATCH /api/vote - Submit or update a vote
 */
export async function PATCH(request: Request): Promise<Response> {
    // 1. Authentication
    const authResult = await requireAuthForRoute("vote");
    if (isAuthResponse(authResult)) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // 2. Guest users cannot vote (requires persistence)
    if (session.user.type === "guest") {
        return forbiddenError("vote", {
            reason: "Guest users cannot vote on messages",
        }).toResponse();
    }

    // 3. Parse and validate request body
    let body: VoteRequestBody;
    try {
        const json = await request.json();
        const parseResult = voteRequestSchema.safeParse(json);
        if (!parseResult.success) {
            const errorMessage = parseResult.error.errors
                .map((e) => e.message)
                .join(", ");
            return validationError(errorMessage).toResponse();
        }
        body = parseResult.data;
    } catch {
        return validationError("Invalid JSON body").toResponse();
    }

    const { chatId, messageId, type } = body;

    // 4. Verify chat exists and user owns it
    const chatResult = await chatData.get(chatId, ctx);
    if (!chatResult) {
        return notFoundError("chat", { chatId }).toResponse();
    }

    // 5. Verify message exists in chat
    const chatWithMessages = await chatData.getWithMessages(chatId, ctx);
    const messageExists = chatWithMessages?.messages.some(
        (m) => m.id === messageId
    );
    if (!messageExists) {
        return notFoundError("message", { messageId, chatId }).toResponse();
    }

    // 6. Save vote
    const vote = await voteData.save({ chatId, messageId, type }, ctx);
    if (!vote) {
        return new AppError({
            code: "internal:database",
            message: "Failed to save vote",
        }).toResponse();
    }

    return Response.json({ success: true, messageId, type }, { status: 200 });
}
