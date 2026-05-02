"use client"

import { useCallback } from "react"
import useSWRInfinite from "swr/infinite"
import { useSession } from "@/features/auth/components/session-provider"
import type { ChatSummary } from "@/lib/types/entity.types"

// ── Types ────────────────────────────────────────────────────

/** Shape returned by GET /api/history */
interface HistoryPage {
	chats: ChatSummary[]
	hasMore: boolean
	nextCursor?: string
}

type SidebarHistoryPatch = Partial<Pick<ChatSummary, "title" | "visibility">>

/** Return value of useSidebarHistory */
export interface UseSidebarHistoryReturn {
	/** Flat array of chats across all loaded pages */
	chats: ChatSummary[]
	/** Whether more pages are available beyond what's loaded */
	hasMore: boolean
	/** Last pagination or revalidation error */
	error: Error | undefined
	/** Load the next page of history */
	loadMore: () => void
	/** Retry the current history request set after a failed page load */
	retry: () => void
	/** True during initial load or when loading the next page */
	isLoading: boolean
	/** Patch a loaded chat locally without forcing a revalidation */
	patchChat: (chatId: string, patch: SidebarHistoryPatch) => void
}

// ── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20

/** Base path prefix for history SWR keys — shared with other components
 *  that need to revalidate or clear the history cache (e.g. delete-all). */
export const HISTORY_KEY_PREFIX = "/api/history"

// ── Fetcher ──────────────────────────────────────────────────

async function historyFetcher(url: string): Promise<HistoryPage> {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`History fetch failed: ${response.status}`)
	}
	return response.json()
}

// ── Key generator ────────────────────────────────────────────

function getKey(pageIndex: number, previousPageData: HistoryPage | null): string | null {
	// Stop fetching when there are no more pages
	if (previousPageData && !previousPageData.hasMore) {
		return null
	}

	// First page — no cursor needed
	if (pageIndex === 0) {
		return `/api/history?limit=${PAGE_SIZE}`
	}

	// Subsequent pages — use cursor from previous page
	const cursor = previousPageData?.nextCursor
	if (!cursor) {
		return null
	}

	return `/api/history?limit=${PAGE_SIZE}&cursor=${cursor}`
}

// ── Hook ─────────────────────────────────────────────────────

/** Options for `useSidebarHistory` */
interface UseSidebarHistoryOptions {
	/** Server-provided initial data for page 0. When supplied, SWR uses it
	 *  as `fallbackData` and skips the redundant first-page fetch. */
	initialData?: {
		chats: ChatSummary[]
		hasMore: boolean
	}
	/** Called when SWR successfully completes a revalidation. Useful for
	 *  clearing optimistic state that is now reflected in server data. */
	onSuccess?: () => void
}

/**
 * Paginated chat history hook using `useSWRInfinite`.
 *
 * When `initialData` is provided (from the server component), it is
 * passed as `fallbackData` so SWR uses the server data for page 0
 * without issuing a duplicate network request.
 *
 * Returns null key when no authenticated user to skip fetching.
 */
export function useSidebarHistory(options?: UseSidebarHistoryOptions): UseSidebarHistoryReturn {
	const { session } = useSession()

	// Build fallbackData from server-provided initial chats so SWR
	// doesn't re-fetch page 0 on mount.
	/**
	 * Build fallbackData for SWR page 0 from server-provided initial chats.
	 *
	 * The `nextCursor` is derived from the last chat's ID because the server
	 * API uses the ID of the last returned item as the pagination cursor.
	 * This matches the contract of `GET /api/history?cursor=<id>`, which
	 * returns chats created before the chat with the given ID.
	 */
	const fallbackData = options?.initialData
		? [
				{
					chats: options.initialData.chats,
					hasMore: options.initialData.hasMore,
					nextCursor:
						options.initialData.hasMore && options.initialData.chats.length > 0
							? options.initialData.chats[options.initialData.chats.length - 1]?.id
							: undefined,
				},
			]
		: undefined

	const { data, error, mutate, setSize, size, isLoading, isValidating } = useSWRInfinite<
		HistoryPage,
		Error
	>(
		// Null key when no authenticated user — skips all requests
		session?.user ? getKey : () => null,
		historyFetcher,
		{
			revalidateFirstPage: false,
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
			fallbackData,
			// Skip mount revalidation when server data is available
			revalidateOnMount: !fallbackData,
			onSuccess: options?.onSuccess,
		},
	)

	const chats = data ? data.flatMap((page) => page.chats) : []

	const hasMore = data ? (data[data.length - 1]?.hasMore ?? false) : false

	const isLoadingMore = isLoading || (isValidating && size > (data?.length ?? 0))

	const loadMore = useCallback(() => {
		if (!isValidating && !error && hasMore) {
			setSize((prev) => prev + 1)
		}
	}, [error, hasMore, isValidating, setSize])

	const retry = useCallback(() => {
		void mutate()
	}, [mutate])

	const patchChat = useCallback(
		(chatId: string, patch: SidebarHistoryPatch) => {
			void mutate(
				(currentPages) =>
					currentPages?.map((page) => ({
						...page,
						chats: page.chats.map((chat) =>
							chat.id === chatId ? { ...chat, ...patch } : chat,
						),
					})),
				{ revalidate: false },
			)
		},
		[mutate],
	)

	return {
		chats,
		hasMore,
		error,
		loadMore,
		retry,
		isLoading: isLoadingMore,
		patchChat,
	}
}
