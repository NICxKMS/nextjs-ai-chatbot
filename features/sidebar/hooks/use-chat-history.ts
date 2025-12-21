"use client";

import useSWRInfinite from "swr/infinite";
import type { ChatHistoryItem } from "../types";

interface HistoryResponse {
    chats: ChatHistoryItem[];
    hasMore: boolean;
    nextCursor?: string;
}

const fetcher = (url: string): Promise<HistoryResponse> =>
    fetch(url).then((res) => res.json());

const getKey = (
    pageIndex: number,
    previousPageData: HistoryResponse | null
): string | null => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null;

    // First page
    if (pageIndex === 0) return "/api/history?limit=20";

    // Add cursor for subsequent pages
    return `/api/history?limit=20&cursor=${previousPageData?.nextCursor}`;
};

export function useChatHistory() {
    const { data, error, size, setSize, isLoading, isValidating, mutate } =
        useSWRInfinite<HistoryResponse>(getKey, fetcher, {
            revalidateOnFocus: false,
            revalidateFirstPage: false,
        });

    const chats = data?.flatMap((page: HistoryResponse) => page.chats) ?? [];
    const hasMore = data?.[data.length - 1]?.hasMore ?? false;

    const loadMore = () => {
        if (!isValidating) {
            setSize(size + 1);
        }
    };

    const deleteChat = async (chatId: string) => {
        // Optimistic update
        mutate(
            data?.map((page: HistoryResponse) => ({
                ...page,
                chats: page.chats.filter(
                    (c: ChatHistoryItem) => c.id !== chatId
                ),
            })),
            false
        );

        // Call API
        await fetch(`/api/chat?id=${chatId}`, { method: "DELETE" });

        // Revalidate
        mutate();
    };

    const deleteAllChats = async () => {
        // Optimistic update
        mutate([], false);

        // Call API
        await fetch("/api/history", { method: "DELETE" });

        // Revalidate
        mutate();
    };

    return {
        chats,
        hasMore,
        isLoading: isLoading && !data,
        loadMore,
        deleteChat,
        deleteAllChats,
        mutate,
        error,
    };
}
