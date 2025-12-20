/**
 * Chat Components
 *
 * Exports all chat-related components for the chat feature.
 *
 * @module features/chat/components
 */

// Main Chat component
export { Chat } from './chat';
export type { FullChatProps } from './chat';

// Error Boundary
export { ChatErrorBoundary } from './chat-error-boundary';

// Provider
export { ChatProvider } from './chat-provider';
export type { ChatProviderProps } from './chat-provider';

// Data Stream
export { DataStreamProvider, useDataStream } from './data-stream-provider';
export type { DataStreamProviderProps, DataStreamPart } from './data-stream-provider';

export {
  DataStreamHandler,
  useDataStreamHandler,
  isDataChatTitlePart,
  isDataUsagePart,
  isDataAppendMessagePart,
} from './data-stream-handler';
export type {
  DataStreamHandlerProps,
  UseDataStreamHandlerOptions,
  DataUsageType,
} from './data-stream-handler';

// Artifact Wrapper
export { ArtifactWrapper } from './artifact-wrapper';
export type { ArtifactWrapperProps } from './artifact-wrapper';

// Layout
export { ChatContainer } from './chat-container';
export type { ChatContainerProps } from './chat-container';

export { ChatHeader } from './chat-header';
export type { ChatHeaderProps } from './chat-header';

// Sub-components
export { ModelSelector } from './model-selector';
export type { ModelSelectorProps } from './model-selector';

export { SidebarToggle } from './sidebar-toggle';
export type { SidebarToggleProps } from './sidebar-toggle';

export { NewChatButton } from './new-chat-button';
export type { NewChatButtonProps } from './new-chat-button';

// Message components
export {
  MessageItem,
  MessageAvatar,
  MessageContent,
  MessagePart,
  MessageActions,
} from './message';
export type {
  MessageItemProps,
  MessageAvatarProps,
  MessageContentProps,
  MessagePartProps,
  MessageActionsProps,
} from './message';

// Messages list
export { ChatMessages, ChatMessagesArea } from './chat-messages';

// Greeting/Empty state
export { ChatGreeting } from './chat-greeting';
export type { ChatGreetingProps } from './chat-greeting';

// Input components
export { ChatInput } from './chat-input';
export type { ChatInputProps } from '../types';

// Input sub-components
export {
  AttachmentButton,
  AttachmentPreviews,
  AttachmentPreview,
  SubmitButton,
  StopButton,
} from './input';
export type {
  AttachmentButtonProps,
  AttachmentPreviewsProps,
  AttachmentPreviewProps,
  SubmitButtonProps,
  StopButtonProps,
} from './input';

// P1 Components
export { MessageEditor } from './message-editor';
export type { MessageEditorProps } from './message-editor';

export { SuggestedActions } from './suggested-actions';
export type { SuggestedActionsProps } from './suggested-actions';

export { VisibilitySelector } from './visibility-selector';
export type { VisibilitySelectorProps } from './visibility-selector';

// Markdown Renderer
export { MarkdownRenderer } from './markdown-renderer';
export type { MarkdownRendererProps } from './markdown-renderer';

// Reasoning
export { Reasoning, ReasoningTrigger, ReasoningContent } from './reasoning';
export type {
  ReasoningProps,
  ReasoningTriggerProps,
  ReasoningContentProps,
} from './reasoning';
