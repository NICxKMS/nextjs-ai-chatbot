"use client";

import equal from "fast-deep-equal";
import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "@/lib/motion";
import type { ArtifactChatHelpers, UIArtifact } from "../types";

type ArtifactMessagesProps = {
    chatId: string;
    status: ArtifactChatHelpers["status"];
    votes: Array<{ messageId: string; vote: "up" | "down" }> | undefined;
    messages: Array<{
        id: string;
        role: string;
        content: string;
        parts?: Array<{ type: string; text?: string }>;
    }>;
    setMessages: ArtifactChatHelpers["setMessages"];
    regenerate: ArtifactChatHelpers["regenerate"];
    isReadonly: boolean;
    artifactStatus: UIArtifact["status"];
};

function PureArtifactMessages({
    chatId: _chatId,
    status,
    votes: _votes,
    messages,
    setMessages: _setMessages,
    regenerate: _regenerate,
    isReadonly: _isReadonly,
}: ArtifactMessagesProps) {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [_hasSentMessage, setHasSentMessage] = useState(false);

    // Track when user sends a message
    useEffect(() => {
        if (status === "submitted") {
            setHasSentMessage(true);
        }
    }, [status]);

    // Auto-scroll to bottom when new messages arrive
    // biome-ignore lint/correctness/useExhaustiveDependencies: messages reference changes on new message; intentional trigger
    useEffect(() => {
        if (isAtBottom && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isAtBottom, messages]);

    const handleScroll = () => {
        if (!messagesContainerRef.current) {
            return;
        }
        const { scrollTop, scrollHeight, clientHeight } =
            messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(isNearBottom);
    };

    return (
        <div
            className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20"
            onScroll={handleScroll}
            ref={messagesContainerRef}
        >
            {messages.map((message, _index) => (
                <div
                    className={`w-full rounded-lg p-3 text-sm ${
                        message.role === "user"
                            ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                            : "mr-auto max-w-[80%] bg-muted"
                    }`}
                    key={message.id}
                >
                    {message.content ||
                        message.parts?.find((p) => p.type === "text")?.text ||
                        ""}
                </div>
            ))}

            <AnimatePresence mode="wait">
                {status === "submitted" && (
                    <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-muted-foreground text-sm"
                        exit={{ opacity: 0, y: -10 }}
                        initial={{ opacity: 0, y: 10 }}
                        key="thinking"
                    >
                        <div className="size-2 animate-pulse rounded-full bg-muted-foreground" />
                        Thinking...
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="min-h-[24px] min-w-[24px] shrink-0"
                ref={messagesEndRef}
            />
        </div>
    );
}

function areEqual(
    prevProps: ArtifactMessagesProps,
    nextProps: ArtifactMessagesProps
) {
    if (
        prevProps.artifactStatus === "streaming" &&
        nextProps.artifactStatus === "streaming"
    ) {
        return true;
    }

    if (prevProps.status !== nextProps.status) {
        return false;
    }
    if (prevProps.status && nextProps.status) {
        return false;
    }
    if (prevProps.messages.length !== nextProps.messages.length) {
        return false;
    }
    if (!equal(prevProps.votes, nextProps.votes)) {
        return false;
    }

    return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
