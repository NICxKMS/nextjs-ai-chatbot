/**
 * Message Actions Component
 *
 * Renders action buttons for messages including copy, vote up/down, and edit.
 * Actions are displayed for assistant messages when not in read-only mode.
 *
 * @module features/chat/components/message/message-actions
 */

"use client";

import { Copy, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/shared/components/tooltip";
import type { MessageVote, VoteType } from "../../types";

// =============================================================================
// TYPES
// =============================================================================

export type MessageActionsProps = {
    /** ID of the message these actions are for */
    messageId: string;
    /** Current vote state for this message */
    vote?: MessageVote;
    /** Callback when user votes on the message */
    onVote?: (vote: VoteType) => void;
    /** Callback when user copies the message */
    onCopy?: () => void;
    /** Callback when user wants to edit the message */
    onEdit?: () => void;
    /** Whether to show edit action (typically for user messages) */
    showEdit?: boolean;
    /** Whether actions are disabled */
    disabled?: boolean;
    /** Optional additional class names */
    className?: string;
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

type ActionButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
    tooltip?: string;
    children: React.ReactNode;
    className?: string;
};

/**
 * Individual action button with tooltip and hover states.
 * P3-052: Memoized to prevent re-renders when parent re-renders.
 */
const ActionButton = memo(function ActionButton({
    onClick,
    disabled,
    active,
    tooltip,
    children,
    className,
}: ActionButtonProps) {
    const button = (
        <button
            aria-label={tooltip}
            className={cn(
                "inline-flex size-7 items-center justify-center rounded-md",
                "text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                active && "bg-muted text-foreground",
                className
            )}
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );

    if (!tooltip) {
        return button;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
        </Tooltip>
    );
});

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders action buttons for a chat message.
 *
 * For assistant messages: Copy, Thumbs Up, Thumbs Down
 * For user messages (with showEdit): Edit, Copy
 *
 * @example
 * ```tsx
 * // Assistant message actions
 * <MessageActions
 *   messageId="msg-123"
 *   vote={vote}
 *   onVote={handleVote}
 *   onCopy={handleCopy}
 * />
 *
 * // User message actions
 * <MessageActions
 *   messageId="msg-456"
 *   showEdit
 *   onEdit={handleEdit}
 *   onCopy={handleCopy}
 * />
 * ```
 */
export const MessageActions = memo(function MessageActions({
    messageId,
    vote,
    onVote,
    onCopy,
    onEdit,
    showEdit = false,
    disabled = false,
    className,
}: MessageActionsProps) {
    const handleUpvote = useCallback(() => {
        onVote?.("up");
    }, [onVote]);

    const handleDownvote = useCallback(() => {
        onVote?.("down");
    }, [onVote]);

    const handleCopy = useCallback(() => {
        onCopy?.();
    }, [onCopy]);

    const handleEdit = useCallback(() => {
        onEdit?.();
    }, [onEdit]);

    const isUpvoted = vote?.vote === "up";
    const isDownvoted = vote?.vote === "down";

    // User message actions layout
    if (showEdit) {
        return (
            <div
                className={cn(
                    "flex items-center justify-end gap-0.5",
                    className
                )}
            >
                {onEdit && (
                    <ActionButton
                        disabled={disabled}
                        onClick={handleEdit}
                        tooltip="Edit message"
                    >
                        <Pencil className="size-3.5" />
                    </ActionButton>
                )}
                <ActionButton
                    disabled={disabled}
                    onClick={handleCopy}
                    tooltip="Copy message"
                >
                    <Copy className="size-3.5" />
                </ActionButton>
            </div>
        );
    }

    // Assistant message actions layout
    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            <ActionButton
                disabled={disabled}
                onClick={handleCopy}
                tooltip="Copy message"
            >
                <Copy className="size-3.5" />
            </ActionButton>

            <ActionButton
                active={isUpvoted}
                disabled={disabled || isUpvoted}
                onClick={handleUpvote}
                tooltip="Good response"
            >
                <ThumbsUp className="size-3.5" />
            </ActionButton>

            <ActionButton
                active={isDownvoted}
                disabled={disabled || isDownvoted}
                onClick={handleDownvote}
                tooltip="Bad response"
            >
                <ThumbsDown className="size-3.5" />
            </ActionButton>
        </div>
    );
});
