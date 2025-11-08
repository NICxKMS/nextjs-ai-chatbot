import Link from "next/link";
import { memo } from "react";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Chat } from "@/lib/db/schema";
import {
	CheckCircleFillIcon,
	GlobeIcon,
	LoaderIcon,
	LockIcon,
	MoreHorizontalIcon,
	ShareIcon,
	TrashIcon,
} from "./icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
	chat,
	isActive,
	onDelete,
	setOpenMobile,
	isOptimistic = false,
}: {
	chat: Chat;
	isActive: boolean;
	onDelete: (chatId: string) => void;
	setOpenMobile: (open: boolean) => void;
	isOptimistic?: boolean;
}) => {
	const { visibilityType, setVisibilityType } = useChatVisibility({
		chatId: chat.id,
		initialVisibilityType: chat.visibility,
	});

	// Render loading icon for optimistic chats that are still generating title
	// Once title is generated, render normally (without animation)
	const isTitleGenerating = isOptimistic && chat.title === "Generating title...";
	
	if (isTitleGenerating) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton asChild isActive={isActive}>
					<Link
						href={`/chat/${chat.id}`}
						onClick={() => setOpenMobile(false)}
					>
						<span className="flex items-center gap-2">
							<span className="animate-spin text-muted-foreground">
								<LoaderIcon size={14} />
							</span>
						</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

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
										setVisibilityType("private");
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
										setVisibilityType("public");
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
	);
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
	if (prevProps.isActive !== nextProps.isActive) {
		return false;
	}
	// Re-render when title changes (for optimistic title updates from stream)
	if (prevProps.chat.title !== nextProps.chat.title) {
		return false;
	}
	return true;
});
