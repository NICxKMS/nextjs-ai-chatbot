import type { Visibility } from "./models.types"

// ── Optimistic chat entry ────────────────────────────────────
// Represents a chat in the pending/optimistic state, used by
// PendingChatsProvider to manage sidebar UI before server confirmation.

export interface PendingChat {
	id: string
	title: string
	visibility: Visibility
	createdAt: Date
	isOptimistic: boolean
}

// ── Provider operations ──────────────────────────────────────

export interface PendingChatOperations {
	add(chat: Omit<PendingChat, "isOptimistic">): void
	remove(id: string): void
	updateTitle(id: string, title: string): void
	markConfirmed(id: string): void
}

// ── Provider state shape ─────────────────────────────────────
// Full context value exposed by PendingChatsProvider (P5-T02).

export interface PendingChatsState extends PendingChatOperations {
	entries: PendingChat[]
}
