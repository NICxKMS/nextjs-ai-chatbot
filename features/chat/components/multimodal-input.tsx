"use client"

import {
	type ChangeEvent,
	type DragEvent,
	type KeyboardEvent,
	useCallback,
	useRef,
	useState,
} from "react"
import { toast } from "sonner"

import { PaperclipIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import type { Attachment } from "@/features/chat/types/chat.types"
import { cn } from "@/lib/utils/cn"

import { SubmitButton } from "./submit-button"

// ── File upload helpers ──────────────────────────────────────

async function uploadFile(file: File): Promise<Attachment | undefined> {
	const formData = new FormData()
	formData.append("file", file)
	try {
		const response = await fetch("/api/files/upload", {
			method: "POST",
			body: formData,
		})
		if (response.ok) {
			const data = (await response.json()) as {
				url: string
				filename?: string
				pathname?: string
				contentType: string
			}
			return {
				url: data.url,
				name: data.filename ?? data.pathname ?? file.name,
				contentType: data.contentType,
			}
		}
		const errorData = (await response.json()) as { error: string }
		toast.error(errorData.error)
	} catch {
		toast.error("Failed to upload file, please try again!")
	}
}

async function processFiles(
	files: File[],
	setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>,
	setUploadQueue: React.Dispatch<React.SetStateAction<string[]>>,
) {
	setUploadQueue(files.map((f) => f.name))
	try {
		const results = await Promise.all(files.map(uploadFile))
		const uploaded = results.filter((r): r is Attachment => r !== undefined)
		if (uploaded.length > 0) {
			setAttachments((prev) => [...prev, ...uploaded])
		}
	} finally {
		setUploadQueue([])
	}
}

// ── Component ────────────────────────────────────────────────

export function MultimodalInput({ className }: { className?: string }) {
	const { input, setInput, attachments, setAttachments, sendMessage, stop, status, isReadonly } =
		useChatSessionContext()

	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [uploadQueue, setUploadQueue] = useState<string[]>([])

	// Auto-resize textarea to fit content (capped at 200px)
	const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
		textarea.style.height = "auto"
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
	}, [])

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			setInput(e.target.value)
			adjustHeight(e.target)
		},
		[setInput, adjustHeight],
	)

	// Submit on Enter, newline on Shift+Enter
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault()
				if (status === "ready" && input.trim()) {
					sendMessage()
				}
			}
		},
		[input, sendMessage, status],
	)

	const handleFileChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || [])
			if (files.length > 0) {
				processFiles(files, setAttachments, setUploadQueue)
			}
		},
		[setAttachments],
	)

	// Paste images from clipboard
	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const imageFiles = Array.from(e.clipboardData.items)
				.filter((item) => item.type.startsWith("image/"))
				.map((item) => item.getAsFile())
				.filter((f): f is File => f !== null)
			if (imageFiles.length > 0) {
				e.preventDefault()
				processFiles(imageFiles, setAttachments, setUploadQueue)
			}
		},
		[setAttachments],
	)

	// Drag-and-drop handlers
	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
			setIsDragging(false)
			const files = Array.from(e.dataTransfer.files)
			if (files.length > 0) {
				processFiles(files, setAttachments, setUploadQueue)
			}
		},
		[setAttachments],
	)

	if (isReadonly) return null

	const isSubmitting = status === "submitted" || status === "streaming"

	return (
		<form
			className={cn("relative flex w-full flex-col gap-2", className)}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onSubmit={(e) => {
				e.preventDefault()
				if (status === "ready" && input.trim()) {
					sendMessage()
				}
			}}
		>
			{/* Attachment previews */}
			{(attachments.length > 0 || uploadQueue.length > 0) && (
				<div
					className="flex flex-row gap-2 overflow-x-auto"
					data-testid="attachments-preview"
				>
					{attachments.map((attachment) => (
						<div
							className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
							key={attachment.url}
						>
							<span className="max-w-[120px] truncate">{attachment.name}</span>
							<button
								aria-label={`Remove ${attachment.name}`}
								className="text-muted-foreground hover:text-foreground"
								onClick={() =>
									setAttachments((prev) =>
										prev.filter((a) => a.url !== attachment.url),
									)
								}
								type="button"
							>
								×
							</button>
						</div>
					))}
					{uploadQueue.map((name) => (
						<div
							className="flex animate-pulse items-center gap-1 rounded-md border px-2 py-1 text-xs"
							key={name}
						>
							<span className="max-w-[120px] truncate">{name}</span>
						</div>
					))}
				</div>
			)}

			{/* Hidden file input for attachment button */}
			<input
				aria-label="Upload attachments"
				className="hidden"
				multiple
				onChange={handleFileChange}
				ref={fileInputRef}
				tabIndex={-1}
				type="file"
			/>

			{/* Input area */}
			<div
				className={cn(
					"flex items-end gap-2 rounded-xl border bg-background p-3 shadow-xs transition-colors",
					isDragging && "border-primary ring-2 ring-primary/20",
				)}
			>
				<Button
					aria-label="Attach file"
					className="shrink-0"
					disabled={isSubmitting}
					onClick={() => fileInputRef.current?.click()}
					size="icon"
					variant="ghost"
				>
					<PaperclipIcon size={16} />
				</Button>

				<Textarea
					autoFocus
					className="min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
					data-testid="multimodal-input"
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onPaste={handlePaste}
					placeholder="Send a message..."
					ref={textareaRef}
					rows={1}
					value={input}
				/>

				<SubmitButton
					hasInput={!!input.trim() || attachments.length > 0}
					isSubmitting={isSubmitting}
					isUploading={uploadQueue.length > 0}
					onStop={stop}
					onSubmit={sendMessage}
				/>
			</div>
		</form>
	)
}
