"use client";

import equal from "fast-deep-equal";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";
import { MessageContent } from "./message-content";
import type { FilePart, MessageMode, MessageProps } from "./types";

/** Avatar icon for assistant messages */
function AssistantAvatar() {
    return (
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <span className="text-sm">✨</span>
        </div>
    );
}

/** Attachment preview component */
function AttachmentPreview({ attachment }: { attachment: FilePart }) {
    const name = attachment.name ?? attachment.filename ?? "file";
    return (
        <div className="rounded-md border bg-muted px-2 py-1 text-xs">
            {name}
        </div>
    );
}

function PureMessage({
    chatId,
    message,
    vote,
    isLoading,
    setMessages,
    regenerate,
    isReadonly = false,
    requiresScrollPadding = false,
}: MessageProps) {
    const [mode, setMode] = useState<MessageMode>("view");

    const attachments =
        message.parts?.filter(
            (part): part is FilePart => part.type === "file"
        ) ?? [];

    return (
        <div
            className="group/message fade-in w-full animate-in"
            data-role={message.role}
            data-testid={`message-${message.role}`}
        >
            <div
                className={cn("flex w-full items-start gap-2 md:gap-3", {
                    "justify-end": message.role === "user" && mode !== "edit",
                    "justify-start": message.role === "assistant",
                })}
            >
                {message.role === "assistant" && <AssistantAvatar />}

                <div
                    className={cn("flex flex-col", {
                        "gap-2 md:gap-4": message.parts?.some(
                            (p) =>
                                p.type === "text" &&
                                "text" in p &&
                                (p.text as string)?.trim()
                        ),
                        "min-h-96":
                            message.role === "assistant" &&
                            requiresScrollPadding,
                        "w-full":
                            message.role === "assistant" || mode === "edit",
                        "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
                            message.role === "user" && mode !== "edit",
                    })}
                >
                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <div
                            className="flex flex-row justify-end gap-2"
                            data-testid="message-attachments"
                        >
                            {attachments.map((att) => (
                                <AttachmentPreview
                                    attachment={att}
                                    key={att.url}
                                />
                            ))}
                        </div>
                    )}

                    {/* Message content */}
                    <MessageContent
                        chatId={chatId}
                        isLoading={isLoading}
                        isReadonly={isReadonly}
                        message={message}
                        mode={mode}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                    />

                    {/* Actions */}
                    {!isReadonly && (
                        <MessageActions
                            chatId={chatId}
                            isLoading={isLoading}
                            key={`action-${message.id}`}
                            message={message}
                            setMode={setMode}
                            vote={vote}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export const Message = memo(PureMessage, (prev, next) => {
    // Always re-render during loading to capture streaming updates
    if (prev.isLoading || next.isLoading) {
        return false;
    }
    if (prev.message.id !== next.message.id) {
        return false;
    }
    if (prev.requiresScrollPadding !== next.requiresScrollPadding) {
        return false;
    }
    if (!equal(prev.message.parts, next.message.parts)) {
        return false;
    }
    if (!equal(prev.vote, next.vote)) {
        return false;
    }
    return true;
});

/** Placeholder while assistant is thinking */
export function ThinkingMessage() {
    return (
        <div
            className="group/message fade-in w-full animate-in"
            data-role="assistant"
            data-testid="message-assistant-loading"
        >
            <div className="flex items-start justify-start gap-3">
                <AssistantAvatar />
                <div className="flex w-full flex-col gap-2 md:gap-4">
                    <div className="p-0 text-muted-foreground text-sm">
                        Thinking...
                    </div>
                </div>
            </div>
        </div>
    );
}
