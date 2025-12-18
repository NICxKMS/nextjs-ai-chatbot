/**
 * useHistoryData Hook - Data fetching for chat history with infinite pagination
 */

import { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/utils";
import type { ChatHistory, HistoryChat } from "../types";

const PAGE_SIZE = 20;

/** Generate pagination key for SWR infinite */
export function getChatHistoryPaginationKey(
    pageIndex: number,
    previousPageData: ChatHistory | null
): string | null {
    if (previousPageData?.hasMore === false) {
        return null;
    }
    if (pageIndex === 0) {
        return `/api/history?limit=${PAGE_SIZE}`;
    }
    const lastChat = previousPageData?.chats.at(-1);
    return lastChat
        ? `/api/history?ending_before=${lastChat.id}&limit=${PAGE_SIZE}`
        : null;
}

type UseHistoryDataOptions = {
    user?: { email?: string | null };
    isNewSession?: boolean;
    optimisticChats?: HistoryChat[];
    removeOptimisticChat?: (id: string) => void;
};

type UseHistoryDataReturn = {
    chats: HistoryChat[];
    isLoading: boolean;
    isValidating: boolean;
    hasReachedEnd: boolean;
    isEmpty: boolean;
    loadMore: () => void;
    mutate: ReturnType<typeof useSWRInfinite<ChatHistory>>["mutate"];
};

/** Hook for fetching and managing chat history data */
export function useHistoryData({
    user,
    isNewSession = false,
    optimisticChats = [],
    removeOptimisticChat,
}: UseHistoryDataOptions): UseHistoryDataReturn {
    const getKeyWithAuth = (
        pageIndex: number,
        prevData: ChatHistory | null
    ) => {
        if (!user || (isNewSession && pageIndex === 0)) {
            return null;
        }
        return getChatHistoryPaginationKey(pageIndex, prevData);
    };

    const {
        data: pages,
        setSize,
        isValidating,
        isLoading,
        mutate,
    } = useSWRInfinite<ChatHistory>(getKeyWithAuth, fetcher, {
        fallbackData: [],
        revalidateOnMount: true,
    });

    const processedIds = useRef<Set<string>>(
        new Set(optimisticChats.map((c) => c.id))
    );

    // Remove optimistic chats once real chats are loaded
    useEffect(() => {
        if (!(pages?.length && removeOptimisticChat)) {
            return;
        }

        const allIds = new Set(pages.flatMap((p) => p.chats.map((c) => c.id)));

        for (const chat of optimisticChats) {
            if (allIds.has(chat.id) && !processedIds.current.has(chat.id)) {
                processedIds.current.add(chat.id);
                removeOptimisticChat(chat.id);
            }
        }

        // Prevent unbounded memory growth
        if (processedIds.current.size > 100) {
            const currentIds = new Set(optimisticChats.map((c) => c.id));
            for (const id of processedIds.current) {
                if (!(currentIds.has(id) || allIds.has(id))) {
                    processedIds.current.delete(id);
                }
            }
        }
    }, [pages, optimisticChats, removeOptimisticChat]);

    // Listen for title updates
    useEffect(() => {
        const handleTitleUpdate = () => mutate();
        window.addEventListener("chat-title-updated", handleTitleUpdate);
        return () =>
            window.removeEventListener("chat-title-updated", handleTitleUpdate);
    }, [mutate]);

    const chats = pages?.flatMap((p) => p.chats) ?? [];
    const hasReachedEnd = pages?.some((p) => p.hasMore === false) ?? false;
    const isEmpty = pages?.every((p) => p.chats.length === 0) ?? false;
    const loadMore = () => {
        if (!(isValidating || hasReachedEnd)) {
            setSize((s) => s + 1);
        }
    };

    return {
        chats,
        isLoading,
        isValidating,
        hasReachedEnd,
        isEmpty,
        loadMore,
        mutate,
    };
}
