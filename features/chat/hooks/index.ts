/**
 * Chat Hooks Barrel Export
 *
 * Re-exports all chat hooks for clean imports.
 *
 * @module features/chat/hooks
 */

// Main Chat Hook
export { type UseChatOptions, type UseChatReturn, useChat } from "./use-chat"
// Data Stream Context
export {
	DataStreamProvider,
	type DataStreamProviderProps,
	useDataStream,
	useDataStreamDispatch,
	useDataStreamState,
} from "./use-data-stream"

// Messages Hook
export {
	type UseMessagesOptions,
	type UseMessagesReturn,
	useMessages,
} from "./use-messages"

// Scroll to Bottom Hook
export { useScrollToBottom } from "./use-scroll-to-bottom"

// Stream Status Hook
export {
	type StreamError,
	type StreamStatus,
	type StreamStatusActions,
	type StreamStatusState,
	type UseStreamStatusReturn,
	useStreamStatus,
} from "./use-stream-status"
