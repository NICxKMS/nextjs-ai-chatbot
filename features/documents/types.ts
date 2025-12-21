/**
 * Document Feature Types
 *
 * Types for document preview and tool components.
 *
 * @module features/documents/types
 */

import type { ArtifactKind } from "@/features/artifacts";

// =============================================================================
// DOCUMENT TYPES (re-export from schema)
// =============================================================================

export type { Document } from "@/lib/db/schema";

// =============================================================================
// DOCUMENT TOOL TYPES
// =============================================================================

/** Tool invocation result for document operations */
export type DocumentToolResult = {
    id: string;
    title: string;
    kind: ArtifactKind;
};

/** Tool invocation arguments for document creation/update */
export type DocumentToolArgs = {
    title?: string;
    kind?: ArtifactKind;
    id?: string;
    description?: string;
    documentId?: string;
};

/** Document operation type */
export type DocumentOperationType = "create" | "update" | "request-suggestions";

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export type DocumentPreviewProps = {
    /** Document ID to fetch and preview */
    documentId: string;
    /** Whether the chat is in readonly mode */
    isReadonly?: boolean;
};

export type DocumentToolProps = {
    /** Type of operation */
    type: DocumentOperationType;
    /** Tool result data */
    result: DocumentToolResult;
    /** Whether the chat is in readonly mode */
    isReadonly?: boolean;
};

export type DocumentToolCallProps = {
    /** Type of operation */
    type: DocumentOperationType;
    /** Tool call arguments */
    args: DocumentToolArgs;
    /** Whether the chat is in readonly mode */
    isReadonly?: boolean;
};

export type DocumentSkeletonProps = {
    /** Kind of artifact for skeleton styling */
    artifactKind: ArtifactKind;
};
