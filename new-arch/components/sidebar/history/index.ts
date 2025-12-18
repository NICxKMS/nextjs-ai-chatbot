/**
 * Sidebar History Module
 * Split sidebar history components for focused functionality
 *
 * Original: 770-line monolith
 * New: ~40-140 LOC per file
 */

export { DeleteChatDialog } from "./delete-chat-dialog";
// Main Component
export { HistoryContainer as SidebarHistory } from "./history-container";
export { HistoryEmpty, HistoryLoginPrompt } from "./history-empty";
export { HistoryGroup } from "./history-group";
// Sub-components
export { HistoryItem } from "./history-item";
export { HistoryItemActions } from "./history-item-actions";
export { HistoryList } from "./history-list";
export { HistorySkeleton } from "./history-skeleton";

// Hooks
export * from "./hooks";

// Types
export type {
    ChatGroup,
    ChatHistory,
    GroupedChats,
    HistoryChat,
    HistoryGroupProps,
    HistoryItemActionsProps,
    HistoryItemProps,
    HistoryProps,
} from "./types";
