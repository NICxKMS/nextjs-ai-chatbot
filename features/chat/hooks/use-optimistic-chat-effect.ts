/**
 * useOptimisticChatEffect Hook
 *
 * Handles optimistic sidebar updates when a new chat is created.
 * Shows the chat in sidebar immediately when first message is submitted.
 *
 * @module features/chat/hooks/use-optimistic-chat-effect
 */

import { useEffect, useRef } from "react";
import type { OptimisticChatItem } from "@/shared/types";
import type { ChatMessage } from "../types";

export type UseOptimisticChatEffectOptions = {
    /** Chat ID */
    chatId: string;
    /** Current chat status from AI SDK */
    status: string;
    /** Current messages array */
    messages: ChatMessage[];
    /** Initial messages (empty for new chats) */
    initialMessagesLength: number;
    /** Callback to add optimistic chat to sidebar (injected from app layer) */
    addOptimisticChat?: (chat: OptimisticChatItem) => void;
};

/**
 * Extracts text content from a message's parts array.
 */
function extractTextContent(message: ChatMessage | undefined): string {
    if (!message?.parts) {
        return "New Chat";
    }

    const textPart = message.parts.find(
        (part): part is { type: "text"; text: string } => part.type === "text"
    );

    return textPart?.text || "New Chat";
}

/**
 * Hook that optimistically adds a chat to the sidebar when first message is sent.
 * Only triggers for new chats (no initial messages) on first submission.
 *
 * @example
 * ```tsx
 * const { addOptimisticChat } = useOptimisticChats(); // from sidebar feature
 *
 * useOptimisticChatEffect({
 *   chatId: "abc123",
 *   status: chatHelpers.status,
 *   messages: chatHelpers.messages,
 *   initialMessagesLength: initialMessages.length,
 *   addOptimisticChat, // injected from app layer
 * });
 * ```
 */
export function useOptimisticChatEffect({
    chatId,
    status,
    messages,
    initialMessagesLength,
    addOptimisticChat,
}: UseOptimisticChatEffectOptions): void {
    const hasAddedOptimisticChat = useRef(false);

    useEffect(() => {
        // Skip if no callback provided (feature not wired)
        if (!addOptimisticChat) {
            return;
        }

        // Only trigger for new chats (no initial messages) when first message is submitted
        if (
            status === "submitted" &&
            initialMessagesLength === 0 &&
            messages.length === 1 &&
            !hasAddedOptimisticChat.current
        ) {
            hasAddedOptimisticChat.current = true;
            const firstMessage = messages[0];

            const textContent = extractTextContent(firstMessage);
            const initialTitle = textContent.slice(0, 80).trim() || "New Chat";

            addOptimisticChat({
                id: chatId,
                title: initialTitle,
                createdAt: new Date(),
                visibility: "private",
                userId: "", // Will be populated from server response
            });
        }
    }, [status, messages, initialMessagesLength, chatId, addOptimisticChat]);
}
