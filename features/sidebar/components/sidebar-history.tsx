"use client";

import { useMemo } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { SkeletonShimmer } from "@/shared/components/ai";
import { useOptimisticChats } from "../hooks";
import type { ChatHistoryItem } from "../types";
import { groupChatsByDate } from "../utils";
import { SidebarHistoryItem } from "./sidebar-history-item";

export type SidebarHistoryProps = {
    chats: ChatHistoryItem[];
    isLoading?: boolean;
    onDeleteChat?: (id: string) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
};

export function SidebarHistory({
    chats,
    isLoading,
    onDeleteChat,
    onLoadMore,
    hasMore,
}: SidebarHistoryProps) {
    const { optimisticChats } = useOptimisticChats();

    // Merge optimistic chats with server chats
    const allChats = useMemo(() => {
        const optimisticIds = new Set(optimisticChats.map((c) => c.id));
        const serverChats = (chats ?? []).filter(
            (c) => c && !optimisticIds.has(c.id)
        );
        return [...optimisticChats, ...serverChats];
    }, [optimisticChats, chats]);

    // Group chats by date
    const groups = useMemo(() => groupChatsByDate(allChats), [allChats]);

    if (isLoading && allChats.length === 0) {
        return <SidebarHistorySkeleton />;
    }

    if (allChats.length === 0) {
        return (
            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No chats yet. Start a conversation!
            </div>
        );
    }

    // Flatten for Virtuoso
    const groupCounts = groups.map((g) => g.chats.length);
    const flatChats = groups.flatMap((g) => g.chats);

    return (
        <div className="flex-1 overflow-hidden" data-testid="chat-history">
            <GroupedVirtuoso
                className="h-full"
                endReached={() => hasMore && onLoadMore?.()}
                groupContent={(index) => {
                    const group = groups[index];
                    return (
                        <div className="sticky top-0 bg-background px-3 py-2 font-medium text-muted-foreground text-xs uppercase">
                            {group?.label ?? "Unknown"}
                        </div>
                    );
                }}
                groupCounts={groupCounts}
                itemContent={(index) => {
                    const chat = flatChats[index];
                    if (!chat) {
                        return null;
                    }
                    return (
                        <SidebarHistoryItem
                            chat={chat}
                            onDelete={onDeleteChat}
                        />
                    );
                }}
            />
        </div>
    );
}

/**
 * Sidebar history loading skeleton using SkeletonShimmer wrapper.
 */
function SidebarHistorySkeleton() {
    return (
        <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonShimmer
                    height={32}
                    key={i}
                    shape="rectangle"
                    width="100%"
                />
            ))}
        </div>
    );
}
