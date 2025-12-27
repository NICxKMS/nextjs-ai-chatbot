/**
 * Document Services
 *
 * Client-side API services for document feature.
 *
 * @module features/documents/services
 */

export {
    type DocumentData,
    fetchDocument,
    fetchDocumentVersions,
    fetchSuggestions,
    restoreDocumentVersion,
    type SaveDocumentRequest,
    saveDocument,
} from "./document-api";
