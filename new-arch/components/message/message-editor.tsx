"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MessageEditorProps } from "./types";

/** Extract text from message parts */
function getTextFromMessage(message: {
    parts?: Array<{ type: string; text?: string }>;
}): string {
    return (
        message.parts
            ?.filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("\n") ?? ""
    );
}

/**
 * Inline editor for editing user messages.
 * Handles text editing, submission, and regeneration.
 */
export function MessageEditor({
    chatId,
    message,
    setMode,
    setMessages,
    regenerate,
}: MessageEditorProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [draftContent, setDraftContent] = useState(() =>
        getTextFromMessage(message)
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        }
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDraftContent(e.target.value);
        adjustHeight();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            // Delete trailing messages from this point
            await fetch("/api/messages/delete-trailing", {
                method: "POST",
                body: JSON.stringify({
                    chatId,
                    createdAt:
                        message.metadata?.createdAt ?? new Date().toISOString(),
                }),
            });
        } catch {
            setIsSubmitting(false);
            toast.error("Failed to edit message");
            return;
        }

        // Update message in state
        setMessages((messages) => {
            const index = messages.findIndex((m) => m.id === message.id);
            if (index === -1) {
                return messages;
            }

            const updatedMessage = {
                ...message,
                parts: [{ type: "text" as const, text: draftContent }],
            };
            return [...messages.slice(0, index), updatedMessage];
        });

        setMode("view");
        regenerate();
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <Textarea
                className="w-full resize-none overflow-hidden rounded-xl bg-transparent text-base outline-none"
                data-testid="message-editor"
                onChange={handleInput}
                ref={textareaRef}
                value={draftContent}
            />

            <div className="flex justify-end gap-2">
                <Button
                    className="h-fit px-3 py-2"
                    onClick={() => setMode("view")}
                    variant="outline"
                >
                    Cancel
                </Button>
                <Button
                    className="h-fit px-3 py-2"
                    data-testid="message-editor-send-button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                >
                    {isSubmitting ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    );
}
