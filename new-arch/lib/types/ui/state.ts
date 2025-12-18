/**
 * UI State Types
 * @module lib/types/ui/state
 *
 * Type definitions for UI state management.
 */

import type { ArtifactKind, ArtifactStatus, BoundingBox } from "../domain";

// =============================================================================
// SIDEBAR STATE
// =============================================================================

/**
 * Sidebar visibility state
 */
export type SidebarState = {
    /** Whether sidebar is open */
    isOpen: boolean;
    /** Whether sidebar is in mobile mode */
    isMobile: boolean;
    /** Currently active section */
    activeSection?: "history" | "settings";
};

// =============================================================================
// CHAT STATE
// =============================================================================

/**
 * Chat input state
 */
export type ChatInputState = {
    /** Current input value */
    value: string;
    /** Attached files */
    attachments: AttachmentState[];
    /** Whether input is focused */
    isFocused: boolean;
    /** Whether AI is generating */
    isGenerating: boolean;
};

/**
 * Attachment state for pending uploads
 */
export type AttachmentState = {
    /** Temporary ID */
    id: string;
    /** File name */
    name: string;
    /** MIME type */
    contentType: string;
    /** Upload URL (after upload) */
    url?: string;
    /** Upload progress (0-100) */
    progress: number;
    /** Upload status */
    status: "pending" | "uploading" | "complete" | "error";
    /** Error message if failed */
    error?: string;
};

// =============================================================================
// ARTIFACT STATE
// =============================================================================

/**
 * Artifact panel state
 */
export type ArtifactPanelState = {
    /** Whether panel is visible */
    isVisible: boolean;
    /** Current artifact info */
    current: ArtifactViewState | null;
    /** Panel mode */
    mode: "view" | "edit" | "diff";
};

/**
 * Individual artifact view state
 */
export type ArtifactViewState = {
    /** Document ID */
    documentId: string;
    /** Artifact kind */
    kind: ArtifactKind;
    /** Display title */
    title: string;
    /** Current content */
    content: string;
    /** Stream status */
    status: ArtifactStatus;
    /** Current version index */
    currentVersionIndex: number;
    /** Total versions */
    totalVersions: number;
    /** Bounding box for positioning */
    boundingBox: BoundingBox;
};

// =============================================================================
// MODAL STATE
// =============================================================================

/**
 * Modal visibility state
 */
export type ModalState = {
    /** Whether modal is open */
    isOpen: boolean;
    /** Modal content key */
    contentKey?: string;
    /** Modal props */
    props?: Record<string, unknown>;
};

/**
 * Confirmation dialog state
 */
export type ConfirmDialogState = ModalState & {
    /** Dialog title */
    title: string;
    /** Dialog message */
    message: string;
    /** Confirm button text */
    confirmText?: string;
    /** Cancel button text */
    cancelText?: string;
    /** Whether action is destructive */
    isDestructive?: boolean;
    /** Confirm callback */
    onConfirm?: () => void | Promise<void>;
    /** Cancel callback */
    onCancel?: () => void;
};

// =============================================================================
// TOAST STATE
// =============================================================================

/**
 * Toast notification type
 */
export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast notification state
 */
export type ToastState = {
    /** Unique toast ID */
    id: string;
    /** Toast type */
    type: ToastType;
    /** Toast title */
    title?: string;
    /** Toast message */
    message: string;
    /** Duration in ms (0 = persistent) */
    duration?: number;
    /** Action button */
    action?: {
        label: string;
        onClick: () => void;
    };
};

// =============================================================================
// SETTINGS STATE
// =============================================================================

/**
 * User settings state
 */
export type SettingsState = {
    /** Theme preference */
    theme: "light" | "dark" | "system";
    /** Selected AI model */
    model: string;
    /** Send messages on Enter */
    sendOnEnter: boolean;
    /** Show message timestamps */
    showTimestamps: boolean;
    /** Compact message view */
    compactView: boolean;
};

// =============================================================================
// SELECTION STATE
// =============================================================================

/**
 * Multi-select state
 */
export type SelectionState<T = string> = {
    /** Selected item IDs */
    selectedIds: Set<T>;
    /** Last selected ID (for shift-click) */
    lastSelectedId?: T;
    /** Whether selection mode is active */
    isSelecting: boolean;
};

// =============================================================================
// SCROLL STATE
// =============================================================================

/**
 * Scroll position state
 */
export type ScrollState = {
    /** Scroll position from top */
    scrollTop: number;
    /** Total scrollable height */
    scrollHeight: number;
    /** Visible container height */
    clientHeight: number;
    /** Whether at bottom */
    isAtBottom: boolean;
    /** Whether at top */
    isAtTop: boolean;
};
