"use client"

import {
	type ChangeEvent,
	type DragEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
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

import { PreviewAttachment } from "./preview-attachment"
import { SubmitButton } from "./submit-button"

// ── File upload helpers ──────────────────────────────────────

async function uploadFile(file: File, signal?: AbortSignal): Promise<Attachment | undefined> {
	const formData = new FormData()
	formData.append("file", file)
	try {
		const response = await fetch("/api/files/upload", {
			method: "POST",
			body: formData,
			signal,
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
	} catch (error) {
		// Silently ignore aborted uploads (e.g., component unmount)
		if (error instanceof Error && error.name === "AbortError") return
		toast.error("Failed to upload file, please try again!")
	}
}

async function processFiles(
	files: File[],
	setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>,
	setUploadQueue: React.Dispatch<React.SetStateAction<string[]>>,
	signal?: AbortSignal,
) {
	setUploadQueue(files.map((f) => f.name))
	try {
		const results = await Promise.all(files.map((f) => uploadFile(f, signal)))
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
	const uploadAbortRef = useRef<AbortController | null>(null)

	// Abort active uploads on unmount
	useEffect(() => {
		return () => {
			uploadAbortRef.current?.abort()
		}
	}, [])

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
	// Skip during IME composition (e.g. CJK input) to avoid premature submission
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
				const controller = new AbortController()
				uploadAbortRef.current = controller
				processFiles(files, setAttachments, setUploadQueue, controller.signal)
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
				const controller = new AbortController()
				uploadAbortRef.current = controller
				processFiles(imageFiles, setAttachments, setUploadQueue, controller.signal)
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
				const controller = new AbortController()
				uploadAbortRef.current = controller
				processFiles(files, setAttachments, setUploadQueue, controller.signal)
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
					className="flex flex-row items-end gap-2 overflow-x-auto"
					data-testid="attachments-preview"
				>
					{attachments.map((attachment) => (
						<PreviewAttachment
							attachment={attachment}
							key={attachment.url}
							onRemove={() =>
								setAttachments((prev) =>
									prev.filter((a) => a.url !== attachment.url),
								)
							}
						/>
					))}
					{uploadQueue.map((filename) => (
						<PreviewAttachment
							attachment={{
								url: "",
								name: filename,
								contentType: "",
							}}
							isUploading
							key={filename}
						/>
					))}
				</div>
			)}

			{/* Hidden file input for attachment button */}
			<input
				accept="image/*"
				aria-label="Upload file"
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
					className="relative shrink-0 after:absolute after:-inset-0.5 after:md:hidden"
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
