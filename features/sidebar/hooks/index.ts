/**
 * Sidebar Hooks Barrel Export
 *
 * Re-exports all hooks for sidebar state management.
 *
 * @module features/sidebar/hooks
 */

// Re-export from UI library for convenience
export { useSidebar } from "@/components/ui/sidebar"
// Re-export types
export type { UseSidebarStateReturn } from "../types"
// Optimistic chats management
export {
	type OptimisticChat,
	OptimisticChatsProvider,
	useOptimisticChats,
} from "./use-optimistic-chats"
export { useSidebarState } from "./use-sidebar"
