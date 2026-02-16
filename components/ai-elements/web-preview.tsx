/**
 * Web Preview Element Components
 *
 * Components for displaying web content in an iframe preview.
 * Used for AI-generated web content and code previews.
 *
 * @module components/ai-elements/web-preview
 */

"use client"

import { ChevronDownIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { createContext, useContext, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/index"

export type WebPreviewContextValue = {
	url: string
	setUrl: (url: string) => void
	consoleOpen: boolean
	setConsoleOpen: (open: boolean) => void
}

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null)

const useWebPreview = () => {
	const context = useContext(WebPreviewContext)
	if (!context) {
		throw new Error(
			"WebPreview components must be used within a WebPreview",
		)
	}
	return context
}

export type WebPreviewProps = ComponentProps<"div"> & {
	defaultUrl?: string
	onUrlChange?: (url: string) => void
}

/**
 * Root web preview container component.
 * Provides context for URL state and console visibility.
 */
export const WebPreview = ({
	className,
	children,
	defaultUrl = "",
	onUrlChange,
	...props
}: WebPreviewProps) => {
	const [url, setUrl] = useState(defaultUrl)
	const [consoleOpen, setConsoleOpen] = useState(false)

	const handleUrlChange = (newUrl: string) => {
		setUrl(newUrl)
		onUrlChange?.(newUrl)
	}

	const contextValue: WebPreviewContextValue = {
		url,
		setUrl: handleUrlChange,
		consoleOpen,
		setConsoleOpen,
	}

	return (
		<WebPreviewContext.Provider value={contextValue}>
			<div
				className={cn(
					"flex size-full flex-col rounded-lg border bg-card",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</WebPreviewContext.Provider>
	)
}

export type WebPreviewNavigationProps = ComponentProps<"div">

/**
 * Web preview navigation bar.
 */
export const WebPreviewNavigation = ({
	className,
	children,
	...props
}: WebPreviewNavigationProps) => (
	<div
		className={cn("flex items-center gap-1 border-b p-2", className)}
		{...props}
	>
		{children}
	</div>
)

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
	tooltip?: string
}

/**
 * Navigation button with optional tooltip.
 */
export const WebPreviewNavigationButton = ({
	tooltip,
	children,
	...props
}: WebPreviewNavigationButtonProps) => {
	const button = (
		<Button size="icon" type="button" variant="ghost" {...props}>
			{children}
		</Button>
	)

	if (tooltip) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{button}</TooltipTrigger>
					<TooltipContent>{tooltip}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return button
}

export type WebPreviewUrlBarProps = ComponentProps<typeof Input>

/**
 * URL input bar for web preview.
 */
export const WebPreviewUrlBar = ({
	className,
	...props
}: WebPreviewUrlBarProps) => {
	const { url, setUrl } = useWebPreview()

	return (
		<Input
			className={cn("flex-1", className)}
			onChange={(e) => setUrl(e.target.value)}
			placeholder="Enter URL..."
			type="url"
			value={url}
			{...props}
		/>
	)
}

export type WebPreviewFrameProps = ComponentProps<"iframe">

/**
 * Iframe for displaying web content.
 */
export const WebPreviewFrame = ({
	className,
	...props
}: WebPreviewFrameProps) => {
	const { url } = useWebPreview()

	return (
		<iframe
			className={cn("flex-1 border-0", className)}
			src={url}
			{...props}
		/>
	)
}

export type WebPreviewContentProps = ComponentProps<"div">

/**
 * Web preview content container.
 */
export const WebPreviewContent = ({
	className,
	children,
	...props
}: WebPreviewContentProps) => (
	<div className={cn("flex-1 overflow-auto", className)} {...props}>
		{children}
	</div>
)

export type WebPreviewConsoleProps = ComponentProps<typeof Collapsible>

/**
 * Collapsible console panel for web preview.
 */
export const WebPreviewConsole = ({
	className,
	children,
	...props
}: WebPreviewConsoleProps) => {
	const { consoleOpen, setConsoleOpen } = useWebPreview()

	return (
		<Collapsible
			className={cn("border-t", className)}
			onOpenChange={setConsoleOpen}
			open={consoleOpen}
			{...props}
		>
			{children}
		</Collapsible>
	)
}

export type WebPreviewConsoleTriggerProps = ComponentProps<
	typeof CollapsibleTrigger
>

/**
 * Console toggle trigger.
 */
export const WebPreviewConsoleTrigger = ({
	className,
	children,
	...props
}: WebPreviewConsoleTriggerProps) => (
	<CollapsibleTrigger asChild>
		<button
			className={cn(
				"flex w-full items-center justify-between px-3 py-2 text-muted-foreground text-sm hover:bg-muted",
				className,
			)}
			type="button"
			{...props}
		>
			{children ?? (
				<>
					<span>Console</span>
					<ChevronDownIcon className="size-4" />
				</>
			)}
		</button>
	</CollapsibleTrigger>
)

export type WebPreviewConsoleContentProps = ComponentProps<
	typeof CollapsibleContent
>

/**
 * Console content area.
 */
export const WebPreviewConsoleContent = ({
	className,
	...props
}: WebPreviewConsoleContentProps) => (
	<CollapsibleContent className={cn("p-2", className)} {...props} />
)
