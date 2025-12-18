/**
 * HistoryItemActions Component
 * Dropdown menu actions for chat history items
 */

"use client";

import { memo } from "react";

import {
    CheckCircleFillIcon,
    GlobeIcon,
    LockIcon,
    MoreHorizontalIcon,
    ShareIcon,
} from "@/components/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { useChatVisibility } from "@/hooks/use-chat-visibility";

import type { HistoryItemActionsProps } from "./types";

function PureHistoryItemActions({ chat, isActive }: HistoryItemActionsProps) {
    const { visibilityType, setVisibilityType } = useChatVisibility({
        chatId: chat.id,
        initialVisibilityType: chat.visibility,
    });

    return (
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
                                onClick={() => setVisibilityType("private")}
                            >
                                <div className="flex flex-row items-center gap-2">
                                    <LockIcon size={12} />
                                    <span>Private</span>
                                </div>
                                {visibilityType === "private" && (
                                    <CheckCircleFillIcon />
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer flex-row justify-between"
                                onClick={() => setVisibilityType("public")}
                            >
                                <div className="flex flex-row items-center gap-2">
                                    <GlobeIcon />
                                    <span>Public</span>
                                </div>
                                {visibilityType === "public" && (
                                    <CheckCircleFillIcon />
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const HistoryItemActions = memo(
    PureHistoryItemActions,
    (prevProps, nextProps) => {
        return (
            prevProps.chat.id === nextProps.chat.id &&
            prevProps.chat.visibility === nextProps.chat.visibility &&
            prevProps.isActive === nextProps.isActive
        );
    }
);
