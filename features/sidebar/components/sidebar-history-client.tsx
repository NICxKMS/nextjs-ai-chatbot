"use client"

import { isToday, isYesterday, subDays } from "date-fns"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { LoaderIcon, TrashIcon } from "@/components/icons"
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
import { Button } from "@/components/ui/button"
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { deleteChat } from "@/features/chat/actions/delete-chat"
import { SidebarHistoryItem } from "@/features/sidebar/components/sidebar-history-item"
import { useSidebarHistory } from "@/features/sidebar/hooks/use-sidebar-history"
import type { SidebarHistoryGroup } from "@/features/sidebar/types/sidebar.types"
import { updateChatVisibility } from "@/features/visibility/actions/update-visibility"
import { usePendingChats } from "@/lib/providers/pending-chats-provider"
import type { Chat, Visibility } from "@/lib/types/models.types"
import type { PendingChat } from "@/lib/types/pending-chats.types"

// ── Props ──────────────────────────────────────────────────────

interface SidebarHistoryClientProps {
	initialChats: Chat[]
	initialHasMore: boolean
}

// ── Date grouping ──────────────────────────────────────────────

function groupChatsByDate(chats: Chat[]): SidebarHistoryGroup[] {
	const now = new Date()
	const sevenDaysAgo = subDays(now, 7)
	const thirtyDaysAgo = subDays(now, 30)

	const today: Chat[] = []
	const yesterday: Chat[] = []
	const lastWeek: Chat[] = []
	const lastMonth: Chat[] = []
	const older: Chat[] = []

	for (const chat of chats) {
		const date = new Date(chat.createdAt)
		if (isToday(date)) {
			today.push(chat)
		} else if (isYesterday(date)) {
			yesterday.push(chat)
		} else if (date > sevenDaysAgo) {
			lastWeek.push(chat)
		} else if (date > thirtyDaysAgo) {
			lastMonth.push(chat)
		} else {
			older.push(chat)
		}
	}

	const groups: SidebarHistoryGroup[] = []
	if (today.length > 0) groups.push({ label: "Today", chats: today })
	if (yesterday.length > 0) groups.push({ label: "Yesterday", chats: yesterday })
	if (lastWeek.length > 0) groups.push({ label: "Last 7 Days", chats: lastWeek })
	if (lastMonth.length > 0) groups.push({ label: "Last 30 Days", chats: lastMonth })
	if (older.length > 0) groups.push({ label: "Older", chats: older })

	return groups
}

// ── PendingChat → Chat adapter ─────────────────────────────────
// SidebarHistoryItem expects the full Chat type. Pending chats are
// missing userId/updatedAt/model — provide safe defaults for fields
// the item component never reads.

function pendingToChat(pending: PendingChat): Chat {
	return {
		id: pending.id,
		title: pending.title,
		visibility: pending.visibility,
		createdAt: pending.createdAt,
		updatedAt: pending.createdAt,
		userId: "",
		model: null,
	}
}

// ── Component ──────────────────────────────────────────────────

export function SidebarHistoryClient({ initialChats, initialHasMore }: SidebarHistoryClientProps) {
	const pathname = usePathname()
	const router = useRouter()
	const { setOpenMobile } = useSidebar()

	const { entries: pendingEntries, remove: removePending, markConfirmed } = usePendingChats()
	const {
		chats: paginatedChats,
		hasMore: swrHasMore,
		loadMore,
		isLoading,
	} = useSidebarHistory({
		initialData: { chats: initialChats, hasMore: initialHasMore },
	})

	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
	const sentinelRef = useRef<HTMLDivElement>(null)

	// ── Derived state ────────────────────────────────────────────

	// Extract active chat ID from pathname
	const activeChatId = useMemo(() => {
		const match = pathname.match(/^\/chat\/([^/]+)/)
		return match?.[1] ?? null
	}, [pathname])

	// Merge initial + SWR pages, deduplicate by ID, exclude deleted
	const serverChats = useMemo(() => {
		const map = new Map<string, Chat>()
		for (const chat of initialChats) map.set(chat.id, chat)
		for (const chat of paginatedChats) map.set(chat.id, chat)
		return Array.from(map.values()).filter((c) => !deletedIds.has(c.id))
	}, [initialChats, paginatedChats, deletedIds])

	// Pending chats to display — optimistic entries not yet in server data, not deleted
	const visiblePending = useMemo(() => {
		const serverIds = new Set(serverChats.map((c) => c.id))
		return pendingEntries.filter(
			(e) => e.isOptimistic && !serverIds.has(e.id) && !deletedIds.has(e.id),
		)
	}, [pendingEntries, serverChats, deletedIds])

	// Date-grouped server chats
	const groups = useMemo(() => groupChatsByDate(serverChats), [serverChats])

	// Separate Today from other groups so pending chats merge into Today
	const todayGroup = groups.find((g) => g.label === "Today")
	const otherGroups = groups.filter((g) => g.label !== "Today")

	// Whether more pages are available (use SWR once loaded, otherwise initial flag)
	const hasMore = paginatedChats.length > 0 ? swrHasMore : initialHasMore

	// ── Mark confirmed when server data contains pending chat ────

	useEffect(() => {
		const serverIds = new Set(serverChats.map((c) => c.id))
		for (const entry of pendingEntries) {
			if (entry.isOptimistic && serverIds.has(entry.id)) {
				markConfirmed(entry.id)
			}
		}
	}, [serverChats, pendingEntries, markConfirmed])

	// ── Infinite scroll via IntersectionObserver ────────────────

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel || !hasMore) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && !isLoading) {
					loadMore()
				}
			},
			{ rootMargin: "200px" },
		)

		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [hasMore, isLoading, loadMore])

	// ── Delete handlers ─────────────────────────────────────────

	const handleDeleteRequest = useCallback((chatId: string) => {
		setDeleteId(chatId)
	}, [])

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteId) return
		const id = deleteId
		setDeleteId(null)

		// Optimistic removal
		setDeletedIds((prev) => new Set(prev).add(id))
		removePending(id)

		if (id === activeChatId) {
			router.push("/")
		}

		const result = await deleteChat({ chatId: id })
		if (!result.success) {
			// Rollback on failure
			setDeletedIds((prev) => {
				const next = new Set(prev)
				next.delete(id)
				return next
			})
			toast.error(result.error.message)
		}
	}, [deleteId, activeChatId, removePending, router])

	const handleVisibilityChange = useCallback(
		async (chatId: string, newVisibility: Visibility) => {
			const result = await updateChatVisibility({
				chatId,
				visibility: newVisibility,
			})
			if (!result.success) {
				toast.error("Failed to update visibility")
			}
		},
		[],
	)

	const handleDeleteAllConfirm = useCallback(async () => {
		setShowDeleteAllDialog(false)
		const result = await deleteAllChats()
		if (result.success) {
			for (const entry of pendingEntries) {
				removePending(entry.id)
			}
			router.push("/")
			toast.success("All chats deleted")
		} else {
			toast.error(result.error.message)
		}
	}, [pendingEntries, removePending, router])

	// ── Empty state ─────────────────────────────────────────────

	if (serverChats.length === 0 && visiblePending.length === 0 && !isLoading) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<div className="flex w-full flex-row items-center justify-center px-2 text-sm text-zinc-500">
						Your conversations will appear here once you start chatting!
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	// ── Render ──────────────────────────────────────────────────

	const hasTodaySection = visiblePending.length > 0 || todayGroup

	const totalChats = serverChats.length + visiblePending.length

	return (
		<>
			<SidebarGroup className="flex-1 overflow-y-auto">
				{totalChats > 0 && (
					<div className="flex items-center justify-end px-2 py-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive hover:text-destructive"
									onClick={() => setShowDeleteAllDialog(true)}
								>
									<TrashIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Delete all chats</TooltipContent>
						</Tooltip>
					</div>
				)}
				<SidebarGroupContent>
					<SidebarMenu>
						{/* Today section: pending chats prepended before server "Today" chats */}
						{hasTodaySection && (
							<>
								<SidebarGroupLabel>Today</SidebarGroupLabel>
								{visiblePending.map((pending) => (
									<SidebarHistoryItem
										key={`pending-${pending.id}`}
										chat={pendingToChat(pending)}
										isActive={pending.id === activeChatId}
										onDelete={handleDeleteRequest}
										onVisibilityChange={handleVisibilityChange}
										setOpenMobile={setOpenMobile}
									/>
								))}
								{todayGroup?.chats.map((chat) => (
									<SidebarHistoryItem
										key={chat.id}
										chat={chat}
										isActive={chat.id === activeChatId}
										onDelete={handleDeleteRequest}
										onVisibilityChange={handleVisibilityChange}
										setOpenMobile={setOpenMobile}
									/>
								))}
							</>
						)}

						{/* Remaining date groups */}
						{otherGroups.map((group) => (
							<div key={group.label}>
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								{group.chats.map((chat) => (
									<SidebarHistoryItem
										key={chat.id}
										chat={chat}
										isActive={chat.id === activeChatId}
										onDelete={handleDeleteRequest}
										onVisibilityChange={handleVisibilityChange}
										setOpenMobile={setOpenMobile}
									/>
								))}
							</div>
						))}

						{/* Infinite scroll sentinel */}
						{hasMore && (
							<div ref={sentinelRef} className="h-px shrink-0" aria-hidden="true" />
						)}

						{/* Loading indicator for pagination */}
						{isLoading && (
							<div className="flex items-center gap-2 p-2 text-sm text-zinc-500">
								<div className="animate-spin">
									<LoaderIcon />
								</div>
								<span>Loading more chats…</span>
							</div>
						)}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteId(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your chat and
							remove it from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete all chats confirmation dialog */}
			<AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete all chats?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. All your chats will be permanently
							deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteAllConfirm}
						>
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
