"use client";

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import type { ChatHistoryItem } from "../types";

/** Maximum number of optimistic chats to prevent unbounded growth */
const MAX_OPTIMISTIC_CHATS = 50;

type OptimisticChatsContextValue = {
    optimisticChats: ChatHistoryItem[];
    addOptimisticChat: (chat: ChatHistoryItem) => void;
    removeOptimisticChat: (id: string) => void;
    updateOptimisticChatTitle: (id: string, title: string) => void;
};

const OptimisticChatsContext =
    createContext<OptimisticChatsContextValue | null>(null);

export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
    const [optimisticChats, setOptimisticChats] = useState<ChatHistoryItem[]>(
        []
    );

    const addOptimisticChat = useCallback((chat: ChatHistoryItem) => {
        setOptimisticChats((prev) => {
            const updated = [chat, ...prev];
            // FIFO eviction: trim oldest when exceeding max
            return updated.length > MAX_OPTIMISTIC_CHATS
                ? updated.slice(0, MAX_OPTIMISTIC_CHATS)
                : updated;
        });
    }, []);

    const removeOptimisticChat = useCallback((id: string) => {
        setOptimisticChats((prev) => prev.filter((c) => c.id !== id));
    }, []);

    const updateOptimisticChatTitle = useCallback(
        (id: string, title: string) => {
            setOptimisticChats((prev) =>
                prev.map((c) => (c.id === id ? { ...c, title } : c))
            );
        },
        []
    );

    // Memoize context value to prevent unnecessary re-renders in consumers
    const contextValue = useMemo<OptimisticChatsContextValue>(
        () => ({
            optimisticChats,
            addOptimisticChat,
            removeOptimisticChat,
            updateOptimisticChatTitle,
        }),
        [
            optimisticChats,
            addOptimisticChat,
            removeOptimisticChat,
            updateOptimisticChatTitle,
        ]
    );

    return (
        <OptimisticChatsContext.Provider value={contextValue}>
            {children}
        </OptimisticChatsContext.Provider>
    );
}

export function useOptimisticChats() {
    const context = useContext(OptimisticChatsContext);
    if (!context) {
        throw new Error(
            "useOptimisticChats must be used within OptimisticChatsProvider"
        );
    }
    return context;
}
