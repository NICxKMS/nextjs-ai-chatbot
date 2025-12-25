/**
 * Artifact API Client
 *
 * Client-side API service for artifact/document operations.
 * Centralizes fetch calls for artifact-related endpoints.
 *
 * @module features/artifacts/services/artifact-api
 */

import { apiClient } from "@/lib/api";
import type { Document } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Request to save artifact content.
 */
export interface SaveArtifactRequest {
    title: string;
    content: string;
    kind: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Fetch artifact documents by ID.
 *
 * @param url - Full API URL (e.g., /api/document?id=xxx&chatId=yyy)
 * @returns Array of document versions
 * @throws AppError on failure
 */
export async function fetchArtifactDocuments(url: string): Promise<Document[]> {
    return apiClient.get<Document[]>(url);
}

/**
 * Save artifact content as a new version.
 *
 * @param documentId - Artifact document ID
 * @param data - Content to save
 * @param signal - Optional abort signal
 * @returns Saved document
 * @throws AppError on failure
 */
export async function saveArtifactContent(
    documentId: string,
    data: SaveArtifactRequest,
    signal?: AbortSignal
): Promise<Document> {
    // P3-003: Use spread to satisfy Record<string, unknown> constraint
    return apiClient.post<Document>(`/api/document?id=${documentId}`, {
        body: { ...data },
        signal,
    });
}

/**
 * Restore artifact to a specific version.
 *
 * @param documentId - Artifact document ID
 * @param timestamp - Timestamp of version to restore to
 * @throws AppError on failure
 */
export async function restoreArtifactVersion(
    documentId: string,
    timestamp: string
): Promise<void> {
    await apiClient.delete(
        `/api/document?id=${documentId}&timestamp=${timestamp}`
    );
}

/**
 * Fetch suggestions for an artifact.
 *
 * @param documentId - Artifact document ID
 * @returns Array of suggestions
 * @throws AppError on failure
 */
export async function fetchArtifactSuggestions<T = unknown[]>(
    documentId: string
): Promise<T> {
    return apiClient.get<T>(`/api/suggestions?documentId=${documentId}`);
}
