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
	clearArtifactRegistry,
	createArtifactDefinition,
	getAllArtifactDefinitions,
	getArtifactDefinition,
	getRegisteredArtifactKinds,
	isArtifactRegistered,
	registerArtifact,
	unregisterArtifact,
} from "./artifact-class"
