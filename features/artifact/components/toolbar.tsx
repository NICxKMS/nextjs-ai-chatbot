"use client"

import { memo, type ReactNode, useEffect } from "react"
import {
	CopyIcon,
	DownloadIcon,
	FileIcon,
	RedoIcon,
	UndoIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ArtifactToolbarProps {
	status: "streaming" | "idle"
	isCurrentVersion: boolean
	canUndo: boolean
	canRedo: boolean
	onUndo: () => void
	onRedo: () => void
	onCopy: () => void
	onDownload: () => void
	onOpenVersionHistory: () => void
}

type ToolbarButtonProps = {
	description: string
	shortcut: string
	onClick: () => void
	disabled: boolean
	children: ReactNode
}

function ToolbarButton({
	description,
	shortcut,
	onClick,
	disabled,
	children,
}: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					aria-label={description}
					disabled={disabled}
					onClick={onClick}
					size="icon"
					variant="outline"
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<div className="flex items-center gap-2">
					<span>{description}</span>
					<span className="text-muted-foreground text-xs">
						{shortcut}
					</span>
				</div>
			</TooltipContent>
		</Tooltip>
	)
}

function isInteractiveElement(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const tag = target.tagName
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

function PureArtifactToolbar({
	status,
	isCurrentVersion,
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onCopy,
	onDownload,
	onOpenVersionHistory,
}: ArtifactToolbarProps) {
	const disabled = status === "streaming" || !isCurrentVersion

	useEffect(() => {
		if (!isCurrentVersion) {
			return
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey && !event.ctrlKey) {
				return
			}

			if (isInteractiveElement(event.target)) {
				return
			}

			const key = event.key.toLowerCase()

			if (key === "z" && !event.shiftKey) {
				event.preventDefault()
				if (!disabled && canUndo) {
					onUndo()
				}
				return
			}

			if (key === "y" || (key === "z" && event.shiftKey)) {
				event.preventDefault()
				if (!disabled && canRedo) {
					onRedo()
				}
				return
			}

			if (event.shiftKey && key === "c") {
				event.preventDefault()
				if (!disabled) {
					onCopy()
				}
				return
			}

			if (key === "s") {
				event.preventDefault()
				if (!disabled) {
					onDownload()
				}
				return
			}

			if (event.shiftKey && key === "h") {
				event.preventDefault()
				if (!disabled) {
					onOpenVersionHistory()
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [
		canRedo,
		canUndo,
		disabled,
		isCurrentVersion,
		onCopy,
		onDownload,
		onOpenVersionHistory,
		onRedo,
		onUndo,
	])

	return (
		<div className="border-b border-zinc-200 bg-background px-2 py-2 dark:border-zinc-700 dark:bg-muted">
			<div className="flex items-center gap-1">
				<ToolbarButton
					description="Undo"
					disabled={disabled || !canUndo}
					onClick={onUndo}
					shortcut="Ctrl/Cmd+Z"
				>
					<UndoIcon size={16} />
				</ToolbarButton>
				<ToolbarButton
					description="Redo"
					disabled={disabled || !canRedo}
					onClick={onRedo}
					shortcut="Ctrl/Cmd+Shift+Z"
				>
					<RedoIcon size={16} />
				</ToolbarButton>

				<div className={cn("mx-1 h-5 w-px bg-border")} />

				<ToolbarButton
					description="Copy"
					disabled={disabled}
					onClick={onCopy}
					shortcut="Ctrl/Cmd+Shift+C"
				>
					<CopyIcon size={16} />
				</ToolbarButton>
				<ToolbarButton
					description="Download"
					disabled={disabled}
					onClick={onDownload}
					shortcut="Ctrl/Cmd+S"
				>
					<DownloadIcon size={16} />
				</ToolbarButton>

				<div className={cn("mx-1 h-5 w-px bg-border")} />

				<ToolbarButton
					description="Version history"
					disabled={disabled}
					onClick={onOpenVersionHistory}
					shortcut="Ctrl/Cmd+Shift+H"
				>
					<FileIcon size={16} />
				</ToolbarButton>
			</div>
		</div>
	)
}

export const Toolbar = memo(PureArtifactToolbar)
