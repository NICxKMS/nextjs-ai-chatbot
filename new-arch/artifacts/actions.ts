"use server";

import { revalidatePath } from "next/cache";
import {
    createDocument,
    deleteDocument as deleteDocumentData,
    getDocumentById as getDocumentByIdData,
    updateDocument,
} from "../lib/data/document";
import type { Document, DocumentKind } from "../lib/data/types";
import {
    type ActionResult,
    AppError,
    ErrorCodes,
    err,
    ok,
} from "../lib/errors";

// =============================================================================
// DOCUMENT QUERIES
// =============================================================================

/**
 * Get a document by its ID (returns latest version).
 */
export async function getDocumentById(
    documentId: string
): Promise<ActionResult<Document | null>> {
    try {
        const result = await getDocumentByIdData(documentId);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

// =============================================================================
// DOCUMENT MUTATIONS
// =============================================================================

/**
 * Save (create) a new document.
 */
export async function saveDocument(input: {
    id?: string;
    title: string;
    content?: string | null;
    kind: DocumentKind;
    userId: string;
    chatId: string;
}): Promise<ActionResult<Document>> {
    try {
        const result = await createDocument(input);
        revalidatePath(`/chat/${input.chatId}`);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Update document content.
 * Creates a new version with updated content.
 */
export async function updateDocumentContent(input: {
    id: string;
    createdAt: Date;
    title?: string;
    content?: string | null;
}): Promise<ActionResult<Document>> {
    try {
        const result = await updateDocument(input);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}

/**
 * Delete a specific document version.
 */
export async function deleteDocument(
    documentId: string,
    createdAt: Date
): Promise<ActionResult<boolean>> {
    try {
        const result = await deleteDocumentData(documentId, createdAt);
        return ok(result);
    } catch (error) {
        return err(AppError.from(error, ErrorCodes.DB_QUERY_ERROR));
    }
}
