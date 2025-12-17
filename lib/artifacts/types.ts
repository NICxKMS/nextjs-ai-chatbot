// lib/artifacts/types.ts
// Type-only file - NO runtime imports to prevent bundle bloat

/**
 * The kind of artifact that can be created.
 * Extracted to prevent type imports from pulling runtime code.
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet";
