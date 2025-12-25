/**
 * Document Service
 *
 * Business logic layer for document/artifact operations. Provides a clean
 * abstraction over the data layer with validation, authorization, and
 * business rules.
 *
 * @module lib/services/document-service
 */
import "server-only";

import { isFeatureEnabled } from "@/lib/config/app-config";
import {
    DEFAULT_MAX_DOCUMENT_SIZE_BYTES,
    MAX_CODE_DOCUMENT_SIZE_BYTES,
    MAX_IMAGE_DOCUMENT_SIZE_BYTES,
    MAX_SHEET_DOCUMENT_SIZE_BYTES,
    MAX_TEXT_DOCUMENT_SIZE_BYTES,
} from "@/lib/config/security-constants";
import {
    appendVersionCached,
    createDocumentCached,
    deleteDocumentCached,
    deleteVersionsAfterTimestampCached,
    getAllVersionsCached,
    getDocumentCached,
    getLatestVersionCached,
    getSuggestionsCached,
} from "@/lib/data/cached";
import type { DataContext } from "@/lib/data/types";
import type { Document, Suggestion } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import type { ArtifactKind } from "@/lib/types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Document creation parameters
 */
export interface CreateDocumentParams {
    /** Document ID */
    id: string;
    /** Associated chat ID */
    chatId: string;
    /** Document title */
    title: string;
    /** Document kind/type */
    kind: ArtifactKind;
    /** Document content */
    content: string;
}

/**
 * Document version parameters
 */
export interface AppendVersionParams {
    /** Document ID */
    id: string;
    /** Updated title (optional) */
    title?: string;
    /** Updated content */
    content: string;
}

/**
 * Document with metadata
 */
export interface DocumentWithMeta extends Document {
    /** Total number of versions */
    versionCount?: number;
    /** Whether this is the latest version */
    isLatest?: boolean;
}

/**
 * Document service result
 */
export type DocumentServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code: string };

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate document title
 */
function validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
        return { valid: false, error: "Title is required" };
    }
    if (title.length > 255) {
        return { valid: false, error: "Title exceeds maximum length of 255" };
    }
    return { valid: true };
}

/**
 * Validate document content
 */
function validateContent(
    content: string,
    kind: ArtifactKind
): { valid: boolean; error?: string } {
    // Basic validation - can be extended per kind
    if (content === undefined || content === null) {
        return { valid: false, error: "Content is required" };
    }

    // Kind-specific validation could be added here
    const maxSize = getMaxContentSize(kind);
    if (content.length > maxSize) {
        return {
            valid: false,
            error: `Content exceeds maximum size of ${maxSize} bytes`,
        };
    }

    return { valid: true };
}

/**
 * Get maximum content size based on document kind
 * P3-036: Uses centralized security constants
 */
function getMaxContentSize(kind: ArtifactKind): number {
    const sizes: Record<ArtifactKind, number> = {
        text: MAX_TEXT_DOCUMENT_SIZE_BYTES,
        code: MAX_CODE_DOCUMENT_SIZE_BYTES,
        image: MAX_IMAGE_DOCUMENT_SIZE_BYTES,
        sheet: MAX_SHEET_DOCUMENT_SIZE_BYTES,
    };
    return sizes[kind] ?? DEFAULT_MAX_DOCUMENT_SIZE_BYTES;
}

// =============================================================================
// DOCUMENT SERVICE
// =============================================================================

/**
 * Document Service
 *
 * Provides business logic for document operations with proper validation,
 * authorization, and error handling.
 */
export const DocumentService = {
    /**
     * Create a new document
     *
     * @param params - Document creation parameters
     * @param ctx - Data context with user info
     * @returns Created document or error
     */
    async create(
        params: CreateDocumentParams,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document>> {
        try {
            if (!isFeatureEnabled("documentArtifacts")) {
                return {
                    success: false,
                    error: "Document artifacts are disabled",
                    code: "feature:disabled",
                };
            }

            // Validate title
            const titleValidation = validateTitle(params.title);
            if (!titleValidation.valid) {
                return {
                    success: false,
                    error: titleValidation.error!,
                    code: "validation:invalid_title",
                };
            }

            // Validate content
            const contentValidation = validateContent(
                params.content,
                params.kind
            );
            if (!contentValidation.valid) {
                return {
                    success: false,
                    error: contentValidation.error!,
                    code: "validation:invalid_content",
                };
            }

            const document = await createDocumentCached(
                {
                    id: params.id,
                    chatId: params.chatId,
                    title: params.title.trim(),
                    kind: params.kind,
                    content: params.content,
                },
                ctx
            );

            return { success: true, data: document };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to create document",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get a document by ID
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns Document or null if not found
     */
    async get(
        documentId: string,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document | null>> {
        try {
            const document = await getDocumentCached(documentId, ctx);
            return { success: true, data: document };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get document",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get the latest version of a document
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns Latest document version or null
     */
    async getLatest(
        documentId: string,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document | null>> {
        try {
            const document = await getLatestVersionCached(documentId, ctx);
            return { success: true, data: document };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get latest document version",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get all versions of a document
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns All document versions
     */
    async getAllVersions(
        documentId: string,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document[]>> {
        try {
            const documents = await getAllVersionsCached(documentId, ctx);
            return { success: true, data: documents };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get document versions",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Append a new version to a document
     *
     * @param params - Version parameters
     * @param ctx - Data context with user info
     * @returns New document version or error
     */
    async appendVersion(
        params: AppendVersionParams,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document>> {
        try {
            // Get existing document to validate and get metadata
            const existing = await getLatestVersionCached(params.id, ctx);
            if (!existing) {
                return {
                    success: false,
                    error: "Document not found",
                    code: "not_found:document",
                };
            }

            // Validate title if provided
            if (params.title !== undefined) {
                const titleValidation = validateTitle(params.title);
                if (!titleValidation.valid) {
                    return {
                        success: false,
                        error: titleValidation.error!,
                        code: "validation:invalid_title",
                    };
                }
            }

            // Validate content
            const contentValidation = validateContent(
                params.content,
                existing.kind as ArtifactKind
            );
            if (!contentValidation.valid) {
                return {
                    success: false,
                    error: contentValidation.error!,
                    code: "validation:invalid_content",
                };
            }

            const document = await appendVersionCached(
                {
                    id: params.id,
                    chatId: existing.chatId ?? "",
                    title: params.title?.trim() ?? existing.title,
                    kind: existing.kind as ArtifactKind,
                    content: params.content,
                },
                ctx
            );

            return { success: true, data: document };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to append document version",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Delete a document and all its versions
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns Success or error
     */
    async delete(
        documentId: string,
        ctx: DataContext
    ): Promise<DocumentServiceResult<void>> {
        try {
            await deleteDocumentCached(documentId, ctx);
            return { success: true, data: undefined };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to delete document",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Delete document versions after a specific timestamp
     *
     * @param documentId - Document ID
     * @param timestamp - Delete versions created after this timestamp
     * @param ctx - Data context with user info
     * @returns Deleted documents or error
     */
    async deleteVersionsAfterTimestamp(
        documentId: string,
        timestamp: Date,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Document[]>> {
        try {
            // Verify document exists and user has access
            const existing = await getDocumentCached(documentId, ctx);
            if (!existing) {
                return {
                    success: false,
                    error: "Document not found",
                    code: "not_found:document",
                };
            }

            // Validate timestamp
            if (Number.isNaN(timestamp.getTime())) {
                return {
                    success: false,
                    error: "Invalid timestamp",
                    code: "validation:invalid_timestamp",
                };
            }

            const deleted = await deleteVersionsAfterTimestampCached(
                documentId,
                timestamp,
                ctx
            );

            return { success: true, data: deleted };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to delete document versions",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Get suggestions for a document
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns Suggestions for the document
     */
    async getSuggestions(
        documentId: string,
        ctx: DataContext
    ): Promise<DocumentServiceResult<Suggestion[]>> {
        try {
            if (!isFeatureEnabled("suggestions")) {
                return { success: true, data: [] };
            }

            const suggestions = await getSuggestionsCached(documentId, ctx);
            return { success: true, data: suggestions };
        } catch (error) {
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                    code: error.code,
                };
            }
            return {
                success: false,
                error: "Failed to get suggestions",
                code: "internal:unknown",
            };
        }
    },

    /**
     * Verify document ownership
     *
     * @param documentId - Document ID
     * @param ctx - Data context with user info
     * @returns Whether the user owns the document
     */
    async verifyOwnership(
        documentId: string,
        ctx: DataContext
    ): Promise<boolean> {
        try {
            const document = await getDocumentCached(documentId, ctx);
            return document !== null && document.userId === ctx.userId;
        } catch {
            return false;
        }
    },

    /**
     * Get document kind label for display
     *
     * @param kind - Document kind
     * @returns Human-readable label
     */
    getKindLabel(kind: ArtifactKind): string {
        const labels: Record<ArtifactKind, string> = {
            text: "Text Document",
            code: "Code",
            image: "Image",
            sheet: "Spreadsheet",
        };
        return labels[kind] ?? "Document";
    },
} as const;

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const createDocument = DocumentService.create;
export const getDocument = DocumentService.get;
export const getLatestDocument = DocumentService.getLatest;
export const getAllDocumentVersions = DocumentService.getAllVersions;
export const appendDocumentVersion = DocumentService.appendVersion;
export const deleteDocument = DocumentService.delete;
export const deleteDocumentVersionsAfterTimestamp =
    DocumentService.deleteVersionsAfterTimestamp;
export const getDocumentSuggestions = DocumentService.getSuggestions;
export const verifyDocumentOwnership = DocumentService.verifyOwnership;
export const getDocumentKindLabel = DocumentService.getKindLabel;
