/**
 * Message Actions Component
 *
 * Action buttons for messages (copy, edit, vote) with memoization.
 *
 * @module features/chat/components
 */

"use client"

import equal from "fast-deep-equal"
import { memo, useMemo } from "react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import { useCopyToClipboard } from "usehooks-ts"
import type { ChatMessage, UserVote } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the PureMessageActions component
 */
export interface PureMessageActionsProps {
	/** Chat ID for context */
	chatId: string
	/** Message data */
	message: ChatMessage
	/** User's vote on this message */
	vote: UserVote | undefined
	/** Whether message is loading/streaming */
	isLoading: boolean
	/** Set mode callback (view/edit) - optional, only for user messages */
	setMode?: (mode: "view" | "edit") => void
}

/**
 * Props for the ActionButton component
 */
interface ActionButtonProps {
	/** Click handler */
	onClick: () => void
	/** Tooltip text */
	tooltip: string
	/** Whether button is disabled */
	disabled?: boolean | undefined
	/** Whether button is pressed */
	"aria-pressed"?: boolean | undefined
	/** Test ID */
	"data-testid"?: string | undefined
	/** Button content */
	children: React.ReactNode
	/** Additional class name */
	className?: string | undefined
}

// =============================================================================
// Icon Components
// =============================================================================

/**
 * Copy Icon
 */
function CopyIcon() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width="16"
		>
			<title>Copy</title>
			<path
				clipRule="evenodd"
				d="M11 0H5H4V1V4H1H0V5V11V12H1H4V15V16H5H11H12V15V12H15H16V11V5V4H15H12V1V0H11ZM5 1V4H1V5H5V11H1V12H5V15V16H11V15V12H15V11H11V5H15V4H11V1H5ZM5 5H11V11H5V5Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

/**
 * Pencil Edit Icon
 */
function PencilEditIcon() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width="16"
		>
			<title>Edit</title>
			<path
				clipRule="evenodd"
				d="M11.75 0.189331L12.2803 0.719661L15.2803 3.71966L15.8107 4.24999L15.2803 4.78032L5.15901 14.9016C4.45575 15.6049 3.50192 16 2.50736 16H0.75H0V15.25V13.4926C0 12.4981 0.395088 11.5442 1.09835 10.841L11.2197 0.719661L11.75 0.189331ZM11.75 2.31065L9.81066 4.24999L11.75 6.18933L13.6893 4.24999L11.75 2.31065ZM2.15901 11.9016L8.75 5.31065L10.6893 7.24999L4.09835 13.841C3.67639 14.2629 3.1041 14.5 2.50736 14.5H1.5V13.4926C1.5 12.8959 1.73705 12.3236 2.15901 11.9016ZM9 16H16V14.5H9V16Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

/**
 * Thumb Up Icon
 */
function ThumbUpIcon() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width="16"
		>
			<title>Upvote</title>
			<path
				clipRule="evenodd"
				d="M8.00002 1.5L7.50002 1.5C6.39545 1.5 5.50002 2.39543 5.50002 3.5L5.50002 4.5L3.50002 4.5C2.39545 4.5 1.50002 5.39543 1.50002 6.5L1.50002 8.5L1.50002 10C1.50002 11.1046 2.39545 12 3.50002 12L5.50002 12L5.50002 13C5.50002 14.1046 6.39545 15 7.50002 15L8.50002 15C9.60459 15 10.5 14.1046 10.5 13L10.5 12L12.5 12C13.6046 12 14.5 11.1046 14.5 10L14.5 8.5L14.5 6.5C14.5 5.39543 13.6046 4.5 12.5 4.5L10.5 4.5L10.5 3.5C10.5 2.39543 9.60459 1.5 8.50002 1.5L8.00002 1.5ZM8.00002 3L8.50002 3C8.77616 3 9.00002 3.22386 9.00002 3.5L9.00002 6L12.5 6C12.7762 6 13 6.22386 13 6.5L13 10C13 10.2761 12.7762 10.5 12.5 10.5L9.00002 10.5L9.00002 13C9.00002 13.2761 8.77616 13.5 8.50002 13.5L7.50002 13.5C7.22388 13.5 7.00002 13.2761 7.00002 13L7.00002 10.5L3.50002 10.5C3.22388 10.5 3.00002 10.2761 3.00002 10L3.00002 6.5C3.00002 6.22386 3.22388 6 3.50002 6L7.00002 6L7.00002 3.5C7.00002 3.22386 7.22388 3 7.50002 3L8.00002 3Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

/**
 * Thumb Down Icon
 */
function ThumbDownIcon() {
	return (
		<svg
			aria-hidden="true"
			height="16"
			style={{ color: "currentcolor" }}
			viewBox="0 0 16 16"
			width="16"
		>
			<title>Downvote</title>
			<path
				clipRule="evenodd"
				d="M8.00002 14.5L8.50002 14.5C9.60459 14.5 10.5 13.6046 10.5 12.5L10.5 11.5L12.5 11.5C13.6046 11.5 14.5 10.6046 14.5 9.5L14.5 7.5L14.5 6C14.5 4.89543 13.6046 4 12.5 4L10.5 4L10.5 3C10.5 1.89543 9.60459 1 8.50002 1L7.50002 1C6.39545 1 5.50002 1.89543 5.50002 3L5.50002 4L3.50002 4C2.39545 4 1.50002 4.89543 1.50002 6L1.50002 7.5L1.50002 9.5C1.50002 10.6046 2.39545 11.5 3.50002 11.5L5.50002 11.5L5.50002 12.5C5.50002 13.6046 6.39545 14.5 7.50002 14.5L8.00002 14.5ZM8.00002 13L8.50002 13C8.77616 13 9.00002 12.7761 9.00002 12.5L9.00002 10L12.5 10C12.7762 10 13 9.77614 13 9.5L13 6C13 5.72386 12.7762 5.5 12.5 5.5L9.00002 5.5L9.00002 3C9.00002 2.72386 8.77616 2.5 8.50002 2.5L7.50002 2.5C7.22388 2.5 7.00002 2.72386 7.00002 3L7.00002 5.5L3.50002 5.5C3.22388 5.5 3.00002 5.72386 3.00002 6L3.00002 9.5C3.00002 9.77614 3.22388 10 3.50002 10L7.00002 10L7.00002 12.5C7.00002 12.7761 7.22388 13 7.50002 13L8.00002 13Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	)
}

// =============================================================================
// Components
// =============================================================================

/**
 * Action Button Component
 *
 * A button with tooltip for message actions.
 */
function ActionButton({
	onClick,
	tooltip,
	disabled,
	"aria-pressed": ariaPressed,
	"data-testid": testId,
	children,
	className,
}: ActionButtonProps) {
	return (
		<button
			aria-pressed={ariaPressed}
			className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 disabled:opacity-50 disabled:pointer-events-none ${className ?? ""}`}
			data-testid={testId}
			disabled={disabled}
			onClick={onClick}
			title={tooltip}
			type="button"
		>
			{children}
			<span className="sr-only">{tooltip}</span>
		</button>
	)
}

/**
 * Actions Container Component
 */
function Actions({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<div className={`flex items-center gap-1 ${className ?? ""}`}>
			{children}
		</div>
	)
}

/**
 * Pure Message Actions Component (internal implementation)
 *
 * Renders action buttons based on message role:
 * - User messages: Edit (on hover), Copy
 * - Assistant messages: Copy, Upvote, Downvote
 */
export function PureMessageActions({
	chatId,
	message,
	vote,
	isLoading,
	setMode,
}: PureMessageActionsProps) {
	const { mutate } = useSWRConfig()
	const [, copyToClipboard] = useCopyToClipboard()

	// Extract text from message parts
	const textFromParts = useMemo(
		() =>
			message.parts
				?.filter(
					(part): part is { type: "text"; text: string } =>
						part.type === "text",
				)
				.map((part) => part.text)
				.join("\n")
				.trim(),
		[message.parts],
	)

	// Don't render actions while loading
	if (isLoading) {
		return null
	}

	/**
	 * Handle copy action
	 */
	const handleCopy = async () => {
		if (!textFromParts) {
			toast.error("There's no text to copy!")
			return
		}

		await copyToClipboard(textFromParts)
		toast.success("Copied to clipboard!")
	}

	/**
	 * Handle upvote action
	 */
	const submitVote = (type: "up" | "down") => {
		const nextIsUpvoted = type === "up"

		const voteRequest = (async () => {
			const response = await fetch("/api/votes", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					chatId,
					messageId: message.id,
					type,
				}),
			})

			if (!response.ok) {
				throw new Error("Vote request failed")
			}

			await mutate<UserVote[]>(
				`/api/votes?chatId=${chatId}`,
				(currentVotes: UserVote[] | undefined) => {
					const votesWithoutCurrent = (currentVotes ?? []).filter(
						(currentVote) => currentVote.messageId !== message.id,
					)

					return [
						...votesWithoutCurrent,
						{
							chatId,
							messageId: message.id,
							isUpvoted: nextIsUpvoted,
						},
					]
				},
				{ revalidate: false },
			)
		})()

		toast.promise(voteRequest, {
			loading:
				type === "up"
					? "Upvoting Response..."
					: "Downvoting Response...",
			success:
				type === "up" ? "Upvoted Response!" : "Downvoted Response!",
			error:
				type === "up"
					? "Failed to upvote response."
					: "Failed to downvote response.",
		})
	}

	const handleUpvote = () => {
		submitVote("up")
	}

	/**
	 * Handle downvote action
	 */
	const handleDownvote = () => {
		submitVote("down")
	}

	// User messages: Edit (on hover) and Copy actions
	if (message.role === "user") {
		return (
			<Actions className="-mr-0.5 justify-end">
				<div className="relative">
					{setMode && (
						<ActionButton
							className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => setMode("edit")}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</ActionButton>
					)}
					<ActionButton onClick={handleCopy} tooltip="Copy">
						<CopyIcon />
					</ActionButton>
				</div>
			</Actions>
		)
	}

	// Assistant messages: Copy, Upvote, Downvote
	return (
		<Actions className="-ml-0.5">
			<ActionButton onClick={handleCopy} tooltip="Copy">
				<CopyIcon />
			</ActionButton>

			<ActionButton
				aria-pressed={vote?.isUpvoted === true}
				data-testid="message-upvote"
				disabled={vote?.isUpvoted}
				onClick={handleUpvote}
				tooltip="Upvote Response"
			>
				<ThumbUpIcon />
			</ActionButton>

			<ActionButton
				aria-pressed={vote?.isUpvoted === false}
				data-testid="message-downvote"
				disabled={vote !== undefined && !vote.isUpvoted}
				onClick={handleDownvote}
				tooltip="Downvote Response"
			>
				<ThumbDownIcon />
			</ActionButton>
		</Actions>
	)
}

/**
 * Message Actions Component (memoized)
 *
 * Memoized version of PureMessageActions with custom comparison
 * to prevent unnecessary re-renders.
 */
export const MessageActions = memo(
	PureMessageActions,
	(prevProps, nextProps) => {
		// Compare chatId
		if (prevProps.chatId !== nextProps.chatId) {
			return false
		}

		// Compare message id
		if (prevProps.message.id !== nextProps.message.id) {
			return false
		}

		// Compare vote
		if (!equal(prevProps.vote, nextProps.vote)) {
			return false
		}

		// Compare loading state
		if (prevProps.isLoading !== nextProps.isLoading) {
			return false
		}

		// Compare message parts
		if (!equal(prevProps.message.parts, nextProps.message.parts)) {
			return false
		}

		return true
	},
)

MessageActions.displayName = "MessageActions"
