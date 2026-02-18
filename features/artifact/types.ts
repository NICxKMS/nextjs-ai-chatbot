/**
 * Artifact Feature Types
 *
 * Type definitions for artifact components and hooks.
 *
 * @module features/artifact/types
 */

import type { Dispatch, SetStateAction } from "react"

/**
 * Artifact kind types supported by the system
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet"

/**
 * Artifact status during streaming
 */
export type ArtifactStatus = "streaming" | "idle"

/**
 * Bounding box for artifact animation
 */
export interface ArtifactBoundingBox {
	top: number
	left: number
	width: number
	height: number
}

/**
 * UI representation of an artifact
 * Used by the artifact context and components
 */
export interface UIArtifact {
	title: string
	documentId: string
	kind: ArtifactKind
	content: string
	isVisible: boolean
	status: ArtifactStatus
	boundingBox: ArtifactBoundingBox
}

/**
 * Initial artifact data for context initialization
 */
export const initialArtifactData: UIArtifact = {
	documentId: "init",
	content: "",
	kind: "text",
	title: "",
	status: "idle",
	isVisible: false,
	boundingBox: {
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	},
}

/**
 * Artifact metadata type
 * Each artifact type can define its own metadata shape
 */
// biome-ignore lint/suspicious/noExplicitAny: flexible metadata shape for different artifact types
export type ArtifactMetadata = any

/**
 * Context for artifact actions
 */
export interface ArtifactActionContext<M = ArtifactMetadata> {
	content: string
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	currentVersionIndex: number
	isCurrentVersion: boolean
	mode: "edit" | "diff"
	metadata: M
	setMetadata: Dispatch<SetStateAction<M>>
}

/**
 * Artifact action definition
 */
export interface ArtifactAction<M = ArtifactMetadata> {
	description: string
	icon: React.ReactNode
	label?: string
	onClick: (context: ArtifactActionContext<M>) => Promise<void> | void
	isDisabled?: (context: ArtifactActionContext<M>) => boolean
}

/**
 * Context for artifact toolbar items
 */
export interface ArtifactToolbarContext {
	/**
	 * Send a message to the chat
	 */
	sendMessage: (message: {
		role: "user"
		parts: Array<{ type: "text"; text: string }>
	}) => void
}

/**
 * Artifact toolbar item definition
 */
export interface ArtifactToolbarItem {
	description: string
	icon: React.ReactNode
	onClick: (context: ArtifactToolbarContext) => void
}

/**
 * Stream part data for artifact streaming
 */
export interface ArtifactStreamPart<T = unknown> {
	type: string
	data: T
}

/**
 * Context for onStreamPart handler
 */
export interface ArtifactStreamContext<M = ArtifactMetadata> {
	setMetadata: Dispatch<SetStateAction<M>>
	setArtifact: Dispatch<SetStateAction<UIArtifact>>
	streamPart: ArtifactStreamPart
}

/**
 * Initialize parameters for artifact setup
 */
export interface ArtifactInitializeParams<M = ArtifactMetadata> {
	documentId: string
	setMetadata: Dispatch<SetStateAction<M>>
}

/**
 * Props for artifact content components (editors/renderers)
 */
export interface ArtifactContentProps<M = ArtifactMetadata> {
	content: string
	currentVersionIndex: number
	getDocumentContentById: (index: number) => string
	isCurrentVersion: boolean
	isInline: boolean
	isLoading: boolean
	metadata: M
	mode: "edit" | "diff"
	onSaveContent: (content: string, debounce: boolean) => void
	setMetadata: Dispatch<SetStateAction<M>>
	status: ArtifactStatus
	suggestions: Array<{ id: string; content: string }>
	title: string
}

/**
 * Artifact definition for registering artifact types
 */
export interface ArtifactDefinition<M = ArtifactMetadata> {
	kind: ArtifactKind
	name: string
	description: string
	actions: ArtifactAction<M>[]
	toolbar: ArtifactToolbarItem[]
	content: React.ComponentType<ArtifactContentProps<M>>
	initialize:
		| ((params: ArtifactInitializeParams<M>) => void | Promise<void>)
		| undefined
	onStreamPart: ((context: ArtifactStreamContext<M>) => void) | undefined
}

/**
 * Props for the main Artifact panel component
 *
 * Includes props for:
 * - Chat context (chatId, isReadonly)
 * - MultimodalInput integration (input, setInput, status, stop, attachments, setAttachments, sendMessage)
 * - ArtifactMessages integration (messages, setMessages, regenerate, votes)
 */
export interface ArtifactPanelProps {
	/** Chat ID */
	chatId: string
	/** Whether the chat is read-only */
	isReadonly: boolean
	/** Current input value */
	input: string
	/** Set input value */
	setInput: (input: string) => void
	/** Chat status from useChat */
	status: "idle" | "streaming" | "error" | "submitted" | "ready"
	/** Stop generation handler */
	stop: () => void
	/** Current attachments */
	attachments: Array<{ id: string; url: string; name: string }>
	/** Set attachments */
	setAttachments: (
		attachments: Array<{ id: string; url: string; name: string }>,
	) => void
	/** Chat messages */
	messages: Array<unknown>
	/** Set messages */
	setMessages: (messages: Array<unknown>) => void
	/** Regenerate handler */
	regenerate: () => void
	/** User votes on messages */
	votes: Array<{ messageId: string; vote: number }> | undefined
	/** Send message handler */
	sendMessage: () => void
}

/**
 * Props for ArtifactActions component
 */
export interface ArtifactActionsProps {
	artifact: UIArtifact
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	currentVersionIndex: number
	isCurrentVersion: boolean
	mode: "edit" | "diff"
	metadata: ArtifactMetadata
	setMetadata: (metadata: ArtifactMetadata) => void
}

/**
 * Props for ArtifactClose component
 */
export interface ArtifactCloseProps {
	onClose?: () => void
}

/**
 * Props for ArtifactErrorBoundary component
 */
export interface ArtifactErrorBoundaryProps {
	children: React.ReactNode
	fallback?: React.ReactNode
}
