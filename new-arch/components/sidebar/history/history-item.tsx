/**
 * HistoryItem Component
 * Individual chat item in sidebar history
 */

"use client";

import Link from "next/link";
import { memo } from "react";

import { TrashIcon } from "@/components/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

import { HistoryItemActions } from "./history-item-actions";
import type { HistoryItemProps } from "./types";

function PureHistoryItem({
    chat,
    isActive = false,
    isOptimistic = false,
    onDelete,
    setOpenMobile,
}: HistoryItemProps) {
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

            {!isOptimistic && (
                <>
                    <HistoryItemActions chat={chat} isActive={isActive} />

                    {onDelete && (
                        <DropdownMenu modal={true}>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                    className="ml-auto data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    showOnHover={!isActive}
                                >
                                    <TrashIcon />
                                    <span className="sr-only">Delete</span>
                                </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                                    onSelect={() => onDelete(chat.id)}
                                >
                                    <TrashIcon />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </>
            )}
        </SidebarMenuItem>
    );
}

export const HistoryItem = memo(PureHistoryItem, (prevProps, nextProps) => {
    if (prevProps.isActive !== nextProps.isActive) {
        return false;
    }
    // Re-render when title changes (for optimistic title updates from stream)
    if (prevProps.chat.title !== nextProps.chat.title) {
        return false;
    }
    return true;
});
