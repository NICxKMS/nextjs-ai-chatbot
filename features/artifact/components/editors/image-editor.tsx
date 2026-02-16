/**
 * Image Editor Component
 *
 * Image display component for image artifacts with streaming support.
 * Migrated from archive/oldapp/components/image-editor.tsx
 *
 * @module features/artifact/components/editors/image-editor
 */
"use client"

import { memo } from "react"

import { LoaderIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Props for the ImageEditor component
 */
export interface ImageEditorProps {
	/** The image title for alt text */
	title: string
	/** Base64 encoded image content */
	content: string
	/** Whether this is the current version */
	isCurrentVersion: boolean
	/** Index of the current version */
	currentVersionIndex: number
	/** Current streaming status */
	status: "streaming" | "idle"
	/** Whether the image is displayed inline */
	isInline: boolean
}

/**
 * Pure editor component for memoization
 */
function PureImageEditor({
	title,
	content,
	status,
	isInline,
}: ImageEditorProps) {
	return (
		<div
			className={cn("flex w-full flex-row items-center justify-center", {
				"h-[calc(100dvh-60px)]": !isInline,
				"h-[200px]": isInline,
			})}
		>
			{status === "streaming" ? (
				<div className="flex flex-row items-center gap-4">
					{!isInline && (
						<div className="animate-spin">
							<LoaderIcon />
						</div>
					)}
					<div>Generating Image...</div>
				</div>
			) : (
				<picture>
					<img
						alt={title}
						className={cn(
							"h-auto w-full max-w-[800px] object-contain",
							{
								"p-0 md:p-20": !isInline,
							},
						)}
						height={600}
						src={`data:image/png;base64,${content}`}
						style={{ aspectRatio: "4/3" }}
						width={800}
					/>
				</picture>
			)}
		</div>
	)
}

/**
 * Custom comparison function for memoization
 */
function areEqual(prevProps: ImageEditorProps, nextProps: ImageEditorProps) {
	return (
		prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
		prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
		!(
			prevProps.status === "streaming" && nextProps.status === "streaming"
		) &&
		prevProps.content === nextProps.content &&
		prevProps.title === nextProps.title &&
		prevProps.isInline === nextProps.isInline
	)
}

/**
 * Image display component for image artifacts
 *
 * Features:
 * - Base64 image rendering
 * - Streaming state with loading indicator
 * - Responsive sizing (inline vs panel)
 * - Aspect ratio preservation
 *
 * @example
 * ```tsx
 * <ImageEditor
 *   title="Generated Image"
 *   content="base64EncodedImageData"
 *   status="idle"
 *   isCurrentVersion={true}
 *   currentVersionIndex={0}
 *   isInline={false}
 * />
 * ```
 */
export const ImageEditor = memo(PureImageEditor, areEqual)
