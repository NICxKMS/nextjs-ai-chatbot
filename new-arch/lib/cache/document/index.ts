import "server-only";

/**
 * Document cache operations.
 *
 * @module cache/document
 */

export {
    clearDocumentVersionsFromCache,
    deleteDocumentFromCache,
    deleteDocumentsFromCache,
    deleteDocumentVersionsAfterTimestamp,
} from "./delete";

export {
    documentExistsInCache,
    getDocumentFromCache,
    getDocumentVersionsFromCache,
    getLatestDocumentVersionFromCache,
} from "./read";

export {
    appendDocumentVersionToCache,
    createDocumentInCacheIfNotExists,
    setDocumentInCache,
    updateDocumentInCache,
} from "./write";
