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
