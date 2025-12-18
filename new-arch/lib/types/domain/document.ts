/**
 * Document Domain Types
 * @module lib/types/domain/document
 *
 * Type definitions for document-related entities.
 */

// =============================================================================
// DOCUMENT KIND
// =============================================================================

/**
 * Supported document types
 */
export type DocumentKind = "text" | "code" | "image" | "sheet";

// =============================================================================
// DOCUMENT
// =============================================================================

/**
 * Core document entity
 */
export type Document = {
    /** Unique document identifier (UUID) */
    id: string;
    /** Document title */
    title: string;
    /** Document content */
    content: string | null;
    /** Document type */
    kind: DocumentKind;
    /** Owner user ID */
    userId: string;
    /** Associated chat ID */
    chatId: string;
    /** Creation timestamp (also used for versioning) */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
};

/**
 * Document version for history tracking
 */
export type DocumentVersion = {
    /** Document ID */
    documentId: string;
    /** Version timestamp */
    createdAt: Date;
    /** Content at this version */
    content: string | null;
    /** Title at this version */
    title: string;
};

/**
 * Document with version history
 */
export type DocumentWithVersions = Document & {
    /** Version history */
    versions: DocumentVersion[];
    /** Current version index */
    currentVersionIndex: number;
};

/**
 * Document metadata (without content)
 */
export type DocumentMetadata = Omit<Document, "content">;

// =============================================================================
// DOCUMENT INPUT
// =============================================================================

/**
 * Input for creating a new document
 */
export type CreateDocumentInput = {
    id?: string;
    title: string;
    content?: string;
    kind: DocumentKind;
    userId: string;
    chatId: string;
};

/**
 * Input for updating a document
 */
export type UpdateDocumentInput = {
    id: string;
    title?: string;
    content?: string;
};
