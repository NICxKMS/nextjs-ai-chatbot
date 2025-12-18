"use client";

import { createContext, useContext } from "react";
import type { InputState } from "../types";

/**
 * InputContext - provides input state
 * Isolated to prevent message list re-renders when typing
 */
const InputContext = createContext<InputState | null>(null);

InputContext.displayName = "InputContext";

export { InputContext };

/**
 * Hook to consume input state
 * @throws Error if used outside ChatProvider
 */
export function useInput(): InputState {
    const context = useContext(InputContext);
    if (context === null) {
        throw new Error(
            "useInput must be used within a ChatProvider. " +
                "Wrap your component tree with <ChatProvider>."
        );
    }
    return context;
}
