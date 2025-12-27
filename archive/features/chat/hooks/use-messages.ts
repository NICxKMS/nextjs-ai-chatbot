"use client";

/**
 * Messages Hook
 *
 * Provides message list management with scroll handling.
 * Combines useScrollToBottom with message state tracking.
 *
 * @module features/chat/hooks/use-messages
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatStatus } from "../types";
import type { UseScrollToBottomReturn } from "./use-scroll-to-bottom";
import { useScrollToBottom } from "./use-scroll-to-bottom";

// =============================================================================
// TYPES
// =============================================================================

export type UseMessagesOptions = {
    /** Current chat status from AI SDK */
    status: ChatStatus;
    /**
     * Optional callback when a message is sent.
     * @warning This callback should be memoized (via useCallback) to avoid
     * triggering unnecessary re-renders. If not memoized, the useEffect
     * dependency may cause the callback to fire multiple times.
     */
    onMessageSent?: () => void;
};

export interface UseMessagesReturn extends UseScrollToBottomReturn {
    /** Whether a message has been sent in this session */
    hasSentMessage: boolean;
    /** Reset the sent message state */
    resetSentState: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing chat messages with scroll behavior.
 *
 * Features:
 * - Auto-scroll management via useScrollToBottom
 * - Tracks whether user has sent a message
 * - Provides refs for container and end marker
 * - Viewport enter/leave callbacks for scroll tracking
 *
 * @param options - Configuration options
 * @returns Message state and scroll controls
 *
 * @example
 * ```tsx
 * const {
 *   containerRef,
 *   endRef,
 *   isAtBottom,
 *   scrollToBottom,
 *   hasSentMessage,
 * } = useMessages({ status: chatStatus });
 *
 * return (
 *   <div ref={containerRef}>
 *     {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *     <div ref={endRef} />
 *   </div>
 * );
 * ```
 */
export function useMessages({
    status,
    onMessageSent,
}: UseMessagesOptions): UseMessagesReturn {
    const {
        containerRef,
        endRef,
        isAtBottom,
        scrollToBottom,
        onViewportEnter,
        onViewportLeave,
    } = useScrollToBottom();

    // Track if user has sent a message in this session
    const [hasSentMessage, setHasSentMessage] = useState(false);

    // Detect when a message is submitted
    useEffect(() => {
        if (status === "submitted") {
            setHasSentMessage(true);
            onMessageSent?.();
        }
    }, [status, onMessageSent]);

    // Reset sent state (useful for new chat sessions)
    const resetSentState = useCallback(() => {
        setHasSentMessage(false);
    }, []);

    return useMemo(
        () => ({
            containerRef,
            endRef,
            isAtBottom,
            scrollToBottom,
            onViewportEnter,
            onViewportLeave,
            hasSentMessage,
            resetSentState,
        }),
        [
            containerRef,
            endRef,
            isAtBottom,
            scrollToBottom,
            onViewportEnter,
            onViewportLeave,
            hasSentMessage,
            resetSentState,
        ]
    );
}
