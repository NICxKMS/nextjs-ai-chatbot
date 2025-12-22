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
