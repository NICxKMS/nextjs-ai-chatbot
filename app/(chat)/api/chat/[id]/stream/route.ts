import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds } from "date-fns";
import {
    requireAuthForRoute,
    requireRateLimitForRoute,
    requireResourceForRoute,
    verifyOwnershipForRoute,
} from "@/lib/api/guards";
import { chatData } from "@/lib/data/chat";
import { ChatSDKError } from "@/lib/errors";
import { logError } from "@/lib/log";
import type { ChatMessage } from "@/lib/types";

export async function GET(
    _: Request,
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

    // Apply rate limiting for stream reconnection
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "stream"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Fetch chat with messages in a single optimized cache operation
    // Guest users: cache-only (no database fallback)
    // Authenticated users: cache first, then database fallback
    let result: Awaited<ReturnType<typeof chatData.getWithMessages>>;

    try {
        result = await chatData.getWithMessages(chatId, ctx);
    } catch (error) {
        // Task 9.11: Ensure all stream errors go through ChatSDKError wrapper
        logError("Stream: Failed to fetch chat with messages", error, {
            chatId,
            userId: session.user.id,
        });
        if (error instanceof ChatSDKError) {
            return error.toResponse();
        }
        return new ChatSDKError(
            "not_found:chat",
            "Failed to load chat data"
        ).toResponse();
    }

    // Require chat exists
    const chatResult = requireResourceForRoute(result, "chat");
    if (chatResult instanceof Response) {
        return chatResult;
    }

    const { chat, messages } = chatResult;

    // Verify ownership for private chats
    if (chat.visibility === "private") {
        const ownershipCheck = verifyOwnershipForRoute(chat, session, "chat");
        if (ownershipCheck) {
            return ownershipCheck;
        }
    }

    // Since resumable streams are removed, we just return the most recent message if it's recent
    const mostRecentMessage = messages.at(-1);

    const emptyDataStream = createUIMessageStream<ChatMessage>({
        // biome-ignore lint/suspicious/noEmptyBlockStatements: "Needs to exist"
        execute: () => {},
    });

    if (!mostRecentMessage) {
        return new Response(
            emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
            { status: 200 }
        );
    }

    if (mostRecentMessage.role !== "assistant") {
        return new Response(
            emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
            { status: 200 }
        );
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);
    const resumeRequestedAt = new Date();

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
        return new Response(
            emptyDataStream.pipeThrough(new JsonToSseTransformStream()),
            { status: 200 }
        );
    }

    // Issue #6 Fix: Prevent double JSON serialization
    // The stream writer already serializes data, so we pass the object directly
    // instead of pre-stringifying it which would cause double-encoding
    const restoredStream = createUIMessageStream<ChatMessage>({
        execute: ({ writer }) => {
            writer.write({
                type: "data-appendMessage",
                data: mostRecentMessage,
                transient: true,
            });
        },
    });

    return new Response(
        restoredStream.pipeThrough(new JsonToSseTransformStream()),
        { status: 200 }
    );
}
