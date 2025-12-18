"use client";

import { createContext, useContext } from "react";
import type { ChatState } from "../types";

/**
 * ChatStateContext - provides read-only chat state
 * Components consuming this will re-render when state changes
 */
const ChatStateContext = createContext<ChatState | null>(null);

ChatStateContext.displayName = "ChatStateContext";

export { ChatStateContext };

/**
 * Hook to consume chat state
 * @throws Error if used outside ChatProvider
 */
export function useChatState(): ChatState {
    const context = useContext(ChatStateContext);
    if (context === null) {
        throw new Error(
            "useChatState must be used within a ChatProvider. " +
                "Wrap your component tree with <ChatProvider>."
        );
    }
    return context;
}

/**
 * Selector hook for reading specific chat state properties
 * Helps minimize re-renders by selecting only needed state
 */
export function useChatStateSelector<T>(selector: (state: ChatState) => T): T {
    const state = useChatState();
    return selector(state);
}
