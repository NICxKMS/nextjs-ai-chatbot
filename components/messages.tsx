import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowDownIcon, RotateCcw } from "lucide-react";
import { memo, useEffect } from "react";
import { useMessages } from "@/hooks/use-messages";
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
    const {
        containerRef: messagesContainerRef,
        endRef: messagesEndRef,
        isAtBottom,
        scrollToBottom,
        hasSentMessage,
    } = useMessages({
        status,
    });

    useDataStream();
    const { autoScroll } = useSettingsSnapshot();

    useEffect(() => {
        if (status === "submitted" && autoScroll) {
            requestAnimationFrame(() => {
                const container = messagesContainerRef.current;
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: "smooth",
                    });
                }
            });
        }
    }, [status, autoScroll, messagesContainerRef]);

    return (
        <div
            className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll"
            ref={messagesContainerRef}
            style={{ overflowAnchor: "none" }}
        >
            <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
                <ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
                    {messages.length === 0 && <Greeting />}

                    {messages.map((message, index) => {
                        // Skip rendering empty assistant messages when there's an error
                        // (these are placeholder messages created during streaming that never received content)
                        const isEmptyAssistantMessage =
                            message.role === "assistant" &&
                            (!message.parts ||
                                message.parts.length === 0 ||
                                message.parts.every(
                                    (p) =>
                                        p.type === "text" &&
                                        (!p.text || p.text.trim() === "")
                                ));

                        if (
                            chatError &&
                            isEmptyAssistantMessage &&
                            index === messages.length - 1
                        ) {
                            return null;
                        }

                        return (
                            <PreviewMessage
                                chatId={chatId}
                                isLoading={
                                    status === "streaming" &&
                                    messages.length - 1 === index
                                }
                                isReadonly={isReadonly}
                                key={message.id}
                                message={message}
                                regenerate={regenerate}
                                requiresScrollPadding={
                                    hasSentMessage &&
                                    index === messages.length - 1
                                }
                                setMessages={setMessages}
                                vote={
                                    !isGuest && votes
                                        ? votes.find(
                                              (vote) =>
                                                  vote.messageId === message.id
                                          )
                                        : undefined
                                }
                            />
                        );
                    })}

                    {/* Error state with retry button */}
                    {chatError && status === "ready" && (
                        <ErrorMessage
                            clearError={clearError}
                            error={chatError}
                            regenerate={regenerate}
                        />
                    )}

                    <AnimatePresence mode="wait">
                        {status === "submitted" && (
                            <ThinkingMessage key="thinking" />
                        )}
                    </AnimatePresence>

                    <div
                        className="min-h-[24px] min-w-[24px] shrink-0"
                        ref={messagesEndRef}
                    />
                </ConversationContent>
            </Conversation>

            {!isAtBottom && (
                <button
                    aria-label="Scroll to bottom"
                    className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
                    onClick={() => scrollToBottom("smooth")}
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
