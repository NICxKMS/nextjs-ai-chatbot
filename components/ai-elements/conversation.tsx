/**
 * Conversation Element Components
 *
 * Components for building scrollable conversation UIs with auto-scroll.
 * Uses use-stick-to-bottom for smooth scroll behavior.
 *
 * @module components/ai-elements/conversation
 */

"use client"

import { ArrowDownIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { useCallback } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"

export type ConversationProps = ComponentProps<typeof StickToBottom>

/**
 * Root conversation container with auto-scroll behavior.
 * Automatically scrolls to bottom when new content is added.
 */
export const Conversation = ({ className, ...props }: ConversationProps) => (
	<StickToBottom
		className={cn("relative flex-1 overflow-y-hidden", className)}
		initial="smooth"
		resize="smooth"
		role="log"
		{...props}
	/>
)

export type ConversationContentProps = ComponentProps<
	typeof StickToBottom.Content
>

/**
 * Conversation content container.
 * Holds the message list with proper spacing.
 */
export const ConversationContent = ({
	className,
	...props
}: ConversationContentProps) => (
	<StickToBottom.Content
		className={cn("flex flex-col gap-8 p-4", className)}
		{...props}
	/>
)

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
	title?: string
	description?: string
	icon?: React.ReactNode
}

/**
 * Empty state component for conversations.
 * Displays when no messages are present.
 */
export const ConversationEmptyState = ({
	className,
	title = "No messages yet",
	description = "Start a conversation to see messages here",
	icon,
	children,
	...props
}: ConversationEmptyStateProps) => (
	<div
		className={cn(
			"flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
			className,
		)}
		{...props}
	>
		{children ?? (
			<>
				{icon && <div className="text-muted-foreground">{icon}</div>}
				<div className="space-y-1">
					<h3 className="font-medium text-sm">{title}</h3>
					{description && (
						<p className="text-muted-foreground text-sm">
							{description}
						</p>
					)}
				</div>
			</>
		)}
	</div>
)

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

/**
 * Scroll to bottom button.
 * Only visible when user has scrolled up.
 */
export const ConversationScrollButton = ({
	className,
	...props
}: ConversationScrollButtonProps) => {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext()

	const handleScrollToBottom = useCallback(() => {
		scrollToBottom()
	}, [scrollToBottom])

	return (
		!isAtBottom && (
			<Button
				aria-label="Scroll to bottom"
				className={cn(
					"absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
					className,
				)}
				onClick={handleScrollToBottom}
				size="icon"
				type="button"
				variant="outline"
				{...props}
			>
				<ArrowDownIcon className="size-4" />
			</Button>
		)
	)
}
