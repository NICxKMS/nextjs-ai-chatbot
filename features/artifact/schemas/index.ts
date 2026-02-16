/**
 * Artifact Schemas Barrel Export
 *
 * Re-exports all Zod validation schemas for artifact operations.
 *
 * @module features/artifact/schemas
 */

// Type Exports
export type {
	AddSuggestionInput,
	ApplySuggestionInput,
	ArtifactIdInput,
	ArtifactKind,
	ArtifactStatus,
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
} from "./artifact.schema"
// Common Schemas
// Creation Schemas
// Update Schemas
// Version Schemas
// Suggestion Schemas
// UI Schemas
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
} from "./artifact.schema"
