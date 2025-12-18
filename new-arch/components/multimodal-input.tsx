/**
 * Multimodal Input Component - Stub
 * @module new-arch/components/multimodal-input
 *
 * This is a placeholder for the multimodal input component.
 * Will be implemented in future.
 */

"use client";

import type React from "react";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { VisibilityType } from "./visibility-selector";

export type MultimodalInputProps = {
    attachments?: Attachment[];
    availableModels?: Array<{ id: string; name: string }>;
    chatId?: string;
    input?: string;
    messages?: ChatMessage[];
    onModelChange?: (modelId: string) => void;
    selectedModelId?: string;
    selectedVisibilityType?: VisibilityType;
    sendMessage?: (message: string) => void;
    setAttachments?: (attachments: Attachment[]) => void;
    setInput?: (input: string) => void;
    setMessages?: (messages: ChatMessage[]) => void;
    status?: string;
    stop?: () => void;
    usage?: unknown;
};

export function MultimodalInput({
    input = "",
    setInput,
    sendMessage,
}: MultimodalInputProps): React.JSX.Element {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage?.(input);
            setInput?.("");
        }
    };

    return (
        <form className="flex gap-2 border-t p-4" onSubmit={handleSubmit}>
            <input
                className="flex-1 rounded border px-3 py-2"
                onChange={(e) => setInput?.(e.target.value)}
                placeholder="Type a message..."
                type="text"
                value={input}
            />
            <button
                className="rounded bg-primary px-4 py-2 text-primary-foreground"
                type="submit"
            >
                Send
            </button>
        </form>
    );
}
