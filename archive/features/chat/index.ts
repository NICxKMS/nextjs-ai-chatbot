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
    useDataStream,
    useDataStreamHandler,
} from "./components";

// =============================================================================
// HOOK EXPORTS
// =============================================================================

// Utility hooks
export type {
    RetryState,
    UseChatVisibilityOptions,
    UseChatVisibilityReturn,
    UseMessageRetryOptions,
    UseMessageRetryReturn,
    UseMessagesOptions,
    UseMessagesReturn,
    UseRequestAbortReturn,
    UseScrollToBottomReturn,
} from "./hooks";
// Core chat hooks
export {
    combineAbortSignals,
    createTimeoutAbortController,
    useChatHelpers,
    useChatMetadata,
    useChatVisibility,
    useMessageRetry,
    useMessages,
    useModelState,
    useRequestAbort,
    useScrollToBottom,
} from "./hooks";

// =============================================================================
// ACTION EXPORTS
// =============================================================================

export type { VoteInput, VoteResult } from "./actions";
export { removeVote, voteOnMessage } from "./actions";

// =============================================================================
// SERVICE EXPORTS
// =============================================================================

export type { IModelPersistence, IModelService } from "./services";
export {
    createModelService,
    defaultModelService,
    getDefaultModelId,
    getModels,
} from "./services";
