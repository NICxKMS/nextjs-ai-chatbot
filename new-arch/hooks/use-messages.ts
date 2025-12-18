"use client";

import {
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import useSWR from "swr";

import type { ChatMessage } from "@/types/message";
import { SWR_KEYS } from "./swr-keys";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type MessageStatus =
    | "idle"
    | "submitted"
    | "streaming"
    | "ready"
    | "error";

export type UseMessagesOptions = {
    /** Chat ID for scoping messages */
    chatId: string;
    /** Initial messages from server (for SSR hydration) */
    initialMessages?: ChatMessage[];
    /** Whether to auto-scroll on new messages */
    autoScroll?: boolean;
};

export type UseMessagesReturn = {
    /** Current messages list */
    messages: ChatMessage[];
    /** Current streaming/loading status */
    status: MessageStatus;
    /** Whether user has sent at least one message this session */
    hasSentMessage: boolean;
    /** Ref for the messages container */
    containerRef: RefObject<HTMLDivElement | null>;
    /** Ref for the scroll anchor element */
    endRef: RefObject<HTMLDivElement | null>;
    /** Whether scroll is at bottom */
    isAtBottom: boolean;
    /** Scroll to bottom of messages */
    scrollToBottom: () => void;
    /** Set messages (for streaming updates) */
    setMessages: (messages: ChatMessage[]) => void;
    /** Set status */
    setStatus: (status: MessageStatus) => void;
    /** Append a single message */
    appendMessage: (message: ChatMessage) => void;
    /** Update a message by ID */
    updateMessage: (
        id: string,
        updater: (msg: ChatMessage) => ChatMessage
    ) => void;
    /** Clear all messages */
    clearMessages: () => void;
    /** Viewport enter handler for IntersectionObserver */
    onViewportEnter: () => void;
    /** Viewport leave handler for IntersectionObserver */
    onViewportLeave: () => void;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "at bottom"
const SCROLL_BEHAVIOR: ScrollBehavior = "smooth";

// ─────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Hook for managing chat messages with streaming support.
 *
 * Features:
 * - Message state via SWR for cache sharing
 * - Auto-scroll behavior with user override detection
 * - Streaming status management
 * - Viewport-aware scroll tracking
 *
 * @example
 * ```tsx
 * const {
 *   messages,
 *   status,
 *   containerRef,
 *   endRef,
 *   isAtBottom,
 *   scrollToBottom,
 * } = useMessages({
 *   chatId: "abc123",
 *   initialMessages: serverMessages,
 *   autoScroll: true,
 * });
 * ```
 */
export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
    const { chatId, initialMessages = [], autoScroll = true } = options;

    // ─────────────────────────────────────────────────────────────
    // Message State (SWR Cache)
    // ─────────────────────────────────────────────────────────────

    const { data: messages = [], mutate: mutateMessages } = useSWR<
        ChatMessage[]
    >(SWR_KEYS.messages(chatId), null, {
        fallbackData: initialMessages,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    // ─────────────────────────────────────────────────────────────
    // Local State
    // ─────────────────────────────────────────────────────────────

    const [status, setStatus] = useState<MessageStatus>("idle");
    const [hasSentMessage, setHasSentMessage] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Track if user manually scrolled away
    const userScrolledRef = useRef(false);
    const isStreamingRef = useRef(false);

    // ─────────────────────────────────────────────────────────────
    // Refs
    // ─────────────────────────────────────────────────────────────

    const containerRef = useRef<HTMLDivElement | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);

    // ─────────────────────────────────────────────────────────────
    // Scroll Logic
    // ─────────────────────────────────────────────────────────────

    const checkIfAtBottom = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return true;
        }

        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
    }, []);

    const scrollToBottom = useCallback(() => {
        endRef.current?.scrollIntoView({ behavior: SCROLL_BEHAVIOR });
        userScrolledRef.current = false;
        setIsAtBottom(true);
    }, []);

    // Track scroll position
    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const handleScroll = () => {
            const atBottom = checkIfAtBottom();
            setIsAtBottom(atBottom);

            // If user scrolls up during streaming, mark as manual scroll
            if (isStreamingRef.current && !atBottom) {
                userScrolledRef.current = true;
            }
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, [checkIfAtBottom]);

    // Auto-scroll on new messages (if enabled and at bottom)
    useEffect(() => {
        if (!autoScroll) {
            return;
        }
        if (userScrolledRef.current) {
            return;
        }

        const atBottom = checkIfAtBottom();
        if (atBottom || status === "submitted") {
            scrollToBottom();
        }
    }, [status, autoScroll, checkIfAtBottom, scrollToBottom]);

    // Track streaming state
    useEffect(() => {
        isStreamingRef.current = status === "streaming";
        if (status === "ready" || status === "error") {
            userScrolledRef.current = false;
        }
    }, [status]);

    // Track if user has sent a message
    useEffect(() => {
        if (status === "submitted") {
            setHasSentMessage(true);
        }
    }, [status]);

    // ─────────────────────────────────────────────────────────────
    // Message Actions
    // ─────────────────────────────────────────────────────────────

    const setMessages = useCallback(
        (newMessages: ChatMessage[]) => {
            mutateMessages(newMessages, { revalidate: false });
        },
        [mutateMessages]
    );

    const appendMessage = useCallback(
        (message: ChatMessage) => {
            mutateMessages((current = []) => [...current, message], {
                revalidate: false,
            });
        },
        [mutateMessages]
    );

    const updateMessage = useCallback(
        (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
            mutateMessages(
                (current = []) =>
                    current.map((msg) => (msg.id === id ? updater(msg) : msg)),
                { revalidate: false }
            );
        },
        [mutateMessages]
    );

    const clearMessages = useCallback(() => {
        mutateMessages([], { revalidate: false });
        setStatus("idle");
        setHasSentMessage(false);
    }, [mutateMessages]);

    // ─────────────────────────────────────────────────────────────
    // Viewport Handlers (for IntersectionObserver integration)
    // ─────────────────────────────────────────────────────────────

    const onViewportEnter = useCallback(() => {
        setIsAtBottom(true);
        userScrolledRef.current = false;
    }, []);

    const onViewportLeave = useCallback(() => {
        setIsAtBottom(false);
    }, []);

    return {
        messages,
        status,
        hasSentMessage,
        containerRef,
        endRef,
        isAtBottom,
        scrollToBottom,
        setMessages,
        setStatus,
        appendMessage,
        updateMessage,
        clearMessages,
        onViewportEnter,
        onViewportLeave,
    };
}

// ─────────────────────────────────────────────────────────────
// Scroll-to-Bottom Only Hook
// ─────────────────────────────────────────────────────────────

export type UseScrollToBottomReturn = {
    containerRef: RefObject<HTMLDivElement | null>;
    endRef: RefObject<HTMLDivElement | null>;
    isAtBottom: boolean;
    scrollToBottom: () => void;
    onViewportEnter: () => void;
    onViewportLeave: () => void;
};

/**
 * Lightweight hook for scroll-to-bottom behavior only.
 * Use this when you don't need full message management.
 *
 * @example
 * ```tsx
 * const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();
 * ```
 */
export function useScrollToBottom(): UseScrollToBottomReturn {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const endRef = useRef<HTMLDivElement | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const scrollToBottom = useCallback(() => {
        endRef.current?.scrollIntoView({ behavior: SCROLL_BEHAVIOR });
        setIsAtBottom(true);
    }, []);

    const onViewportEnter = useCallback(() => {
        setIsAtBottom(true);
    }, []);

    const onViewportLeave = useCallback(() => {
        setIsAtBottom(false);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setIsAtBottom(
                scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
            );
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
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
