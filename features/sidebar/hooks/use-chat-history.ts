"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import { extractErrorMessage, normalizeChatItem } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import {
    deleteAllChatHistory,
    deleteChat as deleteChatApi,
    fetchChatHistory,
    type HistoryResponse,
} from "../services/history-api";
import type { ChatHistoryItem } from "../types";

// =============================================================================
// FETCHER
// =============================================================================

/**
 * P3-007: Named fetcher function for SWR.
 * Validates and normalizes chat history response data.
 */
async function historyFetcher(url: string): Promise<HistoryResponse> {
    try {
        const data = await fetchChatHistory(url);
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
}

/**
 * Type guard for validating HistoryResponse structure.
 * P3-003: Proper type narrowing without unsafe casting.
 */
function isValidHistoryResponse(data: unknown): data is HistoryResponse {
    if (typeof data !== "object" || data === null) {
        return false;
    }
    const obj = data as Record<string, unknown>;
    return (
        "chats" in obj &&
        Array.isArray(obj.chats) &&
        "hasMore" in obj &&
        typeof obj.hasMore === "boolean"
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
        useSWRInfinite<HistoryResponse>(getKey, historyFetcher, {
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
                // Call API via service
                await deleteChatApi(chatId);

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
            // Call API via service
            await deleteAllChatHistory();

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
