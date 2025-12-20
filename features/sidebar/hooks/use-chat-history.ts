'use client';

import useSWRInfinite from 'swr/infinite';
import type { ChatHistory, ChatItem, GroupedChats, DateGroup } from '../types';
import { useOptimisticChats } from './use-optimistic-chats';
import { useMemo } from 'react';
import { isToday, isYesterday, isWithinInterval, subDays, subMonths } from 'date-fns';

const PAGE_SIZE = 20;

function getKey(pageIndex: number, previousPageData: ChatHistory | null) {
  if (previousPageData && !previousPageData.hasMore) return null;
  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;
  return `/api/history?ending_before=${previousPageData?.chats.at(-1)?.id}&limit=${PAGE_SIZE}`;
}

function getDateGroup(date: Date): DateGroup {
  const now = new Date();
  
  if (isToday(date)) return 'today';
  if (isYesterday(date)) return 'yesterday';
  if (isWithinInterval(date, { start: subDays(now, 7), end: now })) return 'lastWeek';
  if (isWithinInterval(date, { start: subMonths(now, 1), end: now })) return 'lastMonth';
  return 'older';
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  lastWeek: 'Last 7 days',
  lastMonth: 'Last 30 days',
  older: 'Older',
};

function groupChatsByDate(chats: ChatItem[]): GroupedChats[] {
  const groups = new Map<DateGroup, ChatItem[]>();
  
  for (const chat of chats) {
    const group = getDateGroup(new Date(chat.createdAt));
    const existing = groups.get(group) || [];
    groups.set(group, [...existing, chat]);
  }
  
  const order: DateGroup[] = ['today', 'yesterday', 'lastWeek', 'lastMonth', 'older'];
  
  return order
    .filter((group) => groups.has(group))
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      chats: groups.get(group)!,
    }));
}

export function useChatHistory(userId: string | undefined) {
  const { optimisticChats, removeOptimisticChat } = useOptimisticChats();
  
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<ChatHistory>(
    userId ? getKey : () => null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  );

  // Flatten pages into single array
  const allChats = useMemo(() => {
    if (!data) return [];
    const flatChats = data.flatMap((page) => page.chats);
    
    // Deduplicate with optimistic chats
    const chatMap = new Map<string, ChatItem>();
    
    // Add optimistic chats first (newest)
    for (const oc of optimisticChats) {
      chatMap.set(oc.id, {
        id: oc.id,
        title: oc.title,
        createdAt: oc.createdAt,
        visibility: 'private',
      });
    }
    
    // Add real chats, removing from optimistic if exists
    for (const chat of flatChats) {
      if (chatMap.has(chat.id)) {
        // Real data arrived, remove from optimistic
        removeOptimisticChat(chat.id);
      }
      chatMap.set(chat.id, chat);
    }
    
    return Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data, optimisticChats, removeOptimisticChat]);

  const groupedChats = useMemo(() => groupChatsByDate(allChats), [allChats]);

  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false;
  
  const loadMore = () => {
    if (hasMore && !isValidating) {
      setSize(size + 1);
    }
  };

  return {
    chats: allChats,
    groupedChats,
    isLoading,
    isValidating,
    error,
    hasMore,
    loadMore,
    mutate,
  };
}
