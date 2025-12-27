/**
 * Chat Hooks
 *
 * Exports all chat-related hooks for the chat feature.
 * Uses AI SDK's useChat directly via useChatHelpers.
 *
 * @module features/chat/hooks
 */

// Re-export hooks from the provider
export {
    useChatHelpers,
    useChatMetadata,
    useModelState,
} from "../components/chat-provider";
export type {
    UseChatVisibilityOptions,
    UseChatVisibilityReturn,
} from "./use-chat-visibility";
// Chat visibility hook
export { useChatVisibility } from "./use-chat-visibility";
export type {
    RetryState,
    UseMessageRetryOptions,
    UseMessageRetryReturn,
} from "./use-message-retry";
// Message retry hook
export { useMessageRetry } from "./use-message-retry";
export type { UseMessagesOptions, UseMessagesReturn } from "./use-messages";
// Messages hook
export { useMessages } from "./use-messages";
export type {
    UseModelSelectionOptions,
    UseModelSelectionReturn,
} from "./use-model-selection";
// Model selection hook (extracted from ChatProvider)
export { useModelSelection } from "./use-model-selection";
export type { UseOptimisticChatEffectOptions } from "./use-optimistic-chat-effect";
// Optimistic chat effect hook (extracted from ChatProvider)
export { useOptimisticChatEffect } from "./use-optimistic-chat-effect";
export type { UseRequestAbortReturn } from "./use-request-abort";
// Request abort hook
export {
    combineAbortSignals,
    createTimeoutAbortController,
    useRequestAbort,
} from "./use-request-abort";
export type { UseScrollToBottomReturn } from "./use-scroll-to-bottom";
// Scroll to bottom hook
export { useScrollToBottom } from "./use-scroll-to-bottom";
// Stream error handler hook (extracted from ChatProvider)
export { useStreamErrorHandler } from "./use-stream-error-handler";
