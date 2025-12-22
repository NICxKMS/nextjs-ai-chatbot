"use client";

/**
 * Scroll to Bottom Hook
 *
 * Provides auto-scroll functionality for chat messages container.
 * Tracks scroll position and provides methods to scroll to bottom.
 *
 * @module features/chat/hooks/use-scroll-to-bottom
 */

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

// =============================================================================
// TYPES
// =============================================================================

type ScrollFlag = ScrollBehavior | false;

export type UseScrollToBottomReturn = {
    /** Ref to attach to the scrollable container */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Ref to attach to the end marker element */
    endRef: React.RefObject<HTMLDivElement | null>;
    /** Whether the container is scrolled to bottom */
    isAtBottom: boolean;
    /** Function to scroll to bottom with optional behavior */
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    /** Callback when viewport enters bottom area */
    onViewportEnter: () => void;
    /** Callback when viewport leaves bottom area */
    onViewportLeave: () => void;
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Distance from bottom (in pixels) to consider "at bottom" */
const SCROLL_BOTTOM_THRESHOLD = 100;

/** SWR key for scroll behavior state */
const SCROLL_SWR_KEY = "messages:should-scroll";

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing scroll-to-bottom behavior in chat containers.
 *
 * Features:
 * - Auto-scroll tracking with threshold
 * - Smooth scroll to bottom
 * - ResizeObserver and MutationObserver for content changes
 * - SSR-safe with hydration handling
 *
 * @returns Scroll state and control methods
 */
export function useScrollToBottom(): UseScrollToBottomReturn {
    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const rafIdRef = useRef<number | null>(null);

    // Start as true to match SSR, actual value computed after mount
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Mark as mounted after first render for client-side scroll tracking
    useEffect(() => {
        setMounted(true);
    }, []);

    // Use SWR for scroll behavior flag to coordinate scroll requests
    const { data: scrollBehavior = false, mutate: setScrollBehavior } =
        useSWR<ScrollFlag>(SCROLL_SWR_KEY, null, {
            fallbackData: false,
        });

    // Handle scroll events and update isAtBottom state
    const handleScroll = useCallback(() => {
        // Only track scroll after mount to prevent hydration mismatch
        if (!mounted || !containerRef.current) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

        // Check if we are within threshold of the bottom
        setIsAtBottom(
            scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD
        );
    }, [mounted]);

    // Set up ResizeObserver and MutationObserver for content changes
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const container = containerRef.current;

        // Observe size changes
        const resizeObserver = new ResizeObserver(() => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = requestAnimationFrame(() => {
                handleScroll();
                rafIdRef.current = null;
            });
        });

        // Observe DOM mutations
        const mutationObserver = new MutationObserver(() => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = requestAnimationFrame(() => {
                    handleScroll();
                    rafIdRef.current = null;
                });
            });
        });

        resizeObserver.observe(container);
        mutationObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class", "data-state"],
        });

        handleScroll();

        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [handleScroll]);

    // Set up scroll event listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        container.addEventListener("scroll", handleScroll);
        handleScroll(); // Check initial state

        return () => {
            container.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll]);

    // Execute scroll when scrollBehavior is set
    useEffect(() => {
        if (scrollBehavior && containerRef.current) {
            const container = containerRef.current;
            const scrollOptions: ScrollToOptions = {
                top: container.scrollHeight,
                behavior: scrollBehavior,
            };
            container.scrollTo(scrollOptions);
            setScrollBehavior(false);
        }
    }, [scrollBehavior, setScrollBehavior]);

    // Function to trigger scroll to bottom
    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            setScrollBehavior(behavior);
        },
        [setScrollBehavior]
    );

    // Viewport tracking callbacks for intersection observers
    const onViewportEnter = useCallback(() => {
        setIsAtBottom(true);
    }, []);

    const onViewportLeave = useCallback(() => {
        setIsAtBottom(false);
    }, []);

    return {
        containerRef,
        endRef,
        isAtBottom,
        scrollToBottom,
        onViewportEnter,
        onViewportLeave,
    };
}
