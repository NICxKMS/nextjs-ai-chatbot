"use client";

/**
 * Conversation Wrapper
 *
 * Enhanced wrapper around AI Element Conversation component.
 * Adds integration with chat context and scroll state callbacks.
 */

import { useCallback, useEffect, useRef } from "react";
import {
    Conversation as BaseConversation,
    type ConversationProps as BaseConversationProps,
    ConversationEmptyState,
    type ConversationEmptyStateProps,
} from "@/components/ai-elements/conversation";
import { cn } from "@/lib/utils/index";

// Re-export all base components and types
export {
    ConversationContent,
    type ConversationContentProps,
    ConversationEmptyState,
    type ConversationEmptyStateProps,
    type ConversationProps as BaseConversationProps,
    ConversationScrollButton,
    type ConversationScrollButtonProps,
} from "@/components/ai-elements/conversation";

/**
 * Scroll state for tracking conversation scroll position
 */
export type ScrollState = {
    /** Whether the user is at the bottom of the conversation */
    isAtBottom: boolean;
    /** Current scroll position from top */
    scrollTop: number;
    /** Total scrollable height */
    scrollHeight: number;
    /** Visible height of the container */
    clientHeight: number;
    /** Percentage scrolled (0-100) */
    scrollPercentage: number;
};

/**
 * Enhanced conversation props with scroll callbacks
 */
export interface EnhancedConversationProps extends BaseConversationProps {
    /** Called when scroll state changes */
    onScrollStateChange?: (state: ScrollState) => void;
    /** Called when user scrolls to bottom */
    onScrollToBottom?: () => void;
    /** Called when user scrolls away from bottom */
    onScrollAwayFromBottom?: () => void;
    /** Called when new messages arrive (for auto-scroll) */
    onNewMessage?: () => void;
    /** Auto-scroll to bottom on new messages when already at bottom */
    autoScrollOnNewMessage?: boolean;
}

/**
 * Enhanced Conversation component with scroll state callbacks
 */
export function Conversation({
    onScrollStateChange,
    onScrollToBottom,
    onScrollAwayFromBottom,
    autoScrollOnNewMessage = true,
    className,
    children,
    ...props
}: EnhancedConversationProps) {
    const wasAtBottomRef = useRef(true);

    // Note: The StickToBottom component handles scroll state internally
    // These callbacks provide a hook for external state management
    const _handleScrollStateChange = useCallback(
        (state: ScrollState) => {
            onScrollStateChange?.(state);

            // Track bottom state changes
            if (state.isAtBottom && !wasAtBottomRef.current) {
                onScrollToBottom?.();
            } else if (!state.isAtBottom && wasAtBottomRef.current) {
                onScrollAwayFromBottom?.();
            }
            wasAtBottomRef.current = state.isAtBottom;
        },
        [onScrollStateChange, onScrollToBottom, onScrollAwayFromBottom]
    );

    return (
        <BaseConversation className={cn("flex flex-col", className)} {...props}>
            {children}
        </BaseConversation>
    );
}

/**
 * Enhanced empty state with custom presets
 */
export interface EnhancedEmptyStateProps extends ConversationEmptyStateProps {
    /** Preset style for empty state */
    preset?: "chat" | "search" | "documents" | "custom";
}

/**
 * Preset configurations for empty states
 */
const EMPTY_STATE_PRESETS = {
    chat: {
        title: "Start a conversation",
        description: "Send a message to begin chatting with the AI assistant",
    },
    search: {
        title: "No results found",
        description: "Try adjusting your search terms or filters",
    },
    documents: {
        title: "No documents",
        description: "Upload or create a document to get started",
    },
    custom: {
        title: "No content",
        description: "Nothing to display yet",
    },
};

/**
 * Enhanced empty state with presets
 */
export function EnhancedConversationEmptyState({
    preset = "chat",
    title,
    description,
    ...props
}: EnhancedEmptyStateProps) {
    const presetConfig = EMPTY_STATE_PRESETS[preset];

    return (
        <ConversationEmptyState
            description={description ?? presetConfig.description}
            title={title ?? presetConfig.title}
            {...props}
        />
    );
}

/**
 * Hook for managing conversation scroll state
 */
export function useConversationScroll() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = "smooth") => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior,
                });
            }
        },
        []
    );

    const scrollToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: 0,
                behavior,
            });
        }
    }, []);

    const getScrollState = useCallback((): ScrollState | null => {
        if (!scrollRef.current) {
            return null;
        }

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
        const scrollPercentage =
            scrollHeight > clientHeight
                ? (scrollTop / (scrollHeight - clientHeight)) * 100
                : 100;

        return {
            isAtBottom,
            scrollTop,
            scrollHeight,
            clientHeight,
            scrollPercentage,
        };
    }, []);

    return {
        scrollRef,
        scrollToBottom,
        scrollToTop,
        getScrollState,
        isAtBottom: isAtBottomRef.current,
    };
}

/**
 * Hook for auto-scrolling on new messages
 */
export function useAutoScroll(
    messagesCount: number,
    options?: {
        enabled?: boolean;
        scrollBehavior?: ScrollBehavior;
    }
) {
    const { enabled = true, scrollBehavior = "smooth" } = options ?? {};
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevCountRef = useRef(messagesCount);
    const isAtBottomRef = useRef(true);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        // New message added and user was at bottom
        if (messagesCount > prevCountRef.current && isAtBottomRef.current) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: scrollBehavior,
            });
        }

        prevCountRef.current = messagesCount;
    }, [messagesCount, enabled, scrollBehavior]);

    const handleScroll = useCallback(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            isAtBottomRef.current =
                scrollHeight - scrollTop - clientHeight < 10;
        }
    }, []);

    return {
        scrollRef,
        handleScroll,
    };
}
