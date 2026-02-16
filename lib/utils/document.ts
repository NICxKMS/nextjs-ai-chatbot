/**
 * Document Utilities
 *
 * Utility functions for document/artifact operations.
 *
 * @module lib/utils/document
 */

import type { Artifact } from "@/lib/db/schema"

/**
 * Get document timestamp by index from a list of documents
 *
 * @param documents - Array of documents/artifacts
 * @param index - Index of the document
 * @returns The creation date of the document at the given index, or current date if not found
 */
export function getDocumentTimestampByIndex(
	documents: Artifact[] | undefined,
	index: number,
): Date {
	if (!documents) {
		return new Date()
	}
	if (index < 0 || index >= documents.length) {
		return new Date()
	}

	const document = documents[index]
	return document ? new Date(document.createdAt) : new Date()
}
