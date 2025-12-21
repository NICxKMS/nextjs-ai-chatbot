/**
 * Document Handlers - Public API
 *
 * Export all artifact streaming handlers.
 */

// Base
export {
    createDocumentHandler,
    type DocumentHandler,
    type DocumentHandlerConfig,
    type CreateDocumentCallbackProps,
    type UpdateDocumentCallbackProps,
} from "./base";

// Text handler
export { textDocumentHandler } from "./text";

// Code handler
export { codeDocumentHandler } from "./code";

// Sheet handler
export { sheetDocumentHandler } from "./sheet";

// Handler registry
import type { DocumentHandler } from "./base";
import { textDocumentHandler } from "./text";
import { codeDocumentHandler } from "./code";
import { sheetDocumentHandler } from "./sheet";

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
