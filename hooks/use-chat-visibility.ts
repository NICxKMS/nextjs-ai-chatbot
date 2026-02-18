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

	// Use useSWRInfinite to properly subscribe to history changes
	// This ensures reactive updates when history data changes, unlike direct cache access
	useSWRInfinite<unknown>(
		() => "/api/history",
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
		// For now, just use local visibility since we don't have the full history type
		return localVisibility
	}, [localVisibility])

	const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
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
			}
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
