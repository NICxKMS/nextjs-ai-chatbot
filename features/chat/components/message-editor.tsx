/**
 * Message Editor Component
 *
 * Inline editing component for user messages with auto-resizing textarea.
 *
 * @module features/chat/components
 */

"use client"

import type { UseChatHelpers } from "@ai-sdk/react"
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react"
import { toast } from "sonner"
import type { ChatMessage } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the MessageEditor component
 */
export interface MessageEditorProps {
	/** Chat ID for context */
	chatId: string
	/** Message being edited */
	message: ChatMessage
	/** Set mode callback (view/edit) */
	setMode: Dispatch<SetStateAction<"view" | "edit">>
	/** Set messages function from useChat */
	setMessages: UseChatHelpers<ChatMessage>["setMessages"]
	/** Regenerate function from useChat */
	regenerate: UseChatHelpers<ChatMessage>["regenerate"]
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Text part type for message content
 */
type TextPart = { type: "text"; text: string }

/**
 * Extract text content from a message
 */
function getTextFromMessage(message: ChatMessage): string {
	// Handle parts property (UIMessage format)
	if (message.parts) {
		return message.parts
			.filter(
				(part): part is TextPart =>
					part.type === "text" && "text" in part,
			)
			.map((part) => part.text)
			.join("\n")
			.trim()
	}

	return ""
}

// =============================================================================
// Components
// =============================================================================

/**
 * Message Editor Component
 *
 * Provides inline editing for user messages with:
 * - Auto-resizing textarea
 * - Cancel and Send buttons
 * - Loading state during submission
 */
export function MessageEditor({
	chatId,
	message,
	setMode,
	setMessages,
	regenerate,
}: MessageEditorProps) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [draftContent, setDraftContent] = useState<string>(() =>
		getTextFromMessage(message),
	)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	/**
	 * Adjust textarea height to fit content
	 */
	const adjustHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`
		}
	}, [])

	// Adjust height on mount
	useEffect(() => {
		if (textareaRef.current) {
			adjustHeight()
		}
	}, [adjustHeight])

	/**
	 * Handle textarea input changes
	 */
	const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDraftContent(event.target.value)
		adjustHeight()
	}

	/**
	 * Handle cancel action
	 */
	const handleCancel = () => {
		setMode("view")
	}

	/**
	 * Handle send/edit submission
	 */
	const handleSubmit = async () => {
		setIsSubmitting(true)

		try {
			// Delete trailing messages after the edited message
			// Note: This would typically call a server action
			// For now, we'll update the messages directly
			const createdAt =
				message.metadata?.createdAt ?? new Date().toISOString()

			// Log the action for debugging (server action would be called here)
			console.log("deleteTrailingMessages", { chatId, createdAt })
		} catch {
			setIsSubmitting(false)
			toast.error("Failed to edit message")
			return
		}

		// Update messages state
		setMessages((messages) => {
			const index = messages.findIndex((m) => m.id === message.id)

			if (index !== -1) {
				const updatedMessage: ChatMessage = {
					...message,
					parts: [{ type: "text" as const, text: draftContent }],
				}

				return [...messages.slice(0, index), updatedMessage]
			}

			return messages
		})

		setMode("view")
		regenerate()
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<textarea
				className="w-full resize-none overflow-hidden rounded-xl bg-transparent text-base outline-hidden border border-input focus:border-ring focus:ring-1 focus:ring-ring px-3 py-2"
				data-testid="message-editor"
				onChange={handleInput}
				ref={textareaRef}
				value={draftContent}
				rows={1}
			/>

			<div className="flex flex-row justify-end gap-2">
				<button
					className="h-fit px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
					onClick={handleCancel}
					type="button"
				>
					Cancel
				</button>
				<button
					className="h-fit px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
					data-testid="message-editor-send-button"
					disabled={isSubmitting}
					onClick={handleSubmit}
					type="button"
				>
					{isSubmitting ? "Sending..." : "Send"}
				</button>
			</div>
		</div>
	)
}
