"use client";

import {
    CopyIcon,
    PencilIcon,
    ThumbsDownIcon,
    ThumbsUpIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import {
    Message as BaseMessage,
    type MessageProps as BaseMessageProps,
    MessageAction,
    MessageActions,
    type MessageActionsProps,
} from "@/components/ai-elements/message";

export {
    Message as BaseMessage,
    MessageAction,
    type MessageActionProps,
    MessageActions,
    type MessageActionsProps,
    MessageBranch,
    MessageBranchContent,
    MessageBranchNext,
    MessageBranchPage,
    MessageBranchPrevious,
    type MessageBranchProps,
    MessageBranchSelector,
    MessageContent,
    type MessageContentProps,
    type MessageProps as BaseMessageProps,
} from "@/components/ai-elements/message";

import { cn } from "@/lib/utils/index";

/**
 * Extended message props with custom callbacks and avatar support
 */
export interface EnhancedMessageProps extends BaseMessageProps {
    /** Called when user upvotes the message */
    onVoteUp?: () => void;
    /** Called when user downvotes the message */
    onVoteDown?: () => void;
    /** Called when user initiates edit mode */
    onEdit?: () => void;
    /** Called when user copies message content */
    onCopy?: () => void;
    /** Avatar element to display alongside the message */
    avatar?: ReactNode;
    /** Enable entrance animation */
    animate?: boolean;
}

/**
 * Enhanced Message wrapper component with voting, editing, and avatar support.
 * Wraps the base AI Element Message with additional functionality.
 */
export function Message({
    onVoteUp,
    onVoteDown,
    onEdit,
    onCopy,
    avatar,
    animate,
    className,
    children,
    ...props
}: EnhancedMessageProps) {
    return (
        <BaseMessage
            className={cn(
                animate &&
                    "fade-in-0 slide-in-from-bottom-2 animate-in duration-300",
                className
            )}
            {...props}
        >
            {avatar && <div className="flex-shrink-0">{avatar}</div>}
            <div className="min-w-0 flex-1">{children}</div>
        </BaseMessage>
    );
}

/**
 * Extended message actions props with built-in vote/edit/copy actions
 */
export interface EnhancedMessageActionsProps extends MessageActionsProps {
    /** Show vote actions (thumbs up/down) */
    showVoteActions?: boolean;
    /** Show edit action */
    showEditAction?: boolean;
    /** Show copy action */
    showCopyAction?: boolean;
    /** Vote up callback */
    onVoteUp?: () => void;
    /** Vote down callback */
    onVoteDown?: () => void;
    /** Edit callback */
    onEdit?: () => void;
    /** Copy callback */
    onCopy?: () => void;
    /** Current vote state */
    voteState?: "up" | "down" | null;
}

/**
 * Enhanced MessageActions with built-in vote, edit, and copy functionality.
 */
export const EnhancedMessageActions = ({
    showVoteActions = false,
    showEditAction = false,
    showCopyAction = false,
    onVoteUp,
    onVoteDown,
    onEdit,
    onCopy,
    voteState,
    children,
    ...props
}: EnhancedMessageActionsProps) => {
    const handleCopy = useCallback(() => {
        onCopy?.();
    }, [onCopy]);

    return (
        <MessageActions {...props}>
            {showVoteActions && (
                <>
                    <MessageAction
                        onClick={onVoteUp}
                        tooltip="Helpful"
                        variant={voteState === "up" ? "secondary" : "ghost"}
                    >
                        <ThumbsUpIcon className="size-4" />
                    </MessageAction>
                    <MessageAction
                        onClick={onVoteDown}
                        tooltip="Not helpful"
                        variant={voteState === "down" ? "secondary" : "ghost"}
                    >
                        <ThumbsDownIcon className="size-4" />
                    </MessageAction>
                </>
            )}
            {showCopyAction && (
                <MessageAction onClick={handleCopy} tooltip="Copy">
                    <CopyIcon className="size-4" />
                </MessageAction>
            )}
            {showEditAction && (
                <MessageAction onClick={onEdit} tooltip="Edit">
                    <PencilIcon className="size-4" />
                </MessageAction>
            )}
            {children}
        </MessageActions>
    );
};
