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
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { DEFAULT_MODEL_ID } from "@/lib/ai/config";
import { getAvailableModels } from "@/lib/ai/models";
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

    // Keep ref in sync with state
    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    // Calculate adaptive throttle (memoized)
    const throttleValue = useMemo(() => getAdaptiveThrottle(), []);

    // Get available models
    const models = useMemo(
        () => availableModels ?? getAvailableModels(),
        [availableModels]
    );

    // AI SDK useChat hook with DefaultChatTransport
    const chatHelpers = useChat<ChatMessage>({
        id: chatId,
        messages: initialMessages,
        generateId: generateUUID,
        experimental_throttle: throttleValue,
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

    // Model state (custom - not in AI SDK)
    const modelState = useMemo<ModelState>(
        () => ({
            currentModelId,
            availableModels: models,
            setModelId: setCurrentModelId,
        }),
        [currentModelId, models]
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
