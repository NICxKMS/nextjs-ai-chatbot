/**
 * Artifact Domain Types
 * @module lib/types/domain/artifact
 *
 * Type definitions for artifact-related entities.
 */

// =============================================================================
// ARTIFACT KIND
// =============================================================================

/**
 * Supported artifact types
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet";

/**
 * Artifact kind metadata
 */
export type ArtifactKindInfo = {
    /** Kind identifier */
    kind: ArtifactKind;
    /** Human-readable label */
    label: string;
    /** Description of the artifact type */
    description: string;
    /** Associated MIME type */
    mimeType: string;
};

// =============================================================================
// ARTIFACT STATUS
// =============================================================================

/**
 * Artifact streaming/processing status
 */
export type ArtifactStatus = "idle" | "streaming" | "error";

// =============================================================================
// ARTIFACT
// =============================================================================

/**
 * Core artifact entity
 */
export type Artifact = {
    /** Unique artifact identifier (UUID) */
    id: string;
    /** Artifact title */
    title: string;
    /** Artifact content */
    content: string;
    /** Artifact type */
    kind: ArtifactKind;
    /** Current status */
    status: ArtifactStatus;
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
};

/**
 * Artifact version for history tracking
 */
export type ArtifactVersion = {
    /** Artifact ID */
    artifactId: string;
    /** Version number (1-indexed) */
    versionNumber: number;
    /** Content at this version */
    content: string;
    /** Version timestamp */
    createdAt: Date;
};

/**
 * Artifact with version history
 */
export type ArtifactWithVersions = Artifact & {
    /** Version history */
    versions: ArtifactVersion[];
    /** Current version index */
    currentVersionIndex: number;
    /** Total version count */
    totalVersions: number;
};

// =============================================================================
// UI ARTIFACT
// =============================================================================

/**
 * Bounding box for artifact positioning
 */
export type BoundingBox = {
    top: number;
    left: number;
    width: number;
    height: number;
};

/**
 * UI state for an artifact in the panel
 */
export type UIArtifact = {
    /** Document ID reference */
    documentId: string;
    /** Current content */
    content: string;
    /** Artifact kind */
    kind: ArtifactKind;
    /** Display title */
    title: string;
    /** Current status */
    status: ArtifactStatus;
    /** Visibility flag */
    isVisible: boolean;
    /** Position and size */
    boundingBox: BoundingBox;
};

// =============================================================================
// ARTIFACT KIND REGISTRY
// =============================================================================

/**
 * Registry of artifact kinds with metadata
 */
export const ARTIFACT_KINDS: Record<ArtifactKind, ArtifactKindInfo> = {
    text: {
        kind: "text",
        label: "Text Document",
        description: "Rich text documents with markdown support",
        mimeType: "text/markdown",
    },
    code: {
        kind: "code",
        label: "Code Snippet",
        description: "Executable Python code with console output",
        mimeType: "text/x-python",
    },
    sheet: {
        kind: "sheet",
        label: "Spreadsheet",
        description: "CSV-based spreadsheet data",
        mimeType: "text/csv",
    },
    image: {
        kind: "image",
        label: "Image",
        description: "Generated or uploaded images",
        mimeType: "image/png",
    },
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a string is a valid artifact kind
 */
export function isArtifactKind(value: string): value is ArtifactKind {
    return value in ARTIFACT_KINDS;
}
