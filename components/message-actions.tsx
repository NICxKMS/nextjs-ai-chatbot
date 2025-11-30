import equal from "fast-deep-equal";
import { memo, useMemo } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import type { ChatMessage, UserVote } from "@/lib/types";
import { Action, Actions } from "./elements/actions";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

export function PureMessageActions({
	chatId,
	message,
	vote,
	isLoading,
	setMode,
}: {
	chatId: string;
	message: ChatMessage;
	vote: UserVote | undefined;
	isLoading: boolean;
	setMode?: (mode: "view" | "edit") => void;
}) {
	const { mutate } = useSWRConfig();
	const [_, copyToClipboard] = useCopyToClipboard();

	const textFromParts = useMemo(
		() =>
			message.parts
				?.filter((part) => part.type === "text")
				.map((part) => part.text)
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

	// User messages get edit (on hover) and copy actions
	if (message.role === "user") {
		return (
			<Actions className="-mr-0.5 justify-end">
				<div className="relative">
					{setMode && (
						<Action
							className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => setMode("edit")}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</Action>
					)}
					<Action onClick={handleCopy} tooltip="Copy">
						<CopyIcon />
					</Action>
				</div>
			</Actions>
		);
	}

	return (
		<Actions className="-ml-0.5">
			<Action onClick={handleCopy} tooltip="Copy">
				<CopyIcon />
			</Action>

			<Action
				aria-pressed={vote?.isUpvoted === true}
				data-testid="message-upvote"
				disabled={vote?.isUpvoted}
				onClick={() => {
					const upvote = fetch("/api/vote", {
						method: "PATCH",
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: "up",
						}),
					});

					toast.promise(upvote, {
						loading: "Upvoting Response...",
						success: () => {
							mutate<UserVote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes: UserVote[] | undefined) => {
									if (!currentVotes) {
										return [] as UserVote[];
									}

									const votesWithoutCurrent =
										currentVotes.filter(
											(currentVote) =>
												currentVote.messageId !==
												message.id
										);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: true,
										} as UserVote,
									];
								},
								{ revalidate: false }
							);
							return "Upvoted Response!";
						},
						error: "Failed to upvote response.",
					});
				}}
				tooltip="Upvote Response"
			>
				<ThumbUpIcon />
			</Action>

			<Action
				aria-pressed={vote?.isUpvoted === false}
				data-testid="message-downvote"
				disabled={vote && !vote.isUpvoted}
				onClick={() => {
					const downvote = fetch("/api/vote", {
						method: "PATCH",
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: "down",
						}),
					});

					toast.promise(downvote, {
						loading: "Downvoting Response...",
						success: () => {
							mutate<UserVote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes: UserVote[] | undefined) => {
									if (!currentVotes) {
										return [] as UserVote[];
									}

									const votesWithoutCurrent =
										currentVotes.filter(
											(currentVote) =>
												currentVote.messageId !==
												message.id
										);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: false,
										} as UserVote,
									];
								},
								{ revalidate: false }
							);
							return "Downvoted Response!";
						},
						error: "Failed to downvote response.",
					});
				}}
				tooltip="Downvote Response"
			>
				<ThumbDownIcon />
			</Action>
		</Actions>
	);
}

export const MessageActions = memo(
	PureMessageActions,
	(prevProps, nextProps) => {
		if (prevProps.chatId !== nextProps.chatId) {
			return false;
		}
		if (prevProps.message.id !== nextProps.message.id) {
			return false;
		}
		if (!equal(prevProps.vote, nextProps.vote)) {
			return false;
		}
		if (prevProps.isLoading !== nextProps.isLoading) {
			return false;
		}
		if (!equal(prevProps.message.parts, nextProps.message.parts)) {
			return false;
		}

		return true;
	}
);
