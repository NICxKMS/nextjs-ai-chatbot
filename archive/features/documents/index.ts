/**
 * Documents Feature - Public API
 *
 * Provides document preview and tool components for chat integration.
 *
 * @module features/documents
 */

// Components
export {
    CodePreview,
    // Preview
    DocumentPreview,
    type DocumentPreviewProps,
    // Skeleton
    DocumentSkeleton,
    type DocumentSkeletonProps,
    DocumentToolCall,
    type DocumentToolCallProps,
    // Tool components
    DocumentToolResult,
    type DocumentToolResultProps,
    ImagePreview,
    InlineDocumentSkeleton,
    SheetPreview,
    // Renderers
    TextPreview,
} from "./components";
// P3-008: Re-export services for public API
export {
    type DocumentData,
    fetchDocument,
    fetchDocumentVersions,
    fetchSuggestions,
    restoreDocumentVersion,
    type SaveDocumentRequest,
    saveDocument,
} from "./services";
// Types
export type {
    Document,
    DocumentOperationType,
    DocumentPreviewProps as DocumentPreviewPropsType,
    DocumentSkeletonProps as DocumentSkeletonPropsType,
    DocumentToolArgs,
    DocumentToolCallProps as DocumentToolCallPropsType,
    DocumentToolProps,
    DocumentToolResult as DocumentToolResultType,
} from "./types";
