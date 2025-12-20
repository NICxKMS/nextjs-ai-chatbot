/**
 * Chat Hooks
 *
 * Exports all chat-related hooks for the chat feature.
 * Uses AI SDK's useChat directly via useChatHelpers.
 *
 * @module features/chat/hooks
 */

// Re-export hooks from the provider
export { useChatHelpers, useModelState, useChatMetadata } from '../components/chat-provider';
