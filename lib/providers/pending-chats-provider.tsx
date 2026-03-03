"use client"

import type { ReactNode } from "react"

/**
 * Stub PendingChatsProvider — passes children through.
 *
 * Full implementation in P5-T02 with add/remove/updateTitle/markConfirmed operations.
 * @see lib/types/pending-chats.types.ts for the PendingChatOperations interface.
 */
export function PendingChatsProvider({ children }: { children: ReactNode }) {
	return <>{children}</>
}
