"use client"

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react"
import type { PendingChat, PendingChatsState } from "@/lib/types/pending-chats.types"

// ── Context ──────────────────────────────────────────────────

const PendingChatsContext = createContext<PendingChatsState | null>(null)

// ── Provider ─────────────────────────────────────────────────
// Wraps both sidebar and content in the chat layout so all
// consumers share the same pending-chats state.

export function PendingChatsProvider({ children }: { children: ReactNode }) {
	const [entries, setEntries] = useState<PendingChat[]>([])
	const reservedIds = useRef(new Set<string>())

	const dropEntry = useCallback((id: string, shouldReleaseId = false) => {
		if (shouldReleaseId) {
			reservedIds.current.delete(id)
		}
		setEntries((prev) => prev.filter((entry) => entry.id !== id))
	}, [])

	// Add a pending chat to the head of the list.
	// Reserved IDs prevent duplicate optimistic rows and re-adding
	// chats that have already been confirmed by the server.
	const add = useCallback((chat: Omit<PendingChat, "isOptimistic">) => {
		if (reservedIds.current.has(chat.id)) return
		reservedIds.current.add(chat.id)
		setEntries((prev) => [{ ...chat, isOptimistic: true }, ...prev])
	}, [])

	// Remove a pending chat by ID (e.g. on delete).
	const remove = useCallback(
		(id: string) => {
			dropEntry(id, true)
		},
		[dropEntry],
	)

	// Update the title in-place — single-channel title delivery
	// from `chat-title` stream events.
	const updateTitle = useCallback((id: string, title: string) => {
		setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title } : e)))
	}, [])

	// Drop the optimistic entry once the server confirms persistence.
	const markConfirmed = useCallback(
		(id: string) => {
			dropEntry(id)
		},
		[dropEntry],
	)

	return (
		<PendingChatsContext value={{ entries, add, remove, updateTitle, markConfirmed }}>
			{children}
		</PendingChatsContext>
	)
}

// ── Hook ─────────────────────────────────────────────────────

export function usePendingChats(): PendingChatsState {
	const ctx = useContext(PendingChatsContext)
	if (!ctx) {
		throw new Error("usePendingChats must be used within PendingChatsProvider")
	}
	return ctx
}
