"use client"

import type { UIMessage } from "ai"
import dynamic from "next/dynamic"
import { useCallback } from "react"

import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import { ChatHeader } from "@/features/chat/components/chat-header"
import { Messages } from "@/features/chat/components/messages"
import { MultimodalInput } from "@/features/chat/components/multimodal-input"
import { StreamBridge } from "@/features/chat/components/stream-bridge"
import { useChatSession } from "@/features/chat/hooks/use-chat-session"
import { ChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { useChatSideEffects } from "@/features/chat/hooks/use-chat-side-effects"
import type { VisibilityType } from "@/features/chat/types/chat.types"
import type { UIArtifact } from "@/lib/types/artifact.types"
import type { ModelMetadata } from "@/lib/types/model.types"

// ── Lazy-loaded artifact panel ───────────────────────────────
// ArtifactPanel is heavy (editors, animations) — only loaded when
// the artifact store signals visibility. Code-split via dynamic import.

const ArtifactPanel = dynamic(
	() =>
		import("@/features/artifacts/components/artifact-panel").then((m) => ({
			default: m.ArtifactPanel,
		})),
	{ ssr: false },
)

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
		onChatChange: artifactStore.reset,
	})

	// StreamBridge passes fully-resolved UIArtifact from processStreamDelta.
	// Replace the store state wholesale — StreamBridge already accumulated deltas.
	const handleArtifactDelta = useCallback((artifact: UIArtifact) => {
		artifactStore.setState(() => artifact)
	}, [])

	return (
		<ChatSessionContext.Provider value={session}>
			<ChatHeader />
			<Messages />
			{!isReadonly && <MultimodalInput />}
			<StreamBridge chatId={id} onArtifactDelta={handleArtifactDelta} />
			<ArtifactPanel />
		</ChatSessionContext.Provider>
	)
}
