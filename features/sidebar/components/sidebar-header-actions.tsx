"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import { PlusIcon, TrashIcon } from "@/components/icons"
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
import { useSidebar } from "@/components/ui/sidebar-provider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteAllChats } from "@/features/chat/actions/delete-all-chats"
import { HISTORY_KEY_PREFIX } from "@/features/sidebar/hooks/use-sidebar-history"
import { usePendingChats } from "@/lib/providers/pending-chats-provider"

// ── Props ──────────────────────────────────────────────────────

interface SidebarHeaderActionsProps {
	hasUser: boolean
}

// ── Component ──────────────────────────────────────────────────

/**
 * Client component for sidebar header actions.
 *
 * Contains the brand link, delete-all button (with confirmation dialog),
 * and new-chat button. Extracted as a client component because the parent
 * SidebarShell is a server component and cannot hold useState for the
 * delete-all confirmation dialog.
 *
 * Matches the oldapp AppSidebar header layout: both buttons side by side.
 */
export function SidebarHeaderActions({ hasUser }: SidebarHeaderActionsProps) {
	const router = useRouter()
	const { setOpenMobile } = useSidebar()
	const { mutate } = useSWRConfig()
	const { entries: pendingEntries, remove: removePending } = usePendingChats()
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

	const handleDeleteAllConfirm = useCallback(async () => {
		setShowDeleteAllDialog(false)
		const result = await deleteAllChats()
		if (result.success) {
			for (const entry of pendingEntries) {
				removePending(entry.id)
			}
			// Clear SWR cache for all history pages so the sidebar reflects deletion
			await mutate((key) => typeof key === "string" && key.includes(HISTORY_KEY_PREFIX))
			router.push("/")
			toast.success("All chats deleted")
		} else {
			toast.error(result.error.message)
		}
	}, [mutate, pendingEntries, removePending, router])

	return (
		<>
			<div className="flex flex-row items-center justify-between">
				<Link
					className="flex flex-row items-center gap-3"
					href="/"
					onClick={() => setOpenMobile(false)}
				>
					<span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
						Assistant
					</span>
				</Link>
				<div className="flex flex-row gap-1">
					{hasUser && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									aria-label="Delete all chats"
									className="h-8 p-1 md:h-fit md:p-2"
									data-testid="delete-all-chats-button"
									onClick={() => setShowDeleteAllDialog(true)}
									type="button"
									variant="ghost"
								>
									<TrashIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent align="end" className="hidden md:block">
								Delete All Chats
							</TooltipContent>
						</Tooltip>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								asChild
								className="relative h-8 p-1 after:absolute after:-inset-1.5 after:md:hidden md:h-fit md:p-2"
								variant="ghost"
							>
								<Link
									href="/"
									data-testid="new-chat-button-sidebar"
									onClick={() => setOpenMobile(false)}
								>
									<PlusIcon />
								</Link>
							</Button>
						</TooltipTrigger>
						<TooltipContent align="end" className="hidden md:block">
							New Chat
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

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
