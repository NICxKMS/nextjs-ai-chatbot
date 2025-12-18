// =============================================================================
// DOCUMENT DATA MODULE
// =============================================================================

// Mutations
export {
    type CreateDocumentInput,
    createDocument,
    deleteDocument,
    type UpdateDocumentInput,
    updateDocument,
} from "./mutations";
// Queries
export {
    getDocumentById,
    getDocumentsByChatId,
    getDocumentVersions,
} from "./queries";
