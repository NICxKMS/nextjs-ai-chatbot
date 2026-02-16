/**
 * Tool Element Components
 *
 * Compound components for displaying AI tool invocations.
 * Shows tool status, input/output, and execution state.
 *
 * @module components/ai-elements/tool
 */

"use client"

import type { ToolUIPart } from "ai"
import {
	CheckCircleIcon,
	ChevronDownIcon,
	CircleIcon,
	ClockIcon,
	WrenchIcon,
	XCircleIcon,
} from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { ExtendedToolState } from "@/lib/types/ai-sdk"
import { cn } from "@/lib/utils/index"
import { CodeBlock } from "./code-block"

export type ToolProps = ComponentProps<typeof Collapsible>

/**
 * Root tool container component.
 */
export const Tool = ({ className, ...props }: ToolProps) => (
	<Collapsible
		className={cn("not-prose mb-4 w-full rounded-md border", className)}
		{...props}
	/>
)

export type ToolHeaderProps = {
	title?: string
	type: ToolUIPart["type"]
	state: ExtendedToolState
	className?: string
}

/**
 * Gets status badge for tool state.
 */
const getStatusBadge = (status: ExtendedToolState) => {
	const labels: Record<ExtendedToolState, string> = {
		"input-streaming": "Pending",
		"input-available": "Running",
		"approval-requested": "Awaiting Approval",
		"approval-responded": "Responded",
		"output-available": "Completed",
		"output-error": "Error",
		"output-denied": "Denied",
	}

	const icons: Record<ExtendedToolState, ReactNode> = {
		"input-streaming": <CircleIcon className="size-4" />,
		"input-available": <ClockIcon className="size-4 animate-pulse" />,
		"approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
		"approval-responded": (
			<CheckCircleIcon className="size-4 text-blue-600" />
		),
		"output-available": (
			<CheckCircleIcon className="size-4 text-green-600" />
		),
		"output-error": <XCircleIcon className="size-4 text-red-600" />,
		"output-denied": <XCircleIcon className="size-4 text-orange-600" />,
	}

	return (
		<Badge
			aria-live="polite"
			className="gap-1.5 rounded-full text-xs"
			role="status"
			variant="secondary"
		>
			{icons[status]}
			{labels[status]}
		</Badge>
	)
}

/**
 * Tool header with title and status badge.
 */
export const ToolHeader = ({
	className,
	title,
	type,
	state,
	...props
}: ToolHeaderProps) => (
	<CollapsibleTrigger
		className={cn(
			"flex w-full items-center justify-between gap-4 p-3",
			className,
		)}
		{...props}
	>
		<div className="flex items-center gap-2">
			<WrenchIcon className="size-4 text-muted-foreground" />
			<span className="font-medium text-sm">
				{title ?? type.split("-").slice(1).join("-")}
			</span>
			{getStatusBadge(state)}
		</div>
		<ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
	</CollapsibleTrigger>
)

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

/**
 * Tool collapsible content area.
 */
export const ToolContent = ({ className, ...props }: ToolContentProps) => (
	<CollapsibleContent
		className={cn(
			"border-t px-3 pb-3 pt-2",
			"data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		{...props}
	/>
)

export type ToolInputProps = ComponentProps<"div"> & {
	input?: unknown
	language?: string
}

/**
 * Tool input display component.
 */
export const ToolInput = ({
	input,
	language = "json",
	className,
	children,
	...props
}: ToolInputProps) => {
	if (children) {
		return (
			<div className={cn("space-y-1", className)} {...props}>
				{children}
			</div>
		)
	}

	if (!input) {
		return null
	}

	const code =
		typeof input === "string" ? input : JSON.stringify(input, null, 2)

	return (
		<div className={cn("space-y-1", className)} {...props}>
			<p className="text-muted-foreground text-xs">Input</p>
			<CodeBlock
				code={code}
				language={language as "json"}
				className="text-xs"
			/>
		</div>
	)
}

export type ToolOutputProps = ComponentProps<"div"> & {
	output?: unknown
	language?: string
}

/**
 * Tool output display component.
 */
export const ToolOutput = ({
	output,
	language = "json",
	className,
	children,
	...props
}: ToolOutputProps) => {
	if (children) {
		return (
			<div className={cn("space-y-1", className)} {...props}>
				{children}
			</div>
		)
	}

	if (!output) {
		return null
	}

	const code =
		typeof output === "string" ? output : JSON.stringify(output, null, 2)

	return (
		<div className={cn("space-y-1", className)} {...props}>
			<p className="text-muted-foreground text-xs">Output</p>
			<CodeBlock
				code={code}
				language={language as "json"}
				className="text-xs"
			/>
		</div>
	)
}
