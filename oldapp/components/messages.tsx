import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AlertCircle, ArrowDownIcon, RotateCcw } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { AnimatePresence } from "@/lib/motion";
import type { ChatMessage, UserVote } from "@/lib/types";
import { useSettingsSnapshot } from "@/lib/ui/settings-store";
import { useDataStream } from "./data-stream-provider";
import { Conversation, ConversationContent } from "./elements/conversation";
import { Greeting } from "./greeting";
import { PreviewMessage, ThinkingMessage } from "./message";
import { Button } from "./ui/button";

type MessagesProps = {
    chatId: string;
    status: UseChatHelpers<ChatMessage>["status"];
    votes: UserVote[] | undefined;
    messages: ChatMessage[];
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    isReadonly: boolean;
    isGuest: boolean;
    isArtifactVisible: boolean;
    selectedModelId: string;
    chatError?: Error;
    clearError?: () => void;
};

function PureMessages({
    chatId,
    status,
    votes,
    messages,
    setMessages,
    regenerate,
    isReadonly,
    isGuest,
    chatError,
    clearError,
}: MessagesProps) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasSentMessage, setHasSentMessage] = useState(false);

    useDataStream();
    const { autoScroll } = useSettingsSnapshot();

    // Track when user sends a message
    useEffect(() => {
        if (status === "submitted") {
            setHasSentMessage(true);
        }
    }, [status]);

    // Auto-scroll when status changes to submitted
    useEffect(() => {
        if (status === "submitted" && autoScroll) {
            requestAnimationFrame(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: "LAST",
                    behavior: "smooth",
                });
            });
        }
    }, [status, autoScroll]);

    const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
        setIsAtBottom(atBottom);
    }, []);

    const scrollToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({
            index: "LAST",
            behavior: "smooth",
        });
    }, []);

    // Filter messages to get renderable ones (exclude empty assistant messages with errors)
    const renderableMessages = messages.filter((message, index) => {
        const isEmptyAssistantMessage =
            message.role === "assistant" &&
            (!message.parts ||
                message.parts.length === 0 ||
                message.parts.every(
                    (p) =>
                        p.type === "text" && (!p.text || p.text.trim() === "")
                ));

        // Skip empty assistant message at the end when there's an error
        if (
            chatError &&
            isEmptyAssistantMessage &&
            index === messages.length - 1
        ) {
            return false;
        }
        return true;
    });

    // Render individual message item
    const itemContent = useCallback(
        (index: number, message: ChatMessage) => {
            const isLastMessage = index === renderableMessages.length - 1;
            const isStreaming = status === "streaming" && isLastMessage;

            return (
                <div className="px-2 pb-4 md:px-4 md:pb-6">
                    <PreviewMessage
                        chatId={chatId}
                        isLoading={isStreaming}
                        isReadonly={isReadonly}
                        message={message}
                        regenerate={regenerate}
                        requiresScrollPadding={hasSentMessage && isLastMessage}
                        setMessages={setMessages}
                        vote={
                            !isGuest && votes
                                ? votes.find(
                                      (vote) => vote.messageId === message.id
                                  )
                                : undefined
                        }
                    />
                </div>
            );
        },
        [
            chatId,
            isReadonly,
            regenerate,
            setMessages,
            votes,
            isGuest,
            status,
            hasSentMessage,
            renderableMessages.length,
        ]
    );

    // Header component (Greeting when no messages)
    const Header = useCallback(() => {
        if (messages.length === 0) {
            return (
                <div className="px-2 py-4 md:px-4">
                    <Greeting />
                </div>
            );
        }
        return <div className="pt-4" />;
    }, [messages.length]);

    // Footer component (error state, thinking message, spacer)
    const Footer = useCallback(() => {
        return (
            <div className="px-2 md:px-4">
                {/* Error state with retry button - reserve space to prevent CLS */}
                <div className="min-h-[60px]">
                    {chatError && status === "ready" && (
                        <div className="pb-4 md:pb-6">
                            <ErrorMessage
                                clearError={clearError}
                                error={chatError}
                                regenerate={regenerate}
                            />
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {status === "submitted" && (
                        <div className="pb-4 md:pb-6">
                            <ThinkingMessage key="thinking" />
                        </div>
                    )}
                </AnimatePresence>

                <div className="min-h-[24px] min-w-[24px] shrink-0" />
            </div>
        );
    }, [chatError, status, clearError, regenerate]);

    // Show greeting if no messages
    if (messages.length === 0) {
        return (
            <div className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll">
                <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
                    <ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
                        <Greeting />
                    </ConversationContent>
                </Conversation>
            </div>
        );
    }

    return (
        <div
            className="overscroll-behavior-contain -webkit-overflow-scrolling-touch relative flex-1 touch-pan-y overflow-hidden"
            style={{ overflowAnchor: "none" }}
        >
            <Virtuoso
                atBottomStateChange={handleAtBottomStateChange}
                atBottomThreshold={100}
                className="h-full"
                components={{
                    Header,
                    Footer,
                }}
                data={renderableMessages}
                followOutput="smooth"
                increaseViewportBy={{ top: 200, bottom: 200 }}
                itemContent={itemContent}
                ref={virtuosoRef}
                style={{ height: "100%" }}
            />

            {!isAtBottom && (
                <button
                    aria-label="Scroll to bottom"
                    className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
                    onClick={scrollToBottom}
                    type="button"
                >
                    <ArrowDownIcon className="size-4" />
                </button>
            )}
        </div>
    );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
    // INTENTIONAL: Skip re-renders when artifact panel is visible.
    // Messages are visually behind the artifact, so re-rendering is wasted work.
    // When artifact closes, isArtifactVisible changes triggering a re-render.
    if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
        return true;
    }

    // During streaming, always re-render to capture text updates
    if (prevProps.status === "streaming" || nextProps.status === "streaming") {
        return false;
    }

    // Status changed (covers non-streaming status transitions)
    if (prevProps.status !== nextProps.status) {
        return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
        return false;
    }
    // Fast path: check length before deep equality
    if (prevProps.messages.length !== nextProps.messages.length) {
        return false;
    }
    if (!equal(prevProps.messages, nextProps.messages)) {
        return false;
    }
    if (!equal(prevProps.votes, nextProps.votes)) {
        return false;
    }
    // Check boolean props that affect rendering
    if (prevProps.isReadonly !== nextProps.isReadonly) {
        return false;
    }
    if (prevProps.isGuest !== nextProps.isGuest) {
        return false;
    }
    // Check error state changes
    if (prevProps.chatError !== nextProps.chatError) {
        return false;
    }

    // All checks passed and not streaming - safe to skip render
    return true;
});

// Error message component with retry button
function ErrorMessage({
    error,
    regenerate,
    clearError,
}: {
    error: Error;
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    clearError?: () => void;
}) {
    const handleRetry = () => {
        clearError?.();
        regenerate();
    };

    // Extract error message, handling various error formats
    const errorMessage =
        error.message ||
        (error.cause ? String(error.cause) : "An unexpected error occurred");

    return (
        <div className="flex items-start gap-2 md:gap-3">
            <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
                <AlertCircle className="size-4 text-destructive" />
            </div>
            <div className="flex flex-col gap-2">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm dark:bg-destructive/10">
                    <p className="font-medium">Failed to get response</p>
                    <p className="mt-1 text-destructive/80">{errorMessage}</p>
                </div>
                <Button
                    className="w-fit gap-2"
                    onClick={handleRetry}
                    size="sm"
                    variant="outline"
                >
                    <RotateCcw className="size-3.5" />
                    Retry
                </Button>
            </div>
        </div>
    );
}
