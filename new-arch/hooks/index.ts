"use client";

// ─────────────────────────────────────────────────────────────
// SWR Keys (Centralized Cache Keys)
// ─────────────────────────────────────────────────────────────
export {
    INVALIDATION_PATTERNS,
    matchesKeyPattern,
    SWR_KEYS,
    type SWRKeyType,
} from "./swr-keys";
// ─────────────────────────────────────────────────────────────
// Artifact Hooks
// ─────────────────────────────────────────────────────────────
export {
    type ArtifactBoundingBox,
    type ArtifactKind,
    type ArtifactMetadata,
    type ArtifactStatus,
    initialArtifactData,
    type Selector,
    type UIArtifact,
    type UseArtifactReturn,
    useArtifact,
    useArtifactSelector,
} from "./use-artifact";
export {
    type SaveStatus,
    type UseArtifactPersistenceReturn,
    useArtifactPersistence,
} from "./use-artifact-persistence";
export {
    type UseArtifactVersioningReturn,
    useArtifactVersioning,
    type VersionInfo,
    type VersionMode,
} from "./use-artifact-versioning";
// ─────────────────────────────────────────────────────────────
// Chat Hooks
// ─────────────────────────────────────────────────────────────
export {
    type ChatHistoryPage,
    type OptimisticChat,
    useChats,
    useChatVisibility,
} from "./use-chats";
// ─────────────────────────────────────────────────────────────
// Editor Hooks
// ─────────────────────────────────────────────────────────────
export { type UseEditorStateReturn, useEditorState } from "./use-editor-state";
// ─────────────────────────────────────────────────────────────
// Message Hooks
// ─────────────────────────────────────────────────────────────
export {
    type MessageStatus,
    type UseMessagesOptions,
    type UseMessagesReturn,
    type UseScrollToBottomReturn,
    useMessages,
    useScrollToBottom,
} from "./use-messages";
// ─────────────────────────────────────────────────────────────
// Responsive Hooks
// ─────────────────────────────────────────────────────────────
export {
    breakpoints,
    type DeviceType,
    parseDeviceTypeHeader,
    type UseBreakpointOptions,
    type UseIsMobileOptions,
    type UseWindowSizeReturn,
    useBreakpoint,
    useIsMobile,
    useMediaQuery,
    useWindowSize,
} from "./use-mobile";
export {
    type OptimisticChat as OptimisticChatType,
    type OptimisticChatsContextType,
    OptimisticChatsProvider,
    useOptimisticChats,
} from "./use-optimistic-chats";
// ─────────────────────────────────────────────────────────────
// Settings Hooks
// ─────────────────────────────────────────────────────────────
export {
    type AppSettings,
    getDefaultSettings,
    type SamplingSettings,
    SettingsProvider,
    type SettingsProviderProps,
    type SettingsStore,
    useSetting,
    useSettings,
    useSettingsSnapshot,
} from "./use-settings";
