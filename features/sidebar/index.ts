/**
 * Sidebar Feature Barrel Export
 *
 * Main barrel export for the sidebar feature module.
 *
 * @module features/sidebar
 */

// =============================================================================
// Components
// =============================================================================

export {
	AppSidebar,
	ChatItem,
	SidebarHistory,
	SidebarItem,
	SidebarSkeleton,
	SidebarToggle,
	SidebarUserNav,
} from "./components"

// =============================================================================
// Hooks
// =============================================================================

export {
	type UseSidebarStateReturn,
	useSidebar,
	useSidebarState,
} from "./hooks"

// =============================================================================
// Server Actions
// =============================================================================

export { deleteAllChats, deleteChat, getChatHistory } from "./actions"

// =============================================================================
// Types
// =============================================================================

export type {
	// Component Props
	AppSidebarProps,
	ChatGroup,
	ChatHistory,
	ChatHistoryPagination,
	ChatItemProps,
	DeleteAllChatsResult,
	// Action Types
	DeleteChatResult,
	// Data Types
	GroupedChats,
	SidebarContextValue,
	SidebarHistoryProps,
	// State Types
	SidebarState,
	SidebarToggleProps,
	SidebarUserNavProps,
	UpdateVisibilityResult,
} from "./types"
