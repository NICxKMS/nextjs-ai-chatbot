/**
 * Chat Feature Module
 *
 * Exports all chat-related types, components, and utilities.
 *
 * @module features/chat
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
    // AI SDK re-exports
    UIMessage,
    ChatRequestOptions,
    ChatMessage,
    // Status & Helpers
    ChatStatus,
    ChatHelpers,
    // Attachment & Message
    Attachment,
    CreateMessage,
    // Message parts
    TextPart,
    ToolCallPart,
    ToolResultPart,
    ReasoningPart,
    SourcePart,
    MessagePart,
    // Model types
    ModelCapabilities,
    ModelMetadata,
    ModelState,
    // Vote types
    VoteType,
    MessageVote,
    // Component props
    ChatProps,
    ChatMessagesProps,
    MessageItemProps,
    ChatInputProps,
    // Server action types
    GenerateTitleParams,
    DeleteMessagesParams,
    UpdateVisibilityParams,
    // Visibility
    VisibilityType,
} from "./types";

// =============================================================================
// COMPONENT EXPORTS
// =============================================================================

// Main Chat component (primary export)
export { Chat } from "./components";
export type { FullChatProps } from "./components";

// Error Boundary
export { ChatErrorBoundary } from "./components";

export { ChatProvider } from "./components";
export type { ChatProviderProps } from "./components";

export { DataStreamProvider, useDataStream } from "./components";
export type { DataStreamProviderProps, DataStreamPart } from "./components";

export {
    DataStreamHandler,
    useDataStreamHandler,
    isDataChatTitlePart,
    isDataUsagePart,
    isDataAppendMessagePart,
} from "./components";
export type {
    DataStreamHandlerProps,
    UseDataStreamHandlerOptions,
    DataUsageType,
} from "./components";

export { ChatContainer } from "./components";
export type { ChatContainerProps } from "./components";

export { ChatHeader } from "./components";
export type { ChatHeaderProps } from "./components";

export { ModelSelector } from "./components";
export type { ModelSelectorProps } from "./components";

export { SidebarToggle } from "./components";
export type { SidebarToggleProps } from "./components";

export { NewChatButton } from "./components";
export type { NewChatButtonProps } from "./components";

// =============================================================================
// HOOK EXPORTS
// =============================================================================

export { useChatHelpers, useModelState, useChatMetadata } from "./hooks";

// =============================================================================
// ACTION EXPORTS
// =============================================================================

export { voteOnMessage, removeVote } from "./actions";
export type { VoteInput, VoteResult } from "./actions";
