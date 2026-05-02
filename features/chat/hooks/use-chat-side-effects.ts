"use client"

import type { UIMessage } from "ai"
import { useEffect, useRef } from "react"

interface UseChatSideEffectsConfig {
	/** Current chat ID */
	id: string
	/** Current messages array */
	messages: UIMessage[]
	/** Abort the current streaming response (from useChat) */
	stop: () => void
	/** Optional callback invoked on chat change (e.g., artifactStore.reset) — wired by ChatShell */
	onChatChange?: () => void
}

/**
 * Manages chat side effects:
 * 1. URL update via history.replaceState when a new chat receives its first response
 * 2. Abort in-progress streaming on chat change (calls stop from useChat)
 * 3. Artifact reset on navigation (via onChatChange callback)
 *
 * Pure side-effect hook — no return value.
 */
export function useChatSideEffects({
	id,
	messages,
	stop,
	onChatChange,
}: UseChatSideEffectsConfig): void {
	const prevIdRef = useRef(id)
	const hasUpdatedUrlRef = useRef(false)

	// ── URL update on new chat ─────────────────────────────────
	// When a new chat (URL is "/") gets its first assistant response,
	// update the URL to /chat/{id} without a full navigation.
	useEffect(() => {
		if (hasUpdatedUrlRef.current) return
		if (messages.length < 2) return

		const isNewChat =
			window.location.pathname === "/" || !window.location.pathname.includes(`/chat/${id}`)

		if (isNewChat) {
			window.history.replaceState({}, "", `/chat/${id}`)
			hasUpdatedUrlRef.current = true
		}
	}, [id, messages.length])

	// ── Chat change cleanup ────────────────────────────────────
	// On navigation to a different chat, reset artifact state and
	// reset the URL-update guard for the next new-chat flow.
	useEffect(() => {
		if (prevIdRef.current === id) return
		prevIdRef.current = id
		hasUpdatedUrlRef.current = false
		stop()
		onChatChange?.()
	}, [id, stop, onChatChange])
}
