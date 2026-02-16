/**
 * AI Web Preview Wrapper Component
 *
 * Project wrapper for ai-elements WebPreview primitive that adds:
 * - Sandbox security controls
 * - Reload functionality
 * - Loading states
 * - Error handling
 *
 * @module components/ai/content/web-preview
 */

"use client"

import {
	ArrowLeftIcon,
	ArrowRightIcon,
	LoaderIcon,
	RefreshCwIcon,
} from "lucide-react"
import { memo, useCallback, useState } from "react"
import {
	WebPreview as AIWebPreviewBase,
	WebPreviewConsole as AIWebPreviewConsoleBase,
	WebPreviewConsoleContent as AIWebPreviewConsoleContentBase,
	WebPreviewConsoleTrigger as AIWebPreviewConsoleTriggerBase,
	WebPreviewContent as AIWebPreviewContentBase,
	WebPreviewFrame as AIWebPreviewFrameBase,
	WebPreviewNavigation as AIWebPreviewNavigationBase,
	WebPreviewNavigationButton as AIWebPreviewNavigationButtonBase,
	type WebPreviewProps as AIWebPreviewProps,
	WebPreviewUrlBar as AIWebPreviewUrlBarBase,
} from "@/components/ai-elements/web-preview"
import { cn } from "@/lib/utils"

/**
 * Props for the AIWebPreview wrapper component
 */
export interface AIWebPreviewWrapperProps extends AIWebPreviewProps {
	/** Whether to show the navigation bar */
	showNavigation?: boolean
	/** Whether to show the URL bar */
	showUrlBar?: boolean
	/** Whether to show the console panel */
	showConsole?: boolean
	/** Whether the preview is loading */
	isLoading?: boolean
	/** Error message to display */
	error?: string
	/** Callback when reload is triggered */
	onReload?: () => void
	/** Sandbox permissions for iframe */
	sandbox?: string
	/** Additional class names */
	className?: string
}

/**
 * Default sandbox permissions for secure preview
 */
const DEFAULT_SANDBOX =
	"allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"

/**
 * Loading overlay component
 */
function LoadingOverlay() {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-2">
				<LoaderIcon className="size-8 animate-spin text-muted-foreground" />
				<span className="text-muted-foreground text-sm">
					Loading preview...
				</span>
			</div>
		</div>
	)
}

/**
 * Error overlay component
 */
function ErrorOverlay({
	error,
	onRetry,
}: {
	error: string
	onRetry?: () => void
}) {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-2 p-4 text-center">
				<span className="text-destructive text-sm">{error}</span>
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="rounded-md bg-primary px-3 py-1 text-primary-foreground text-sm hover:bg-primary/90"
					>
						Retry
					</button>
				)}
			</div>
		</div>
	)
}

/**
 * Internal web preview component
 */
const AIWebPreviewComponent = ({
	showNavigation = true,
	showUrlBar = true,
	showConsole = false,
	isLoading = false,
	error,
	onReload,
	sandbox = DEFAULT_SANDBOX,
	className,
	children,
	defaultUrl = "",
	onUrlChange,
	...props
}: AIWebPreviewWrapperProps) => {
	const [key, setKey] = useState(0)

	const handleReload = useCallback(() => {
		setKey((prev) => prev + 1)
		onReload?.()
	}, [onReload])

	return (
		<AIWebPreviewBase
			className={cn("relative", className)}
			defaultUrl={defaultUrl}
			{...(onUrlChange ? { onUrlChange } : {})}
			{...props}
		>
			{/* Navigation bar */}
			{showNavigation && (
				<AIWebPreviewNavigationBase>
					<AIWebPreviewNavigationButtonBase tooltip="Back">
						<ArrowLeftIcon className="size-4" />
					</AIWebPreviewNavigationButtonBase>
					<AIWebPreviewNavigationButtonBase tooltip="Forward">
						<ArrowRightIcon className="size-4" />
					</AIWebPreviewNavigationButtonBase>
					<AIWebPreviewNavigationButtonBase
						tooltip="Reload"
						onClick={handleReload}
					>
						<RefreshCwIcon className="size-4" />
					</AIWebPreviewNavigationButtonBase>
					{showUrlBar && <AIWebPreviewUrlBarBase className="h-8" />}
				</AIWebPreviewNavigationBase>
			)}

			{/* Content area */}
			<AIWebPreviewContentBase className="relative">
				<AIWebPreviewFrameBase
					key={key}
					className="size-full"
					sandbox={sandbox}
				/>
				{isLoading && <LoadingOverlay />}
				{error && <ErrorOverlay error={error} onRetry={handleReload} />}
			</AIWebPreviewContentBase>

			{/* Console panel */}
			{showConsole && (
				<AIWebPreviewConsoleBase>
					<AIWebPreviewConsoleTriggerBase />
					<AIWebPreviewConsoleContentBase>
						{children}
					</AIWebPreviewConsoleContentBase>
				</AIWebPreviewConsoleBase>
			)}
		</AIWebPreviewBase>
	)
}

/**
 * Memoized AI Web Preview wrapper component
 */
export const AIWebPreview = memo(AIWebPreviewComponent)
AIWebPreview.displayName = "AIWebPreview"

/**
 * Props for AI Code Preview component
 */
export interface AICodePreviewProps {
	/** HTML content to preview */
	htmlContent: string
	/** Whether to show the navigation bar */
	showNavigation?: boolean
	/** Whether the preview is loading */
	isLoading?: boolean
	/** Error message to display */
	error?: string
	/** Callback when reload is triggered */
	onReload?: () => void
	/** Additional class names */
	className?: string
}

/**
 * Code preview component for HTML content
 */
export const AICodePreview = memo(function AICodePreview({
	htmlContent,
	showNavigation = false,
	isLoading = false,
	error,
	onReload,
	className,
}: AICodePreviewProps) {
	const [key, setKey] = useState(0)

	const handleReload = useCallback(() => {
		setKey((prev) => prev + 1)
		onReload?.()
	}, [onReload])

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg border",
				className,
			)}
		>
			{showNavigation && (
				<div className="flex items-center gap-1 border-b p-2">
					<button
						type="button"
						onClick={handleReload}
						className="rounded-md p-1 hover:bg-muted"
					>
						<RefreshCwIcon className="size-4" />
					</button>
				</div>
			)}
			<div className="relative h-full min-h-48">
				{isLoading ? (
					<LoadingOverlay />
				) : error ? (
					<ErrorOverlay error={error} onRetry={handleReload} />
				) : (
					<iframe
						key={key}
						srcDoc={htmlContent}
						sandbox={DEFAULT_SANDBOX}
						className="size-full border-0"
						title="Code Preview"
					/>
				)}
			</div>
		</div>
	)
})

/**
 * Props for AI Artifact Preview component
 */
export interface AIArtifactPreviewProps {
	/** Content to preview (HTML, SVG, etc.) */
	content: string
	/** Content type */
	contentType?: "html" | "svg" | "image"
	/** Whether the preview is loading */
	isLoading?: boolean
	/** Error message to display */
	error?: string
	/** Callback when reload is triggered */
	onReload?: () => void
	/** Additional class names */
	className?: string
}

/**
 * Artifact preview component for various content types
 */
export const AIArtifactPreview = memo(function AIArtifactPreview({
	content,
	contentType = "html",
	isLoading = false,
	error,
	onReload,
	className,
}: AIArtifactPreviewProps) {
	const [key, setKey] = useState(0)

	const handleReload = useCallback(() => {
		setKey((prev) => prev + 1)
		onReload?.()
	}, [onReload])

	const getSrcDoc = () => {
		if (contentType === "svg") {
			return `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body>${content}</body></html>`
		}
		return content
	}

	if (contentType === "image") {
		return (
			<div
				className={cn("relative overflow-hidden rounded-lg", className)}
			>
				{isLoading ? (
					<LoadingOverlay />
				) : error ? (
					<ErrorOverlay error={error} />
				) : (
					<img
						src={content}
						alt="Preview"
						className="size-full object-contain"
					/>
				)}
			</div>
		)
	}

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg border",
				className,
			)}
		>
			<div className="relative h-full min-h-48">
				{isLoading ? (
					<LoadingOverlay />
				) : error ? (
					<ErrorOverlay error={error} onRetry={handleReload} />
				) : (
					<iframe
						key={key}
						srcDoc={getSrcDoc()}
						sandbox={DEFAULT_SANDBOX}
						className="size-full border-0"
						title="Artifact Preview"
					/>
				)}
			</div>
		</div>
	)
})

export type { AIWebPreviewProps }
