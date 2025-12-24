"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import { extractErrorMessage, normalizeChatItem } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
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
            // Provide user-friendly error based on status
            if (res.status === 401) {
                throw new Error("Please sign in to view your chat history");
            }
            if (res.status === 429) {
                throw new Error("Too many requests. Please wait a moment");
            }
            throw new Error("Unable to load chat history. Please try again");
        }
        const data = await res.json();
        // Validate and normalize response structure
        if (!isValidHistoryResponse(data)) {
            throw new Error("Received invalid data format");
        }
        // Normalize each chat item for consistent data handling
        return {
            ...data,
            chats: data.chats.map(
                (chat: Record<string, unknown>) =>
                    normalizeChatItem(chat) as ChatHistoryItem
            ),
        };
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            logger.errorWithCause("[useChatHistory] Fetch error", error);
        }
        throw new Error(
            extractErrorMessage(error, "Failed to load chat history")
        );
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
    // Return null to stop fetching: previous page exists and has no more data
    // This signals SWR infinite to stop requesting additional pages
    if (previousPageData && !previousPageData.hasMore) {
        return null;
    }

    // Return base URL for first page: no cursor needed
    // pageIndex 0 is the initial fetch before any data exists
    if (pageIndex === 0) {
        return "/api/history?limit=20";
    }

    // Return cursor-based URL for subsequent pages
    // Uses optional chain because previousPageData may be null on error recovery
    return `/api/history?limit=20&cursor=${previousPageData?.nextCursor}`;
};

export function useChatHistory() {
    const { data, error, size, setSize, isLoading, isValidating, mutate } =
        useSWRInfinite<HistoryResponse>(getKey, fetcher, {
            revalidateOnFocus: false,
            revalidateFirstPage: false,
        });

    // Memoize derived values to prevent unnecessary recalculations
    const chats = useMemo(
        () => data?.flatMap((page: HistoryResponse) => page.chats) ?? [],
        [data]
    );
    const hasMore = useMemo(
        () => data?.[data.length - 1]?.hasMore ?? false,
        [data]
    );

    const loadMore = useCallback(() => {
        if (!isValidating) {
            setSize(size + 1);
        }
    }, [isValidating, setSize, size]);

    const deleteChat = useCallback(
        async (chatId: string) => {
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
                    throw new Error(
                        "Couldn't delete this chat. Please try again"
                    );
                }

                // Revalidate on success
                mutate();
            } catch (error) {
                // Rollback on failure
                if (previousData) {
                    mutate(previousData, false);
                }
                toast.error(
                    extractErrorMessage(error, "Failed to delete chat")
                );
            }
        },
        [data, mutate]
    );

    const deleteAllChats = useCallback(async () => {
        // Store previous state for rollback
        const previousData = data;

        // Optimistic update
        mutate([], false);

        try {
            // Call API
            const response = await fetch("/api/history", { method: "DELETE" });

            if (!response.ok) {
                throw new Error(
                    "Couldn't clear your history. Please try again"
                );
            }

            // Revalidate on success
            mutate();
        } catch (error) {
            // Rollback on failure
            if (previousData) {
                mutate(previousData, false);
            }
            throw new Error(
                extractErrorMessage(error, "Failed to clear history")
            );
        }
    }, [data, mutate]);

    return useMemo(
        () => ({
            chats,
            hasMore,
            isLoading: isLoading && !data,
            loadMore,
            deleteChat,
            deleteAllChats,
            mutate,
            error,
        }),
        [
            chats,
            hasMore,
            isLoading,
            data,
            loadMore,
            deleteChat,
            deleteAllChats,
            mutate,
            error,
        ]
    );
}
