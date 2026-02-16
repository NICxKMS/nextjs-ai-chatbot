/**
 * Chat Feature Barrel Export
 *
 * Main entry point for the chat feature module.
 * Re-exports all public APIs from actions, components, hooks, and schemas.
 *
 * @module features/chat
 */

// =============================================================================
// Types
// =============================================================================

export type {
	AppUsage,
	ArtifactKind,
	Attachment,
	ChatMessage,
	CustomUIDataTypes,
	DocumentOutput,
	MessageMetadata,
	StreamingSuggestion,
	SuggestionOutput,
	UserVote,
	WeatherOutput,
} from "./types"

// =============================================================================
// Actions
// =============================================================================

export {
	// Get History
	type ChatWithPreview,
	// Create Chat
	type CreateChatInput as CreateChatActionInput,
	type CreateChatResult,
	createChatAction,
	createChatWithId,
	// Delete Chat
	type DeleteChatActionResult,
	type DeleteChatInput,
	deleteAllChatsAction,
	deleteChatAction,
	type GetChatResult,
	type GetHistoryInput,
	type GetHistoryResult,
	generateTitleAction,
	getChatAction,
	getChatByIdAction,
	getHistoryAction,
	// Save Message
	type MessageToSave,
	prepareStreamContext,
	type SaveMessageInput,
	type SaveMessageResult,
	// Stream Chat
	type StreamChatInput as StreamChatActionInput,
	type StreamChatResult,
	type StreamMessage,
	saveMessageAction,
	saveSingleMessage,
	streamChatAction,
	// Update Title
	type UpdateTitleInput,
	type UpdateTitleResult,
	updateTitleAction,
} from "./actions"

// =============================================================================
// Components
// =============================================================================

export type {
	ArtifactKind as ComponentArtifactKind,
	ArtifactToolbarItem,
	ChatProps,
	DataStreamHandlerProps,
	MessageProps,
	ModelMetadata,
	PureMessageActionsProps,
	ThinkingMessageProps,
	VisibilityType,
} from "./components"
export {
	artifactDefinitions,
	artifactStreamDefinitions,
	// Main Components
	Chat,
	ChatHeader,
	DataStreamHandler,
	Greeting,
	Message,
	MessageActions,
	MessageEditor,
	MessageReasoning,
	Messages,
	PureMessageActions,
	ThinkingMessage,
	Toolbar,
	Tools,
	VisibilitySelector,
} from "./components"

// =============================================================================
// Hooks
// =============================================================================

export {
	// Data Stream
	DataStreamProvider,
	type DataStreamProviderProps,
	type StreamError,
	type StreamStatus,
	type StreamStatusActions,
	type StreamStatusState,
	type UseChatOptions,
	type UseChatReturn,
	type UseMessagesOptions,
	type UseMessagesReturn,
	type UseStreamStatusReturn,
	// Chat Hook
	useChat,
	useDataStream,
	useDataStreamDispatch,
	useDataStreamState,
	// Messages Hook
	useMessages,
	// Scroll Hook
	useScrollToBottom,
	// Stream Status Hook
	useStreamStatus,
} from "./hooks"

// =============================================================================
// Schemas
// =============================================================================

export type {
	CreateChatInput,
	CreateMessageInput,
	MessageRole,
	PaginationInput,
	StreamChatInput,
	UpdateChatInput,
	UpdateMessageInput,
	Visibility,
	VoteMessageInput,
	VoteType,
} from "./schemas"
export {
	ChatIdSchema,
	// Chat Schemas
	CreateChatSchema,
	CreateMessageSchema,
	// Message Schemas
	MessageContentSchema,
	MessageRoleSchema,
	NonEmptyStringSchema,
	// Pagination Schemas
	PaginationSchema,
	// Stream Schemas
	StreamChatSchema,
	UpdateChatSchema,
	UpdateMessageSchema,
	UUIDSchema,
	// Common Schemas
	VisibilitySchema,
	VoteMessageSchema,
	// Vote Schemas
	VoteTypeSchema,
} from "./schemas"
