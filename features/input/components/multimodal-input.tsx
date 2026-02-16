/**
 * Multimodal Input Component
 *
 * Main input component combining text input, attachment handling, and suggested actions.
 *
 * @module features/input/components/multimodal-input
 */

"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import type { UIMessage } from "ai"
import equal from "fast-deep-equal"
import {
	type ChangeEvent,
	type Dispatch,
	memo,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react"
import { toast } from "sonner"
import { useDebounceCallback, useLocalStorage } from "usehooks-ts"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Attachment, ChatMessage } from "@/features/chat/types"
import { useWindowSize } from "@/hooks/use-window-size"
import { cn } from "@/lib/utils"
import { AttachmentPreview } from "./attachment-preview"
import { StopButton, SubmitButton } from "./submit-button"
import { SuggestedActions } from "./suggested-actions"

/**
 * Props for MultimodalInput component
 */
export interface MultimodalInputProps {
	/** Chat ID */
	chatId: string
	/** Current input value */
	input: string
	/** Set input value */
	setInput: Dispatch<SetStateAction<string>>
	/** Chat status */
	status: UseChatHelpers<ChatMessage>["status"]
	/** Stop generation handler */
	stop: () => void
	/** Current attachments */
	attachments: Attachment[]
	/** Set attachments */
	setAttachments: Dispatch<SetStateAction<Attachment[]>>
	/** Chat messages */
	messages: UIMessage[]
	/** Set messages */
	setMessages: UseChatHelpers<ChatMessage>["setMessages"]
	/** Send message handler */
	sendMessage: UseChatHelpers<ChatMessage>["sendMessage"]
	/** Additional class names */
	className?: string
}

/**
 * Pure multimodal input component
 */
function PureMultimodalInput({
	chatId,
	input,
	setInput,
	status,
	stop,
	attachments,
	setAttachments,
	messages,
	setMessages,
	sendMessage,
	className,
}: MultimodalInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const { width } = useWindowSize()

	const adjustHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px"
		}
	}, [])

	useEffect(() => {
		if (textareaRef.current) {
			adjustHeight()
		}
	}, [adjustHeight])

	const resetHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px"
		}
	}, [])

	const [localStorageInput, setLocalStorageInput] = useLocalStorage(
		"input",
		"",
		{ initializeWithValue: false },
	)

	// Debounce localStorage writes
	const debouncedSetLocalStorageInput = useDebounceCallback(
		setLocalStorageInput,
		500,
	)

	// Track hydration
	const hasHydratedRef = useRef(false)

	useEffect(() => {
		if (hasHydratedRef.current) return

		if (textareaRef.current) {
			hasHydratedRef.current = true
			const domValue = textareaRef.current.value
			const finalValue = domValue || localStorageInput || ""
			setInput(finalValue)
			adjustHeight()
		}
	}, [adjustHeight, localStorageInput, setInput])

	useEffect(() => {
		debouncedSetLocalStorageInput(input)
	}, [input, debouncedSetLocalStorageInput])

	const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setInput(event.target.value)
	}

	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploadQueue, setUploadQueue] = useState<string[]>()

	const submitForm = useCallback(() => {
		window.history.replaceState({}, "", `/chat/${chatId}`)

		sendMessage({
			role: "user",
			parts: [
				...attachments.map((attachment) => ({
					type: "file" as const,
					url: attachment.url,
					name: attachment.name,
					mediaType: attachment.contentType,
				})),
				{
					type: "text",
					text: input,
				},
			],
		})

		setAttachments([])
		setLocalStorageInput("")
		resetHeight()
		setInput("")

		if (width && width > 768) {
			textareaRef.current?.focus()
		}
	}, [
		input,
		setInput,
		attachments,
		sendMessage,
		setAttachments,
		setLocalStorageInput,
		width,
		chatId,
		resetHeight,
	])

	// AbortController ref for cancelling uploads
	const uploadAbortControllerRef = useRef<AbortController | null>(null)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			uploadAbortControllerRef.current?.abort()
		}
	}, [])

	const uploadFile = useCallback(async (file: File) => {
		const formData = new FormData()
		formData.append("file", file)

		uploadAbortControllerRef.current = new AbortController()

		try {
			const response = await fetch("/api/files/upload", {
				method: "POST",
				body: formData,
				signal: uploadAbortControllerRef.current.signal,
			})

			if (response.ok) {
				const data = await response.json()
				const { url, pathname, contentType, filename } = data

				return {
					url,
					name: filename ?? pathname ?? file.name,
					contentType,
				}
			}
			const { error } = await response.json()
			toast.error(error)
			return undefined
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				return undefined
			}
			toast.error("Failed to upload file, please try again!")
			return undefined
		}
	}, [])

	const handleFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files || [])

			setUploadQueue(files.map((file) => file.name))

			try {
				const MAX_CONCURRENT_UPLOADS = 3
				const uploadedAttachments: Awaited<
					ReturnType<typeof uploadFile>
				>[] = []

				for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
					const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS)
					const batchResults = await Promise.all(
						batch.map((file) => uploadFile(file)),
					)
					uploadedAttachments.push(...batchResults)
				}

				const successfullyUploadedAttachments =
					uploadedAttachments.filter(
						(attachment) => attachment !== undefined,
					)

				setAttachments((currentAttachments) => [
					...currentAttachments,
					...successfullyUploadedAttachments,
				])
			} finally {
				setUploadQueue([])
			}
		},
		[setAttachments, uploadFile],
	)

	const handleSubmit = useCallback(
		(event: React.FormEvent) => {
			event.preventDefault()
			if (status !== "ready") {
				toast.error("Please wait for the model to finish its response!")
			} else {
				submitForm()
			}
		},
		[status, submitForm],
	)

	return (
		<div className={cn("relative flex w-full flex-col gap-4", className)}>
			{messages.length === 0 &&
				attachments.length === 0 &&
				(uploadQueue?.length ?? 0) === 0 && (
					<SuggestedActions
						actions={[
							{
								id: "1",
								label: "What are the advantages of using Next.js?",
								prompt: "What are the advantages of using Next.js?",
								category: "explore",
							},
							{
								id: "2",
								label: "Write code to demonstrate Dijkstra's algorithm",
								prompt: "Write code to demonstrate Dijkstra's algorithm",
								category: "task",
							},
							{
								id: "3",
								label: "Help me write an essay about Silicon Valley",
								prompt: "Help me write an essay about Silicon Valley",
								category: "task",
							},
							{
								id: "4",
								label: "What is the weather in San Francisco?",
								prompt: "What is the weather in San Francisco?",
								category: "explore",
							},
						]}
						onSelect={(action) => {
							window.history.replaceState(
								{},
								"",
								`/chat/${chatId}`,
							)
							sendMessage({
								role: "user",
								parts: [{ type: "text", text: action.prompt }],
							})
						}}
					/>
				)}

			<input
				aria-label="Upload attachments"
				className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
				multiple
				onChange={handleFileChange}
				ref={fileInputRef}
				tabIndex={-1}
				type="file"
			/>

			<form
				className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
				onSubmit={handleSubmit}
			>
				{(attachments.length > 0 || (uploadQueue?.length ?? 0) > 0) && (
					<div
						className="flex flex-row items-end gap-2 overflow-x-scroll pb-2"
						data-testid="attachments-preview"
					>
						{attachments.map((attachment) => (
							<AttachmentPreview
								attachment={{
									...attachment,
									id: attachment.url,
									type: attachment.contentType?.startsWith(
										"image/",
									)
										? "image"
										: "document",
									status: "ready",
								}}
								key={attachment.url}
								onRemove={() => {
									setAttachments((currentAttachments) =>
										currentAttachments.filter(
											(a) => a.url !== attachment.url,
										),
									)
									if (fileInputRef.current) {
										fileInputRef.current.value = ""
									}
								}}
							/>
						))}

						{uploadQueue?.map((filename) => (
							<AttachmentPreview
								attachment={{
									id: filename,
									url: "",
									name: filename,
									contentType: "",
									type: "document",
									status: "uploading",
								}}
								isUploading={true}
								key={filename}
							/>
						))}
					</div>
				)}

				<div className="flex flex-row items-start gap-1 sm:gap-2">
					<Textarea
						autoFocus
						className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
						data-testid="multimodal-input"
						onChange={handleInput}
						placeholder="Send a message..."
						ref={textareaRef}
						rows={1}
						value={input}
					/>
				</div>

				<div className="flex items-center justify-between border-t border-border/50 pt-2">
					<div className="flex items-center gap-1">
						<Button
							className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent"
							data-testid="attachments-button"
							disabled={status !== "ready"}
							onClick={(event) => {
								event.preventDefault()
								fileInputRef.current?.click()
							}}
							type="button"
							variant="ghost"
						>
							<svg
								aria-label="Attach file"
								className="size-4"
								fill="none"
								role="img"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Attach file</title>
								<path
									d="M18.5 12.5l-9.5 9.5a4 4 0 01-5.5-5.5l9.5-9.5a2.5 2.5 0 014 0 2.5 2.5 0 010 4l-7 7a1 1 0 01-1.5-1.5l7-7"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</Button>
					</div>

					{status !== "ready" ? (
						<StopButton
							onClick={() => {
								stop()
								setMessages((messages) => messages)
							}}
						/>
					) : (
						<SubmitButton
							hasContent={input.trim().length > 0}
							isDisabled={
								status !== "ready" ||
								(uploadQueue?.length ?? 0) > 0
							}
							isSubmitting={status !== "ready"}
							onClick={submitForm}
						/>
					)}
				</div>
			</form>
		</div>
	)
}

/**
 * Multimodal input component with memoization for performance
 */
export const MultimodalInput = memo(
	PureMultimodalInput,
	(prevProps, nextProps) => {
		if (prevProps.input !== nextProps.input) return false
		if (prevProps.status !== nextProps.status) return false
		if (!equal(prevProps.attachments, nextProps.attachments)) return false
		if (prevProps.chatId !== nextProps.chatId) return false

		return true
	},
)
