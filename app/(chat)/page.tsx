/**
 * New Chat Page (Home)
 *
 * Server component that renders a new chat session.
 * Generates a fresh UUID for each new chat.
 *
 * @module app/(chat)/page
 */

import { cookies } from "next/headers";
import { connection } from "next/server";

import { Chat, DataStreamHandler } from "@/features/chat";
import { DEFAULT_MODEL_ID, getAvailableModels } from "@/lib/ai";
import { generateUUID } from "@/lib/utils";

export default async function NewChatPage() {
    // Defer to request time - prevents prerender errors with cookies()
    await connection();

    const cookieStore = await cookies();

    // Get available models and determine initial model
    const availableModels = getAvailableModels();
    const selectedModelId = cookieStore.get("chat-model")?.value;
    const initialModelId =
        selectedModelId &&
        availableModels.some((model) => model.id === selectedModelId)
            ? selectedModelId
            : DEFAULT_MODEL_ID;

    // Generate new chat ID for new conversations
    const chatId = generateUUID();

    return (
        <>
            <Chat
                id={chatId}
                initialMessages={[]}
                isReadonly={false}
                selectedModelId={initialModelId}
                selectedVisibilityType="private"
                votes={[]}
            />
            <DataStreamHandler />
        </>
    );
}
