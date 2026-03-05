import type { ChatStatus, FileUIPart, LanguageModelUsage, UIMessage } from "ai"
import type { Dispatch, SetStateAction } from "react"

import type { ArtifactKind, ArtifactSuggestion } from "@/lib/types/artifact.types"
import type { ModelMetadata } from "@/lib/types/model.types"
import type { Visibility } from "@/lib/types/models.types"

export type { ChatStatus } from "ai"
// ── Re-exports ───────────────────────────────────────────────
// Canonical ArtifactSuggestion lives in lib/types/artifact.types.ts (P0-T06).
// Re-exported here so chat consumers import from the feature boundary.
export type { ArtifactSuggestion } from "@/lib/types/artifact.types"

// ── Visibility alias for chat domain ─────────────────────────
// Canonical definition: Visibility in lib/types/models.types (P0-T05).
// Aliased as VisibilityType for domain clarity in chat contexts.
export type VisibilityType = Visibility

// ── File attachment (UI concept, not an SDK type) ────────────
// Represents a pending file attachment on the chat input before
// it is embedded in a message. The AI SDK does not export this type.

export interface Attachment {
	/** Display name of the file */
	name: string
	/** Data URL or upload URL */
	url: string
	/** MIME type (e.g., "image/png") */
	contentType: string
}

// ── ChatSessionContext value ─────────────────────────────────
// Contract for ChatSessionContext (P3-T08). The useChatSession hook (P3-T11)
// bridges between useChat's return type and this interface.
// 18 canonical fields per P3-T05 spec.

export interface ChatSessionValue {
	/** Current chat UUID */
	chatId: string
	/** Selected model ID (e.g., "google:gemma-3-4b-it") */
	chatModel: string
	/** Update the selected model ID (client-side, avoids router.refresh) */
	setChatModel: (modelId: string) => void
	/** Whether the chat is read-only (e.g., shared public chat viewed by non-owner) */
	isReadonly: boolean
	/** Current message list from useChat */
	messages: UIMessage[]
	/** Chat status from useChat: 'submitted' | 'streaming' | 'ready' | 'error' */
	status: ChatStatus
	/** Current input text */
	input: string
	/** Update the input text */
	setInput: (input: string) => void
	/** Pending file attachments */
	attachments: Attachment[]
	/** Update pending file attachments */
	setAttachments: Dispatch<SetStateAction<Attachment[]>>
	/** Submit the current input + attachments as a new message.
	 *  Optionally pass content string to bypass input state (avoids stale closure).
	 *  When `files` is provided, those are sent directly instead of reading from attachments state. */
	sendMessage: (
		contentOrEvent?: string | { preventDefault?: () => void },
		files?: FileUIPart[],
	) => void
	/** Abort the current streaming response */
	stop: () => void
	/** Programmatically append a message to the conversation */
	appendMessage: (message: UIMessage) => void
	/** Edit an existing message by ID and resubmit */
	editMessage: (id: string, content: string) => Promise<void>
	/** Current error from useChat (undefined when no error) */
	error: Error | undefined
	/** Clear the current error state */
	clearError: () => void
	/** Chat visibility: 'public' or 'private' (CV-01 Option A) */
	visibility: VisibilityType
	/** Update chat visibility (optimistic setter) */
	setVisibility: (v: VisibilityType) => void
	/** Available models from the catalog for model selector UI */
	availableModels: ModelMetadata[]
	/** Token usage from the last completed response */
	usage: LanguageModelUsage | undefined
}

// ── Artifact data stream parts ──────────────────────────────
// Custom data parts sent via createUIMessageStream for artifact
// lifecycle management. Uses 'artifact-' prefix (NOT 'data-' prefix).
// 12 union members total: 10 artifact-*, chat-title, error.

export type ArtifactDataPart =
	| { type: "artifact-id"; content: string }
	| { type: "artifact-title"; content: string }
	| { type: "artifact-kind"; content: ArtifactKind }
	| { type: "artifact-clear"; content: "" }
	| { type: "artifact-finish"; content: "" }
	| { type: "artifact-textDelta"; content: string }
	| { type: "artifact-codeDelta"; content: string }
	| { type: "artifact-sheetDelta"; content: string }
	| { type: "artifact-imageDelta"; content: string }
	| { type: "artifact-suggestion"; content: ArtifactSuggestion }
	| { type: "chat-title"; content: string }
	| { type: "usage"; content: string }
	| { type: "error"; content: string }

/** Consolidated stream data part type (alias for ArtifactDataPart) */
export type DataPart = ArtifactDataPart
