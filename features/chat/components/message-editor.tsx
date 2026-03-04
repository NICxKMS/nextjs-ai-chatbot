"use client"

import type { UIMessage } from "ai"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { getMessageText } from "@/features/chat/lib/message-utils"

// ── Types ────────────────────────────────────────────────────

interface MessageEditorProps {
	/** The message being edited */
	message: UIMessage
	/** Switch back to view mode on cancel or successful submit */
	setMode: (mode: "view" | "edit") => void
}

// ── Component ────────────────────────────────────────────────

/**
 * MessageEditor — inline editing UI for a user message.
 *
 * Renders a textarea pre-filled with the message text.
 * On submit: calls `editMessage` from ChatSessionContext which
 * deletes trailing messages and re-submits with the edited content.
 * On cancel: switches back to view mode without changes.
 */
export function MessageEditor({ message, setMode }: MessageEditorProps) {
	const { editMessage } = useChatSessionContext()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [draftContent, setDraftContent] = useState(() => getMessageText(message))
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current
		if (textarea) {
			textarea.style.height = "auto"
			textarea.style.height = `${textarea.scrollHeight + 2}px`
		}
	}, [])

	// Auto-size on mount
	useEffect(() => {
		adjustHeight()
	}, [adjustHeight])

	const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDraftContent(event.target.value)
		adjustHeight()
	}

	const handleSubmit = async () => {
		setIsSubmitting(true)
		try {
			await editMessage(message.id, draftContent)
			setMode("view")
		} catch {
			toast.error("Failed to edit message")
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		setMode("view")
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<Textarea
				className="w-full resize-none overflow-hidden rounded-xl bg-transparent text-base! outline-hidden"
				data-testid="message-editor"
				onChange={handleInput}
				ref={textareaRef}
				value={draftContent}
			/>

			<div className="flex flex-row justify-end gap-2">
				<Button className="h-fit px-3 py-2" onClick={handleCancel} variant="outline">
					Cancel
				</Button>
				<Button
					className="h-fit px-3 py-2"
					data-testid="message-editor-send-button"
					disabled={isSubmitting}
					onClick={handleSubmit}
					variant="default"
				>
					{isSubmitting ? "Sending..." : "Send"}
				</Button>
			</div>
		</div>
	)
}
