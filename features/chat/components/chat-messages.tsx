/**
 * Chat Messages Component
 *
 * Renders the chat message list using react-virtuoso for virtualized scrolling.
 * Handles 1000+ messages efficiently with viewport-based rendering.
 *
 * @module features/chat/components/chat-messages
 */

"use client";

import { ArrowDownIcon } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { voteOnMessage } from "../actions";
import { useChatHelpers, useChatMetadata } from "../hooks";
import type { ChatMessage, ChatMessagesProps, VoteType } from "../types";
import { ChatGreeting } from "./chat-greeting";
import { MessageItem } from "./message/message-item";

// =============================================================================
// INTERNAL COMPONENTS
// =============================================================================

/**
 * Internal virtualized message list component.
 * Separated for clean memoization boundaries.
 */
const ChatMessagesList = memo(function ChatMessagesList({
    votes = [],
    isReadonly,
}: ChatMessagesProps) {
    const { messages, status } = useChatHelpers();
    const { isReadonly: metadataReadonly, chatId } = useChatMetadata();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const readonly = isReadonly ?? metadataReadonly;

    // Create vote lookup map for O(1) access
    const voteMap = useMemo(() => {
        return new Map(votes.map((v) => [v.messageId, v]));
    }, [votes]);

    // Handle at-bottom state changes for scroll-to-bottom button
    const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
        setIsAtBottom(atBottom);
    }, []);

    // Scroll to bottom handler
    const scrollToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({
            index: "LAST",
            behavior: "smooth",
        });
    }, []);

    // Placeholder handlers for message actions
    // These will be connected to actual implementations in future tasks
    const handleVote = useCallback(
        async (messageId: string, vote: VoteType) => {
            const result = await voteOnMessage({
                chatId,
                messageId,
                vote,
            });

            if (!result.success) {
                toast.error(result.error ?? "Failed to save vote");
            }
        },
        [chatId]
    );

    const handleCopy = useCallback((_message: ChatMessage) => {
        // Handled internally by MessageItem
    }, []);

    const handleEdit = useCallback((_messageId: string, _content: string) => {
        // TODO: Implement edit functionality
    }, []);

    // Item renderer for Virtuoso
    const itemContent = useCallback(
        (index: number, message: ChatMessage) => {
            const isStreaming =
                status === "streaming" && index === messages.length - 1;
            const vote = voteMap.get(message.id);

            return (
                <div className="px-2 pb-4 md:px-4 md:pb-6">
                    <MessageItem
                        isReadonly={readonly}
                        isStreaming={isStreaming}
                        message={message}
                        onCopy={() => handleCopy(message)}
                        onEdit={(content) => handleEdit(message.id, content)}
                        onVote={(voteType) => handleVote(message.id, voteType)}
                        vote={vote}
                    />
                </div>
            );
        },
        [
            messages.length,
            status,
            voteMap,
            readonly,
            handleVote,
            handleCopy,
            handleEdit,
        ]
    );

    // Header component for top spacing
    const Header = useCallback(() => <div className="pt-4" />, []);

    // Footer component for bottom spacing
    const Footer = useCallback(() => <div className="min-h-6" />, []);

    return (
        <div
            className="relative flex-1 touch-pan-y overflow-hidden overscroll-contain"
            data-testid="messages-container"
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
                data={messages}
                followOutput="smooth"
                increaseViewportBy={{ top: 200, bottom: 200 }}
                itemContent={itemContent}
                ref={virtuosoRef}
                style={{ height: "100%" }}
            />

            {/* Scroll to bottom button */}
            {!isAtBottom && (
                <button
                    aria-label="Scroll to bottom"
                    className={cn(
                        "-translate-x-1/2 absolute bottom-40 left-1/2 z-10",
                        "rounded-full border bg-background p-2 shadow-lg",
                        "transition-colors hover:bg-muted",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                    onClick={scrollToBottom}
                    type="button"
                >
                    <ArrowDownIcon className="size-4" />
                </button>
            )}
        </div>
    );
});

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Chat messages area component.
 *
 * Handles both empty state (greeting) and populated state (virtualized messages).
 * Uses react-virtuoso for efficient rendering of large message lists.
 *
 * Features:
 * - Virtualized scrolling for 1000+ messages
 * - Auto-scroll on new messages (followOutput)
 * - Scroll-to-bottom button when scrolled up
 * - Vote lookup via O(1) Map
 * - Empty state with suggestion buttons
 *
 * @example
 * ```tsx
 * <ChatMessages votes={messageVotes} isReadonly={false} />
 * ```
 */
export function ChatMessages({ votes, isReadonly }: ChatMessagesProps) {
    const { messages } = useChatHelpers();

    // Show greeting when no messages
    if (messages.length === 0) {
        return <ChatGreeting />;
    }

    return <ChatMessagesList isReadonly={isReadonly} votes={votes} />;
}

/**
 * Alias for ChatMessages for semantic clarity.
 * Use when you want to explicitly indicate this is a wrapper component.
 */
export const ChatMessagesArea = ChatMessages;
