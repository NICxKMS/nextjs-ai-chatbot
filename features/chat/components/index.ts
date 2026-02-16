/**
 * Chat Components Barrel Export
 *
 * Re-exports all chat UI components for clean imports.
 *
 * @module features/chat/components
 */

// Re-export types
export type { ChatProps, ModelMetadata } from "./chat"
// Main Components
export { Chat } from "./chat"
// Chat UI Components
export { ChatHeader } from "./chat-header"
// Data Stream Handler
export {
	type ArtifactStreamDefinition,
	type ArtifactStreamUpdate,
	artifactStreamDefinitions,
	DataStreamHandler,
	type DataStreamHandlerProps,
	type StreamPartHandlerContext,
} from "./data-stream-handler"
export { Greeting } from "./greeting"
export type { MessageProps, ThinkingMessageProps } from "./message"
export { Message, ThinkingMessage } from "./message"
export type { PureMessageActionsProps } from "./message-actions"
export { MessageActions, PureMessageActions } from "./message-actions"
// Message Support Components
export type { MessageEditorProps } from "./message-editor"
export { MessageEditor } from "./message-editor"
export type { MessageReasoningProps } from "./message-reasoning"
export { MessageReasoning } from "./message-reasoning"
export type { MessagesProps } from "./messages"
export { Messages } from "./messages"
// Toolbar types
export type {
	ArtifactKind,
	ArtifactToolbarItem,
} from "./toolbar"
export { artifactDefinitions, Toolbar, Tools } from "./toolbar"
export type { VisibilityType } from "./visibility-selector"
export { VisibilitySelector } from "./visibility-selector"
