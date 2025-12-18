"use client";

import { memo, useMemo } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MessageActionsProps, UserVote } from "./types";

/**
 * Reusable action button component
 */
function ActionButton({
    onClick,
    label,
    disabled,
    pressed,
}: {
    onClick: () => void;
    label: string;
    disabled?: boolean;
    pressed?: boolean;
}) {
    return (
        <Button
            aria-pressed={pressed}
            className="h-8 px-2"
            disabled={disabled}
            onClick={onClick}
            size="sm"
            variant="ghost"
        >
            {label}
        </Button>
    );
}

/**
 * Action buttons for messages: copy, edit, vote.
 * User messages get edit + copy. Assistant messages get copy + vote.
 */
function PureMessageActions({
    chatId,
    message,
    vote,
    isLoading,
    setMode,
}: MessageActionsProps) {
    const { mutate } = useSWRConfig();
    const [, copyToClipboard] = useCopyToClipboard();

    const textFromParts = useMemo(
        () =>
            message.parts
                ?.filter((part) => part.type === "text")
                .map((part) => (part as { text: string }).text)
                .join("\n")
                .trim(),
        [message.parts]
    );

    if (isLoading) {
        return null;
    }

    const handleCopy = async () => {
        if (!textFromParts) {
            toast.error("There's no text to copy!");
            return;
        }
        await copyToClipboard(textFromParts);
        toast.success("Copied to clipboard!");
    };

    const handleVote = async (type: "up" | "down") => {
        const votePromise = fetch("/api/vote", {
            method: "PATCH",
            body: JSON.stringify({ chatId, messageId: message.id, type }),
        });

        await toast.promise(votePromise, {
            loading: `${type === "up" ? "Upvoting" : "Downvoting"} Response...`,
            success: () => {
                mutate<UserVote[]>(
                    `/api/vote?chatId=${chatId}`,
                    (votes) => {
                        const filtered =
                            votes?.filter((v) => v.messageId !== message.id) ??
                            [];
                        return [
                            ...filtered,
                            {
                                chatId,
                                messageId: message.id,
                                isUpvoted: type === "up",
                            },
                        ];
                    },
                    { revalidate: false }
                );
                return `${type === "up" ? "Upvoted" : "Downvoted"} Response!`;
            },
            error: `Failed to ${type === "up" ? "upvote" : "downvote"} response.`,
        });
    };

    // User messages: edit + copy
    if (message.role === "user") {
        return (
            <div
                className={cn(
                    "-mr-0.5 flex justify-end gap-1 opacity-0 transition-opacity group-hover/message:opacity-100"
                )}
            >
                {setMode && (
                    <ActionButton
                        label="Edit"
                        onClick={() => setMode("edit")}
                    />
                )}
                <ActionButton label="Copy" onClick={handleCopy} />
            </div>
        );
    }

    // Assistant messages: copy + vote
    return (
        <div className="-ml-0.5 flex gap-1">
            <ActionButton label="Copy" onClick={handleCopy} />
            <ActionButton
                disabled={vote?.isUpvoted === true}
                label="👍"
                onClick={() => handleVote("up")}
                pressed={vote?.isUpvoted === true}
            />
            <ActionButton
                disabled={vote?.isUpvoted === false}
                label="👎"
                onClick={() => handleVote("down")}
                pressed={vote?.isUpvoted === false}
            />
        </div>
    );
}

export const MessageActions = memo(PureMessageActions, (prev, next) => {
    if (prev.chatId !== next.chatId) {
        return false;
    }
    if (prev.message.id !== next.message.id) {
        return false;
    }
    if (prev.vote?.isUpvoted !== next.vote?.isUpvoted) {
        return false;
    }
    if (prev.isLoading !== next.isLoading) {
        return false;
    }
    return true;
});
