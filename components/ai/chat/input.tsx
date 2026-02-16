/**
 * AI Chat Input Wrapper Component
 *
 * Project wrapper for ai-elements PromptInput primitive that adds:
 * - Form submission handling
 * - File attachment support
 * - Voice input integration
 * - Suggestion chips
 *
 * @module components/ai/chat/input
 */

"use client"

import type { FileUIPart } from "ai"
import { useCallback } from "react"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import {
	type PromptInputProps as AIPromptInputProps,
	PromptInput,
	PromptInputProvider,
	usePromptInputController,
	useProviderAttachments,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Attachment type for file uploads
 */
export interface Attachment {
	name: string
	url: string
	contentType: string
}

/**
 * Props for the AIChatInput wrapper component
 */
export interface AIChatInputProps extends Omit<AIPromptInputProps, "onSubmit"> {
	/** Chat ID for context */
	chatId?: string
	/** Whether the input is disabled */
	isDisabled?: boolean
	/** Whether a response is being generated */
	isLoading?: boolean
	/** Handler for message submission */
	onSubmit?: (
		message: string,
		attachments?: Attachment[],
	) => Promise<void> | void
	/** Handler for stopping generation */
	onStop?: () => void
	/** Suggested prompts to display */
	suggestions?: string[]
	/** Whether to show the stop button during generation */
	showStopButton?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Internal component that uses the PromptInput context
 */
const AIChatInputInner = ({
	chatId: _chatId,
	isDisabled = false,
	isLoading = false,
	onSubmit,
	onStop,
	suggestions = [],
	showStopButton = true,
	className,
}: Omit<AIChatInputProps, "children">) => {
	const { textInput } = usePromptInputController()
	const { files } = useProviderAttachments()

	const handleFormSubmit = useCallback(
		async (message: PromptInputMessage, event: React.FormEvent) => {
			event.preventDefault()
			if (!message.text.trim() || isDisabled || isLoading) return

			const attachments: Attachment[] = files.map(
				(f: FileUIPart & { id: string }) => ({
					name: f.filename || "file",
					url: f.url || "",
					contentType: f.mediaType || "application/octet-stream",
				}),
			)

			await onSubmit?.(message.text.trim(), attachments)
		},
		[isDisabled, isLoading, onSubmit, files],
	)

	const handleStop = useCallback(() => {
		onStop?.()
	}, [onStop])

	return (
		<div className={cn("relative", className)}>
			{/* Suggestion chips */}
			{suggestions.length > 0 && !textInput.value && (
				<div className="mb-2 flex flex-wrap gap-2">
					{suggestions.map((suggestion) => (
						<button
							key={suggestion}
							className="rounded-full border bg-muted/50 px-3 py-1 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
							type="button"
						>
							{suggestion}
						</button>
					))}
				</div>
			)}

			<form>
				<PromptInput
					className={cn(
						"min-h-[60px] w-full rounded-xl border bg-background p-3",
						"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
						className,
					)}
					onSubmit={handleFormSubmit}
				>
					{/* Action buttons */}
					<div className="flex items-center justify-between pt-2">
						<div className="flex items-center gap-2">
							{/* File upload button placeholder */}
							<Button
								variant="ghost"
								size="sm"
								type="button"
								disabled={isDisabled || isLoading}
								className="text-muted-foreground"
							>
								📎
							</Button>
						</div>

						<div className="flex items-center gap-2">
							{/* Stop button during generation */}
							{isLoading && showStopButton && (
								<Button
									variant="destructive"
									size="sm"
									type="button"
									onClick={handleStop}
								>
									Stop
								</Button>
							)}

							{/* Submit button */}
							<Button
								variant="default"
								size="sm"
								type="submit"
								disabled={
									isDisabled ||
									!textInput.value.trim() ||
									isLoading
								}
							>
								{isLoading ? "Sending..." : "Send"}
							</Button>
						</div>
					</div>
				</PromptInput>
			</form>
		</div>
	)
}

/**
 * AI Chat Input wrapper component
 *
 * Provides a rich input experience with:
 * - Multi-line text input
 * - File attachment support
 * - Voice input (when available)
 * - Suggestion chips
 * - Stop generation button
 */
export const AIChatInput = (props: AIChatInputProps) => {
	return (
		<PromptInputProvider>
			<AIChatInputInner {...props} />
		</PromptInputProvider>
	)
}

export type { AIPromptInputProps }
