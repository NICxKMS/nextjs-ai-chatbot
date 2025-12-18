"use client";

import type { ReactNode } from "react";

type ChatContainerProps = {
    children: ReactNode;
};

/**
 * ChatContainer - Layout wrapper for chat components
 * Provides consistent styling and structure
 */
export function ChatContainer({ children }: ChatContainerProps) {
    return (
        <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
            {children}
        </div>
    );
}

/**
 * ChatInputArea - Wrapper for the input section
 * Sticky positioning at bottom
 */
export function ChatInputArea({ children }: { children: ReactNode }) {
    return (
        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
            {children}
        </div>
    );
}
