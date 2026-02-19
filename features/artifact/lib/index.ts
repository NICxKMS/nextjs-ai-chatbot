/**
 * Artifact Lib Barrel Export
 *
 * Re-exports artifact class and registration utilities.
 *
 * @module features/artifact/lib
 */

export {
	Artifact,
	type ArtifactConfig,
	artifactKinds,
	clearArtifactRegistry,
	createArtifactDefinition,
	getAllArtifactDefinitions,
	getArtifactDefinition,
	getArtifactIcon,
	getRegisteredArtifactKinds,
	isArtifactRegistered,
	isBuiltInArtifactKind,
	registerArtifact,
	unregisterArtifact,
} from "./artifact-class"
