"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import type { ChatHistoryItem } from "../types";

interface OptimisticChatsContextValue {
    optimisticChats: ChatHistoryItem[];
    addOptimisticChat: (chat: ChatHistoryItem) => void;
    removeOptimisticChat: (id: string) => void;
    updateOptimisticChatTitle: (id: string, title: string) => void;
}

const OptimisticChatsContext =
    createContext<OptimisticChatsContextValue | null>(null);

export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
    const [optimisticChats, setOptimisticChats] = useState<ChatHistoryItem[]>(
        []
    );

    const addOptimisticChat = useCallback((chat: ChatHistoryItem) => {
        setOptimisticChats((prev) => [chat, ...prev]);
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

    return (
        <OptimisticChatsContext.Provider
            value={{
                optimisticChats,
                addOptimisticChat,
                removeOptimisticChat,
                updateOptimisticChatTitle,
            }}
        >
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
