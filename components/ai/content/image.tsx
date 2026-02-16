/**
 * AI Image Wrapper Component
 *
 * Project wrapper for ai-elements Image primitive that adds:
 * - Download functionality
 * - Fullscreen preview
 * - Action buttons for image manipulation
 * - Enhanced loading states
 *
 * @module components/ai/content/image
 */

"use client"

import { DownloadIcon, ExpandIcon, XIcon } from "lucide-react"
import { memo, useCallback, useState } from "react"
import {
	Image as AIImageBase,
	type ImageProps as AIImageProps,
} from "@/components/ai-elements/image"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Props for the AIImage wrapper component
 */
export interface AIImageWrapperProps {
	/** Base64 encoded image data */
	base64: string
	/** Uint8Array of image data (optional) */
	uint8Array?: Uint8Array
	/** Media type of the image */
	mediaType?: string
	/** Alt text for the image */
	alt?: string
	/** Width for aspect ratio placeholder */
	width?: number
	/** Height for aspect ratio placeholder */
	height?: number
	/** Enable lazy loading via IntersectionObserver */
	lazy?: boolean
	/** Whether to show the download button */
	showDownloadButton?: boolean
	/** Whether to show the fullscreen button */
	showFullscreenButton?: boolean
	/** Callback when download is triggered */
	onDownload?: () => void
	/** Callback when fullscreen is opened */
	onFullscreen?: () => void
	/** Custom filename for download (without extension) */
	downloadFilename?: string
	/** Additional class names */
	className?: string
}

/**
 * Image loading skeleton with shimmer effect
 */
function ImageSkeleton() {
	return <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
}

/**
 * Download image from base64 data
 */
async function downloadImage(
	base64: string,
	mediaType: string,
	filename: string,
): Promise<void> {
	const link = document.createElement("a")
	link.href = `data:${mediaType};base64,${base64}`
	link.download = `${filename}.png`
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

/**
 * Action button with tooltip
 */
function ImageActionButton({
	tooltip,
	onClick,
	children,
	className,
}: {
	tooltip: string
	onClick: () => void
	children: React.ReactNode
	className?: string
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						size="icon"
						variant="ghost"
						className={cn(
							"size-8 bg-background/80 backdrop-blur-sm",
							className,
						)}
						onClick={onClick}
					>
						{children}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

/**
 * Fullscreen overlay component
 */
function FullscreenOverlay({
	isOpen,
	onClose,
	imageSrc,
	alt,
}: {
	isOpen: boolean
	onClose: () => void
	imageSrc: string
	alt: string
}) {
	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
			<Button
				size="icon"
				variant="ghost"
				className="absolute top-4 right-4 text-white"
				onClick={onClose}
				aria-label="Close fullscreen"
			>
				<XIcon className="size-6" />
			</Button>
			<img
				src={imageSrc}
				alt={alt}
				className="h-auto max-h-[90vh] w-auto max-w-[90vw] rounded-md object-contain"
			/>
		</div>
	)
}

/**
 * Internal image component with actions
 */
const AIImageComponent = ({
	base64,
	uint8Array,
	mediaType = "image/png",
	showDownloadButton = true,
	showFullscreenButton = true,
	onDownload,
	onFullscreen,
	downloadFilename = "ai-generated-image",
	className,
	alt = "AI generated image",
	width,
	height,
	lazy,
}: AIImageWrapperProps) => {
	const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

	const handleDownload = useCallback(async () => {
		if (!base64) return

		try {
			await downloadImage(base64, mediaType, downloadFilename)
			onDownload?.()
		} catch (error) {
			console.error("Failed to download image:", error)
		}
	}, [base64, mediaType, downloadFilename, onDownload])

	const handleFullscreen = useCallback(() => {
		setIsFullscreenOpen(true)
		onFullscreen?.()
	}, [onFullscreen])

	// If no base64, show skeleton
	if (!base64) {
		return <ImageSkeleton />
	}

	const imageSrc = `data:${mediaType};base64,${base64}`

	return (
		<div className={cn("group relative", className)}>
			{/* Main image */}
			<AIImageBase
				base64={base64}
				uint8Array={uint8Array ?? new Uint8Array()}
				mediaType={mediaType}
				alt={alt}
				className="rounded-md"
				{...(width !== undefined ? { width } : {})}
				{...(height !== undefined ? { height } : {})}
				{...(lazy !== undefined ? { lazy } : {})}
			/>

			{/* Action buttons overlay */}
			{(showDownloadButton || showFullscreenButton) && (
				<div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					{showDownloadButton && (
						<ImageActionButton
							tooltip="Download"
							onClick={handleDownload}
						>
							<DownloadIcon className="size-4" />
						</ImageActionButton>
					)}
					{showFullscreenButton && (
						<ImageActionButton
							tooltip="Fullscreen"
							onClick={handleFullscreen}
						>
							<ExpandIcon className="size-4" />
						</ImageActionButton>
					)}
				</div>
			)}

			{/* Fullscreen overlay */}
			<FullscreenOverlay
				isOpen={isFullscreenOpen}
				onClose={() => setIsFullscreenOpen(false)}
				imageSrc={imageSrc}
				alt={alt}
			/>
		</div>
	)
}

/**
 * Memoized AI Image wrapper component
 */
export const AIImage = memo(AIImageComponent)
AIImage.displayName = "AIImage"

/**
 * Props for AI Image Gallery component
 */
export interface AIImageGalleryProps {
	/** Array of images to display */
	images: Array<{
		base64: string
		uint8Array?: Uint8Array
		mediaType?: string
		alt?: string
	}>
	/** Number of columns in the grid */
	columns?: 2 | 3 | 4
	/** Whether to show download buttons */
	showDownloadButtons?: boolean
	/** Whether to show fullscreen buttons */
	showFullscreenButtons?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Image gallery component for displaying multiple AI-generated images
 */
export const AIImageGallery = ({
	images,
	columns = 2,
	showDownloadButtons = true,
	showFullscreenButtons = true,
	className,
}: AIImageGalleryProps) => {
	const gridCols = {
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
	}

	return (
		<div className={cn("grid gap-4", gridCols[columns], className)}>
			{images.map((image, index) => (
				<AIImage
					key={`image-${image.base64.slice(0, 20)}-${index}`}
					base64={image.base64}
					mediaType={image.mediaType ?? "image/png"}
					alt={image.alt ?? `AI generated image ${index + 1}`}
					showDownloadButton={showDownloadButtons}
					showFullscreenButton={showFullscreenButtons}
					downloadFilename={`ai-generated-image-${index + 1}`}
				/>
			))}
		</div>
	)
}

export type { AIImageProps }
