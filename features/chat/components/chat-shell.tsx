"use client"

import type { UIMessage } from "ai"
import { useCallback } from "react"

import { ChatHeader } from "@/features/chat/components/chat-header"
import { Messages } from "@/features/chat/components/messages"
import { MultimodalInput } from "@/features/chat/components/multimodal-input"
import { StreamBridge } from "@/features/chat/components/stream-bridge"
import { useChatSession } from "@/features/chat/hooks/use-chat-session"
import { ChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { useChatSideEffects } from "@/features/chat/hooks/use-chat-side-effects"
import type { VisibilityType } from "@/features/chat/types/chat.types"
import type { ModelMetadata } from "@/lib/types/model.types"

// ── Props ────────────────────────────────────────────────────

export interface ChatShellProps {
	id: string
	initialMessages: UIMessage[]
	initialChatModel: string
	isReadonly: boolean
	initialVisibility: VisibilityType
	availableModels: ModelMetadata[]
}

// ── Component ────────────────────────────────────────────────
// Thin orchestrator (~55 lines). All state lives in useChatSession →
// ChatSessionContext. Children read from context (zero prop drilling).
// ChatStreamProvider is an ancestor (page-scoped), NOT rendered here —
// useChatSession depends on its dispatch context.

export function ChatShell({
	id,
	initialMessages,
	initialChatModel,
	isReadonly,
	initialVisibility,
	availableModels,
}: ChatShellProps) {
	const session = useChatSession({
		id,
		initialMessages,
		initialChatModel,
		isReadonly,
		initialVisibility,
		availableModels,
	})

	useChatSideEffects({
		id,
		status: session.status,
		messages: session.messages,
		// P4 wires real artifactStore.reset here
	})

	// Noop until P4 wires real artifact store handler
	const handleArtifactDelta = useCallback(() => {
		/* P4-T17 wires artifactStore.setState here */
	}, [])

	return (
		<ChatSessionContext.Provider value={session}>
			<ChatHeader />
			<Messages />
			{!isReadonly && <MultimodalInput />}
			<StreamBridge chatId={id} onArtifactDelta={handleArtifactDelta} />
		</ChatSessionContext.Provider>
	)
}
