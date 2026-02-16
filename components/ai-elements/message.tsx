/**
 * Message Element Components
 *
 * Compound components for building chat message UIs.
 * Supports user/assistant roles, branching, and actions.
 *
 * @module components/ai-elements/message
 */

"use client"

import type { FileUIPart, UIMessage } from "ai"
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PaperclipIcon,
	XIcon,
} from "lucide-react"
import type { ComponentProps, HTMLAttributes, ReactElement } from "react"
import { createContext, useContext, useState } from "react"
import { Button } from "@/components/ui/button"
// Note: ButtonGroup, ButtonGroupText will be available after UI primitives are copied
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/index"

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
	from: UIMessage["role"]
}

/**
 * Root message container component.
 * Applies different styles based on role (user/assistant).
 */
export const Message = ({ className, from, ...props }: MessageProps) => (
	<div
		className={cn(
			"group flex w-full max-w-[95%] flex-col gap-2",
			from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
			className,
		)}
		{...props}
	/>
)

export type MessageContentProps = HTMLAttributes<HTMLDivElement>

/**
 * Message content container.
 * Styles differ based on user vs assistant messages.
 */
export const MessageContent = ({
	children,
	className,
	...props
}: MessageContentProps) => (
	<div
		className={cn(
			"is-user:dark flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
			"group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
			"group-[.is-assistant]:text-foreground",
			className,
		)}
		{...props}
	>
		{children}
	</div>
)

export type MessageActionsProps = ComponentProps<"div">

/**
 * Container for message action buttons.
 */
export const MessageActions = ({
	className,
	children,
	...props
}: MessageActionsProps) => (
	<div className={cn("flex items-center gap-1", className)} {...props}>
		{children}
	</div>
)

export type MessageActionProps = ComponentProps<typeof Button> & {
	tooltip?: string
	label?: string
}

/**
 * Individual message action button with optional tooltip.
 */
export const MessageAction = ({
	tooltip,
	children,
	label,
	variant = "ghost",
	size = "icon-sm",
	...props
}: MessageActionProps) => {
	const button = (
		<Button size={size} type="button" variant={variant} {...props}>
			{children}
			<span className="sr-only">{label || tooltip}</span>
		</Button>
	)

	if (tooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					<TooltipContent>
						<p>{tooltip}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return button
}

type MessageBranchContextType = {
	currentBranch: number
	totalBranches: number
	goToPrevious: () => void
	goToNext: () => void
	branches: ReactElement[]
	setBranches: (branches: ReactElement[]) => void
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
	null,
)

const useMessageBranch = () => {
	const context = useContext(MessageBranchContext)

	if (!context) {
		throw new Error(
			"MessageBranch components must be used within MessageBranch",
		)
	}

	return context
}

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
	defaultBranch?: number
	onBranchChange?: (branchIndex: number) => void
}

/**
 * Message branch container for handling multiple response variants.
 * Allows switching between different AI response branches.
 */
export const MessageBranch = ({
	defaultBranch = 0,
	onBranchChange,
	className,
	...props
}: MessageBranchProps) => {
	const [currentBranch, setCurrentBranch] = useState(defaultBranch)
	const [branches, setBranches] = useState<ReactElement[]>([])

	const handleBranchChange = (newBranch: number) => {
		setCurrentBranch(newBranch)
		onBranchChange?.(newBranch)
	}

	const goToPrevious = () => {
		if (currentBranch > 0) {
			handleBranchChange(currentBranch - 1)
		}
	}

	const goToNext = () => {
		if (currentBranch < branches.length - 1) {
			handleBranchChange(currentBranch + 1)
		}
	}

	return (
		<MessageBranchContext.Provider
			value={{
				currentBranch,
				totalBranches: branches.length,
				goToPrevious,
				goToNext,
				branches,
				setBranches,
			}}
		>
			<div className={cn("relative", className)} {...props}>
				{branches[currentBranch]}
			</div>
		</MessageBranchContext.Provider>
	)
}

export type MessageBranchSelectorProps = ComponentProps<"div">

/**
 * Branch selector UI for switching between response variants.
 */
export const MessageBranchSelector = ({
	className,
	...props
}: MessageBranchSelectorProps) => {
	const { currentBranch, totalBranches, goToPrevious, goToNext } =
		useMessageBranch()

	if (totalBranches <= 1) {
		return null
	}

	return (
		<div
			className={cn(
				"flex items-center gap-1 text-muted-foreground text-xs",
				className,
			)}
			{...props}
		>
			<Button
				disabled={currentBranch === 0}
				onClick={goToPrevious}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<ChevronLeftIcon className="size-3" />
			</Button>
			<span>
				{currentBranch + 1} / {totalBranches}
			</span>
			<Button
				disabled={currentBranch === totalBranches - 1}
				onClick={goToNext}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<ChevronRightIcon className="size-3" />
			</Button>
		</div>
	)
}

export type MessageAttachmentsProps = HTMLAttributes<HTMLDivElement>

/**
 * Container for message attachments.
 */
export const MessageAttachments = ({
	className,
	children,
	...props
}: MessageAttachmentsProps) => (
	<div className={cn("flex flex-wrap gap-2", className)} {...props}>
		{children}
	</div>
)

export type MessageAttachmentProps = ComponentProps<"div"> & {
	attachment: FileUIPart
	onRemove?: () => void
}

/**
 * Individual attachment display component.
 */
export const MessageAttachment = ({
	attachment,
	onRemove,
	className,
	...props
}: MessageAttachmentProps) => (
	<div
		className={cn(
			"flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs",
			className,
		)}
		{...props}
	>
		<PaperclipIcon className="size-3" />
		<span className="truncate max-w-[100px]">
			{attachment.filename || "Attachment"}
		</span>
		{onRemove && (
			<button
				className="hover:text-foreground"
				onClick={onRemove}
				type="button"
			>
				<XIcon className="size-3" />
			</button>
		)}
	</div>
)
