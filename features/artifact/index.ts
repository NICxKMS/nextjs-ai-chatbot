/**
 * Artifact Feature Barrel Export
 *
 * Main entry point for the artifact feature module.
 * Re-exports all public APIs from actions, components, hooks, and types.
 *
 * @module features/artifact
 */

// Actions
export {
	type AddSuggestionParams,
	type ArtifactWithSuggestions,
	addSuggestion,
	applySuggestion,
	type CreateArtifactParams,
	createArtifact,
	deleteArtifact,
	getArtifact,
	getArtifactsByChat,
	getArtifactVersion,
	getArtifactWithSuggestions,
	getSuggestions,
	getVersionHistory,
	rejectSuggestion,
	rollbackToVersion,
	type UpdateArtifactParams,
	updateArtifact,
	type VersionInfo,
} from "./actions"

// Components
export {
	ArtifactActions,
	type ArtifactActionsProps,
	ArtifactClose,
	type ArtifactCloseProps,
	ArtifactErrorBoundary,
	type ArtifactErrorBoundaryProps,
	ArtifactPanel,
	type ArtifactPanelProps,
} from "./components"

// Hooks
export {
	initialArtifactData,
	useArtifact,
	useArtifactSelector,
} from "./hooks"
// Schema Types
export type {
	AddSuggestionInput,
	ApplySuggestionInput,
	ArtifactIdInput,
	ArtifactKind as ArtifactKindInput,
	ArtifactStatus as ArtifactStatusInput,
	BoundingBoxInput,
	ChatIdParamInput,
	CreateArtifactInput,
	RejectSuggestionInput,
	SuggestionInput,
	UIArtifactInput,
	UpdateArtifactInput,
	UpdateArtifactWithIdInput,
	VersionIndexInput,
	VersionInfoInput,
	VersionTimestampInput,
} from "./schemas"

// Schemas
export {
	AddSuggestionSchema,
	ApplySuggestionSchema,
	ArtifactContentSchema,
	ArtifactIdSchema,
	ArtifactKindSchema,
	ArtifactNonEmptyStringSchema,
	ArtifactStatusSchema,
	ArtifactTitleSchema,
	ArtifactUUIDSchema,
	BoundingBoxSchema,
	ChatIdParamSchema,
	CreateArtifactSchema,
	RejectSuggestionSchema,
	SuggestionSchema,
	UIArtifactSchema,
	UpdateArtifactSchema,
	UpdateArtifactWithIdSchema,
	VersionIndexSchema,
	VersionInfoSchema,
	VersionTimestampSchema,
} from "./schemas"
// Types
export type {
	ArtifactAction,
	ArtifactActionContext,
	ArtifactBoundingBox,
	ArtifactContentProps,
	ArtifactDefinition,
	ArtifactKind,
	ArtifactMetadata,
	ArtifactStatus,
	UIArtifact,
} from "./types"
