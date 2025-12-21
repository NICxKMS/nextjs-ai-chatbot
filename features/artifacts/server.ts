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
    artifactKinds,
    type CreateDocumentCallbackProps,
    codeDocumentHandler,
    createDocumentHandler,
    type DocumentHandler,
    type DocumentHandlerConfig,
    documentHandlersByArtifactKind,
    sheetDocumentHandler,
    textDocumentHandler,
    type UpdateDocumentCallbackProps,
} from "./handlers";
