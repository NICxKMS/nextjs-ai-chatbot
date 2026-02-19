/**
 * Chat Actions Barrel Export
 *
 * Re-exports all chat server actions for clean imports.
 *
 * @module features/chat/actions
 */

// Create Chat
export {
	type CreateChatInput,
	type CreateChatResult,
	createChatAction,
	createChatWithId,
} from "./create-chat.action"
// Delete Chat
export {
	type DeleteChatActionResult,
	type DeleteChatInput,
	deleteAllChatsAction,
	deleteChatAction,
} from "./delete-chat.action"
// Delete Trailing Messages
export {
	type DeleteTrailingMessagesInput,
	type DeleteTrailingMessagesResult,
	deleteTrailingMessages,
	deleteTrailingMessagesAction,
} from "./delete-trailing-messages.action"
// Get History
export {
	type ChatWithPreview,
	type GetChatResult,
	type GetHistoryInput,
	type GetHistoryResult,
	getChatAction,
	getChatByIdAction,
	getHistoryAction,
} from "./get-history.action"
// Save Message
export {
	type MessageToSave,
	type SaveMessageInput,
	type SaveMessageResult,
	saveMessageAction,
	saveSingleMessage,
} from "./save-message.action"
// Stream Chat
export {
	type MessagePart,
	prepareStreamContext,
	type StreamChatInput,
	type StreamChatResult,
	type StreamMessage,
	streamChatAction,
} from "./stream-chat.action"
// Update Title
export {
	generateTitleAction,
	type UpdateTitleInput,
	type UpdateTitleResult,
	updateTitleAction,
} from "./update-title.action"
// Update Visibility
export {
	type UpdateVisibilityInput,
	type UpdateVisibilityResult,
	updateChatVisibility,
	updateVisibilityAction,
	type VisibilityType,
} from "./update-visibility.action"
