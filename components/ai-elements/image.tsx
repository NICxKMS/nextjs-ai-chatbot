/**
 * Image Element Component
 *
 * Component for displaying AI-generated images.
 * Supports lazy loading, loading states, and smooth transitions.
 *
 * @module components/ai-elements/image
 */

"use client"

import type { Experimental_GeneratedImage } from "ai"
import { memo, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils/index"

export type ImageProps = Experimental_GeneratedImage & {
	className?: string
	alt?: string
	/** Width for aspect ratio placeholder */
	width?: number
	/** Height for aspect ratio placeholder */
	height?: number
	/** Enable lazy loading via IntersectionObserver */
	lazy?: boolean
}

/**
 * Image loading skeleton with shimmer effect.
 */
function ImageSkeleton({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"animate-pulse rounded-md bg-muted",
				"h-48 w-full",
				className,
			)}
		/>
	)
}

/**
 * Image component for AI-generated images.
 * Uses native img element because Next.js Image doesn't support data URLs (base64).
 *
 * Features:
 * - Lazy loading via IntersectionObserver
 * - Loading state with skeleton
 * - Smooth fade-in transition
 */
const PureImage = ({
	base64,
	uint8Array,
	mediaType,
	lazy = true,
	width,
	height,
	...props
}: ImageProps) => {
	const imgRef = useRef<HTMLImageElement>(null)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isInView, setIsInView] = useState(!lazy)

	// Intersection observer for lazy loading
	useEffect(() => {
		if (!lazy || !imgRef.current) {
			setIsInView(true)
			return
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setIsInView(true)
						observer.disconnect()
					}
				}
			},
			{ rootMargin: "100px" },
		)

		observer.observe(imgRef.current)

		return () => observer.disconnect()
	}, [lazy])

	const aspectRatio =
		width && height ? { aspectRatio: `${width} / ${height}` } : undefined

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-md",
				props.className,
			)}
			ref={imgRef}
			style={aspectRatio}
		>
			{/* Loading skeleton */}
			{!isLoaded && <ImageSkeleton className="absolute inset-0" />}

			{/* Actual image - only render src when in view */}
			{isInView && (
				// biome-ignore lint/performance/noImgElement: base64 data URLs cannot be optimized by Next.js Image
				<img
					alt={props.alt ?? "AI generated image"}
					className={cn(
						"h-auto max-w-full overflow-hidden rounded-md",
						"transition-opacity duration-300",
						isLoaded ? "opacity-100" : "opacity-0",
					)}
					decoding="async"
					height={height}
					loading="lazy"
					onLoad={() => setIsLoaded(true)}
					src={`data:${mediaType};base64,${base64}`}
					width={width}
				/>
			)}
		</div>
	)
}

/**
 * Memoized Image component for AI-generated images.
 */
export const Image = memo(PureImage)
Image.displayName = "Image"
