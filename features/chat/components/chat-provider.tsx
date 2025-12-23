/**
 * Chat Provider Component
 *
 * Exposes AI SDK's useChat hook directly via context.
 * Uses DefaultChatTransport for custom request body.
 *
 * @module features/chat/components/chat-provider
 */

"use client";

import { type UseChatHelpers, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { useSettings } from "@/features/settings";
import { useOptimisticChats } from "@/features/sidebar/hooks";
import { DEFAULT_MODEL_ID } from "@/lib/ai/config";
import { getAvailableModels } from "@/lib/ai/models";
import { logger } from "@/lib/utils/logger";
import { fetchWithErrorHandlers } from "@/lib/utils/network";
import type { ChatMessage, ModelMetadata, ModelState } from "../types";

// =============================================================================
// CONTEXTS
// =============================================================================

/**
 * Context for AI SDK's useChat helpers.
 * Exposes the full useChat return value for direct access.
 */
const ChatHelpersContext = createContext<UseChatHelpers<ChatMessage> | null>(
    null
);
ChatHelpersContext.displayName = "ChatHelpersContext";

/**
 * Context for model selection state (not provided by AI SDK).
 */
const ModelContext = createContext<ModelState | null>(null);
ModelContext.displayName = "ModelContext";

/**
 * Context for chat metadata (chatId, isReadonly, isGuest).
 */
type ChatMetadata = {
    chatId: string;
    isReadonly: boolean;
    isGuest: boolean;
};
const ChatMetadataContext = createContext<ChatMetadata | null>(null);
ChatMetadataContext.displayName = "ChatMetadataContext";

// =============================================================================
// TYPES
// =============================================================================

export type ChatProviderProps = {
    /** Child components to render within the provider */
    children: React.ReactNode;
    /** Unique identifier for the chat session */
    chatId: string;
    /** Optional initial messages to populate the chat */
    initialMessages?: ChatMessage[];
    /** Optional pre-selected model identifier */
    selectedModelId?: string;
    /** Whether the chat is in read-only mode (viewing history) */
    isReadonly?: boolean;
    /** Available models for selection */
    availableModels?: ModelMetadata[];
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a UUID for message IDs.
 */
function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Determines adaptive throttle rate based on connection speed.
 */
function getAdaptiveThrottle(): number {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
        return 100;
    }

    const connection = (
        navigator as Navigator & {
            connection?: { effectiveType?: string };
        }
    ).connection;

    if (!connection?.effectiveType) {
        return 100;
    }

    switch (connection.effectiveType) {
        case "4g":
        case "5g":
            return 50;
        case "3g":
            return 150;
        default:
            return 100;
    }
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * ChatProvider - Exposes AI SDK's useChat directly via context.
 *
 * Features:
 * - Uses DefaultChatTransport for custom request body (modelId)
 * - Provides chat helpers directly from useChat
 * - Separate context for model selection state
 *
 * @example
 * ```tsx
 * <ChatProvider chatId="abc123" initialMessages={messages}>
 *   <ChatMessages />
 *   <ChatInput />
 * </ChatProvider>
 * ```
 */
export function ChatProvider({
    children,
    chatId,
    initialMessages = [],
    selectedModelId = DEFAULT_MODEL_ID,
    isReadonly = false,
    availableModels,
}: ChatProviderProps): React.JSX.Element {
    // Model selection state
    const [currentModelId, setCurrentModelId] = useState(selectedModelId);
    const currentModelIdRef = useRef(currentModelId);
    const { setSelectedModelId: persistModelId } = useSettings();

    // Keep ref in sync with state
    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    // Callback to set model ID and persist to localStorage
    const setModelId = useCallback(
        (id: string) => {
            setCurrentModelId(id);
            persistModelId(id);
        },
        [persistModelId]
    );

    // Calculate adaptive throttle (memoized)
    const throttleValue = useMemo(() => getAdaptiveThrottle(), []);

    // Get available models
    const models = useMemo(
        () => availableModels ?? getAvailableModels(),
        [availableModels]
    );

    // Error handler for streaming errors (Fix #144)
    const handleStreamError = useCallback((error: Error) => {
        logger.error("[ChatProvider] Stream error", { error });

        // Extract user-friendly message from error
        let userMessage = "An error occurred while generating the response.";

        if (
            error.message.includes("rate limit") ||
            error.message.includes("429")
        ) {
            userMessage =
                "Rate limit exceeded. Please wait a moment and try again.";
        } else if (
            error.message.includes("API key") ||
            error.message.includes("authentication")
        ) {
            userMessage =
                "AI service configuration error. Please contact support.";
        } else if (
            error.message.includes("timeout") ||
            error.message.includes("TIMEOUT")
        ) {
            userMessage =
                "The request timed out. Please try again with a shorter message.";
        } else if (
            error.message.includes("network") ||
            error.message.includes("fetch")
        ) {
            userMessage =
                "Network error. Please check your connection and try again.";
        } else if (error.message) {
            // Use the actual error message if it's not too technical
            userMessage =
                error.message.length < 100 ? error.message : userMessage;
        }

        toast.error(userMessage, {
            duration: 5000,
            description: "Click to dismiss",
        });
    }, []);

    // AI SDK useChat hook with DefaultChatTransport
    const chatHelpers = useChat<ChatMessage>({
        id: chatId,
        messages: initialMessages,
        generateId: generateUUID,
        experimental_throttle: throttleValue,
        onError: handleStreamError,
        transport: new DefaultChatTransport({
            api: "/api/chat",
            fetch: fetchWithErrorHandlers,
            prepareSendMessagesRequest(request) {
                return {
                    body: {
                        id: request.id,
                        messages: request.messages,
                        modelId: currentModelIdRef.current,
                        ...request.body,
                    },
                };
            },
        }),
        // Process streaming data parts (title, usage, etc.)
        onData: (data) => {
            // Data is an object with type and data properties
            const streamData = data as { type?: string; data?: unknown };
            if (streamData.type === "data-chat-title") {
                // Handle title update - could dispatch to a title state or callback
                // Title received: streamData.data
            }
            if (streamData.type === "data-usage") {
                // Handle usage tracking
                const _usage = streamData.data as
                    | {
                          inputTokens?: number;
                          outputTokens?: number;
                          totalTokens?: number;
                      }
                    | undefined;
                // Usage data available: _usage?.inputTokens, _usage?.outputTokens, _usage?.totalTokens
            }
        },
    });

    // Optimistic sidebar update: Show new chat immediately when first message is sent
    const { addOptimisticChat } = useOptimisticChats();
    const hasAddedOptimisticChat = useRef(false);

    useEffect(() => {
        // Only trigger for new chats (no initial messages) when first message is submitted
        if (
            chatHelpers.status === "submitted" &&
            initialMessages.length === 0 &&
            chatHelpers.messages.length === 1 &&
            !hasAddedOptimisticChat.current
        ) {
            hasAddedOptimisticChat.current = true;
            const firstMessage = chatHelpers.messages[0];

            // Extract text content from message parts (UIMessage uses parts array)
            let textContent = "New Chat";
            if (firstMessage?.parts) {
                const textPart = firstMessage.parts.find(
                    (part): part is { type: "text"; text: string } =>
                        part.type === "text"
                );
                if (textPart?.text) {
                    textContent = textPart.text;
                }
            }
            const initialTitle = textContent.slice(0, 80).trim() || "New Chat";

            addOptimisticChat({
                id: chatId,
                title: initialTitle,
                createdAt: new Date(),
                visibility: "private",
                userId: "", // Will be populated from server response
            });
        }
    }, [
        chatHelpers.status,
        chatHelpers.messages,
        initialMessages.length,
        chatId,
        addOptimisticChat,
    ]);

    // Model state (custom - not in AI SDK)
    const modelState = useMemo<ModelState>(
        () => ({
            currentModelId,
            availableModels: models,
            setModelId,
        }),
        [currentModelId, models, setModelId]
    );

    // Chat metadata
    const chatMetadata = useMemo<ChatMetadata>(
        () => ({
            chatId,
            isReadonly,
            isGuest: chatId.startsWith("guest-"),
        }),
        [chatId, isReadonly]
    );

    return (
        <ChatHelpersContext.Provider value={chatHelpers}>
            <ModelContext.Provider value={modelState}>
                <ChatMetadataContext.Provider value={chatMetadata}>
                    {children}
                </ChatMetadataContext.Provider>
            </ModelContext.Provider>
        </ChatHelpersContext.Provider>
    );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to get AI SDK's chat helpers directly.
 * Returns the full useChat return value.
 *
 * @example
 * ```tsx
 * const { messages, status, sendMessage, stop } = useChatHelpers();
 * ```
 */
export function useChatHelpers(): UseChatHelpers<ChatMessage> {
    const context = useContext(ChatHelpersContext);
    if (!context) {
        throw new Error("useChatHelpers must be used within ChatProvider");
    }
    return context;
}

/**
 * Hook for model selection state.
 *
 * @example
 * ```tsx
 * const { currentModelId, setModelId, availableModels } = useModelState();
 * ```
 */
export function useModelState(): ModelState {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error("useModelState must be used within ChatProvider");
    }
    return context;
}

/**
 * Hook for chat metadata (chatId, isReadonly, isGuest).
 *
 * @example
 * ```tsx
 * const { chatId, isReadonly, isGuest } = useChatMetadata();
 * ```
 */
export function useChatMetadata(): ChatMetadata {
    const context = useContext(ChatMetadataContext);
    if (!context) {
        throw new Error("useChatMetadata must be used within ChatProvider");
    }
    return context;
}
