import type { Chat } from "@/lib/types/models.types"

// ── Sidebar history grouping ─────────────────────────────────
// Groups server-fetched chats by date for display in SidebarHistoryClient.
// Labels: "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Older"

export interface SidebarHistoryGroup {
	label: string
	chats: Chat[]
}
