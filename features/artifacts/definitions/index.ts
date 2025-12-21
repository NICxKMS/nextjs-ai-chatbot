/**
 * Artifact Definitions - Public API
 * @module features/artifacts/definitions
 */

import type { ArtifactDefinition, ArtifactKind } from "../types";
import { textArtifact } from "./text";
import { codeArtifact } from "./code";
import { imageArtifact } from "./image";
import { sheetArtifact } from "./sheet";

// Re-export base utilities
export { Artifact, artifactRegistry, isArtifactDefinition } from "./base";

// Re-export individual artifact definitions
export { textArtifact } from "./text";
export { codeArtifact } from "./code";
export { imageArtifact } from "./image";
export { sheetArtifact } from "./sheet";

/**
 * Map of all artifact definitions by kind.
 * Use this for looking up artifact definitions at runtime.
 *
 * Note: Type assertion is used because each artifact has its own metadata type,
 * but the map needs a common interface for runtime lookup.
 */
export const artifactDefinitions = {
    text: textArtifact,
    code: codeArtifact,
    image: imageArtifact,
    sheet: sheetArtifact,
} as Record<ArtifactKind, ArtifactDefinition>;

/**
 * Get an artifact definition by kind.
 * @param kind - The artifact kind to look up
 * @returns The artifact definition or undefined if not found
 */
export function getArtifactDefinition<TKind extends ArtifactKind>(
    kind: TKind
): ArtifactDefinition<TKind> | undefined {
    return artifactDefinitions[kind] as ArtifactDefinition<TKind> | undefined;
}

/**
 * Array of all registered artifact kinds.
 */
export const artifactKinds: ArtifactKind[] = ["text", "code", "image", "sheet"];
