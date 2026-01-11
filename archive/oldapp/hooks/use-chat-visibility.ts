"use client";

import { useMemo, useRef } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import { updateChatVisibility } from "@/app/(chat)/actions";
import {
    type ChatHistory,
    getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import type { VisibilityType } from "@/components/visibility-selector";

export function useChatVisibility({
    chatId,
    initialVisibilityType,
}: {
    chatId: string;
    initialVisibilityType: VisibilityType;
}) {
    const { mutate } = useSWRConfig();

    // Track pending visibility update for request deduplication
    const pendingUpdateRef = useRef<AbortController | null>(null);

    // Use useSWRInfinite to properly subscribe to history changes
    // This ensures reactive updates when history data changes, unlike direct cache access
    const { data: historyPages } = useSWRInfinite<ChatHistory>(
        getChatHistoryPaginationKey,
        null, // No fetcher - we just want to read from cache
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            revalidateOnMount: false,
        }
    );
    const history = historyPages?.[0];

    const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
        `${chatId}-visibility`,
        null,
        {
            fallbackData: initialVisibilityType,
        }
    );

    const visibilityType = useMemo(() => {
        if (!history) {
            return localVisibility;
        }
        const chat = history.chats.find(
            (currentChat) => currentChat.id === chatId
        );
        if (!chat) {
            // Chat not in cache yet - use local visibility state
            return localVisibility;
        }
        return chat.visibility;
    }, [history, chatId, localVisibility]);

    const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
        // Cancel any pending visibility update to prevent race conditions
        if (pendingUpdateRef.current) {
            pendingUpdateRef.current.abort();
        }
        pendingUpdateRef.current = new AbortController();

        const previousVisibility = localVisibility;
        setLocalVisibility(updatedVisibilityType);
        // Trigger revalidation of the chat history cache
        mutate(
            (key) => typeof key === "string" && key.startsWith("/api/history"),
            undefined,
            { revalidate: true }
        );

        try {
            await updateChatVisibility({
                chatId,
                visibility: updatedVisibilityType,
            });
        } catch (error) {
            // Don't rollback if this request was aborted (superseded by newer request)
            if (error instanceof Error && error.name === "AbortError") {
                return;
            }
            // Rollback optimistic update on failure
            setLocalVisibility(previousVisibility);
            toast.error("Failed to update visibility");
        } finally {
            pendingUpdateRef.current = null;
        }
    };

    return { visibilityType, setVisibilityType };
}
