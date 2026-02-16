/**
 * Artifact Actions Barrel Export
 *
 * Re-exports all artifact server actions for clean imports.
 *
 * @module features/artifact/actions
 */

// Core CRUD Actions
export {
	type CreateArtifactParams,
	createArtifact,
} from "./create-artifact.action"
export { deleteArtifact } from "./delete-artifact.action"
export {
	type ArtifactWithSuggestions,
	getArtifact,
	getArtifactsByChat,
	getArtifactWithSuggestions,
} from "./get-artifact.action"
// Suggestions
export {
	type AddSuggestionParams,
	addSuggestion,
	applySuggestion,
	getSuggestions,
	rejectSuggestion,
} from "./suggestions"
export {
	type UpdateArtifactParams,
	updateArtifact,
} from "./update-artifact.action"
// Version Management
export {
	getArtifactVersion,
	getVersionHistory,
	rollbackToVersion,
	type VersionInfo,
} from "./versions"
