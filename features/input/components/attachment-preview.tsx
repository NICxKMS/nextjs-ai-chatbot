/**
 * Attachment Preview Component
 *
 * Displays a preview of an attached file with remove functionality.
 *
 * @module features/input/components/attachment-preview
 */

"use client"

import { AlertCircle, FileCode, FileText, Loader2, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { InputAttachment } from "../types"

/**
 * Props for AttachmentPreview component
 */
export interface AttachmentPreviewProps {
	/** Attachment to preview */
	attachment: InputAttachment
	/** Whether the attachment is currently uploading */
	isUploading?: boolean
	/** Handler to remove the attachment */
	onRemove?: () => void
	/** Additional class names */
	className?: string
}

/**
 * Attachment preview with type-specific rendering and removal action
 */
export function AttachmentPreview({
	attachment,
	isUploading = false,
	onRemove,
	className,
}: AttachmentPreviewProps) {
	const { name, url, contentType, status, previewUrl } = attachment

	const isImage = contentType?.startsWith("image/")
	const hasError = status === "error"

	return (
		<div
			className={cn(
				"group relative size-16 overflow-hidden rounded-lg border bg-muted",
				className,
			)}
			data-testid="input-attachment-preview"
		>
			{isImage && url ? (
				<Image
					alt={name ?? "An image attachment"}
					className="size-full object-cover"
					height={64}
					sizes="64px"
					src={previewUrl ?? url}
					width={64}
				/>
			) : (
				<div className="flex size-full items-center justify-center text-muted-foreground">
					{hasError ? (
						<AlertCircle className="size-6" />
					) : contentType?.includes("javascript") ||
						contentType?.includes("typescript") ||
						contentType?.includes("json") ? (
						<FileCode className="size-6" />
					) : (
						<FileText className="size-6" />
					)}
				</div>
			)}

			{isUploading && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/50">
					<Loader2 className="size-4 animate-spin text-white" />
				</div>
			)}

			{onRemove && !isUploading && (
				<Button
					className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
					onClick={onRemove}
					size="sm"
					variant="destructive"
					type="button"
				>
					<X className="size-2" />
				</Button>
			)}

			<div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
				{name}
			</div>
		</div>
	)
}
