import { getAppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { voteMessage } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/monitoring/logger";

// UUID validation regex
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
    return UUID_REGEX.test(value);
}

// Optimize for Vercel Fluid Compute
export const maxDuration = 10;

export async function PATCH(request: Request) {
    const startTime = Date.now();
    const bodyPromise: Promise<{
        chatId: string;
        messageId: string;
        type: "up" | "down";
    }> = request.json();
    const sessionPromise = getAppSession();

    let chatId: string;
    let messageId: string;
    let type: "up" | "down";

    try {
        const body = await bodyPromise;
        chatId = body.chatId;
        messageId = body.messageId;
        type = body.type;
    } catch (_) {
        return new ChatSDKError(
            "bad_request:api:invalid_json",
            "Request body must be valid JSON"
        ).toResponse();
    }

    if (!chatId || !messageId || !type) {
        return new ChatSDKError(
            "bad_request:api:missing_vote_params",
            "Parameters chatId, messageId, and type are required."
        ).toResponse();
    }

    // Validate UUID format
    if (!isValidUUID(chatId) || !isValidUUID(messageId)) {
        return new ChatSDKError(
            "bad_request:api:invalid_uuid_format",
            "chatId and messageId must be valid UUIDs."
        ).toResponse();
    }

    // Validate vote type
    if (type !== "up" && type !== "down") {
        return new ChatSDKError(
            "bad_request:api:invalid_vote_type",
            "Vote type must be 'up' or 'down'."
        ).toResponse();
    }

    let session;
    try {
        session = await sessionPromise;
    } catch (error) {
        logger.error("Session retrieval failed in vote route", { error });
        return new ChatSDKError(
            "unauthorized:vote:session_error",
            "Failed to retrieve session"
        ).toResponse();
    }

    if (!session?.user) {
        return new ChatSDKError(
            "unauthorized:vote:missing_session"
        ).toResponse();
    }

    // Guest users cannot vote (requires database persistence)
    if (session.user.type === "guest") {
        return new ChatSDKError(
            "forbidden:vote:guest_cannot_vote",
            "Guest users cannot vote on messages"
        ).toResponse();
    }

    const ctx = createContext(session);
    const chat = await chatData.get(chatId, ctx, { warmCache: false });

    if (!chat) {
        return new ChatSDKError("not_found:vote").toResponse();
    }

    if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:vote:owner_mismatch").toResponse();
    }

    await voteMessage({
        chatId,
        messageId,
        type,
        userId: session.user.id,
    });

    const duration = Date.now() - startTime;
    logger.info("Message voted", {
        chatId,
        messageId,
        type,
        userId: session.user.id,
        duration,
    });

    return new Response("Message voted", { status: 200 });
}
