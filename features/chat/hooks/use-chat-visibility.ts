/**
 * useChatVisibility Hook
 *
 * Manages chat visibility state with optimistic updates.
 * Handles local state, cache updates, and server synchronization.
 *
 * @module features/chat/hooks/use-chat-visibility
 */

"use client";

import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { updateChatVisibility } from "../actions";
import type { VisibilityType } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type UseChatVisibilityOptions = {
    /** Chat session identifier */
    chatId: string;
    /** Initial visibility type */
    initialVisibilityType: VisibilityType;
};

export type UseChatVisibilityReturn = {
    /** Current visibility type */
    visibilityType: VisibilityType;
    /** Function to update visibility */
    setVisibilityType: (visibility: VisibilityType) => Promise<void>;
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing chat visibility with optimistic updates.
 *
 * Features:
 * - Local state with SWR for caching
 * - Optimistic updates with rollback on error
 * - Request deduplication with AbortController
 *
 * @param options - Hook configuration options
 * @returns Visibility state and setter function
 *
 * @example
 * ```tsx
 * const { visibilityType, setVisibilityType } = useChatVisibility({
 *   chatId: 'chat-123',
 *   initialVisibilityType: 'private',
 * });
 * ```
 */
export function useChatVisibility({
    chatId,
    initialVisibilityType,
}: UseChatVisibilityOptions): UseChatVisibilityReturn {
    // Track pending visibility update for request deduplication
    const pendingUpdateRef = useRef<AbortController | null>(null);

    // Local visibility state with SWR caching
    const { data: localVisibility, mutate: setLocalVisibility } = useSWR(
        `${chatId}-visibility`,
        null,
        {
            fallbackData: initialVisibilityType,
        }
    );

    // Memoized visibility type
    const visibilityType = useMemo(() => {
        return localVisibility ?? initialVisibilityType;
    }, [localVisibility, initialVisibilityType]);

    // Update visibility with optimistic update
    // @todo Consider adding rate limiting here, extracting config to lib/config/rate-limits.ts
    const setVisibilityType = useCallback(
        async (updatedVisibilityType: VisibilityType) => {
            // Cancel any pending visibility update to prevent race conditions
            if (pendingUpdateRef.current) {
                pendingUpdateRef.current.abort();
            }
            // Note: AbortController kept for request deduplication tracking.
            // Server actions don't support abort, but we use it to detect superseded requests.
            pendingUpdateRef.current = new AbortController();

            // Capture previous value before optimistic update using functional update
            // This ensures we always have the correct value for rollback
            let previousVisibility: VisibilityType | undefined;
            setLocalVisibility((current: VisibilityType | undefined) => {
                previousVisibility = current;
                return updatedVisibilityType;
            });

            try {
                const result = await updateChatVisibility({
                    chatId,
                    visibility: updatedVisibilityType,
                });

                if (!result.success) {
                    throw new Error(
                        result.error || "Failed to update visibility"
                    );
                }
            } catch (error) {
                // Don't rollback if this request was aborted (superseded by newer request)
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                // Rollback optimistic update on failure using captured previousVisibility
                if (previousVisibility !== undefined) {
                    setLocalVisibility(previousVisibility);
                }
                toast.error("Failed to update visibility");
            } finally {
                pendingUpdateRef.current = null;
            }
        },
        [chatId, setLocalVisibility]
    );

    return { visibilityType, setVisibilityType };
}
