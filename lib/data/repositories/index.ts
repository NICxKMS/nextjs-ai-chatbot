/**
 * Repository Index
 *
 * Barrel export for all repository classes and interfaces.
 *
 * @module lib/data/repositories
 */

// Artifact repository
export {
	type ArtifactFindOptions,
	ArtifactRepository,
	type ArtifactVersion,
	artifactRepository,
	type SaveVersionParams,
} from "./artifact.repository"
// Base repository and interfaces
export {
	BaseRepository,
	type CountOptions,
	type FindManyOptions,
	type Identifiable,
	type IReadRepository,
	type IWriteRepository,
	type RepositoryContext,
	type RepositoryResult,
} from "./base.repository"
// Chat repository
export {
	type ChatFindOptions,
	ChatRepository,
	type ChatWithMessages,
	chatRepository,
	type PaginatedResult,
	type PaginationParams,
} from "./chat.repository"
// Message repository
export {
	type MessageFindOptions,
	MessageRepository,
	messageRepository,
	type SaveWithContextParams,
} from "./message.repository"
// Suggestion repository
export {
	type SuggestionFindOptions,
	SuggestionRepository,
	suggestionRepository,
} from "./suggestion.repository"
// User repository
export {
	type UpdateUser,
	UserRepository,
	type UserWithPassword,
	userRepository,
} from "./user.repository"
// Vote repository
export {
	type UpsertVoteParams,
	type VoteFindOptions,
	VoteRepository,
	voteRepository,
} from "./vote.repository"
