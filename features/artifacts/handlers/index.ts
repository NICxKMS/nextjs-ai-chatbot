/**
 * Document Handlers - Public API
 *
 * Export all artifact streaming handlers.
 */

// Base
export {
    type CreateDocumentCallbackProps,
    createDocumentHandler,
    type DocumentHandler,
    type DocumentHandlerConfig,
    type UpdateDocumentCallbackProps,
} from "./base";
// Code handler
export { codeDocumentHandler } from "./code";
// Sheet handler
export { sheetDocumentHandler } from "./sheet";
// Text handler
export { textDocumentHandler } from "./text";

// Handler registry
import type { DocumentHandler } from "./base";
import { codeDocumentHandler } from "./code";
import { sheetDocumentHandler } from "./sheet";
import { textDocumentHandler } from "./text";

/**
 * Registry of document handlers by artifact kind
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
    textDocumentHandler,
    codeDocumentHandler,
    sheetDocumentHandler,
];

/**
 * Supported artifact kinds for document handlers
 */
export const artifactKinds = ["text", "code", "sheet"] as const;
