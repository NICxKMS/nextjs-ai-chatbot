"use client";

import { useCallback, useMemo, useRef } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

import type { Chat, VisibilityType } from "@/types/chat";
import { INVALIDATION_PATTERNS, matchesKeyPattern, SWR_KEYS } from "./swr-keys";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ChatHistoryPage = {
    chats: Chat[];
    hasMore: boolean;
};

export type OptimisticChat = {
    id: string;
    title: string;
    createdAt: Date;
    visibility: VisibilityType;
    isOptimistic: true;
};

type UseChatsOptions = {
    /** Initial chat history from server (for SSR hydration) */
    initialData?: ChatHistoryPage[];
    /** Fetcher function for chat history */
    fetcher?: (url: string) => Promise<ChatHistoryPage>;
};

type UseChatsReturn = {
    /** Combined list of optimistic + server chats */
    chats: (Chat | OptimisticChat)[];
    /** Whether initial data is loading */
    isLoading: boolean;
    /** Whether more pages are being fetched */
    isLoadingMore: boolean;
    /** Whether there are more pages to load */
    hasMore: boolean;
    /** Error from fetching */
    error: Error | undefined;
    /** Load the next page of chat history */
    loadMore: () => void;
    /** Add an optimistic chat entry */
    addOptimisticChat: (chatId: string, title?: string) => void;
    /** Remove an optimistic chat (after server confirmation) */
    removeOptimisticChat: (chatId: string) => void;
    /** Update optimistic chat title */
    updateOptimisticChatTitle: (chatId: string, title: string) => void;
    /** Invalidate and refetch chat history */
    refresh: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_OPTIMISTIC_CHATS = 50;

// ─────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Hook for managing chat list with optimistic updates.
 *
 * Features:
 * - Infinite scroll pagination via SWRInfinite
 * - Optimistic chat creation with automatic rollback
 * - Deduplication of optimistic vs server chats
 * - Cache invalidation helpers
 *
 * @example
 * ```tsx
 * const { chats, isLoading, loadMore, addOptimisticChat } = useChats({
 *   fetcher: async (url) => {
 *     const res = await fetch(url);
 *     return res.json();
 *   },
 * });
 * ```
 */
export function useChats(options: UseChatsOptions = {}): UseChatsReturn {
    const { initialData, fetcher } = options;
    const { mutate: globalMutate } = useSWRConfig();

    // Track optimistic chat IDs for O(1) lookup
    const optimisticIdsRef = useRef(new Set<string>());

    // ─────────────────────────────────────────────────────────────
    // Optimistic Chats (Local SWR Cache)
    // ─────────────────────────────────────────────────────────────

    const { data: optimisticChats = [], mutate: mutateOptimistic } = useSWR<
        OptimisticChat[]
    >(SWR_KEYS.optimisticChats, null, {
        fallbackData: [],
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    // ─────────────────────────────────────────────────────────────
    // Chat History (Server State with Pagination)
    // ─────────────────────────────────────────────────────────────

    const getKey = useCallback(
        (pageIndex: number, previousPageData: ChatHistoryPage | null) => {
            // Reached the end
            if (previousPageData && !previousPageData.hasMore) {
                return null;
            }
            // First page
            if (pageIndex === 0) {
                return SWR_KEYS.chatHistory();
            }
            // Subsequent pages - use last chat ID as cursor
            const lastChat = previousPageData?.chats.at(-1);
            if (!lastChat) {
                return null;
            }
            return SWR_KEYS.chatHistory(lastChat.id);
        },
        []
    );

    const {
        data: pages,
        error,
        isLoading,
        isValidating: _isValidating,
        size,
        setSize,
        mutate: mutateHistory,
    } = useSWRInfinite<ChatHistoryPage>(getKey, fetcher ?? null, {
        fallbackData: initialData,
        revalidateOnFocus: false,
        revalidateFirstPage: true,
        parallel: false,
        persistSize: true,
    });

    // ─────────────────────────────────────────────────────────────
    // Derived State
    // ─────────────────────────────────────────────────────────────

    const serverChats = useMemo(() => {
        if (!pages) {
            return [];
        }
        return pages.flatMap((page) => page.chats);
    }, [pages]);

    const hasMore = useMemo(() => {
        if (!pages || pages.length === 0) {
            return true;
        }
        return pages.at(-1)?.hasMore ?? false;
    }, [pages]);

    const isLoadingMore =
        isLoading ||
        (size > 0 && pages && typeof pages[size - 1] === "undefined");

    // Combine optimistic + server chats, filtering duplicates
    const chats = useMemo(() => {
        const serverChatIds = new Set(serverChats.map((c) => c.id));

        // Filter out optimistic chats that now exist on server
        const pendingOptimistic = optimisticChats.filter(
            (oc) => !serverChatIds.has(oc.id)
        );

        // Update the ref for O(1) lookups
        optimisticIdsRef.current = new Set(pendingOptimistic.map((c) => c.id));

        return [...pendingOptimistic, ...serverChats];
    }, [optimisticChats, serverChats]);

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    const loadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            setSize((s) => s + 1);
        }
    }, [isLoadingMore, hasMore, setSize]);

    const addOptimisticChat = useCallback(
        (chatId: string, title = "New Chat") => {
            // O(1) duplicate check
            if (optimisticIdsRef.current.has(chatId)) {
                return;
            }

            const newChat: OptimisticChat = {
                id: chatId,
                title,
                createdAt: new Date(),
                visibility: "private",
                isOptimistic: true,
            };

            mutateOptimistic(
                (current = []) => {
                    const updated = [newChat, ...current];
                    // Enforce size limit
                    return updated.slice(0, MAX_OPTIMISTIC_CHATS);
                },
                { revalidate: false }
            );

            optimisticIdsRef.current.add(chatId);
        },
        [mutateOptimistic]
    );

    const removeOptimisticChat = useCallback(
        (chatId: string) => {
            optimisticIdsRef.current.delete(chatId);
            mutateOptimistic(
                (current = []) => current.filter((c) => c.id !== chatId),
                {
                    revalidate: false,
                }
            );
        },
        [mutateOptimistic]
    );

    const updateOptimisticChatTitle = useCallback(
        (chatId: string, title: string) => {
            mutateOptimistic(
                (current = []) =>
                    current.map((c) => (c.id === chatId ? { ...c, title } : c)),
                { revalidate: false }
            );
        },
        [mutateOptimistic]
    );

    const refresh = useCallback(async () => {
        // Invalidate all history pages
        await globalMutate(
            (key) =>
                matchesKeyPattern(key, INVALIDATION_PATTERNS.allChatHistory),
            undefined,
            { revalidate: true }
        );
        await mutateHistory();
    }, [globalMutate, mutateHistory]);

    return {
        chats,
        isLoading,
        isLoadingMore: isLoadingMore ?? false,
        hasMore,
        error,
        loadMore,
        addOptimisticChat,
        removeOptimisticChat,
        updateOptimisticChatTitle,
        refresh,
    };
}

// ─────────────────────────────────────────────────────────────
// Chat Visibility Hook
// ─────────────────────────────────────────────────────────────

type UseChatVisibilityOptions = {
    chatId: string;
    initialVisibility: VisibilityType;
    onUpdate?: (visibility: VisibilityType) => Promise<void>;
};

type UseChatVisibilityReturn = {
    visibility: VisibilityType;
    setVisibility: (visibility: VisibilityType) => Promise<void>;
    isPending: boolean;
};

/**
 * Hook for managing chat visibility with optimistic updates.
 *
 * @example
 * ```tsx
 * const { visibility, setVisibility, isPending } = useChatVisibility({
 *   chatId: "abc123",
 *   initialVisibility: "private",
 *   onUpdate: async (v) => updateChatVisibility({ chatId, visibility: v }),
 * });
 * ```
 */
export function useChatVisibility(
    options: UseChatVisibilityOptions
): UseChatVisibilityReturn {
    const { chatId, initialVisibility, onUpdate } = options;
    const { mutate: globalMutate } = useSWRConfig();

    // Track pending update for deduplication
    const pendingRef = useRef<AbortController | null>(null);

    const { data: localVisibility, mutate: setLocalVisibility } =
        useSWR<VisibilityType>(SWR_KEYS.chatVisibility(chatId), null, {
            fallbackData: initialVisibility,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        });

    const visibility = localVisibility ?? initialVisibility;
    const isPending = pendingRef.current !== null;

    const setVisibility = useCallback(
        async (newVisibility: VisibilityType) => {
            // Abort pending request
            if (pendingRef.current) {
                pendingRef.current.abort();
            }
            pendingRef.current = new AbortController();

            const previousVisibility = visibility;

            // Optimistic update
            await setLocalVisibility(newVisibility, { revalidate: false });

            // Invalidate history cache to reflect change
            globalMutate(
                (key) =>
                    matchesKeyPattern(
                        key,
                        INVALIDATION_PATTERNS.allChatHistory
                    ),
                undefined,
                { revalidate: true }
            );

            try {
                if (onUpdate) {
                    await onUpdate(newVisibility);
                }
            } catch (error) {
                // Don't rollback if aborted
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }
                // Rollback on failure
                await setLocalVisibility(previousVisibility, {
                    revalidate: false,
                });
                throw error;
            } finally {
                pendingRef.current = null;
            }
        },
        [visibility, setLocalVisibility, globalMutate, onUpdate]
    );

    return { visibility, setVisibility, isPending };
}
