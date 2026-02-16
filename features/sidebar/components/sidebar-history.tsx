/**
 * Sidebar History Component
 *
 * Chat history list with date grouping and infinite scroll.
 *
 * @module features/sidebar/components/sidebar-history
 */

"use client"

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import type { Chat } from "@/lib/db/schema"
import { deleteChat } from "../actions"
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
 * Convert grouped chats into an array of groups for rendering
 */
const convertToGroups = (groupedChats: GroupedChats | null): ChatGroup[] => {
	if (!groupedChats) {
		return []
	}

	const groups: ChatGroup[] = []

	if (groupedChats.today.length > 0) {
		groups.push({ label: "Today", items: groupedChats.today })
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

// =============================================================================
// Component
// =============================================================================

/**
 * Sidebar history component
 *
 * Displays chat history grouped by date with delete functionality.
 */
export function SidebarHistory({ user }: SidebarHistoryProps) {
	const { setOpenMobile, open: isSidebarOpen } = useSidebar()
	const { id } = useParams()
	const router = useRouter()

	// State for chat history
	const [chats, setChats] = useState<Chat[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasMore, setHasMore] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	// Delete dialog state
	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	// Track boundaries calculation
	const lastBoundaryCalcRef = useRef<number>(0)

	// Fetch chat history
	const fetchChats = useCallback(
		async (endingBefore?: string) => {
			if (!user) return

			try {
				const response = await fetch(
					`/api/history?limit=${PAGE_SIZE}${endingBefore ? `&ending_before=${endingBefore}` : ""}`,
				)

				if (!response.ok) {
					throw new Error("Failed to fetch chats")
				}

				const data: ChatHistory = await response.json()
				return data
			} catch (error) {
				console.error("Failed to fetch chats:", error)
				return { chats: [], hasMore: false }
			}
		},
		[user],
	)

	// Initial fetch
	useEffect(() => {
		const loadInitialChats = async () => {
			setIsLoading(true)
			const data = await fetchChats()
			if (data) {
				setChats(data.chats)
				setHasMore(data.hasMore)
			}
			setIsLoading(false)
		}

		loadInitialChats()
	}, [fetchChats])

	// Load more chats
	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore || chats.length === 0) return

		setIsLoadingMore(true)
		const lastChat = chats.at(-1)
		if (!lastChat) {
			setIsLoadingMore(false)
			return
		}
		const data = await fetchChats(lastChat.id)
		if (data) {
			setChats((prev) => [...prev, ...data.chats])
			setHasMore(data.hasMore)
		}
		setIsLoadingMore(false)
	}, [isLoadingMore, hasMore, chats, fetchChats])

	// Handle delete
	const handleDelete = useCallback(async () => {
		if (!deleteId) return

		const result = await deleteChat(deleteId)

		if (result.success) {
			setChats((prev) => prev.filter((chat) => chat.id !== deleteId))
			toast.success("Chat deleted successfully")

			// If deleted chat was active, redirect to home
			if (deleteId === id) {
				router.push("/")
			}
		} else {
			toast.error("Failed to delete chat")
		}

		setShowDeleteDialog(false)
		setDeleteId(null)
	}, [deleteId, id, router])

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

	// Memoize grouped chats
	const groupedChats = useMemo(() => {
		return groupChatsByDateWithBoundaries(chats, dateBoundaries)
	}, [chats, dateBoundaries])

	// Convert to groups for rendering
	const chatGroups = useMemo(
		() => convertToGroups(groupedChats),
		[groupedChats],
	)

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

	// Show empty state
	if (chats.length === 0) {
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
				<SidebarGroupContent className="h-full overflow-auto">
					{chatGroups.map((group) => (
						<div key={group.label}>
							<div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
								{group.label}
							</div>
							<SidebarMenu>
								{group.items.map((chat) => (
									<SidebarItem
										chat={chat}
										isActive={chat.id === id}
										key={chat.id}
										onDelete={(chatId) => {
											setDeleteId(chatId)
											setShowDeleteDialog(true)
										}}
										setOpenMobile={setOpenMobile}
									/>
								))}
							</SidebarMenu>
						</div>
					))}

					{/* Load more button */}
					{hasMore && (
						<div className="flex justify-center p-2">
							<button
								className="text-sidebar-foreground/50 text-xs hover:text-sidebar-foreground"
								onClick={loadMore}
								type="button"
							>
								{isLoadingMore ? (
									<span className="flex items-center gap-2">
										<LoaderIcon className="animate-spin" />
										Loading...
									</span>
								) : (
									"Load more"
								)}
							</button>
						</div>
					)}
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
