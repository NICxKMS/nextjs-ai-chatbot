/**
 * Vote API Route
 * Ref: POST/PATCH vote operations for chat messages
 *
 * @module app/api/vote/route
 */

import { z } from "zod";
import { isAuthResponse, requireAuthForRoute } from "@/lib/auth";
import {
    getChatCached,
    getChatWithMessagesCached,
    saveVoteCached,
} from "@/lib/data";
import {
    AppError,
    forbiddenError,
    notFoundError,
    validationError,
} from "@/lib/errors";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

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
    // 0. Rate limiting
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";

    const rateResult = await checkRateLimit(`vote:${ip}`, "standard");
    if (!rateResult.success) {
        const retryAfter = Math.ceil((rateResult.reset - Date.now()) / 1000);
        return new Response(
            JSON.stringify({
                error: "Too many vote requests",
                retryAfter,
            }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": String(retryAfter),
                },
            }
        );
    }

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
    const chatResult = await getChatCached(chatId, ctx);
    if (!chatResult) {
        return notFoundError("chat", { chatId }).toResponse();
    }

    // 5. Verify message exists in chat
    const chatWithMessages = await getChatWithMessagesCached(chatId, ctx);
    const messageExists = chatWithMessages?.messages.some(
        (m) => m.id === messageId
    );
    if (!messageExists) {
        return notFoundError("message", { messageId, chatId }).toResponse();
    }

    // 6. Save vote
    const vote = await saveVoteCached(chatId, messageId, type, ctx);
    if (!vote) {
        return new AppError({
            code: "internal:database",
            message: "Failed to save vote",
        }).toResponse();
    }

    return Response.json({ success: true, messageId, type }, { status: 200 });
}
