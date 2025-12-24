/**
 * Existing Chat Page (Dynamic Route)
 *
 * Server component that loads and displays an existing chat session.
 * Handles authentication, authorization, and message loading.
 *
 * PERF-002: Uses parallel data loading to eliminate request waterfalls.
 * OPT-008: Dynamic metadata generation for SEO.
 *
 * @module app/(chat)/chat/[id]/page
 */

import type { UIMessage } from "@ai-sdk/react";
import { eq } from "drizzle-orm";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Chat, DataStreamHandler } from "@/features/chat";
import { DEFAULT_MODEL_ID } from "@/lib/ai";
import { loadChatPageData } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { convertToUIMessages } from "@/lib/utils";

type Props = {
    params: Promise<{ id: string }>;
};

/**
 * Generate dynamic metadata for SEO and social sharing.
 * OPT-008: Fetches chat title without auth requirement.
 */
export async function generateMetadata(
    { params }: Props,
    _parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await params;

    try {
        // Direct DB query for title only - no auth required for public metadata
        const db = getDb();
        const [result] = await db
            .select({ title: schema.chat.title })
            .from(schema.chat)
            .where(eq(schema.chat.id, id))
            .limit(1);

        if (result?.title) {
            return {
                title: result.title,
                description: `Chat: ${result.title}`,
            };
        }
    } catch {
        // Fallback for invalid/missing chat - graceful degradation
    }

    return {
        title: "Chat",
        description: "AI Chat Conversation",
    };
}

type ChatPageProps = {
    params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
    const { id } = await params;

    // PERF-002: Load session, chat, and votes in parallel
    // Session first (required), then chat+votes together
    const { session, chatWithMessages, votes } = await loadChatPageData(id);

    // If no session, redirect to login
    if (!session?.user) {
        redirect("/login");
    }

    const user = session.user;

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
