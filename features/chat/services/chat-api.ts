/**
 * Chat API Client
 *
 * Client-side API service for chat operations.
 * Centralizes fetch calls for chat-related endpoints.
 *
 * @module features/chat/services/chat-api
 */

import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

/**
 * File upload response from the API.
 */
export interface FileUploadResponse {
    url: string;
    pathname: string;
    contentType: string;
    filename?: string;
}

/**
 * Attachment data for chat messages.
 */
export interface Attachment {
    url: string;
    name: string;
    contentType: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Upload a file for chat attachment.
 *
 * @param file - File to upload
 * @param signal - Optional abort signal for cancellation
 * @returns Upload response with file URL and metadata
 * @throws AppError on failure
 */
export async function uploadFile(
    file: File,
    signal?: AbortSignal
): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    // Use raw fetch for FormData (apiClient auto-sets JSON content-type)
    const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error || `Upload failed with status ${response.status}`
        );
    }

    return response.json();
}

/**
 * Convert a blob URL to a data URL.
 *
 * @param blobUrl - Blob URL to convert
 * @returns Data URL or null on failure
 */
export async function convertBlobToDataUrl(
    blobUrl: string
): Promise<string | null> {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        logger.warn("Failed to convert blob to data URL", {
            operation: "convertBlobToDataUrl",
            blobUrl,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}
