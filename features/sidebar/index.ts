/**
 * Sidebar Feature Module
 *
 * Provides sidebar navigation, chat history, and user menu components.
 *
 * @module features/sidebar
 */

// Components
export {
    AppSidebar,
    type AppSidebarProps,
    SidebarHistory,
    SidebarHistoryItem,
    type SidebarHistoryItemProps,
    type SidebarHistoryProps,
    SidebarToggle,
    SidebarUserNav,
    type SidebarUserNavProps,
    type UpdateVisibilityAction,
} from "./components";

// Hooks
export {
    OptimisticChatsProvider,
    SidebarProvider,
    type SidebarProviderProps,
    useChatHistory,
    useOptimisticChats,
    useSidebar,
} from "./hooks";
// P3-008: Re-export services for public API
export {
    deleteAllChatHistory,
    deleteChat,
    fetchChatHistory,
    type HistoryResponse,
} from "./services";
// Types
export type {
    ChatGroup,
    ChatHistoryItem,
    SidebarContext,
    SidebarState,
    VisibilityType,
} from "./types";
// Utils
export { groupChatsByDate } from "./utils";
