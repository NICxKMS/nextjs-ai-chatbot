/**
 * AI Chat Wrappers - Barrel Export
 *
 * Project wrappers for chat-related AI elements that add:
 * - Message rendering with actions
 * - Input handling with attachments
 * - Conversation management with auto-scroll
 *
 * @module components/ai/chat
 */

export type { AIConversationProps } from "./conversation"
// Conversation components
export {
	AIConversation,
	type AIConversationWrapperProps,
	useConversationScroll,
} from "./conversation"
export type { AIPromptInputProps } from "./input"
// Input components
export {
	AIChatInput,
	type AIChatInputProps,
	type Attachment,
} from "./input"
// Re-export types from ai-elements for convenience
export type {
	AIMessageContentProps,
	AIMessageProps,
} from "./message"
// Message components
export {
	AIMessage,
	type AIMessageWrapperProps,
	AIThinkingMessage,
	type MessageVote,
} from "./message"
