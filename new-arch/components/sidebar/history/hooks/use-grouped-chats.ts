/**
 * useGroupedChats Hook
 * Groups chat history by date for organized display
 */

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useMemo, useRef } from "react";

import type {
    ChatGroup,
    DateBoundaries,
    GroupedChats,
    HistoryChat,
} from "../types";

/**
 * Group chats by date with pre-calculated boundaries
 */
function groupChatsByDate(
    chats: HistoryChat[],
    boundaries: DateBoundaries
): GroupedChats {
    const { oneWeekAgo, oneMonthAgo } = boundaries;

    return chats.reduce(
        (groups, chat) => {
            const chatDate = new Date(chat.createdAt);

            if (isToday(chatDate)) {
                groups.today.push(chat);
            } else if (isYesterday(chatDate)) {
                groups.yesterday.push(chat);
            } else if (chatDate > oneWeekAgo) {
                groups.lastWeek.push(chat);
            } else if (chatDate > oneMonthAgo) {
                groups.lastMonth.push(chat);
            } else {
                groups.older.push(chat);
            }

            return groups;
        },
        {
            today: [],
            yesterday: [],
            lastWeek: [],
            lastMonth: [],
            older: [],
        } as GroupedChats
    );
}

/**
 * Convert grouped chats into an array of groups for display
 */
function convertToGroups(
    groupedChats: GroupedChats | null,
    optimisticChats: HistoryChat[]
): ChatGroup[] {
    if (!groupedChats) {
        return [];
    }

    const groups: ChatGroup[] = [];

    // Prepend optimistic group if we have any
    if (optimisticChats.length > 0) {
        groups.push({
            label: "__optimistic__",
            chats: optimisticChats,
            isOptimistic: true,
        });
    }

    // Today group
    if (groupedChats.today.length > 0 || optimisticChats.length > 0) {
        groups.push({
            label: "Today",
            chats: groupedChats.today,
            isOptimistic: optimisticChats.length > 0,
        });
    }

    if (groupedChats.yesterday.length > 0) {
        groups.push({ label: "Yesterday", chats: groupedChats.yesterday });
    }

    if (groupedChats.lastWeek.length > 0) {
        groups.push({ label: "Last 7 days", chats: groupedChats.lastWeek });
    }

    if (groupedChats.lastMonth.length > 0) {
        groups.push({ label: "Last 30 days", chats: groupedChats.lastMonth });
    }

    if (groupedChats.older.length > 0) {
        groups.push({
            label: "Older than last month",
            chats: groupedChats.older,
        });
    }

    return groups;
}

/**
 * Hook to group chats by date with optimistic updates
 */
export function useGroupedChats(
    chats: HistoryChat[],
    optimisticChats: HistoryChat[] = [],
    isSidebarOpen = true
): ChatGroup[] {
    const lastBoundaryCalcRef = useRef<number>(0);

    // Memoize date boundaries - recalculate when sidebar opens or day changes
    const dateBoundaries = useMemo(() => {
        const now = new Date();
        const currentDay = now.toDateString();
        const lastDay = new Date(lastBoundaryCalcRef.current).toDateString();

        // Skip recalculation if same day and not a sidebar open event
        if (
            lastBoundaryCalcRef.current > 0 &&
            currentDay === lastDay &&
            !isSidebarOpen
        ) {
            // Return existing boundaries
        } else {
            lastBoundaryCalcRef.current = now.getTime();
        }

        return {
            oneWeekAgo: subWeeks(now, 1),
            oneMonthAgo: subMonths(now, 1),
        };
    }, [isSidebarOpen]);

    // Memoize grouped chats
    const groupedChats = useMemo(() => {
        // Deduplicate chats by ID
        const uniqueChats = Array.from(
            new Map(chats.map((chat) => [chat.id, chat])).values()
        );
        return groupChatsByDate(uniqueChats, dateBoundaries);
    }, [chats, dateBoundaries]);

    // Convert to display groups
    return useMemo(
        () => convertToGroups(groupedChats, optimisticChats),
        [groupedChats, optimisticChats]
    );
}
