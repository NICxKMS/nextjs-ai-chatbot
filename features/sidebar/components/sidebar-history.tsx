/**
 * Sidebar History Component
 *
 * Chat history list with date grouping, virtualization, and infinite scroll.
 * Supports optimistic chat entries for immediate UI feedback.
 *
 * @module features/sidebar/components/sidebar-history
 */

"use client"

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GroupedVirtuoso, type GroupedVirtuosoHandle } from "react-virtuoso"
import { toast } from "sonner"
import { LoaderIcon } from "@/components/icons"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth"
import type { Chat } from "@/lib/db/schema"
import { deleteChat } from "../actions"
import { useOptimisticChats } from "../hooks"
import type {
	ChatGroup,
	ChatHistory,
	GroupedChats,
	SidebarHistoryProps,
} from "../types"
import { SidebarItem } from "./sidebar-item"

// =============================================================================
// Constants
// =============================================================================

const PAGE_SIZE = 20

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Group chats by date with pre-calculated boundaries
 */
const groupChatsByDateWithBoundaries = (
	chats: Chat[],
	boundaries: { oneWeekAgo: Date; oneMonthAgo: Date },
): GroupedChats => {
	const { oneWeekAgo, oneMonthAgo } = boundaries

	return chats.reduce(
		(groups, chat) => {
			const chatDate = new Date(chat.createdAt)

			if (isToday(chatDate)) {
				groups.today.push(chat)
			} else if (isYesterday(chatDate)) {
				groups.yesterday.push(chat)
			} else if (chatDate > oneWeekAgo) {
				groups.lastWeek.push(chat)
			} else if (chatDate > oneMonthAgo) {
				groups.lastMonth.push(chat)
			} else {
				groups.older.push(chat)
			}

			return groups
		},
		{
			today: [],
			yesterday: [],
			lastWeek: [],
			lastMonth: [],
			older: [],
		} as GroupedChats,
	)
}

/**
 * Convert grouped chats into an array of groups for GroupedVirtuoso
 * Includes optimistic chats in a special group at the top.
 *
 * @param groupedChats - The grouped chats object
 * @param optimisticChats - Optimistic chats to include at the top
 * @returns Array of groups with labels and items
 */
const convertToVirtuosoGroups = (
	groupedChats: GroupedChats | null,
	optimisticChats: Chat[],
): ChatGroup[] => {
	if (!groupedChats) {
		return []
	}

	const groups: ChatGroup[] = []

	// Today group includes optimistic chats
	if (groupedChats.today.length > 0 || optimisticChats.length > 0) {
		// Create today items
		const todayItems = [...groupedChats.today]
		groups.push({
			label: "Today",
			items: todayItems,
			isOptimistic: optimisticChats.length > 0,
		})
		// Prepend optimistic group if we have any
		if (optimisticChats.length > 0) {
			groups.unshift({
				label: "__optimistic__",
				items: optimisticChats,
				isOptimistic: true,
			})
		}
	}

	if (groupedChats.yesterday.length > 0) {
		groups.push({ label: "Yesterday", items: groupedChats.yesterday })
	}

	if (groupedChats.lastWeek.length > 0) {
		groups.push({ label: "Last 7 days", items: groupedChats.lastWeek })
	}

	if (groupedChats.lastMonth.length > 0) {
		groups.push({ label: "Last 30 days", items: groupedChats.lastMonth })
	}

	if (groupedChats.older.length > 0) {
		groups.push({
			label: "Older than last month",
			items: groupedChats.older,
		})
	}

	return groups
}

/**
 * API response envelope for /api/history
 */
interface HistoryApiEnvelope {
	success: boolean
	data?: {
		data?: Chat[]
		pagination?: {
			nextCursor?: string | null
			hasMore?: boolean
		}
	}
}

/**
 * Parse /api/history response into sidebar history shape.
 */
function parseHistoryResponse(payload: unknown): ChatHistory {
	if (
		typeof payload === "object" &&
		payload !== null &&
		"success" in payload
	) {
		const envelope = payload as HistoryApiEnvelope
		if (envelope.success) {
			const chats = envelope.data?.data
			const hasMore = envelope.data?.pagination?.hasMore
			const nextCursor = envelope.data?.pagination?.nextCursor

			if (Array.isArray(chats)) {
				return {
					chats,
					hasMore: Boolean(hasMore),
					nextCursor: nextCursor ?? null,
				}
			}
		}
	}

	if (
		typeof payload === "object" &&
		payload !== null &&
		"chats" in payload &&
		Array.isArray((payload as ChatHistory).chats)
	) {
		const legacyPayload = payload as ChatHistory
		return {
			chats: legacyPayload.chats,
			hasMore: legacyPayload.hasMore,
			nextCursor: legacyPayload.nextCursor ?? null,
		}
	}

	return {
		chats: [],
		hasMore: false,
		nextCursor: null,
	}
}

// =============================================================================
// Component
// =============================================================================

/**
 * Sidebar history component
 *
 * Displays chat history grouped by date with virtualization and delete functionality.
 * Supports optimistic chat entries for immediate UI feedback.
 */
export function SidebarHistory({ user }: SidebarHistoryProps) {
	const { setOpenMobile, open: isSidebarOpen } = useSidebar()
	const { id } = useParams()
	const router = useRouter()
	const { isNewSession } = useAuth()

	// Optimistic chats management
	const { optimisticChats, removeOptimisticChat } = useOptimisticChats()

	// State for chat history
	const [chats, setChats] = useState<Chat[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasMore, setHasMore] = useState(false)
	const [nextCursor, setNextCursor] = useState<string | null>(null)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

	// Delete dialog state
	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	// Track boundaries calculation
	const lastBoundaryCalcRef = useRef<number>(0)

	// Virtuoso ref for programmatic control
	const virtuosoRef = useRef<GroupedVirtuosoHandle>(null)

	// Track processed optimistic IDs to prevent re-processing
	const processedOptimisticIds = useRef<Set<string>>(
		new Set(optimisticChats.map((c) => c.id)),
	)

	// Fetch chat history
	const fetchChats = useCallback(
		async (cursor?: string) => {
			if (!user) return

			try {
				const query = new URLSearchParams({
					limit: String(PAGE_SIZE),
				})

				if (cursor) {
					query.set("cursor", cursor)
					query.set("direction", "forward")
				}

				const response = await fetch(`/api/history?${query.toString()}`)

				if (!response.ok) {
					throw new Error("Failed to fetch chats")
				}

				const payload = (await response.json()) as unknown
				return parseHistoryResponse(payload)
			} catch (error) {
				console.error("Failed to fetch chats:", error)
				return { chats: [], hasMore: false, nextCursor: null }
			}
		},
		[user],
	)

	// Initial fetch
	useEffect(() => {
		const loadInitialChats = async () => {
			if (isNewSession) {
				setChats([])
				setHasMore(false)
				setNextCursor(null)
				setIsLoading(false)
				return
			}

			setIsLoading(true)
			const data = await fetchChats()
			if (data) {
				setChats(data.chats)
				setHasMore(data.hasMore)
				setNextCursor(data.nextCursor ?? null)
			}
			setIsLoading(false)
		}

		loadInitialChats()
	}, [fetchChats, isNewSession])

	// Clear chats when user logs out (user becomes undefined)
	useEffect(() => {
		if (!user) {
			setChats([])
			setHasMore(false)
			setNextCursor(null)
			setIsLoading(false)
		}
	}, [user])

	// Remove optimistic chats once real chats are loaded
	useEffect(() => {
		if (chats.length > 0) {
			const allChatIds = new Set(chats.map((chat) => chat.id))
			for (const optimisticChat of optimisticChats) {
				if (
					allChatIds.has(optimisticChat.id) &&
					!processedOptimisticIds.current.has(optimisticChat.id)
				) {
					processedOptimisticIds.current.add(optimisticChat.id)
					removeOptimisticChat(optimisticChat.id)
				}
			}

			// Prevent unbounded memory growth
			if (processedOptimisticIds.current.size > 100) {
				const currentOptimisticIds = new Set(
					optimisticChats.map((c) => c.id),
				)
				for (const processedId of processedOptimisticIds.current) {
					if (
						!currentOptimisticIds.has(processedId) &&
						!allChatIds.has(processedId)
					) {
						processedOptimisticIds.current.delete(processedId)
					}
				}
			}
		}
	}, [chats, optimisticChats, removeOptimisticChat])

	// Listen for title updates (for short responses where title generates after streaming)
	useEffect(() => {
		const handleTitleUpdate = () => {
			// Re-fetch chat history to pick up newly generated titles
			fetchChats().then((data) => {
				if (data) {
					setChats(data.chats)
					setHasMore(data.hasMore)
					setNextCursor(data.nextCursor ?? null)
				}
			})
		}

		window.addEventListener("chat-title-updated", handleTitleUpdate)
		return () => {
			window.removeEventListener("chat-title-updated", handleTitleUpdate)
		}
	}, [fetchChats])

	// Load more chats (for infinite scroll)
	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore || !nextCursor) return

		setIsLoadingMore(true)
		setLoadMoreError(null) // Clear previous error
		try {
			const data = await fetchChats(nextCursor)
			if (data) {
				setChats((prev) => {
					// Deduplicate by chat ID to prevent duplicates from pagination
					const existingIds = new Set(prev.map((chat) => chat.id))
					const newChats = data.chats.filter(
						(chat) => !existingIds.has(chat.id),
					)
					return [...prev, ...newChats]
				})
				setHasMore(data.hasMore)
				setNextCursor(data.nextCursor ?? null)
			}
		} catch (error) {
			console.error("Failed to load more chats:", error)
			setLoadMoreError("Failed to load more chats. Please try again.")
		} finally {
			setIsLoadingMore(false)
		}
	}, [isLoadingMore, hasMore, nextCursor, fetchChats])

	// Handle delete
	const handleDelete = useCallback(async () => {
		if (!deleteId) return
		const targetChatId = deleteId
		const previousChats = chats

		setShowDeleteDialog(false)
		setDeleteId(null)
		setChats((prev) => prev.filter((chat) => chat.id !== targetChatId))

		const result = await deleteChat(targetChatId)

		if (result.success) {
			toast.success("Chat deleted successfully")

			// If deleted chat was active, redirect to home
			if (targetChatId === id) {
				router.push("/")
			}
		} else {
			setChats(previousChats)
			toast.error("Failed to delete chat")
		}
	}, [deleteId, chats, id, router])

	// Memoize date boundaries
	const dateBoundaries = useMemo(() => {
		const now = new Date()
		const currentDay = now.toDateString()
		const lastDay = new Date(lastBoundaryCalcRef.current).toDateString()

		if (
			lastBoundaryCalcRef.current > 0 &&
			currentDay === lastDay &&
			!isSidebarOpen
		) {
			// Return existing boundaries
		} else {
			lastBoundaryCalcRef.current = now.getTime()
		}

		return {
			oneWeekAgo: subWeeks(now, 1),
			oneMonthAgo: subMonths(now, 1),
		}
	}, [isSidebarOpen])

	// Memoize grouped chats with deduplication safety net
	const groupedChats = useMemo(() => {
		// Deduplicate chats by ID to prevent duplicate keys in render
		// This is a safety net for any race conditions in data loading
		const uniqueChats = Array.from(
			new Map(chats.map((chat) => [chat.id, chat])).values(),
		)
		return groupChatsByDateWithBoundaries(uniqueChats, dateBoundaries)
	}, [chats, dateBoundaries])

	// Convert to groups for GroupedVirtuoso (includes optimistic chats)
	const virtuosoGroups = useMemo(
		() => convertToVirtuosoGroups(groupedChats, optimisticChats as Chat[]),
		[groupedChats, optimisticChats],
	)

	// Calculate group counts for GroupedVirtuoso
	const groupCounts = useMemo(
		() => virtuosoGroups.map((group) => group.items.length),
		[virtuosoGroups],
	)

	// Create a flat list of all chat items for index calculation
	const flatItems = useMemo(() => {
		return virtuosoGroups.flatMap((group) =>
			group.items.map((chat) => ({
				chat,
				groupLabel: group.label,
				isOptimistic: group.label === "__optimistic__",
			})),
		)
	}, [virtuosoGroups])

	// Render group header content
	const renderGroupContent = useCallback(
		(index: number) => {
			const group = virtuosoGroups[index]
			if (!group) {
				return null
			}
			// Skip rendering header for optimistic pseudo-group (merged with Today)
			if (group.label === "__optimistic__") {
				return (
					<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
						Today
					</div>
				)
			}
			// Skip Today header if optimistic group exists (already rendered)
			if (
				group.label === "Today" &&
				virtuosoGroups[0]?.label === "__optimistic__"
			) {
				return null
			}
			return (
				<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
					{group.label}
				</div>
			)
		},
		[virtuosoGroups],
	)

	// Render individual chat item
	const renderItemContent = useCallback(
		(index: number) => {
			const item = flatItems[index]
			if (!item) {
				return null
			}

			const { chat, isOptimistic } = item

			return (
				<SidebarItem
					chat={chat}
					isActive={chat.id === id}
					onDelete={(chatId) => {
						if (isOptimistic) {
							// Optimistic chats can't be deleted from server
							return
						}
						setDeleteId(chatId)
						setShowDeleteDialog(true)
					}}
					setOpenMobile={setOpenMobile}
				/>
			)
		},
		[flatItems, id, setOpenMobile],
	)

	// Handle reaching the end of the list for infinite loading
	const handleEndReached = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			loadMore()
		}
	}, [isLoadingMore, hasMore, loadMore])

	// Footer component for loading/end state
	const renderFooter = useCallback(() => {
		// Show error state with retry button
		if (loadMoreError) {
			return (
				<div className="mt-4 flex w-full flex-col items-center gap-2 px-2 pb-4">
					<div className="text-sm text-red-500 dark:text-red-400">
						{loadMoreError}
					</div>
					<button
						className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
						onClick={() => {
							setLoadMoreError(null)
							loadMore()
						}}
						type="button"
					>
						Try again
					</button>
				</div>
			)
		}

		if (!hasMore && flatItems.length > 0) {
			return (
				<div className="mt-8 flex w-full flex-row items-center justify-center gap-2 px-2 pb-4 text-sm text-zinc-500">
					You have reached the end of your chat history.
				</div>
			)
		}
		if (isLoadingMore) {
			return (
				<div className="mt-8 flex flex-row items-center gap-2 p-2 text-zinc-500 dark:text-zinc-400">
					<div className="animate-spin">
						<LoaderIcon />
					</div>
					<div>Loading Chats...</div>
				</div>
			)
		}
		return null
	}, [hasMore, flatItems.length, isLoadingMore, loadMoreError, loadMore])

	// Show login prompt for unauthenticated users
	if (!user) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
						Login to save and revisit previous chats!
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	// Show loading state
	if (isLoading) {
		return (
			<SidebarGroup className="flex-1 overflow-hidden">
				<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
					Today
				</div>
				<SidebarGroupContent className="h-full">
					<div aria-busy="true" className="flex h-full flex-col">
						{[44, 32, 28, 64, 52].map((item) => (
							<div
								className="flex h-8 items-center gap-2 rounded-md px-2"
								key={item}
							>
								<div
									className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
									style={
										{
											"--skeleton-width": `${item}%`,
										} as React.CSSProperties
									}
								/>
							</div>
						))}
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	// Show empty state (but not if we have optimistic chats)
	if (chats.length === 0 && optimisticChats.length === 0) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
						No chats yet. Start a new conversation!
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	return (
		<>
			<SidebarGroup className="flex-1 overflow-hidden">
				<SidebarGroupContent className="flex h-full flex-col">
					<SidebarMenu className="h-full min-h-0 flex-1">
						{virtuosoGroups.length > 0 && (
							<GroupedVirtuoso
								components={{
									Footer: renderFooter,
								}}
								endReached={handleEndReached}
								groupContent={renderGroupContent}
								groupCounts={groupCounts}
								increaseViewportBy={{
									top: 200,
									bottom: 200,
								}}
								itemContent={renderItemContent}
								ref={virtuosoRef}
								style={{ height: "100%" }}
							/>
						)}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>

			{/* Delete confirmation dialog */}
			<AlertDialog
				onOpenChange={setShowDeleteDialog}
				open={showDeleteDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete chat?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently
							delete this chat and remove it from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
