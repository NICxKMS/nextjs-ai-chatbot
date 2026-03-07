"use client"

import { isToday, isYesterday, subDays } from "date-fns"
import { usePathname, useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar-provider"
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

	const {
		entries: pendingEntries,
		patch: patchPendingChat,
		remove: removePending,
		markConfirmed,
	} = usePendingChats()
	const {
		chats: historyChats,
		hasMore,
		error,
		loadMore,
		isLoading,
		patchChat,
		retry,
	} = useSidebarHistory({
		initialData: { chats: initialChats, hasMore: initialHasMore },
	})

	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())
	const sentinelRef = useRef<HTMLDivElement>(null)
	const visibilityRequestIdsRef = useRef(new Map<string, number>())

	// ── Derived state ────────────────────────────────────────────

	// Extract active chat ID from pathname
	const activeChatId = useMemo(() => {
		const match = pathname.match(/^\/chat\/([^/]+)/)
		return match?.[1] ?? null
	}, [pathname])

	const handleRename = useCallback(
		(chatId: string, title: string) => {
			patchChat(chatId, { title })
			patchPendingChat(chatId, { title })
		},
		[patchChat, patchPendingChat],
	)

	const rawServerChats = useMemo(() => {
		return historyChats.filter((chat) => !deletedIds.has(chat.id))
	}, [historyChats, deletedIds])

	const pendingEntryById = useMemo(() => {
		return new Map(pendingEntries.map((entry) => [entry.id, entry]))
	}, [pendingEntries])

	// Keep hydrated SWR history as the single server-data source and layer
	// pending metadata over matching rows until the server copy catches up.
	const serverChats = useMemo(() => {
		return rawServerChats.map((chat) => {
			const pendingEntry = pendingEntryById.get(chat.id)
			if (!pendingEntry) {
				return chat
			}

			return {
				...chat,
				title: pendingEntry.title,
				visibility: pendingEntry.visibility,
			}
		})
	}, [pendingEntryById, rawServerChats])

	// Pending chats to display — optimistic entries not yet in server data, not deleted
	const visiblePending = useMemo(() => {
		const serverIds = new Set(rawServerChats.map((c) => c.id))
		return pendingEntries.filter(
			(e) => e.isOptimistic && !serverIds.has(e.id) && !deletedIds.has(e.id),
		)
	}, [deletedIds, pendingEntries, rawServerChats])

	// Date-grouped server chats
	const groups = useMemo(() => groupChatsByDate(serverChats), [serverChats])

	// Separate Today from other groups so pending chats merge into Today
	const todayGroup = groups.find((g) => g.label === "Today")
	const otherGroups = groups.filter((g) => g.label !== "Today")

	// ── Mark confirmed when server data contains pending chat ────

	useEffect(() => {
		const serverChatsById = new Map(rawServerChats.map((chat) => [chat.id, chat]))
		for (const entry of pendingEntries) {
			const serverChat = serverChatsById.get(entry.id)
			if (!serverChat) {
				continue
			}

			if (entry.isOptimistic) {
				markConfirmed(entry.id)
				continue
			}

			if (serverChat.title === entry.title && serverChat.visibility === entry.visibility) {
				removePending(entry.id)
			}
		}
	}, [markConfirmed, pendingEntries, rawServerChats, removePending])

	// ── Infinite scroll via IntersectionObserver ────────────────

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel || !hasMore || error) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					loadMore()
				}
			},
			{ rootMargin: "200px" },
		)

		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [error, hasMore, loadMore])

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
			const requestId = (visibilityRequestIdsRef.current.get(chatId) ?? 0) + 1
			visibilityRequestIdsRef.current.set(chatId, requestId)

			// Find previous visibility for rollback
			const previousVisibility =
				historyChats.find((c) => c.id === chatId)?.visibility ?? "private"

			// Optimistic update — reflect change immediately in the sidebar
			patchChat(chatId, { visibility: newVisibility })
			patchPendingChat(chatId, { visibility: newVisibility })

			const result = await updateChatVisibility({
				chatId,
				visibility: newVisibility,
			})

			if (visibilityRequestIdsRef.current.get(chatId) !== requestId) {
				return
			}

			visibilityRequestIdsRef.current.delete(chatId)

			if (!result.success) {
				// Revert on failure
				patchChat(chatId, { visibility: previousVisibility })
				patchPendingChat(chatId, { visibility: previousVisibility })
				toast.error("Failed to update visibility")
			}
		},
		[historyChats, patchChat, patchPendingChat],
	)

	// ── Empty state ─────────────────────────────────────────────

	if (serverChats.length === 0 && visiblePending.length === 0 && error && !isLoading) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<div className="flex w-full flex-col items-center gap-2 px-2 text-sm text-zinc-500">
						<output>We couldn&apos;t load your conversations.</output>
						<Button size="sm" variant="outline" onClick={retry}>
							Retry
						</Button>
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	if (serverChats.length === 0 && visiblePending.length === 0 && !isLoading) {
		return (
			<SidebarGroup>
				<SidebarGroupContent>
					<output className="flex w-full flex-row items-center justify-center px-2 text-sm text-zinc-500">
						Your conversations will appear here once you start chatting!
					</output>
				</SidebarGroupContent>
			</SidebarGroup>
		)
	}

	// ── Render ──────────────────────────────────────────────────

	const hasTodaySection = visiblePending.length > 0 || todayGroup

	return (
		<>
			<SidebarGroup className="flex-1 overflow-y-auto">
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
										onRename={handleRename}
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
										onRename={handleRename}
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
										onRename={handleRename}
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
							<output
								aria-label="Loading more chats"
								className="flex items-center gap-2 p-2 text-sm text-zinc-500"
							>
								<div className="animate-spin">
									<LoaderIcon />
								</div>
								<span>Loading more chats…</span>
							</output>
						)}

						{error && (
							<div className="flex items-center gap-2 p-2 text-sm text-zinc-500">
								<span>Couldn&apos;t load more conversations.</span>
								<Button size="sm" variant="ghost" onClick={retry}>
									Retry
								</Button>
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
		</>
	)
}
