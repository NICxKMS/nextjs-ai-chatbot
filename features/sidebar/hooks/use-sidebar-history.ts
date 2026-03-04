"use client"

import { useCallback } from "react"
import useSWRInfinite from "swr/infinite"
import { useSession } from "@/features/auth/components/session-provider"
import type { Chat } from "@/lib/types/models.types"

// ── Types ────────────────────────────────────────────────────

/** Shape returned by GET /api/history */
interface HistoryPage {
	chats: Chat[]
	hasMore: boolean
	nextCursor?: string
}

/** Return value of useSidebarHistory */
export interface UseSidebarHistoryReturn {
	/** Flat array of chats across all loaded pages */
	chats: Chat[]
	/** Whether more pages are available beyond what's loaded */
	hasMore: boolean
	/** Load the next page of history */
	loadMore: () => void
	/** True during initial load or when loading the next page */
	isLoading: boolean
}

// ── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20

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
		chats: Chat[]
		hasMore: boolean
	}
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

	const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<HistoryPage>(
		// Null key when no authenticated user — skips all requests
		session?.user ? getKey : () => null,
		historyFetcher,
		{
			revalidateFirstPage: false,
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			fallbackData,
			// Skip mount revalidation when server data is available
			revalidateOnMount: !fallbackData,
		},
	)

	const chats = data ? data.flatMap((page) => page.chats) : []

	const hasMore = data ? (data[data.length - 1]?.hasMore ?? false) : false

	const loadMore = useCallback(() => {
		if (!isValidating && hasMore) {
			setSize(size + 1)
		}
	}, [isValidating, hasMore, setSize, size])

	return {
		chats,
		hasMore,
		loadMore,
		isLoading: isLoading || isValidating,
	}
}
