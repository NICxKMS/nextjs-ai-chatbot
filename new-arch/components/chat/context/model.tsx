"use client";

import { createContext, useContext } from "react";
import type { ModelState } from "../types";

/**
 * ModelContext - provides model selection state
 * Isolated to prevent re-renders in message components when model changes
 */
const ModelContext = createContext<ModelState | null>(null);

ModelContext.displayName = "ModelContext";

export { ModelContext };

/**
 * Hook to consume model state
 * @throws Error if used outside ChatProvider
 */
export function useModel(): ModelState {
    const context = useContext(ModelContext);
    if (context === null) {
        throw new Error(
            "useModel must be used within a ChatProvider. " +
                "Wrap your component tree with <ChatProvider>."
        );
    }
    return context;
}

/**
 * Hook to get just the current model ID
 * Useful when you only need the ID and not the full model list
 */
export function useCurrentModelId(): string {
    const { currentModelId } = useModel();
    return currentModelId;
}
