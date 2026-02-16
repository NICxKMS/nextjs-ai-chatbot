/**
 * Services Index
 *
 * Barrel export for all service modules.
 * Services orchestrate operations across multiple repositories
 * and provide high-level business logic.
 *
 * @module lib/data/services
 */

// Artifact service
export {
	type AddSuggestionParams,
	type ArtifactWithSuggestions,
	artifactService,
	type CreateArtifactParams,
	type UpdateArtifactParams,
} from "./artifact.service"

// Auth service
export {
	type AuthCredentials,
	type AuthResult,
	authService,
	type RegisterParams,
	type SafeUser,
} from "./auth.service"

// Chat service
export {
	type ChatWithMessages,
	chatService,
	type DeleteChatResult,
	type SaveChatParams,
} from "./chat.service"
