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
    useModelState,
    useChatMetadata,
} from "../components/chat-provider";

// Chat visibility hook
export { useChatVisibility } from "./use-chat-visibility";
export type {
    UseChatVisibilityOptions,
    UseChatVisibilityReturn,
} from "./use-chat-visibility";

// Scroll to bottom hook
export { useScrollToBottom } from "./use-scroll-to-bottom";
export type { UseScrollToBottomReturn } from "./use-scroll-to-bottom";

// Messages hook
export { useMessages } from "./use-messages";
export type { UseMessagesOptions, UseMessagesReturn } from "./use-messages";
