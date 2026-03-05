"use client"

import { useCallback } from "react"

import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { cn } from "@/lib/utils/cn"

// ── Component ────────────────────────────────────────────────
// Thin wrapper that bridges the ai-element PromptInput compound
// components to the ChatSessionContext. The ai-element manages
// text input, file attachments (blob → data URL), drag-drop,
// paste, and submit UX internally. This wrapper only wires the
// submit handler and status/stop to the chat session.

export function MultimodalInput({ className }: { className?: string }) {
	const { sendMessage, stop, status, isReadonly } = useChatSessionContext()

	const handleSubmit = useCallback(
		(message: PromptInputMessage) => {
			// The ai-element already converted blob URLs to data URLs in message.files.
			// Pass text + files directly to sendMessage which forwards to the AI SDK.
			sendMessage(message.text, message.files)
		},
		[sendMessage],
	)

	if (isReadonly) return null

	const isGenerating = status === "submitted" || status === "streaming"

	return (
		<PromptInput
			accept="image/*"
			className={cn("[&_[data-slot=input-group]]:rounded-xl", className)}
			multiple
			onSubmit={handleSubmit}
		>
			<PromptInputTextarea
				autoFocus
				className="min-h-11"
				data-testid="multimodal-input"
				placeholder="Send a message..."
			/>
			<PromptInputFooter>
				<PromptInputTools>
					<PromptInputActionMenu>
						<PromptInputActionMenuTrigger tooltip="Attach file" />
						<PromptInputActionMenuContent>
							<PromptInputActionAddAttachments />
						</PromptInputActionMenuContent>
					</PromptInputActionMenu>
				</PromptInputTools>
				<PromptInputSubmit
					data-testid={isGenerating ? "stop-button" : "send-button"}
					onStop={stop}
					status={status}
				/>
			</PromptInputFooter>
		</PromptInput>
	)
}
