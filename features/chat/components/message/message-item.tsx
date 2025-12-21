/**
 * Message Item Component
 *
 * Renders a single chat message with avatar, content, and actions.
 * Handles both user and assistant messages with appropriate styling and layout.
 *
 * @module features/chat/components/message/message-item
 */

"use client";

import { m as motion } from "framer-motion";
import { memo, useCallback } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessageItemProps, VoteType } from "../../types";
import { MessageActions } from "./message-actions";
import { MessageAvatar } from "./message-avatar";
import { MessageContent } from "./message-content";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extracts text content from a message for copying.
 *
 * @param message - The message to extract text from
 * @returns Combined text content from the message
 */
function getMessageTextContent(message: ChatMessage): string {
    // Check for parts-based content (UIMessage from AI SDK)
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

/**
 * Custom equality function for memo optimization.
 * Only re-renders when meaningful props change.
 */
function messageItemEqual(
    prev: MessageItemProps,
    next: MessageItemProps
): boolean {
    // Compare message identity
    if (prev.message.id !== next.message.id) {
        return false;
    }

    // Compare parts if present
    if ("parts" in prev.message && "parts" in next.message) {
        const prevParts = prev.message.parts;
        const nextParts = next.message.parts;
        if (prevParts?.length !== nextParts?.length) {
            return false;
        }
    }

    // Compare other props
    if (prev.vote?.vote !== next.vote?.vote) {
        return false;
    }
    if (prev.isReadonly !== next.isReadonly) {
        return false;
    }
    if (prev.isStreaming !== next.isStreaming) {
        return false;
    }

    return true;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders a single message in the chat conversation.
 *
 * Features:
 * - Role-based avatar display (user, assistant, system)
 * - Content rendering with parts support
 * - Action buttons (copy, vote, edit) for non-readonly mode
 * - Streaming state visual feedback
 * - Optimized with memo for performance
 *
 * Layout:
 * - User messages: right-aligned with bubble styling
 * - Assistant messages: left-aligned with avatar and actions
 *
 * @example
 * ```tsx
 * <MessageItem
 *   message={message}
 *   vote={messageVote}
 *   isStreaming={isLastMessage && isStreaming}
 *   onVote={handleVote}
 *   onCopy={handleCopy}
 * />
 * ```
 */
export const MessageItem = memo(function MessageItem({
    message,
    vote,
    isReadonly = false,
    isStreaming = false,
    onVote,
    onEdit,
    onCopy,
}: MessageItemProps) {
    const [, copyToClipboard] = useCopyToClipboard();

    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";

    // Handle copy action
    const handleCopy = useCallback(async () => {
        if (onCopy) {
            onCopy();
            return;
        }

        const text = getMessageTextContent(message);
        if (!text) {
            toast.error("There's no text to copy!");
            return;
        }

        await copyToClipboard(text);
        toast.success("Copied to clipboard!");
    }, [message, copyToClipboard, onCopy]);

    // Handle vote action
    const handleVote = useCallback(
        (voteType: VoteType) => {
            onVote?.(voteType);
        },
        [onVote]
    );

    // Handle edit action
    const handleEdit = useCallback(() => {
        const text = getMessageTextContent(message);
        onEdit?.(text);
    }, [message, onEdit]);

    return (
        <motion.div
            animate={{ opacity: 1 }}
            className={cn(
                "group/message flex w-full items-start gap-2 md:gap-3",
                isUser && "justify-end",
                isAssistant && "justify-start"
            )}
            data-role={message.role}
            data-testid={isUser ? "message-user" : "message-assistant"}
            initial={{ opacity: 0 }}
        >
            {/* Avatar - only shown for assistant/system messages */}
            {!isUser && <MessageAvatar className="-mt-1" role={message.role} />}

            {/* Content and actions wrapper */}
            <div
                className={cn(
                    "flex flex-col",
                    // Gap between content and actions
                    "gap-2",
                    // Assistant messages take full width when content exists
                    isAssistant && "w-full",
                    // User messages have max width constraint
                    isUser &&
                        "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]"
                )}
            >
                {/* Message content */}
                <MessageContent
                    isStreaming={isStreaming}
                    isUser={isUser}
                    message={message}
                />

                {/* Actions - shown on hover for assistant messages */}
                {isAssistant && !isReadonly && !isStreaming && (
                    <MessageActions
                        className="opacity-0 transition-opacity group-hover/message:opacity-100"
                        messageId={message.id}
                        onCopy={handleCopy}
                        onVote={handleVote}
                        vote={vote}
                    />
                )}

                {/* Actions for user messages - edit and copy on hover */}
                {isUser && !isReadonly && (
                    <MessageActions
                        className="opacity-0 transition-opacity group-hover/message:opacity-100"
                        messageId={message.id}
                        onCopy={handleCopy}
                        onEdit={onEdit ? handleEdit : undefined}
                        showEdit
                    />
                )}
            </div>
        </motion.div>
    );
}, messageItemEqual);
