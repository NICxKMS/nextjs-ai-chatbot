/**
 * Sidebar History Item Component
 *
 * Individual chat item in sidebar history with actions.
 *
 * @module features/sidebar/components/sidebar-item
 */

"use client"

import Link from "next/link"
import { memo } from "react"
import {
	CheckCircleFillIcon,
	GlobeIcon,
	LockIcon,
	MoreHorizontalIcon,
	ShareIcon,
	TrashIcon,
} from "@/components/icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useChatVisibility } from "@/hooks/use-chat-visibility"

import type { ChatItemProps } from "../types"

/**
 * Pure chat item component for memoization
 */
const PureChatItem = ({
	chat,
	isActive,
	onDelete,
	setOpenMobile,
}: ChatItemProps) => {
	const { visibilityType, setVisibilityType } = useChatVisibility({
		chatId: chat.id,
		initialVisibilityType: chat.visibility,
	})

	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={isActive}>
				<Link
					href={`/chat/${chat.id}`}
					onClick={() => setOpenMobile(false)}
				>
					<span>{chat.title}</span>
				</Link>
			</SidebarMenuButton>

			<DropdownMenu modal={true}>
				<DropdownMenuTrigger asChild>
					<SidebarMenuAction
						className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						showOnHover={!isActive}
					>
						<MoreHorizontalIcon />
						<span className="sr-only">More</span>
					</SidebarMenuAction>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" side="bottom">
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="cursor-pointer">
							<ShareIcon />
							<span>Share</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									className="cursor-pointer flex-row justify-between"
									onClick={() => {
										setVisibilityType("private")
									}}
								>
									<div className="flex flex-row items-center gap-2">
										<LockIcon size={12} />
										<span>Private</span>
									</div>
									{visibilityType === "private" ? (
										<CheckCircleFillIcon />
									) : null}
								</DropdownMenuItem>
								<DropdownMenuItem
									className="cursor-pointer flex-row justify-between"
									onClick={() => {
										setVisibilityType("public")
									}}
								>
									<div className="flex flex-row items-center gap-2">
										<GlobeIcon />
										<span>Public</span>
									</div>
									{visibilityType === "public" ? (
										<CheckCircleFillIcon />
									) : null}
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>

					<DropdownMenuItem
						className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
						onSelect={() => onDelete(chat.id)}
					>
						<TrashIcon />
						<span>Delete</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	)
}

/**
 * Memoized chat item component
 *
 * Uses custom comparison for optimal re-rendering in virtualized lists.
 */
export const SidebarItem = memo(PureChatItem, (prevProps, nextProps) => {
	// Custom comparison for memoization
	if (prevProps.chat.id !== nextProps.chat.id) return false
	if (prevProps.isActive !== nextProps.isActive) return false
	if (prevProps.chat.title !== nextProps.chat.title) return false
	if (prevProps.chat.visibility !== nextProps.chat.visibility) return false
	return true
})

/**
 * Alias for backward compatibility
 */
export const ChatItem = SidebarItem
