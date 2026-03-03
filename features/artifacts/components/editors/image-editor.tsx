"use client"

import { memo, useCallback, useRef, useState } from "react"

import { ImageIcon } from "@/components/icons"
import type { ArtifactStatus } from "@/features/artifacts/types/artifact.types"
import { cn } from "@/lib/utils/cn"

// ── Types ────────────────────────────────────────────────────

type ImageEditorProps = {
	content: string
	title: string
	status: ArtifactStatus
	isCurrentVersion: boolean
	isInline?: boolean
}

// ── Streaming placeholder ────────────────────────────────────

function ImagePlaceholder({ isInline, title }: { isInline: boolean; title: string }) {
	return (
		<output
			aria-label={`Loading image: ${title}`}
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-md bg-muted",
				isInline ? "h-48 w-full max-w-sm" : "h-full min-h-64 w-full",
			)}
		>
			<div className="animate-pulse text-muted-foreground">
				<ImageIcon size={32} />
			</div>
			<span className="text-muted-foreground text-xs">Generating image…</span>
		</output>
	)
}

// ── Pure image editor ────────────────────────────────────────

function PureImageEditor({
	content,
	title,
	status,
	isCurrentVersion: _isCurrentVersion,
	isInline = false,
}: ImageEditorProps) {
	const imgRef = useRef<HTMLImageElement>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const [hasError, setHasError] = useState(false)

	const handleLoad = useCallback(() => {
		setIsLoaded(true)
		setHasError(false)
	}, [])

	const handleError = useCallback(() => {
		setHasError(true)
		setIsLoaded(false)
	}, [])

	// Show placeholder while streaming with no content yet
	const isStreaming = status === "streaming"
	const hasContent = content.length > 0

	if (isStreaming && !hasContent) {
		return <ImagePlaceholder isInline={isInline} title={title} />
	}

	// Error state — image failed to load
	if (hasError && hasContent) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/50",
					isInline ? "h-48 w-full max-w-sm" : "h-full min-h-64 w-full",
				)}
				role="alert"
			>
				<div className="text-muted-foreground">
					<ImageIcon size={24} />
				</div>
				<span className="text-muted-foreground text-xs">Failed to load image</span>
			</div>
		)
	}

	// Determine image source — data URLs pass through directly,
	// regular URLs are used as-is.
	const src = content

	return (
		<div
			className={cn(
				"relative flex items-center justify-center overflow-hidden",
				isInline ? "h-auto max-h-64 w-full max-w-sm" : "h-full w-full p-4",
			)}
		>
			{/* Loading skeleton — shown until image loads */}
			{!isLoaded && hasContent && (
				<output
					aria-label={`Loading image: ${title}`}
					className={cn(
						"absolute inset-0 flex items-center justify-center rounded-md bg-muted",
						"animate-pulse",
					)}
				>
					<ImageIcon size={24} />
				</output>
			)}

			{/* Native img over next/image — base64 data URLs not supported by next/image */}
			{hasContent && (
				// biome-ignore lint/performance/noImgElement: base64 data URLs are not supported by next/image
				<img
					ref={imgRef}
					alt={title || "Artifact image"}
					className={cn(
						"rounded-md object-contain transition-opacity duration-300",
						isLoaded ? "opacity-100" : "opacity-0",
						isInline ? "max-h-64 max-w-full" : "max-h-full max-w-full",
					)}
					decoding="async"
					onError={handleError}
					onLoad={handleLoad}
					src={src}
				/>
			)}
		</div>
	)
}

// ── Memo comparison ──────────────────────────────────────────
// Skip re-render during streaming unless content actually changed.

function arePropsEqual(prev: ImageEditorProps, next: ImageEditorProps): boolean {
	return (
		prev.content === next.content &&
		prev.title === next.title &&
		prev.status === next.status &&
		prev.isCurrentVersion === next.isCurrentVersion &&
		prev.isInline === next.isInline
	)
}

export const ImageEditor = memo(PureImageEditor, arePropsEqual)
