"use client"

import Link from "next/link"
import { memo, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
	CheckCircleFillIcon,
	GlobeIcon,
	LockIcon,
	MoreHorizontalIcon,
	PencilEditIcon,
	ShareIcon,
	TrashIcon,
} from "@/components/icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { renameChat } from "@/features/sidebar/actions/rename-chat"
import type { Chat, Visibility } from "@/lib/types/models.types"

// ── Types ──────────────────────────────────────────────────────

interface SidebarHistoryItemProps {
	chat: Chat
	isActive: boolean
	onDelete: (chatId: string) => void
	onVisibilityChange?: (chatId: string, visibility: Visibility) => void
	setOpenMobile: (open: boolean) => void
}

// ── Component ──────────────────────────────────────────────────

/**
 * Individual sidebar chat history item with dropdown actions.
 *
 * Renders as a SidebarMenuItem with:
 * - Link to /chat/{id} via SidebarMenuButton
 * - Inline rename editing on "Rename" action
 * - Share submenu (stub — only renders when onVisibilityChange is provided)
 * - Delete action (destructive)
 *
 * Memoized: re-renders only when isActive or chat.title changes.
 */
function PureSidebarHistoryItem({
	chat,
	isActive,
	onDelete,
	onVisibilityChange,
	setOpenMobile,
}: SidebarHistoryItemProps) {
	const [isRenaming, setIsRenaming] = useState(false)
	const [renameValue, setRenameValue] = useState(chat.title)
	const inputRef = useRef<HTMLInputElement>(null)

	// Focus the rename input when entering rename mode
	useEffect(() => {
		if (isRenaming && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isRenaming])

	const handleRenameSubmit = async () => {
		const trimmed = renameValue.trim()
		if (!trimmed || trimmed === chat.title) {
			setIsRenaming(false)
			setRenameValue(chat.title)
			return
		}

		const result = await renameChat({ chatId: chat.id, title: trimmed })
		if (result.success) {
			setIsRenaming(false)
		} else {
			toast.error(result.error.message)
			setRenameValue(chat.title)
			setIsRenaming(false)
		}
	}

	const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			handleRenameSubmit()
		} else if (e.key === "Escape") {
			setIsRenaming(false)
			setRenameValue(chat.title)
		}
	}

	return (
		<SidebarMenuItem>
			{isRenaming ? (
				<div className="flex h-8 items-center px-2">
					<input
						ref={inputRef}
						className="h-6 w-full rounded-sm border border-sidebar-border bg-sidebar px-1 text-sm outline-none focus:ring-1 focus:ring-sidebar-ring"
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={handleRenameKeyDown}
						onBlur={() => handleRenameSubmit()}
					/>
				</div>
			) : (
				<SidebarMenuButton asChild isActive={isActive}>
					<Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
						<span>{chat.title}</span>
					</Link>
				</SidebarMenuButton>
			)}

			<DropdownMenu modal>
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
					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={() => {
							setIsRenaming(true)
							setRenameValue(chat.title)
						}}
					>
						<PencilEditIcon />
						<span>Rename</span>
					</DropdownMenuItem>

					{onVisibilityChange && (
						<DropdownMenuSub>
							<DropdownMenuSubTrigger className="cursor-pointer">
								<ShareIcon />
								<span>Share</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										className="cursor-pointer flex-row justify-between"
										onSelect={() => onVisibilityChange(chat.id, "private")}
									>
										<div className="flex flex-row items-center gap-2">
											<LockIcon size={12} />
											<span>Private</span>
										</div>
										{chat.visibility === "private" && <CheckCircleFillIcon />}
									</DropdownMenuItem>
									<DropdownMenuItem
										className="cursor-pointer flex-row justify-between"
										onSelect={() => onVisibilityChange(chat.id, "public")}
									>
										<div className="flex flex-row items-center gap-2">
											<GlobeIcon />
											<span>Public</span>
										</div>
										{chat.visibility === "public" && <CheckCircleFillIcon />}
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					)}

					<DropdownMenuSeparator />

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

export const SidebarHistoryItem = memo(PureSidebarHistoryItem, (prevProps, nextProps) => {
	if (prevProps.isActive !== nextProps.isActive) return false
	if (prevProps.chat.title !== nextProps.chat.title) return false
	return true
})
