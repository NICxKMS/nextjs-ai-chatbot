"use client";

import { useMemo } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import {
    EmptyHistoryState,
    SkeletonGroup,
    SkeletonListItem,
} from "@/shared/components";
import { useOptimisticChats } from "../hooks";
import type { ChatHistoryItem } from "../types";
import { groupChatsByDate } from "../utils";
import { SidebarHistoryItem } from "./sidebar-history-item";

export type SidebarHistoryProps = {
    chats: ChatHistoryItem[];
    isLoading?: boolean;
    onDeleteChat?: (id: string) => Promise<void> | void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    onNewChat?: () => void;
};

export function SidebarHistory({
    chats,
    isLoading,
    onDeleteChat,
    onLoadMore,
    hasMore,
    onNewChat,
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
        return <EmptyHistoryState className="py-8" onNewChat={onNewChat} />;
    }

    // Flatten for Virtuoso
    const groupCounts = groups.map((g) => g.chats.length);
    const flatChats = groups.flatMap((g) => g.chats);

    return (
        <nav
            aria-label="Chat history"
            className="flex-1 overflow-hidden"
            data-testid="chat-history"
        >
            <GroupedVirtuoso
                className="h-full"
                endReached={() => hasMore && onLoadMore?.()}
                groupContent={(index) => {
                    const group = groups[index];
                    return (
                        <h3 className="sticky top-0 bg-background px-3 py-2 font-medium text-muted-foreground text-xs uppercase">
                            {group?.label ?? "Unknown"}
                        </h3>
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
        </nav>
    );
}

/**
 * Sidebar history loading skeleton using reusable skeleton components.
 */
function SidebarHistorySkeleton() {
    return (
        <div
            aria-label="Loading chat history"
            className="space-y-2 p-2"
            role="status"
        >
            <SkeletonGroup count={6} gap={8}>
                {(i) => (
                    <SkeletonListItem
                        key={i}
                        leadingSize={20}
                        showLeading
                        showTrailing={false}
                    />
                )}
            </SkeletonGroup>
        </div>
    );
}
