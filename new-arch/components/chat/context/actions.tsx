"use client";

import { createContext, useContext } from "react";
import type { ChatActions } from "../types";

/**
 * ChatActionsContext - provides stable action functions
 * Components consuming this will NOT re-render when chat state changes
 */
const ChatActionsContext = createContext<ChatActions | null>(null);

ChatActionsContext.displayName = "ChatActionsContext";

export { ChatActionsContext };

/**
 * Hook to consume chat actions
 * @throws Error if used outside ChatProvider
 */
export function useChatActions(): ChatActions {
    const context = useContext(ChatActionsContext);
    if (context === null) {
        throw new Error(
            "useChatActions must be used within a ChatProvider. " +
                "Wrap your component tree with <ChatProvider>."
        );
    }
    return context;
}
