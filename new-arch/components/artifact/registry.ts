"use client";

import type { ArtifactDefinition, ArtifactKind } from "./types";

// ============================================================================
// Artifact Registry - Centralized registration for extensibility
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArtifactLoader = () => Promise<ArtifactDefinition<ArtifactKind, any>>;

const artifactRegistry = new Map<ArtifactKind, ArtifactLoader>();

/**
 * Register an artifact type with lazy loading
 * @param kind - The artifact kind (code, text, image, sheet)
 * @param loader - Async function that imports the artifact definition
 */
export function registerArtifact(
    kind: ArtifactKind,
    loader: ArtifactLoader
): void {
    if (artifactRegistry.has(kind)) {
        console.warn(
            `Artifact kind "${kind}" is already registered. Overwriting.`
        );
    }
    artifactRegistry.set(kind, loader);
}

/**
 * Get an artifact definition by kind (lazy-loaded)
 * Falls back to text artifact if kind not found
 */
export async function getArtifactDefinition(
    kind: ArtifactKind
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ArtifactDefinition<ArtifactKind, any>> {
    const loader = artifactRegistry.get(kind);

    if (!loader) {
        console.warn(
            `Artifact kind "${kind}" not found. Falling back to text.`
        );
        const textLoader = artifactRegistry.get("text");
        if (!textLoader) {
            throw new Error(
                "Text artifact not registered. Cannot provide fallback."
            );
        }
        return await textLoader();
    }

    return await loader();
}

/**
 * Check if an artifact kind is registered
 */
export function isArtifactRegistered(kind: string): kind is ArtifactKind {
    return artifactRegistry.has(kind as ArtifactKind);
}

/**
 * Get all registered artifact kinds
 */
export function getRegisteredArtifactKinds(): ArtifactKind[] {
    return Array.from(artifactRegistry.keys());
}

// ============================================================================
// Built-in Artifact Registrations (Lazy-loaded)
// ============================================================================

registerArtifact("code", () =>
    import("./editors/code-editor").then((m) => m.codeArtifact)
);

registerArtifact("text", () =>
    import("./editors/text-editor").then((m) => m.textArtifact)
);

registerArtifact("image", () =>
    import("./editors/image-editor").then((m) => m.imageArtifact)
);

registerArtifact("sheet", () =>
    import("./editors/sheet-editor").then((m) => m.sheetArtifact)
);
