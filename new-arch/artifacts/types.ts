/**
 * Artifact Type Definitions
 * @module new-arch/artifacts/types
 *
 * Type-safe artifact definitions for the document system.
 */

import type { UIMessageStreamWriter } from "ai";

// =============================================================================
// ARTIFACT KINDS
// =============================================================================

/**
 * Supported artifact types
 */
export type ArtifactKind = "text" | "code" | "sheet" | "image";

/**
 * Artifact kind metadata
 */
export type ArtifactKindInfo = {
    kind: ArtifactKind;
    label: string;
    description: string;
    mimeType: string;
};

/**
 * Registry of artifact kinds with metadata
 */
export const ARTIFACT_KINDS: Record<ArtifactKind, ArtifactKindInfo> = {
    text: {
        kind: "text",
        label: "Text Document",
        description: "Rich text documents with markdown support",
        mimeType: "text/markdown",
    },
    code: {
        kind: "code",
        label: "Code Snippet",
        description: "Executable Python code with console output",
        mimeType: "text/x-python",
    },
    sheet: {
        kind: "sheet",
        label: "Spreadsheet",
        description: "CSV-based spreadsheet data",
        mimeType: "text/csv",
    },
    image: {
        kind: "image",
        label: "Image",
        description: "AI-generated images",
        mimeType: "image/png",
    },
};

// =============================================================================
// DOCUMENT HANDLER TYPES
// =============================================================================

/**
 * Session context for document operations
 */
export type DocumentSession = {
    user?: {
        id: string;
        email?: string;
    };
};

/**
 * Chat message type for data stream
 */
export type ChatMessage = {
    type: string;
    data?: unknown;
    transient?: boolean;
};

/**
 * Props for creating a new document
 */
export type CreateDocumentCallbackProps = {
    id: string;
    title: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    session: DocumentSession;
    chatId: string;
};

/**
 * Document entity for update operations
 */
export type DocumentEntity = {
    id: string;
    title: string;
    content: string | null;
    kind: ArtifactKind;
    chatId: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
};

/**
 * Props for updating an existing document
 */
export type UpdateDocumentCallbackProps = {
    document: DocumentEntity;
    description: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    session: DocumentSession;
};

/**
 * Document handler interface
 */
export type DocumentHandler<T extends ArtifactKind = ArtifactKind> = {
    kind: T;
    onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
    onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

/**
 * Configuration for creating a document handler
 */
export type DocumentHandlerConfig<T extends ArtifactKind> = {
    kind: T;
    onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
    onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
};

// =============================================================================
// ARTIFACT CLIENT TYPES
// =============================================================================

/**
 * Artifact state for client components
 */
export type ArtifactState<T extends ArtifactKind = ArtifactKind> = {
    kind: T;
    id: string;
    title: string;
    content: string;
    status: "idle" | "streaming" | "complete" | "error";
    isVisible: boolean;
    currentVersionIndex: number;
    versions: ArtifactVersion[];
};

/**
 * Artifact version entry
 */
export type ArtifactVersion = {
    id: string;
    content: string;
    createdAt: Date;
};

/**
 * Stream part types for artifacts
 */
export type ArtifactStreamPart =
    | { type: "data-textDelta"; data: string; transient?: boolean }
    | { type: "data-codeDelta"; data: string; transient?: boolean }
    | { type: "data-sheetDelta"; data: string; transient?: boolean }
    | { type: "data-imageDelta"; data: string; transient?: boolean }
    | { type: "data-suggestion"; data: SuggestionData };

/**
 * Suggestion data for text artifacts
 */
export type SuggestionData = {
    id: string;
    documentId: string;
    originalText: string;
    suggestedText: string;
    description?: string;
    isResolved: boolean;
    createdAt: Date;
};

// =============================================================================
// CONSOLE OUTPUT TYPES (for code execution)
// =============================================================================

/**
 * Console output content item
 */
export type ConsoleOutputContent = {
    type: "text" | "image" | "error";
    value: string;
};

/**
 * Console output entry
 */
export type ConsoleOutput = {
    id: string;
    contents: ConsoleOutputContent[];
    status:
        | "idle"
        | "in_progress"
        | "loading_packages"
        | "completed"
        | "failed";
};

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Version change direction
 */
export type VersionChangeDirection = "prev" | "next" | "toggle";

/**
 * Send message function type
 */
export type SendMessageFn = (message: {
    role: "user";
    parts: Array<{ type: "text"; text: string }>;
}) => void;

/**
 * Artifact action handler context
 */
export type ArtifactActionContext<TMetadata = unknown> = {
    content: string;
    status: ArtifactState["status"];
    currentVersionIndex: number;
    isCurrentVersion: boolean;
    metadata: TMetadata;
    setMetadata: (
        updater: TMetadata | ((prev: TMetadata) => TMetadata)
    ) => void;
    handleVersionChange: (direction: VersionChangeDirection) => void;
    sendMessage: SendMessageFn;
};

/**
 * Artifact action definition
 */
export type ArtifactAction<TMetadata = unknown> = {
    icon: React.ReactNode;
    label?: string;
    description: string;
    onClick: (
        context: ArtifactActionContext<TMetadata>
    ) => void | Promise<void>;
    isDisabled?: (context: ArtifactActionContext<TMetadata>) => boolean;
};

/**
 * Artifact toolbar item
 */
export type ArtifactToolbarItem<TMetadata = unknown> = {
    icon: React.ReactNode;
    description: string;
    onClick: (context: ArtifactActionContext<TMetadata>) => void;
};
