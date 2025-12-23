/**
 * Artifact Type Definitions
 *
 * Shared types for artifacts used across lib/ and features/ layers.
 * Placed in lib/types/ to prevent circular dependencies.
 *
 * @module lib/types/artifacts
 */

/**
 * Supported artifact types in the application.
 * Each kind has its own rendering, editing, and streaming behavior.
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet";
