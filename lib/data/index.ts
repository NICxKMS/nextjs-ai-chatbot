/**
 * Data Layer Index
 *
 * Barrel export for the entire data layer including repositories,
 * services, queries, and shared types.
 *
 * @module lib/data
 */

// =============================================================================
// Repositories
// =============================================================================

export {
	type ArtifactFindOptions,
	ArtifactRepository,
	type ArtifactVersion,
	artifactRepository,
	type SaveVersionParams,
} from "./repositories/artifact.repository"
export {
	BaseRepository,
	type CountOptions,
	type FindManyOptions,
	type Identifiable,
	type IReadRepository,
	type IWriteRepository,
	type RepositoryContext,
	type RepositoryResult,
} from "./repositories/base.repository"
export {
	type ChatFindOptions,
	ChatRepository,
	type ChatWithMessages,
	chatRepository,
	type PaginatedResult,
	type PaginationParams,
} from "./repositories/chat.repository"
export {
	type MessageFindOptions,
	MessageRepository,
	messageRepository,
	type SaveWithContextParams,
} from "./repositories/message.repository"
export {
	type SuggestionFindOptions,
	SuggestionRepository,
	suggestionRepository,
} from "./repositories/suggestion.repository"
export {
	type UpdateUser,
	UserRepository,
	type UserWithPassword,
	userRepository,
} from "./repositories/user.repository"
export {
	type UpsertVoteParams,
	type VoteFindOptions,
	VoteRepository,
	voteRepository,
} from "./repositories/vote.repository"

// =============================================================================
// Services
// =============================================================================

export {
	type AddSuggestionParams,
	type ArtifactWithSuggestions,
	artifactService,
	type CreateArtifactParams,
	type UpdateArtifactParams,
} from "./services/artifact.service"
export {
	type AuthCredentials,
	type AuthResult,
	authService,
	type RegisterParams,
	type SafeUser,
} from "./services/auth.service"
export {
	type ChatWithMessages as ServiceChatWithMessages,
	chatService,
	type DeleteChatResult,
	type SaveChatParams,
} from "./services/chat.service"

// =============================================================================
// Queries
// =============================================================================

export type {
	ChatSearchResult,
	ChatStats,
	ChatWithLatestMessage,
	ChatWithMessageCount,
	ChatWithMessagesAndArtifacts,
} from "./queries/chat.queries"
export {
	chatQueries,
	getChatStats,
	getChatsWithinDateRange,
	getChatsWithMessageCount,
	getChatWithLatestMessage,
	getChatWithMessagesAndArtifacts,
	searchChats,
} from "./queries/chat.queries"
export type { UserStats, UserWithChats } from "./queries/user.queries"
export {
	getUserStats,
	getUserWithChats,
	userQueries,
} from "./queries/user.queries"

// =============================================================================
// Types
// =============================================================================

export type {
	Artifact,
	Chat,
	DeleteResult,
	Message,
	NewArtifact,
	NewChat,
	NewMessage,
	NewSuggestion,
	NewUser,
	NewVote,
	OperationResult,
	PaginatedResult as TypesPaginatedResult,
	PaginationParams as TypesPaginationParams,
	RepositoryContext as TypesRepositoryContext,
	ServiceContext,
	Suggestion,
	UpdateArtifact,
	UpdateChat,
	UpdateMessage,
	UpdateSuggestion,
	User,
	Vote,
} from "./types"
