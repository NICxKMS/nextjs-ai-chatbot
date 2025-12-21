/**
 * MessageEditor Component
 *
 * Allows users to edit existing messages in a chat.
 * Displays a textarea with the original message content and save/cancel buttons.
 *
 * @module features/chat/components/message-editor
 */

"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { Button, Textarea } from "@/shared/components";
import { deleteTrailingMessages } from "../actions";
import type { ChatMessage } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type MessageEditorProps = {
    /** Chat session identifier */
    chatId: string;
    /** The message being edited */
    message: ChatMessage;
    /** Function to switch between view and edit modes */
    setMode: Dispatch<SetStateAction<"view" | "edit">>;
    /** AI SDK setMessages function for optimistic updates */
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    /** AI SDK regenerate function to re-run the message */
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract text content from a ChatMessage.
 */
function getTextFromMessage(message: ChatMessage): string {
    if ("parts" in message && Array.isArray(message.parts)) {
        return message.parts
            .filter(
                (part): part is { type: "text"; text: string } =>
                    typeof part === "object" &&
                    part !== null &&
                    (part as { type: string }).type === "text" &&
                    typeof (part as { text: unknown }).text === "string"
            )
            .map((part) => part.text)
            .join("\n")
            .trim();
    }
    return "";
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Message editing component.
 *
 * Features:
 * - Auto-resizing textarea
 * - Save/Cancel buttons
 * - Optimistic update on save
 * - Triggers message regeneration after edit
 *
 * Visual parity with oldapp/components/message-editor.tsx
 */
export function MessageEditor({
    chatId,
    message,
    setMode,
    setMessages,
    regenerate,
}: MessageEditorProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [draftContent, setDraftContent] = useState(
        getTextFromMessage(message)
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea to fit content
    const adjustHeight = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        }
    }, []);

    // Adjust height on mount
    useEffect(() => {
        if (textareaRef.current) {
            adjustHeight();
        }
    }, [adjustHeight]);

    // Handle textarea input changes
    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDraftContent(event.target.value);
        adjustHeight();
    };

    // Handle cancel button click
    const handleCancel = useCallback(() => {
        setMode("view");
    }, [setMode]);

    // Handle save button click
    const handleSave = useCallback(async () => {
        setIsSubmitting(true);

        try {
            // Get message timestamp for deletion
            const createdAt =
                (message as ChatMessage & { metadata?: { createdAt?: string } })
                    .metadata?.createdAt ?? new Date().toISOString();

            // Delete trailing messages from database
            await deleteTrailingMessages({
                chatId,
                createdAt,
            });
        } catch (_error) {
            setIsSubmitting(false);
            toast.error("Failed to edit message");
            return;
        }

        // Optimistically update the message in the UI
        setMessages((messages) => {
            const index = messages.findIndex((m) => m.id === message.id);

            if (index !== -1) {
                const updatedMessage: ChatMessage = {
                    ...message,
                    parts: [{ type: "text", text: draftContent }],
                };

                return [...messages.slice(0, index), updatedMessage];
            }

            return messages;
        });

        setMode("view");
        regenerate();
    }, [chatId, message, draftContent, setMessages, setMode, regenerate]);

    return (
        <div className="flex w-full flex-col gap-2">
            <Textarea
                className="w-full resize-none overflow-hidden rounded-xl bg-transparent text-base! outline-hidden"
                data-testid="message-editor"
                onChange={handleInput}
                ref={textareaRef}
                value={draftContent}
            />

            <div className="flex flex-row justify-end gap-2">
                <Button
                    className="h-fit px-3 py-2"
                    onClick={handleCancel}
                    variant="outline"
                >
                    Cancel
                </Button>
                <Button
                    className="h-fit px-3 py-2"
                    data-testid="message-editor-send-button"
                    disabled={isSubmitting}
                    onClick={handleSave}
                    variant="default"
                >
                    {isSubmitting ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
}
