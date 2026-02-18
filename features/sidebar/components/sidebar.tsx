/**
 * App Sidebar Component
 *
 * Main sidebar container component. Orchestrates sidebar layout with
 * header (logo, new chat, delete all), history content, and footer (user navigation).
 *
 * @module features/sidebar/components/sidebar
 */

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
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
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/features/auth"
import { deleteAllChats } from "../actions"
import type { AppSidebarProps } from "../types"
import { SidebarHistory } from "./sidebar-history"
import { SidebarUserNav } from "./sidebar-user-nav"

/**
 * Main application sidebar
 *
 * Contains header, history, and user navigation.
 */
export function AppSidebar(_props: AppSidebarProps) {
	const router = useRouter()
	const { setOpenMobile } = useSidebar()
	const { session } = useAuth()
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const userForDisplay: { email?: string | null } | undefined = session?.user
		? { email: session.user.email ?? null }
		: undefined

	const handleDeleteAll = async () => {
		setIsDeleting(true)
		try {
			const result = await deleteAllChats()

			if (result.success) {
				toast.success("All chats deleted successfully")
				router.push("/")
				setShowDeleteAllDialog(false)
			} else {
				toast.error("Failed to delete all chats")
			}
		} catch (error) {
			console.error("Failed to delete all chats:", error)
			toast.error("Failed to delete all chats")
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<>
			<Sidebar className="group-data-[side=left]:border-r-0">
				<SidebarHeader>
					<SidebarMenu>
						<div className="flex flex-row items-center justify-between">
							<Link
								className="flex flex-row items-center gap-3"
								href="/"
								prefetch={true}
								onClick={() => {
									setOpenMobile(false)
								}}
							>
								<span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
									Assistant
								</span>
							</Link>
							<div className="flex flex-row gap-1">
								{session && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="h-8 p-1 md:h-fit md:p-2"
												onClick={() =>
													setShowDeleteAllDialog(true)
												}
												type="button"
												variant="ghost"
											>
												<TrashIcon />
											</Button>
										</TooltipTrigger>
										<TooltipContent
											align="end"
											className="hidden md:block"
										>
											Delete All Chats
										</TooltipContent>
									</Tooltip>
								)}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="h-8 p-1 md:h-fit md:p-2"
											onClick={() => {
												setOpenMobile(false)
												router.push("/")
												router.refresh()
											}}
											type="button"
											variant="ghost"
										>
											<PlusIcon />
										</Button>
									</TooltipTrigger>
									<TooltipContent
										align="end"
										className="hidden md:block"
									>
										New Chat
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarHistory user={userForDisplay} />
				</SidebarContent>
				<SidebarFooter>
					<SidebarUserNav user={userForDisplay} />
				</SidebarFooter>
			</Sidebar>

			<AlertDialog
				onOpenChange={setShowDeleteAllDialog}
				open={showDeleteAllDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete all chats?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently
							delete all your chats and remove them from our
							servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isDeleting}
							onClick={handleDeleteAll}
						>
							{isDeleting ? "Deleting..." : "Delete All"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
