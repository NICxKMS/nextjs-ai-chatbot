"use client"

import { createContext, useContext } from "react"

import type { ChatSessionValue } from "@/features/chat/types/chat.types"

// Re-export so consumers can import the value type from the context module
export type { ChatSessionValue } from "@/features/chat/types/chat.types"

// ── Context ──────────────────────────────────────────────────
// ChatSessionContext is provided by ChatShell (P3-T21) and consumed
// by all chat child components (Messages, MultimodalInput, ChatHeader,
// ArtifactPanel). Value is undefined until ChatShell provides it.

export const ChatSessionContext = createContext<ChatSessionValue | undefined>(undefined)

// ── Hook ─────────────────────────────────────────────────────
// Intent-based API: consumers call sendMessage/stop/editMessage,
// NOT raw setters like setMessages/setStatus. The hook throws if
// used outside a ChatShell provider boundary.

export function useChatSessionContext(): ChatSessionValue {
	const context = useContext(ChatSessionContext)
	if (context === undefined) {
		throw new Error(
			"useChatSessionContext must be used within a ChatSessionContext.Provider (ChatShell)",
		)
	}
	return context
}
