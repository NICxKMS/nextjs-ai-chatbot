/**
 * HistoryList Component
 * Virtualized list of chat history with infinite scroll
 */

"use client";

import { useCallback, useMemo, useRef } from "react";
import { GroupedVirtuoso, type GroupedVirtuosoHandle } from "react-virtuoso";

import { LoaderIcon } from "@/components/icons";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
} from "@/components/ui/sidebar";

import type { ChatGroup, HistoryChat } from "./types";

type FlatItem = {
    chat: HistoryChat;
    isOptimistic: boolean;
};

type HistoryListProps = {
    groups: ChatGroup[];
    activeId?: string;
    isValidating: boolean;
    hasReachedEnd: boolean;
    onEndReached: () => void;
    onDelete: (chatId: string) => void;
    setOpenMobile: (open: boolean) => void;
    renderItem: (item: FlatItem, isActive: boolean) => React.ReactNode;
};

export function HistoryList({
    groups,
    activeId,
    isValidating,
    hasReachedEnd,
    onEndReached,
    renderItem,
}: HistoryListProps) {
    const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);

    // Calculate group counts for GroupedVirtuoso
    const groupCounts = useMemo(
        () => groups.map((group) => group.chats.length),
        [groups]
    );

    // Create a flat list of all chat items
    const flatItems = useMemo((): FlatItem[] => {
        return groups.flatMap((group) =>
            group.chats.map((chat) => ({
                chat,
                isOptimistic: group.label === "__optimistic__",
            }))
        );
    }, [groups]);

    // Render group header content
    const renderGroupContent = useCallback(
        (index: number) => {
            const group = groups[index];
            if (!group) {
                return null;
            }
            // Skip rendering header for optimistic pseudo-group
            if (group.label === "__optimistic__") {
                return (
                    <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                        Today
                    </div>
                );
            }
            // Skip Today header if optimistic group exists (already rendered)
            if (
                group.label === "Today" &&
                groups[0]?.label === "__optimistic__"
            ) {
                return null;
            }
            return (
                <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
                    {group.label}
                </div>
            );
        },
        [groups]
    );

    // Render individual chat item
    const renderItemContent = useCallback(
        (index: number) => {
            const item = flatItems[index];
            if (!item) {
                return null;
            }
            return renderItem(item, item.chat.id === activeId);
        },
        [flatItems, activeId, renderItem]
    );

    // Handle reaching the end of the list
    const handleEndReached = useCallback(() => {
        onEndReached();
    }, [onEndReached]);

    // Footer component for loading/end state
    const Footer = useCallback(() => {
        if (hasReachedEnd) {
            return (
                <div className="mt-8 flex w-full flex-row items-center justify-center gap-2 px-2 pb-4 text-sm text-zinc-500">
                    You have reached the end of your chat history.
                </div>
            );
        }
        if (isValidating) {
            return (
                <div className="mt-8 flex flex-row items-center gap-2 p-2 text-zinc-500 dark:text-zinc-400">
                    <div className="animate-spin">
                        <LoaderIcon />
                    </div>
                    <div>Loading Chats...</div>
                </div>
            );
        }
        return null;
    }, [hasReachedEnd, isValidating]);

    return (
        <SidebarGroup className="flex-1 overflow-hidden">
            <SidebarGroupContent className="flex h-full flex-col">
                <SidebarMenu className="h-full min-h-0 flex-1">
                    {groups.length > 0 && (
                        <GroupedVirtuoso
                            components={{
                                Footer,
                            }}
                            endReached={handleEndReached}
                            groupContent={renderGroupContent}
                            groupCounts={groupCounts}
                            increaseViewportBy={{
                                top: 200,
                                bottom: 200,
                            }}
                            itemContent={renderItemContent}
                            ref={virtuosoRef}
                            style={{ height: "100%" }}
                        />
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
