import {
    requireAuthForRoute,
    requireNonGuestForRoute,
    requireRateLimitForRoute,
    requireResourceForRoute,
    verifyOwnershipForRoute,
} from "@/lib/api/guards";
import { parseJsonBodyForRoute } from "@/lib/api/validators";
import { chatData } from "@/lib/data/chat";
import { voteMessage } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logInfo } from "@/lib/log";
import { type VoteRequestBody, voteRequestSchema } from "./schema";

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function PATCH(request: Request) {
    // Parse and validate request body
    const bodyResult = await parseJsonBodyForRoute(
        request,
        voteRequestSchema,
        "vote"
    );
    if (bodyResult instanceof Response) {
        return bodyResult;
    }
    const { chatId, messageId, type } = bodyResult as VoteRequestBody;

    // Require authenticated session
    const authResult = await requireAuthForRoute("vote");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Apply rate limiting for voting
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "api"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Guest users cannot vote (requires database persistence)
    const guestCheck = requireNonGuestForRoute(session, "vote", "vote");
    if (guestCheck) {
        return guestCheck;
    }

    // Fetch and verify chat exists
    const chat = await chatData.get(chatId, ctx, { warmCache: false });
    const chatResource = requireResourceForRoute(chat, "vote");
    if (chatResource instanceof Response) {
        return chatResource;
    }

    // Verify ownership
    const ownershipCheck = verifyOwnershipForRoute(
        chatResource,
        session,
        "vote"
    );
    if (ownershipCheck) {
        return ownershipCheck;
    }

    // Issue #9 Fix: Verify that the message belongs to the chat
    // This prevents users from voting on messages from other chats
    const chatWithMessages = await chatData.getWithMessages(chatId, ctx);
    const messageExists = chatWithMessages?.messages.some(
        (m) => m.id === messageId
    );
    if (!messageExists) {
        return new ChatSDKError(
            "not_found:vote",
            "Message not found in this chat"
        ).toResponse();
    }

    await voteMessage({
        chatId,
        messageId,
        type,
        userId: session.user.id,
    });

    logInfo("Message voted", {
        chatId,
        messageId,
        type,
        userId: session.user.id,
    });

    // Issue #10 Fix: Return JSON response for consistency
    return Response.json({ success: true, messageId, type }, { status: 200 });
}
