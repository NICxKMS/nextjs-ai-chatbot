/**
 * Chat Components
 *
 * Exports all chat-related components for the chat feature.
 *
 * @module features/chat/components
 */

export type {
    ReasoningContentProps,
    ReasoningProps,
    ReasoningTriggerProps,
} from "@/components/ai-elements/reasoning";
// Reasoning (re-exported from AI Elements)
export {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
export type { ChatInputProps } from "../types";
export type { ArtifactWrapperProps } from "./artifact-wrapper";
// Artifact Wrapper
export { ArtifactWrapper } from "./artifact-wrapper";
export type { FullChatProps } from "./chat";
// Main Chat component
export { Chat } from "./chat";
export type { ChatContainerProps } from "./chat-container";
// Layout
export { ChatContainer } from "./chat-container";
export type { ChatContextProps, ChatUsage } from "./chat-context";
// Chat Context
export { ChatContext } from "./chat-context";
// Error Boundary
export { ChatErrorBoundary } from "./chat-error-boundary";
// Greeting/Empty state
export { ChatGreeting } from "./chat-greeting";
export type { ChatHeaderProps } from "./chat-header";
export { ChatHeader } from "./chat-header";
// Input components
export { ChatInput } from "./chat-input";
// Messages list
export { ChatMessages, ChatMessagesArea } from "./chat-messages";
export type { ChatProviderProps } from "./chat-provider";
// Provider
export { ChatProvider } from "./chat-provider";
export type {
    DataStreamHandlerProps,
    DataUsageType,
    UseDataStreamHandlerOptions,
} from "./data-stream-handler";
export {
    DataStreamHandler,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    isDataUsagePart,
    useDataStreamHandler,
} from "./data-stream-handler";
export type {
    DataStreamPart,
    DataStreamProviderProps,
} from "./data-stream-provider";
// Data Stream
export { DataStreamProvider, useDataStream } from "./data-stream-provider";
export type {
    AttachmentButtonProps,
    AttachmentPreviewProps,
    AttachmentPreviewsProps,
    StopButtonProps,
    SubmitButtonProps,
} from "./input";
// Input sub-components
export {
    AttachmentButton,
    AttachmentPreview,
    AttachmentPreviews,
    StopButton,
    SubmitButton,
} from "./input";
export type { MarkdownRendererProps } from "./markdown-renderer";
// Markdown Renderer
export { MarkdownRenderer } from "./markdown-renderer";
export type {
    MessageActionsProps,
    MessageAvatarProps,
    MessageContentProps,
    MessageItemProps,
    MessagePartProps,
} from "./message";
// Message components
export {
    MessageActions,
    MessageAvatar,
    MessageContent,
    MessageItem,
    MessagePart,
} from "./message";
export type { MessageEditorProps } from "./message-editor";
// P1 Components
export { MessageEditor } from "./message-editor";
export type { ModelSelectorProps } from "./model-selector";
// Sub-components
export { ModelSelector } from "./model-selector";
export type { NewChatButtonProps } from "./new-chat-button";
export { NewChatButton } from "./new-chat-button";
export type { SuggestedActionsProps } from "./suggested-actions";
export { SuggestedActions } from "./suggested-actions";
export type { VisibilitySelectorProps } from "./visibility-selector";
export { VisibilitySelector } from "./visibility-selector";
