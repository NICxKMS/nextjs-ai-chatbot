/**
 * Documents Feature - Public API
 *
 * Provides document preview and tool components for chat integration.
 *
 * @module features/documents
 */

// Types
export type {
    Document,
    DocumentToolResult as DocumentToolResultType,
    DocumentToolArgs,
    DocumentOperationType,
    DocumentPreviewProps as DocumentPreviewPropsType,
    DocumentToolProps,
    DocumentToolCallProps as DocumentToolCallPropsType,
    DocumentSkeletonProps as DocumentSkeletonPropsType,
} from "./types";

// Components
export {
    // Skeleton
    DocumentSkeleton,
    InlineDocumentSkeleton,
    type DocumentSkeletonProps,
    // Preview
    DocumentPreview,
    type DocumentPreviewProps,
    // Tool components
    DocumentToolResult,
    DocumentToolCall,
    type DocumentToolResultProps,
    type DocumentToolCallProps,
    // Renderers
    TextPreview,
    CodePreview,
    SheetPreview,
    ImagePreview,
} from "./components";
