"use client";

import useSWRInfinite from "swr/infinite";
import type { ChatHistoryItem } from "../types";

type HistoryResponse = {
    chats: ChatHistoryItem[];
    hasMore: boolean;
    nextCursor?: string;
};

const fetcher = async (url: string): Promise<HistoryResponse> => {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        // Validate response structure
        if (!isValidHistoryResponse(data)) {
            throw new Error("Invalid response format");
        }
        return data;
    } catch (error) {
        console.error("[useChatHistory] Fetch error:", error);
        throw error;
    }
};

/**
 * Type guard for validating HistoryResponse structure.
 */
function isValidHistoryResponse(data: unknown): data is HistoryResponse {
    return (
        typeof data === "object" &&
        data !== null &&
        "chats" in data &&
        Array.isArray((data as HistoryResponse).chats) &&
        "hasMore" in data &&
        typeof (data as HistoryResponse).hasMore === "boolean"
    );
}

const getKey = (
    pageIndex: number,
    previousPageData: HistoryResponse | null
): string | null => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) {
        return null;
    }

    // First page
    if (pageIndex === 0) {
        return "/api/history?limit=20";
    }

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
        // Store previous state for rollback
        const previousData = data;

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

        try {
            // Call API
            const response = await fetch(`/api/chat?id=${chatId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`Failed to delete chat: ${response.status}`);
            }

            // Revalidate on success
            mutate();
        } catch (error) {
            // Rollback on failure
            if (previousData) {
                mutate(previousData, false);
            }
            throw error;
        }
    };

    const deleteAllChats = async () => {
        // Store previous state for rollback
        const previousData = data;

        // Optimistic update
        mutate([], false);

        try {
            // Call API
            const response = await fetch("/api/history", { method: "DELETE" });

            if (!response.ok) {
                throw new Error(
                    `Failed to delete all chats: ${response.status}`
                );
            }

            // Revalidate on success
            mutate();
        } catch (error) {
            // Rollback on failure
            if (previousData) {
                mutate(previousData, false);
            }
            throw error;
        }
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
