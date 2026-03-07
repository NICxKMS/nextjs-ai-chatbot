"use client"

import type { FileUIPart } from "ai"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"

import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputProvider,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputController,
} from "@/components/ai-elements/prompt-input"
import { ContextDisplay } from "@/features/chat/components/context-display"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { ModelSelector } from "@/features/models/components/model-selector"
import { cn } from "@/lib/utils/cn"

interface UploadedFilePayload {
	url: string
	pathname: string
	contentType?: string
}

async function uploadFile(file: FileUIPart): Promise<FileUIPart> {
	if (!file.url.startsWith("data:")) {
		return file
	}

	const sourceResponse = await fetch(file.url)
	const sourceBlob = await sourceResponse.blob()
	const uploadFormData = new FormData()
	uploadFormData.append("file", sourceBlob, file.filename ?? `upload-${Date.now()}`)

	const uploadResponse = await fetch("/api/files/upload", {
		method: "POST",
		body: uploadFormData,
	})

	if (!uploadResponse.ok) {
		let message = "File upload failed"

		try {
			const payload = (await uploadResponse.json()) as { message?: string }
			if (payload.message) {
				message = payload.message
			}
		} catch {
			// Fall back to the generic upload failure message.
		}

		throw new Error(message)
	}

	const payload = (await uploadResponse.json()) as UploadedFilePayload

	return {
		...file,
		url: payload.url,
		mediaType: payload.contentType ?? file.mediaType,
	}
}

async function uploadFiles(files: FileUIPart[]): Promise<FileUIPart[]> {
	return Promise.all(files.map(uploadFile))
}

// ── Component ────────────────────────────────────────────────
// Thin wrapper that bridges the ai-element PromptInput compound
// components to the ChatSessionContext. The ai-element manages
// text input, file attachments, drag-drop, paste, and submit UX.
// This wrapper uploads inline attachment payloads through the
// app route before sending the final message to the chat session.

function ControlledMultimodalInput({ className }: { className?: string }) {
	const {
		sendMessage,
		stop,
		status,
		isReadonly,
		chatModel,
		setChatModel,
		availableModels,
		setInput,
		usage,
	} = useChatSessionContext()
	const controller = usePromptInputController()

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			try {
				const files = await uploadFiles(message.files)
				sendMessage(message.text, files)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "File upload failed")
				throw error
			}
		},
		[sendMessage],
	)

	const currentModel = useMemo(
		() => availableModels.find((m) => m.id === chatModel),
		[availableModels, chatModel],
	)

	const usedTokens =
		(usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0) + (usage?.reasoningTokens ?? 0)
	const maxTokens = currentModel?.contextWindow ?? 0

	if (isReadonly) return null

	const isGenerating = status === "submitted" || status === "streaming"
	const isSubmitDisabled = !controller.textInput.value.trim()

	return (
		<PromptInput
			accept="image/*"
			className={cn("[&_[data-slot=input-group]]:rounded-xl", className)}
			multiple
			onSubmit={handleSubmit}
		>
			<PromptInputTextarea
				autoFocus
				className="min-h-11 pr-14"
				data-testid="multimodal-input"
				onChange={(event) => setInput(event.currentTarget.value)}
				placeholder="Send a message..."
			/>
			{maxTokens > 0 && (
				<div className="absolute top-1 right-1 z-10">
					<ContextDisplay
						usedTokens={usedTokens}
						maxTokens={maxTokens}
						usage={usage}
						modelId={chatModel}
					/>
				</div>
			)}
			<PromptInputFooter>
				<PromptInputTools>
					<PromptInputActionMenu>
						<PromptInputActionMenuTrigger tooltip="Attach file" />
						<PromptInputActionMenuContent>
							<PromptInputActionAddAttachments />
						</PromptInputActionMenuContent>
					</PromptInputActionMenu>
					<ModelSelector
						compact
						className="size-8 border-0 bg-transparent shadow-none hover:bg-accent hover:text-foreground rounded-md"
						selectedModelId={chatModel}
						onModelChange={setChatModel}
						models={availableModels}
					/>
				</PromptInputTools>
				<PromptInputSubmit
					data-testid={isGenerating ? "stop-button" : "send-button"}
					disabled={!isGenerating && isSubmitDisabled}
					onStop={stop}
					status={status}
				/>
			</PromptInputFooter>
		</PromptInput>
	)
}

export function MultimodalInput({ className }: { className?: string }) {
	const { isReadonly, input } = useChatSessionContext()

	if (isReadonly) return null

	return (
		<PromptInputProvider initialInput={input}>
			<ControlledMultimodalInput className={className} />
		</PromptInputProvider>
	)
}
