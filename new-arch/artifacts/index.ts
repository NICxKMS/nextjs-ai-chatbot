/**
 * Artifacts Module
 * @module new-arch/artifacts
 *
 * Unified artifact system with type-safe document handlers and client components.
 *
 * @example
 * ```ts
 * // Server-side usage
 * import { codeDocumentHandler, textDocumentHandler } from '@/artifacts';
 *
 * // Client-side usage
 * import { codeArtifactConfig, CodeArtifactContent } from '@/artifacts';
 * ```
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
    ArtifactAction,
    ArtifactActionContext,
    ArtifactKind,
    ArtifactKindInfo,
    ArtifactState,
    ArtifactStreamPart,
    ArtifactToolbarItem,
    ArtifactVersion,
    ChatMessage,
    ConsoleOutput,
    ConsoleOutputContent,
    CreateDocumentCallbackProps,
    DocumentEntity,
    DocumentHandler,
    DocumentHandlerConfig,
    DocumentSession,
    SendMessageFn,
    SuggestionData,
    VersionChangeDirection,
} from "./types";

export { ARTIFACT_KINDS } from "./types";

// =============================================================================
// SERVER EXPORTS
// =============================================================================

// Server handlers
export { codeDocumentHandler } from "./code/server";
export { imageDocumentHandler } from "./image/server";
export {
    codePrompt,
    createDocumentHandler,
    sheetPrompt,
    textPrompt,
    updateDocumentPrompt,
} from "./server";
export { sheetDocumentHandler } from "./sheet/server";
export { textDocumentHandler } from "./text/server";

// =============================================================================
// CLIENT EXPORTS
// =============================================================================

// Code artifact
export {
    CodeArtifactContent,
    type CodeArtifactMetadata,
    type CodeEditorProps,
    codeActions,
    codeArtifactConfig,
    codeToolbar,
} from "./code/client";
// Image artifact
export {
    ImageArtifactContent,
    type ImageArtifactMetadata,
    type ImageEditorProps,
    imageActions,
    imageArtifactConfig,
    imageToolbar,
} from "./image/client";

// Sheet artifact
export {
    SheetArtifactContent,
    type SheetArtifactMetadata,
    type SheetEditorProps,
    sheetActions,
    sheetArtifactConfig,
    sheetToolbar,
} from "./sheet/client";
// Text artifact
export {
    TextArtifactContent,
    type TextArtifactMetadata,
    type TextEditorProps,
    textActions,
    textArtifactConfig,
    textToolbar,
} from "./text/client";

// =============================================================================
// REGISTRY
// =============================================================================

import { codeDocumentHandler } from "./code/server";
import { imageDocumentHandler } from "./image/server";
import { sheetDocumentHandler } from "./sheet/server";
import { textDocumentHandler } from "./text/server";

import type { ArtifactKind, DocumentHandler } from "./types";

/**
 * Registry of all document handlers by kind
 */
export const documentHandlers: Record<ArtifactKind, DocumentHandler> = {
    code: codeDocumentHandler,
    text: textDocumentHandler,
    sheet: sheetDocumentHandler,
    image: imageDocumentHandler,
};

/**
 * Get document handler by artifact kind
 */
export function getDocumentHandler(kind: ArtifactKind): DocumentHandler {
    const handler = documentHandlers[kind];
    if (!handler) {
        throw new Error(`Unknown artifact kind: ${kind}`);
    }
    return handler;
}
