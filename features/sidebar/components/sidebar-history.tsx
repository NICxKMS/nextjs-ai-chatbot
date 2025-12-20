'use client';

import { useMemo } from 'react';
import { GroupedVirtuoso } from 'react-virtuoso';
import type { ChatHistoryItem } from '../types';
import { groupChatsByDate } from '../utils';
import { SidebarHistoryItem } from './sidebar-history-item';
import { useOptimisticChats } from '../hooks';

export interface SidebarHistoryProps {
  chats: ChatHistoryItem[];
  isLoading?: boolean;
  onDeleteChat?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

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
    const serverChats = chats.filter((c) => !optimisticIds.has(c.id));
    return [...optimisticChats, ...serverChats];
  }, [optimisticChats, chats]);

  // Group chats by date
  const groups = useMemo(() => groupChatsByDate(allChats), [allChats]);

  if (isLoading && allChats.length === 0) {
    return <SidebarHistorySkeleton />;
  }

  if (allChats.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No chats yet. Start a conversation!
      </div>
    );
  }

  // Flatten for Virtuoso
  const groupCounts = groups.map((g) => g.chats.length);
  const flatChats = groups.flatMap((g) => g.chats);

  return (
    <GroupedVirtuoso
      groupCounts={groupCounts}
      groupContent={(index) => {
        const group = groups[index];
        return (
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase sticky top-0 bg-background">
            {group?.label ?? 'Unknown'}
          </div>
        );
      }}
      itemContent={(index) => {
        const chat = flatChats[index];
        if (!chat) return null;
        return <SidebarHistoryItem chat={chat} onDelete={onDeleteChat} />;
      }}
      endReached={() => hasMore && onLoadMore?.()}
      className="flex-1"
    />
  );
}

function SidebarHistorySkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
