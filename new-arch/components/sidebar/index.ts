/**
 * Sidebar Module
 * Split sidebar components for focused functionality
 *
 * Original: 814-line monolith
 * New: ~50-150 LOC per file
 */

// Context & Provider
export { SidebarProvider, useSidebar } from "./context";
export type {
    ChatGroup,
    ChatHistory,
    GroupedChats,
    HistoryChat,
    HistoryGroupProps,
    HistoryItemActionsProps,
    HistoryItemProps,
    HistoryProps,
} from "./history";
// History Components
export {
    DeleteChatDialog,
    getChatHistoryPaginationKey,
    HistoryEmpty,
    HistoryGroup,
    HistoryItem,
    HistoryItemActions,
    HistoryList,
    HistoryLoginPrompt,
    HistorySkeleton,
    SidebarHistory,
    useGroupedChats,
    useHistoryData,
} from "./history";
export { SidebarContent } from "./sidebar-content";
export { SidebarFooter } from "./sidebar-footer";
export { SidebarHeader } from "./sidebar-header";
// Layout Components
export { SidebarRoot } from "./sidebar-root";
export { SidebarSearch } from "./sidebar-search";
// Controls
export { SidebarToggle } from "./sidebar-toggle";

// Types
export type {
    SidebarContentProps,
    SidebarContextValue,
    SidebarFooterProps,
    SidebarHeaderProps,
    SidebarProviderProps,
    SidebarRootProps,
    SidebarState,
    SidebarToggleProps,
    SidebarUser,
} from "./types";

export { SIDEBAR_CONSTANTS } from "./types";
