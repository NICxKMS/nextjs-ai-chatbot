"use client";

import { cn } from "@/lib/utils";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { TextPart } from "./parts";
import type { MessageContentProps } from "./types";

/**
 * Renders message content based on parts.
 * Handles text, reasoning, and edit mode.
 */
export function MessageContent({
    message,
    mode,
    isLoading,
    _isReadonly,
    chatId,
    setMode,
    setMessages,
    regenerate,
}: MessageContentProps) {
    return (
        <>
            {message.parts?.map((part, index) => {
                const key = `message-${message.id}-part-${index}`;

                // Reasoning part
                if (
                    part.type === "reasoning" &&
                    "text" in part &&
                    (part.text as string)?.trim()
                ) {
                    return (
                        <MessageReasoning
                            isLoading={isLoading}
                            key={key}
                            reasoning={part.text as string}
                        />
                    );
                }

                // Text part
                if (part.type === "text" && "text" in part) {
                    if (mode === "edit" && message.role === "user") {
                        return (
                            <div
                                className="flex w-full flex-row items-start gap-3"
                                key={key}
                            >
                                <div className="size-8" />
                                <div className="min-w-0 flex-1">
                                    <MessageEditor
                                        chatId={chatId}
                                        key={message.id}
                                        message={message}
                                        regenerate={regenerate}
                                        setMessages={setMessages}
                                        setMode={setMode}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <TextPart
                            className={cn({
                                "min-w-0 max-w-full":
                                    message.role === "assistant",
                            })}
                            key={key}
                            role={message.role}
                            text={part.text as string}
                        />
                    );
                }

                // Tool parts would be handled here by extending this component
                // For now, return null for unhandled types
                return null;
            })}
        </>
    );
}
