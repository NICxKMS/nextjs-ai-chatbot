"use client";

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { ChatSDKError } from "@/lib/errors";

type OptimisticChat = {
    id: string;
    title: string;
    createdAt: Date;
};

// Maximum number of optimistic chats to prevent unbounded memory growth
const MAX_OPTIMISTIC_CHATS = 50;

type OptimisticChatsContextType = {
    optimisticChats: OptimisticChat[];
    addOptimisticChat: (chatId: string, initialTitle?: string) => void;
    updateOptimisticChatTitle: (chatId: string, title: string) => void;
    removeOptimisticChat: (chatId: string) => void;
};

const OptimisticChatsContext = createContext<OptimisticChatsContextType | null>(
    null
);

export function OptimisticChatsProvider({ children }: { children: ReactNode }) {
    const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>(
        []
    );
    // Use Set for O(1) duplicate detection instead of Array.some() which is O(n)
    const optimisticChatIdsRef = useRef(new Set<string>());

    const addOptimisticChat = useCallback(
        (chatId: string, initialTitle?: string) => {
            // O(1) duplicate check using Set
            if (optimisticChatIdsRef.current.has(chatId)) {
                return;
            }
            optimisticChatIdsRef.current.add(chatId);

            setOptimisticChats((prev) => {
                const newChat: OptimisticChat = {
                    id: chatId,
                    title: initialTitle || "New Chat",
                    createdAt: new Date(),
                };
                const updated = [newChat, ...prev];

                // Enforce maximum size limit to prevent unbounded memory growth
                if (updated.length > MAX_OPTIMISTIC_CHATS) {
                    // Remove oldest entries and clean up the Set
                    const removed = updated.slice(MAX_OPTIMISTIC_CHATS);
                    for (const chat of removed) {
                        optimisticChatIdsRef.current.delete(chat.id);
                    }
                    return updated.slice(0, MAX_OPTIMISTIC_CHATS);
                }

                return updated;
            });
        },
        []
    );

    const updateOptimisticChatTitle = useCallback(
        (chatId: string, title: string) => {
            setOptimisticChats((prev) =>
                prev.map((chat) =>
                    chat.id === chatId ? { ...chat, title } : chat
                )
            );
        },
        []
    );

    const removeOptimisticChat = useCallback((chatId: string) => {
        optimisticChatIdsRef.current.delete(chatId);
        setOptimisticChats((prev) => prev.filter((chat) => chat.id !== chatId));
    }, []);

    return (
        <OptimisticChatsContext.Provider
            value={{
                optimisticChats,
                addOptimisticChat,
                updateOptimisticChatTitle,
                removeOptimisticChat,
            }}
        >
            {children}
        </OptimisticChatsContext.Provider>
    );
}

export function useOptimisticChats() {
    const context = useContext(OptimisticChatsContext);
    if (!context) {
        throw new ChatSDKError(
            "bad_request:ui:useOptimisticChats_outside_provider"
        );
    }
    return context;
}
