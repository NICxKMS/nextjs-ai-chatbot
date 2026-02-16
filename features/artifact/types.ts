/**
 * Artifact Feature Types
 *
 * Type definitions for artifact components and hooks.
 *
 * @module features/artifact/types
 */

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArtifactMetadata = any

/**
 * Context for artifact actions
 */
export interface ArtifactActionContext {
	content: string
	handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void
	currentVersionIndex: number
	isCurrentVersion: boolean
	mode: "edit" | "diff"
	metadata: ArtifactMetadata
	setMetadata: (metadata: ArtifactMetadata) => void
}

/**
 * Artifact action definition
 */
export interface ArtifactAction {
	description: string
	icon: React.ReactNode
	label?: string
	onClick: (context: ArtifactActionContext) => Promise<void> | void
	isDisabled?: (context: ArtifactActionContext) => boolean
}

/**
 * Artifact definition for registering artifact types
 */
export interface ArtifactDefinition {
	kind: ArtifactKind
	name: string
	description: string
	actions: ArtifactAction[]
	content: React.ComponentType<ArtifactContentProps>
	initialize?: (params: {
		documentId: string
		setMetadata: (metadata: ArtifactMetadata) => void
	}) => void
}

/**
 * Props for artifact content components (editors/renderers)
 */
export interface ArtifactContentProps {
	content: string
	currentVersionIndex: number
	getDocumentContentById: (index: number) => string
	isCurrentVersion: boolean
	isInline: boolean
	isLoading: boolean
	metadata: ArtifactMetadata
	mode: "edit" | "diff"
	onSaveContent: (content: string, debounce: boolean) => void
	setMetadata: (metadata: ArtifactMetadata) => void
	status: ArtifactStatus
	suggestions: Array<{ id: string; content: string }>
	title: string
}

/**
 * Props for the main Artifact panel component
 */
export interface ArtifactPanelProps {
	chatId: string
	input: string
	setInput: (input: string) => void
	status: "idle" | "streaming" | "error"
	stop: () => void
	attachments: Array<{ id: string; url: string; name: string }>
	setAttachments: (
		attachments: Array<{ id: string; url: string; name: string }>,
	) => void
	messages: Array<unknown>
	setMessages: (messages: Array<unknown>) => void
	regenerate: () => void
	votes: Array<{ messageId: string; vote: number }> | undefined
	sendMessage: () => void
	isReadonly: boolean
	selectedVisibilityType: "public" | "private"
	selectedModelId: string
	availableModels: Array<{ id: string; name: string }>
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
