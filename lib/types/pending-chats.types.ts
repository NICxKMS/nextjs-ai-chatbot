import type { Visibility } from "./entity.types"

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

export type PendingChatPatch = Partial<Pick<PendingChat, "title" | "visibility">>

export interface PendingChatOperations {
	add(chat: Omit<PendingChat, "isOptimistic">): void
	patch(id: string, patch: PendingChatPatch): void
	remove(id: string): void
	markConfirmed(id: string): void
}

// ── Provider state shape ─────────────────────────────────────
// Full context value exposed by PendingChatsProvider. Entries start as
// visible optimistic rows, then downgrade to hidden overlay state until
// server history catches up with the latest title or visibility.

export interface PendingChatsState extends PendingChatOperations {
	entries: PendingChat[]
}
