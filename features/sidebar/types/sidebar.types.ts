import type { Chat } from "@/lib/types/models.types"
import type { PendingChatsState } from "@/lib/types/pending-chats.types"

// ── Pending chats context ────────────────────────────────────
// Context value exposed by PendingChatsProvider (P5-T02).
// Reuses PendingChatsState which already defines entries + operations
// (add, remove, updateTitle, markConfirmed) in terms of shared PendingChat.

export type PendingChatsContextValue = PendingChatsState

// ── Sidebar history grouping ─────────────────────────────────
// Groups server-fetched chats by date for display in SidebarHistoryClient.
// Labels: "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Older"

export interface SidebarHistoryGroup {
	label: string
	chats: Chat[]
}
