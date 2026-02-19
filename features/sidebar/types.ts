/**
 * Sidebar Feature Types
 *
 * Type definitions for the sidebar feature module.
 *
 * @module features/sidebar/types
 */

import type { Chat } from "@/lib/db/schema"

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for the main AppSidebar component
 */
export interface AppSidebarProps {
	/** Custom class name */
	className?: string
}

/**
 * Props for SidebarHistory component
 */
export interface SidebarHistoryProps {
	/** User info for display */
	user?: { email?: string | null } | null | undefined
}

/**
 * Props for individual chat item in sidebar
 */
export interface ChatItemProps {
	/** Chat data */
	chat: Chat
	/** Whether this chat is currently active */
	isActive: boolean
	/** Callback when delete is requested */
	onDelete: (chatId: string) => void
	/** Callback to close mobile sidebar */
	setOpenMobile: (open: boolean) => void
}

/**
 * Props for SidebarUserNav component
 */
export interface SidebarUserNavProps {
	/** User info for display */
	user?: { email?: string | null } | null | undefined
}

/**
 * Props for SidebarToggle component
 */
export interface SidebarToggleProps {
	/** Custom class name */
	className?: string
}

// =============================================================================
// State Types
// =============================================================================

/**
 * Sidebar state interface
 */
export interface SidebarState {
	/** Whether sidebar is expanded */
	isExpanded: boolean
	/** Whether sidebar is loading */
	isLoading: boolean
}

/**
 * Sidebar context value
 */
export interface SidebarContextValue {
	/** Current sidebar state */
	state: SidebarState
	/** Toggle sidebar open/close */
	toggle: () => void
	/** Open sidebar */
	open: () => void
	/** Close sidebar */
	close: () => void
}

/**
 * Return type for useSidebarState hook
 */
export interface UseSidebarStateReturn {
	/** Whether sidebar is expanded */
	isExpanded: boolean
	/** Toggle sidebar state */
	toggle: () => void
	/** Expand sidebar */
	expand: () => void
	/** Collapse sidebar */
	collapse: () => void
	/** Whether viewport is mobile */
	isMobile: boolean | undefined
}

// =============================================================================
// Data Types
// =============================================================================

/**
 * Chat history grouped by date
 */
export interface GroupedChats {
	/** Chats from today */
	today: Chat[]
	/** Chats from yesterday */
	yesterday: Chat[]
	/** Chats from last 7 days */
	lastWeek: Chat[]
	/** Chats from last 30 days */
	lastMonth: Chat[]
	/** Chats older than 30 days */
	older: Chat[]
}

/**
 * Chat group for virtualized list
 */
export interface ChatGroup {
	/** Group label (e.g., "Today", "Yesterday") */
	label: string
	/** Chat items in this group */
	items: Chat[]
	/** Whether this group contains optimistic chats */
	isOptimistic?: boolean
}

/**
 * Chat history response from API
 */
export interface ChatHistory {
	/** Array of chats */
	chats: Chat[]
	/** Whether there are more chats to load */
	hasMore: boolean
	/** Cursor for next page */
	nextCursor?: string | null
}

/**
 * Pagination parameters for chat history
 */
export interface ChatHistoryPagination {
	/** Number of items per page */
	limit: number
	/** Cursor for pagination */
	cursor?: string | null
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * Result of delete chat action
 */
export interface DeleteChatResult {
	/** Whether deletion was successful */
	success: boolean
	/** ID of deleted chat */
	chatId: string
}

/**
 * Result of delete all chats action
 */
export interface DeleteAllChatsResult {
	/** Whether deletion was successful */
	success: boolean
	/** Number of chats deleted */
	deletedCount: number
}

/**
 * Result of update visibility action
 */
export interface UpdateVisibilityResult {
	/** Whether update was successful */
	success: boolean
	/** Chat ID */
	chatId: string
	/** New visibility value */
	visibility: "public" | "private"
}
