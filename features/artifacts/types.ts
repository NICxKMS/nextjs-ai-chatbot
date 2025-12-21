import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";

// ============================================================================
// Artifact Kind Types
// ============================================================================

/**
 * Supported artifact types in the application.
 * Each kind has its own rendering, editing, and streaming behavior.
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet";

/**
 * Status of an artifact during its lifecycle.
 * - streaming: Content is being received from AI
 * - idle: Content is complete and ready for interaction
 */
export type ArtifactStatus = "streaming" | "idle";

// ============================================================================
// UI Artifact Types
// ============================================================================

/**
 * Bounding box for artifact positioning.
 * Used for inline artifact display within chat messages.
 */
export type ArtifactBoundingBox = {
    top: number;
    left: number;
    width: number;
    height: number;
};

/**
 * Core UI representation of an artifact.
 * This is the main state object managed by useArtifact hook.
 */
export type UIArtifact = {
    /** Unique identifier for the artifact/document */
    documentId: string;
    /** Display title of the artifact */
    title: string;
    /** Type of artifact (text, code, image, sheet) */
    kind: ArtifactKind;
    /** Raw content of the artifact */
    content: string;
    /** Whether the artifact panel is visible */
    isVisible: boolean;
    /** Current streaming/idle status */
    status: ArtifactStatus;
    /** Position and size for inline display */
    boundingBox: ArtifactBoundingBox;
};

// ============================================================================
// Artifact Definition Types
// ============================================================================

/**
 * Context passed to artifact action handlers.
 * Actions can use this to interact with artifact state and navigation.
 */
export type ArtifactActionContext<TMetadata = unknown> = {
    /** Current artifact content */
    content: string;
    /** Navigate between artifact versions */
    handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
    /** Index of currently viewed version */
    currentVersionIndex: number;
    /** Whether viewing the latest version */
    isCurrentVersion: boolean;
    /** Current editing mode */
    mode: "edit" | "diff";
    /** Artifact-specific metadata */
    metadata: TMetadata;
    /** Update artifact metadata */
    setMetadata: Dispatch<SetStateAction<TMetadata>>;
};

/**
 * An action button displayed in the artifact panel.
 * Actions perform operations on the artifact (run code, copy, etc.)
 */
export type ArtifactAction<TMetadata = unknown> = {
    /** Icon component to display */
    icon: ReactNode;
    /** Optional label text */
    label?: string;
    /** Tooltip description */
    description: string;
    /** Handler called when action is triggered */
    onClick: (
        context: ArtifactActionContext<TMetadata>
    ) => Promise<void> | void;
    /** Optional function to disable the action conditionally */
    isDisabled?: (context: ArtifactActionContext<TMetadata>) => boolean;
};

/**
 * Context passed to toolbar item handlers.
 * Toolbar items typically send messages to the AI.
 */
export type ArtifactToolbarContext = {
    /** Function to send a message to the AI */
    sendMessage: (message: {
        role: "user";
        parts: Array<{ type: "text"; text: string }>;
    }) => void;
};

/**
 * A toolbar item displayed at the bottom of the artifact panel.
 * Toolbar items typically trigger AI actions (add comments, etc.)
 */
export type ArtifactToolbarItem = {
    /** Tooltip description */
    description: string;
    /** Icon component to display */
    icon: ReactNode;
    /** Handler called when toolbar item is clicked */
    onClick: (context: ArtifactToolbarContext) => void;
};

/**
 * Props passed to artifact content renderer component.
 * Each artifact kind implements its own content component.
 */
export type ArtifactContentProps<TMetadata = unknown> = {
    /** Display title */
    title: string;
    /** Raw content */
    content: string;
    /** Current editing mode */
    mode: "edit" | "diff";
    /** Whether viewing the latest version */
    isCurrentVersion: boolean;
    /** Index of currently viewed version */
    currentVersionIndex: number;
    /** Current streaming/idle status */
    status: ArtifactStatus;
    /** AI-generated suggestions for the content */
    suggestions: Array<{ id: string; content: string }>;
    /** Callback to save content changes */
    onSaveContent: (updatedContent: string, debounce: boolean) => void;
    /** Whether artifact is displayed inline */
    isInline: boolean;
    /** Get content of a specific version by index */
    getDocumentContentById: (index: number) => string;
    /** Whether document is loading */
    isLoading: boolean;
    /** Artifact-specific metadata */
    metadata: TMetadata;
    /** Update artifact metadata */
    setMetadata: Dispatch<SetStateAction<TMetadata>>;
};

/**
 * Parameters passed to artifact initialize function.
 */
export type ArtifactInitializeParams<TMetadata = unknown> = {
    /** Document ID being initialized */
    documentId: string;
    /** Function to set initial metadata */
    setMetadata: Dispatch<SetStateAction<TMetadata>>;
};

// ============================================================================
// Artifact Stream Types
// ============================================================================

/**
 * Data stream part types for artifact streaming.
 * These match the AI SDK's data stream protocol.
 */
export type ArtifactStreamPartType =
    | "data-id"
    | "data-title"
    | "data-kind"
    | "data-clear"
    | "data-finish"
    | "data-textDelta"
    | "data-codeDelta"
    | "data-imageDelta"
    | "data-sheetDelta";

/**
 * Generic stream part for artifact updates.
 */
export type ArtifactStreamPart<TData = unknown> = {
    type: ArtifactStreamPartType | string;
    data: TData;
};

/**
 * Arguments passed to onStreamPart handler.
 */
export type ArtifactStreamPartArgs<TMetadata = unknown> = {
    /** The stream part being processed */
    streamPart: ArtifactStreamPart;
    /** Function to update artifact state */
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    /** Function to update artifact metadata */
    setMetadata: Dispatch<SetStateAction<TMetadata>>;
};

/**
 * Configuration for creating an artifact definition.
 */
export type ArtifactConfig<TKind extends ArtifactKind, TMetadata = unknown> = {
    /** Artifact type identifier */
    kind: TKind;
    /** Human-readable description */
    description: string;
    /** Content renderer component */
    content: ComponentType<ArtifactContentProps<TMetadata>>;
    /** Action buttons */
    actions: ArtifactAction<TMetadata>[];
    /** Toolbar items */
    toolbar: ArtifactToolbarItem[];
    /** Optional initialization function */
    initialize?: (params: ArtifactInitializeParams<TMetadata>) => void;
    /** Stream part processor */
    onStreamPart: (args: ArtifactStreamPartArgs<TMetadata>) => void;
};

/**
 * A complete artifact definition instance.
 */
export type ArtifactDefinition<
    TKind extends ArtifactKind = ArtifactKind,
    TMetadata = unknown,
> = {
    readonly kind: TKind;
    readonly description: string;
    readonly content: ComponentType<ArtifactContentProps<TMetadata>>;
    readonly actions: ArtifactAction<TMetadata>[];
    readonly toolbar: ArtifactToolbarItem[];
    readonly initialize?: (params: ArtifactInitializeParams<TMetadata>) => void;
    readonly onStreamPart: (args: ArtifactStreamPartArgs<TMetadata>) => void;
};

// ============================================================================
// Console Output Types (for code execution)
// ============================================================================

/**
 * Content type for console output.
 */
export type ConsoleOutputContent = {
    /** Type of output (text or image for matplotlib, etc.) */
    type: "text" | "image";
    /** The output value (text or base64 image data) */
    value: string;
};

/**
 * Status of code execution.
 */
export type ConsoleOutputStatus =
    | "in_progress"
    | "loading_packages"
    | "completed"
    | "failed";

/**
 * A single console output entry from code execution.
 */
export type ConsoleOutput = {
    /** Unique identifier for this execution run */
    id: string;
    /** Current status of the execution */
    status: ConsoleOutputStatus;
    /** Output contents (stdout, images, errors) */
    contents: ConsoleOutputContent[];
};
