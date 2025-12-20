"use client";

import { memo, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import {
    CopyIcon,
    PencilIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
} from "lucide-react";
import { Action, Actions } from "@/shared/components/elements";
import type { ChatMessage, UserVote } from "../types";

export interface MessageActionsProps {
    chatId: string;
    messageId: string;
    content: string;
    role: "user" | "assistant";
    vote?: UserVote;
    isLoading?: boolean;
    onEdit?: () => void;
}

function PureMessageActions({
    chatId,
    messageId,
    content,
    role,
    vote,
    isLoading = false,
    onEdit,
}: MessageActionsProps) {
    const { mutate } = useSWRConfig();
    const [, copyToClipboard] = useCopyToClipboard();

    const handleCopy = useCallback(async () => {
        if (!content.trim()) {
            toast.error("There's no text to copy!");
            return;
        }
        await copyToClipboard(content);
        toast.success("Copied to clipboard!");
    }, [content, copyToClipboard]);

    const handleVote = useCallback(
        async (type: "up" | "down") => {
            const votePromise = fetch("/api/vote", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId,
                    messageId,
                    type,
                }),
            });

            toast.promise(votePromise, {
                loading: type === "up" ? "Upvoting..." : "Downvoting...",
                success: () => {
                    mutate<UserVote[]>(
                        `/api/vote?chatId=${chatId}`,
                        (currentVotes) => {
                            if (!currentVotes) return [];
                            const filtered = currentVotes.filter(
                                (v) => v.messageId !== messageId
                            );
                            return [
                                ...filtered,
                                {
                                    chatId,
                                    messageId,
                                    isUpvoted: type === "up",
                                },
                            ];
                        },
                        { revalidate: false }
                    );
                    return type === "up" ? "Upvoted!" : "Downvoted!";
                },
                error: `Failed to ${type}vote response.`,
            });
        },
        [chatId, messageId, mutate]
    );

    if (isLoading) {
        return null;
    }

    if (role === "user") {
        return (
            <Actions className="-mr-0.5 justify-end">
                <div className="relative">
                    {onEdit && (
                        <Action
                            className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
                            onClick={onEdit}
                            tooltip="Edit"
                        >
                            <PencilIcon className="size-4" />
                        </Action>
                    )}
                    <Action onClick={handleCopy} tooltip="Copy">
                        <CopyIcon className="size-4" />
                    </Action>
                </div>
            </Actions>
        );
    }

    return (
        <Actions className="-ml-0.5">
            <Action onClick={handleCopy} tooltip="Copy">
                <CopyIcon className="size-4" />
            </Action>

            <Action
                aria-pressed={vote?.isUpvoted === true}
                data-testid="message-upvote"
                disabled={vote?.isUpvoted === true}
                onClick={() => handleVote("up")}
                tooltip="Upvote Response"
            >
                <ThumbsUpIcon className="size-4" />
            </Action>

            <Action
                aria-pressed={vote?.isUpvoted === false}
                data-testid="message-downvote"
                disabled={vote?.isUpvoted === false}
                onClick={() => handleVote("down")}
                tooltip="Downvote Response"
            >
                <ThumbsDownIcon className="size-4" />
            </Action>
        </Actions>
    );
}

export const MessageActions = memo(PureMessageActions, (prev, next) => {
    return (
        prev.chatId === next.chatId &&
        prev.messageId === next.messageId &&
        prev.content === next.content &&
        prev.role === next.role &&
        prev.isLoading === next.isLoading &&
        prev.vote?.isUpvoted === next.vote?.isUpvoted
    );
});
