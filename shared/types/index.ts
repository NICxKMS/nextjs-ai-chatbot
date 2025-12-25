/**
 * Shared Types
 *
 * Cross-feature types used by multiple modules.
 * Placed here to prevent circular dependencies between features.
 *
 * @module shared/types
 */

// =============================================================================
// VISIBILITY TYPES
// =============================================================================

/**
 * Chat visibility options.
 * Used by chat, sidebar, and artifacts features.
 */
export type VisibilityType = "public" | "private";

// =============================================================================
// RE-EXPORTS FROM LIB/TYPES
// =============================================================================

/**
 * Re-export artifact types from canonical source.
 * Use this import for cross-feature artifact type usage.
 */
export type { ArtifactKind } from "@/lib/types";

// =============================================================================
// SETTINGS INTERFACES (Cross-Feature Contract)
// =============================================================================

/**
 * Sampling settings for AI model configuration.
 * Used by chat and settings features.
 */
export type SamplingSettings = {
    /** Controls randomness in responses (0-2) */
    temperature: number;
    /** Nucleus sampling threshold (0-1) */
    topP: number;
    /** Maximum tokens in response */
    maxOutputTokens: number;
};

/**
 * Interface for settings consumer hooks.
 * Features should depend on this interface, not concrete implementation.
 */
export type ISettingsReader = {
    sampling: SamplingSettings;
    systemPrompt: string;
    enableReasoning: boolean;
    streamArtifacts: boolean;
    autoScroll: boolean;
    selectedModelId?: string;
    setSelectedModelId: (modelId: string | undefined) => void;
};

// =============================================================================
// OPTIMISTIC CHAT INTERFACES (Cross-Feature Contract)
// =============================================================================

/**
 * Minimal chat item for optimistic updates.
 * Used by chat and sidebar features.
 */
export type OptimisticChatItem = {
    id: string;
    title: string;
    createdAt: Date;
    visibility: VisibilityType;
    userId: string;
};

/**
 * Interface for optimistic chat operations.
 * Features should depend on this interface, not concrete implementation.
 */
export type IOptimisticChats = {
    optimisticChats: OptimisticChatItem[];
    addOptimisticChat: (chat: OptimisticChatItem) => void;
    removeOptimisticChat: (id: string) => void;
    updateOptimisticChatTitle: (id: string, title: string) => void;
};

// =============================================================================
// ARTIFACT INTERFACES (Cross-Feature Contract)
// =============================================================================

/**
 * UI Artifact state representation.
 * Used by artifacts, documents, and chat features.
 */
export type UIArtifactState = {
    documentId: string;
    content: string;
    kind: import("@/lib/types").ArtifactKind;
    title: string;
    status: "idle" | "streaming" | "error";
    isVisible: boolean;
    boundingBox: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
};

/**
 * Interface for artifact state access.
 * Used by documents feature to access artifact state.
 */
export type IUseArtifact = {
    artifact: UIArtifactState;
    setArtifact: (
        updater:
            | UIArtifactState
            | ((current: UIArtifactState) => UIArtifactState)
    ) => void;
};

// =============================================================================
// SIDEBAR INTERFACES (Cross-Feature Contract)
// =============================================================================

/**
 * Sidebar state for toggle functionality.
 */
export type SidebarState = {
    isOpen: boolean;
    isMobile: boolean;
};

/**
 * Interface for sidebar toggle operations.
 * Used by chat feature for sidebar toggle button.
 */
export type ISidebarContext = {
    state: SidebarState;
    toggle: () => void;
    open: () => void;
    close: () => void;
};
