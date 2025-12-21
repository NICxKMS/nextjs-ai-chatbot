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
    // Attachment & Message
    Attachment,
    ChatHelpers,
    ChatInputProps,
    ChatMessage,
    ChatMessagesProps,
    // Component props
    ChatProps,
    ChatRequestOptions,
    // Status & Helpers
    ChatStatus,
    CreateMessage,
    DeleteMessagesParams,
    // Server action types
    GenerateTitleParams,
    MessageItemProps,
    MessagePart,
    MessageVote,
    // Model types
    ModelCapabilities,
    ModelMetadata,
    ModelState,
    ReasoningPart,
    SourcePart,
    // Message parts
    TextPart,
    ToolCallPart,
    ToolResultPart,
    // AI SDK re-exports
    UIMessage,
    UpdateVisibilityParams,
    // Visibility
    VisibilityType,
    // Vote types
    VoteType,
} from "./types";

// =============================================================================
// COMPONENT EXPORTS
// =============================================================================

export type {
    ChatContainerProps,
    ChatHeaderProps,
    ChatProviderProps,
    DataStreamHandlerProps,
    DataStreamPart,
    DataStreamProviderProps,
    DataUsageType,
    FullChatProps,
    ModelSelectorProps,
    NewChatButtonProps,
    SidebarToggleProps,
    UseDataStreamHandlerOptions,
} from "./components";
// Main Chat component (primary export)
// Error Boundary
export {
    Chat,
    ChatContainer,
    ChatErrorBoundary,
    ChatHeader,
    ChatProvider,
    DataStreamHandler,
    DataStreamProvider,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    isDataUsagePart,
    ModelSelector,
    NewChatButton,
    SidebarToggle,
    useDataStream,
    useDataStreamHandler,
} from "./components";

// =============================================================================
// HOOK EXPORTS
// =============================================================================

export { useChatHelpers, useChatMetadata, useModelState } from "./hooks";

// =============================================================================
// ACTION EXPORTS
// =============================================================================

export type { VoteInput, VoteResult } from "./actions";
export { removeVote, voteOnMessage } from "./actions";
