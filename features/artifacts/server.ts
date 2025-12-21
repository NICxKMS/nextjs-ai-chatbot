/**
 * Artifacts Feature - Server-Only Exports
 *
 * This module exports server-only code that cannot be imported in client components.
 * Import from '@/features/artifacts/server' in server code only.
 *
 * @module features/artifacts/server
 */

// Handlers (server-only)
export {
    createDocumentHandler,
    textDocumentHandler,
    codeDocumentHandler,
    sheetDocumentHandler,
    documentHandlersByArtifactKind,
    artifactKinds,
    type DocumentHandler,
    type DocumentHandlerConfig,
    type CreateDocumentCallbackProps,
    type UpdateDocumentCallbackProps,
} from "./handlers";
