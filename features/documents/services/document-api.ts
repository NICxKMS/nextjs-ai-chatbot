/**
 * Document API Client
 *
 * Client-side API service for document operations.
 * Centralizes fetch calls for document endpoints.
 *
 * @module features/documents/services/document-api
 */

import { apiClient } from "@/lib/api";
import type { Document } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Document data with content and metadata.
 */
export type DocumentData = Pick<Document, "title" | "kind" | "content">;

/**
 * Request to save a document version.
 */
export interface SaveDocumentRequest {
    title: string;
    content: string;
    kind: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch a document by URL.
 *
 * @param url - Full document API URL (e.g., /api/document?id=xxx)
 * @returns Document data
 * @throws AppError on failure
 */
export async function fetchDocument<T = DocumentData>(url: string): Promise<T> {
    return apiClient.get<T>(url);
}

/**
 * Fetch multiple document versions.
 *
 * @param documentId - Document ID
 * @param chatId - Associated chat ID
 * @returns Array of document versions
 * @throws AppError on failure
 */
export async function fetchDocumentVersions(
    documentId: string,
    chatId: string
): Promise<Document[]> {
    return apiClient.get<Document[]>(
        `/api/document?id=${documentId}&chatId=${chatId}`
    );
}

/**
 * Save a new document version.
 *
 * @param documentId - Document ID
 * @param data - Document data to save
 * @param signal - Optional abort signal
 * @returns Updated document
 * @throws AppError on failure
 */
export async function saveDocument(
    documentId: string,
    data: SaveDocumentRequest,
    signal?: AbortSignal
): Promise<Document> {
    // P3-003: Use spread to satisfy Record<string, unknown> constraint
    return apiClient.post<Document>(`/api/document?id=${documentId}`, {
        body: { ...data },
        signal,
    });
}

/**
 * Restore a document to a specific version (delete newer versions).
 *
 * @param documentId - Document ID
 * @param timestamp - Timestamp of version to restore to
 * @returns Response from delete operation
 * @throws AppError on failure
 */
export async function restoreDocumentVersion(
    documentId: string,
    timestamp: string
): Promise<void> {
    await apiClient.delete(
        `/api/document?id=${documentId}&timestamp=${timestamp}`
    );
}

/**
 * Fetch suggestions for a document.
 *
 * @param documentId - Document ID
 * @returns Array of suggestions
 * @throws AppError on failure
 */
export async function fetchSuggestions<T = unknown[]>(
    documentId: string
): Promise<T> {
    return apiClient.get<T>(`/api/suggestions?documentId=${documentId}`);
}
