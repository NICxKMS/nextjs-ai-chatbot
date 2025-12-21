/**
 * Existing Chat Page (Dynamic Route)
 *
 * Server component that loads and displays an existing chat session.
 * Handles authentication, authorization, and message loading.
 *
 * @module app/(chat)/chat/[id]/page
 */

import type { UIMessage } from "@ai-sdk/react";
import { notFound, redirect } from "next/navigation";
import { Chat, DataStreamHandler } from "@/features/chat";
import { DEFAULT_MODEL_ID } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { chatData, createContext, voteData } from "@/lib/data";
import { convertToUIMessages } from "@/lib/utils";

type ChatPageProps = {
    params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
    const { id } = await params;

    // Get current session
    const session = await getSession();
    const user = session?.user;

    // If no session, redirect to login
    if (!user) {
        redirect("/login");
    }

    // Create data context
    const ctx = createContext(user.id, user.type);

    // Try to load existing chat with messages
    const chatWithMessages = await chatData.getWithMessages(id, ctx);

    // If chat doesn't exist, show 404
    if (!chatWithMessages) {
        notFound();
    }

    const { chat, messages: rawMessages } = chatWithMessages;

    // Check authorization - private chats are owner-only
    if (chat.visibility === "private" && chat.userId !== user.id) {
        redirect("/?notice=chat_not_found");
    }

    // Convert to UI messages format
    const messages = convertToUIMessages(rawMessages) as UIMessage[];

    // Determine readonly state
    const isReadonly = chat.userId !== user.id;

    // Get model from lastContext or use default
    const lastContext = chat.lastContext as { modelId?: string } | null;
    const selectedModelId = lastContext?.modelId ?? DEFAULT_MODEL_ID;

    // Load votes for authenticated (non-guest) users
    let votes: Array<{
        chatId: string;
        messageId: string;
        vote: "up" | "down";
    }> = [];
    if (rawMessages.length >= 2 && user.type !== "guest") {
        try {
            const dbVotes = await voteData.getByChatId(id, ctx);
            votes = dbVotes.map((v) => ({
                chatId: v.chatId,
                messageId: v.messageId,
                vote: v.isUpvoted ? "up" : "down",
            }));
        } catch {
            // Continue without votes on error
            votes = [];
        }
    }

    return (
        <>
            <Chat
                id={chat.id}
                initialMessages={messages}
                isReadonly={isReadonly}
                selectedModelId={selectedModelId}
                selectedVisibilityType={chat.visibility}
                votes={votes}
            />
            <DataStreamHandler />
        </>
    );
}
