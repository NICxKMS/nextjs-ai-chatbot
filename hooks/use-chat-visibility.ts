"use client"

/**
 * useChatVisibility Hook
 *
 * Hook to manage chat visibility state with optimistic updates,
 * server persistence, and error handling with rollback.
 *
 * @module hooks/use-chat-visibility
 */

import { useMemo, useRef } from "react"
import { toast } from "sonner"
import useSWR, { useSWRConfig } from "swr"
import useSWRInfinite from "swr/infinite"

import {
	updateVisibilityAction,
	type VisibilityType,
} from "@/features/chat/actions"
import type { ChatHistory } from "@/features/sidebar"

const HISTORY_PAGE_SIZE = 20

function getChatHistoryPaginationKey(
	pageIndex: number,
	previousPageData: ChatHistory | null,
): string | null {
	if (pageIndex === 0) {
		return `/api/history?limit=${HISTORY_PAGE_SIZE}`
	}

	if (!previousPageData?.hasMore || !previousPageData.nextCursor) {
		return null
	}

	return `/api/history?limit=${HISTORY_PAGE_SIZE}&cursor=${previousPageData.nextCursor}&direction=forward`
}

/**
 * Hook to manage chat visibility with optimistic updates
 *
 * @param chatId - The chat ID
 * @param initialVisibilityType - Initial visibility type
 */
export function useChatVisibility({
	chatId,
	initialVisibilityType,
}: {
	chatId: string
	initialVisibilityType: VisibilityType
}) {
	const { mutate } = useSWRConfig()

	// Track pending visibility update for request deduplication
	const pendingUpdateRef = useRef<AbortController | null>(null)

	const { data: historyPages } = useSWRInfinite<ChatHistory>(
		getChatHistoryPaginationKey,
		null, // No fetcher - we just want to read from cache
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			revalidateIfStale: false,
			revalidateOnMount: false,
		},
	)

	const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
		`${chatId}-visibility`,
		null,
		{
			fallbackData: initialVisibilityType,
		},
	)

	const visibilityType = useMemo(() => {
		if (!historyPages || historyPages.length === 0) {
			return localVisibility
		}

		for (const historyPage of historyPages) {
			const chat = historyPage.chats.find(
				(currentChat) => currentChat.id === chatId,
			)

			if (chat) {
				return chat.visibility
			}
		}

		return localVisibility
	}, [chatId, historyPages, localVisibility])

	const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
		if (updatedVisibilityType === visibilityType) {
			return
		}

		// Cancel any pending visibility update to prevent race conditions
		if (pendingUpdateRef.current) {
			pendingUpdateRef.current.abort()
		}
		pendingUpdateRef.current = new AbortController()

		// Store previous value for potential rollback
		const previousVisibility = localVisibility

		// Optimistically update UI
		setLocalVisibility(updatedVisibilityType)

		// Trigger revalidation of the chat history cache
		mutate(
			(key) => typeof key === "string" && key.startsWith("/api/history"),
			undefined,
			{ revalidate: true },
		)

		try {
			// Persist to server
			const result = await updateVisibilityAction({
				chatId,
				visibility: updatedVisibilityType,
			})

			if (!result.success) {
				// Rollback on failure
				setLocalVisibility(previousVisibility)
				toast.error(result.error || "Failed to update visibility")
				return
			}

			toast.success(
				updatedVisibilityType === "public"
					? "Chat is now public"
					: "Chat is now private",
			)
		} catch (error) {
			// Don't rollback if this request was aborted (superseded by newer request)
			if (error instanceof Error && error.name === "AbortError") {
				return
			}

			// Rollback optimistic update on failure
			setLocalVisibility(previousVisibility)
			toast.error("Failed to update visibility")
		} finally {
			pendingUpdateRef.current = null
		}
	}

	return { visibilityType, setVisibilityType }
}

// Re-export the type for consumers
export type { VisibilityType }
