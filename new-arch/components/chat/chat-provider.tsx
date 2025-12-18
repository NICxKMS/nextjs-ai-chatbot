"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useDataStream } from "@/components/data-stream-provider";
import { toast } from "@/components/toast";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useOptimisticChats } from "@/hooks/use-optimistic-chats";
import { ChatSDKError } from "@/lib/errors";
import { logError, logWarn } from "@/lib/log";
import type { Attachment, ChatMessage } from "@/lib/types";
import { isDataAppendMessagePart, isDataChatTitlePart } from "@/lib/types";
import { useSettings } from "@/lib/ui/settings-store";
import type { AppUsage } from "@/lib/usage";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import {
    ChatActionsContext,
    ChatStateContext,
    InputContext,
    ModelContext,
} from "./context";
import type {
    ChatActions,
    ChatProviderProps,
    ChatState,
    InputState,
    ModelState,
} from "./types";

// Network Information API types
type NetworkInformation = {
    effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
};

type NavigatorWithConnection = Navigator & {
    connection?: NetworkInformation;
};

/**
 * ChatProvider - Composes all chat contexts
 * Wraps useChat and splits state/actions into separate contexts
 */
export function ChatProvider({
    children,
    chatId,
    initialMessages,
    initialChatModel,
    initialVisibilityType,
    isReadonly,
    isGuest,
    initialLastContext,
    availableModels = [],
}: ChatProviderProps) {
    const { setDataStream } = useDataStream();
    const { settings, setSelectedModelId } = useSettings();
    const { clearNewSessionFlag } = useAuth();
    const {
        addOptimisticChat,
        removeOptimisticChat,
        updateOptimisticChatTitle,
    } = useOptimisticChats();
    const { visibilityType } = useChatVisibility({
        chatId,
        initialVisibilityType,
    });

    // Input state - isolated to prevent cascade re-renders
    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    // Usage state
    const [usage, setUsage] = useState<AppUsage | undefined>(
        initialLastContext
    );

    // Model state
    const [currentModelId, setCurrentModelId] = useState(initialChatModel);
    const currentModelIdRef = useRef(currentModelId);
    const hasAppliedPersistedModel = useRef(false);

    // Sync persisted model for new chats
    useEffect(() => {
        if (
            !hasAppliedPersistedModel.current &&
            initialMessages.length === 0 &&
            settings.selectedModelId &&
            settings.selectedModelId !== currentModelId
        ) {
            hasAppliedPersistedModel.current = true;
            setCurrentModelId(settings.selectedModelId);
        }
    }, [settings.selectedModelId, initialMessages.length, currentModelId]);

    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    const handleModelChange = useCallback(
        (modelId: string) => {
            setCurrentModelId(modelId);
            setSelectedModelId(modelId);
        },
        [setSelectedModelId]
    );

    // Adaptive throttle based on connection
    const optimalThrottle = useMemo(() => {
        if (typeof navigator !== "undefined" && "connection" in navigator) {
            const nav = navigator as NavigatorWithConnection;
            const conn = nav.connection;
            if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") {
                return 50;
            }
            if (conn?.effectiveType === "3g") {
                return 150;
            }
        }
        return 100;
    }, []);

    // Refs for callbacks
    const messagesLengthRef = useRef(0);
    const titlePollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Cleanup timers
    useEffect(() => {
        return () => {
            for (const timerId of titlePollTimersRef.current) {
                clearTimeout(timerId);
            }
            titlePollTimersRef.current = [];
        };
    }, []);

    const {
        messages,
        setMessages,
        sendMessage,
        status,
        stop,
        regenerate,
        error: chatError,
        clearError,
    } = useChat<ChatMessage>({
        id: chatId,
        messages: initialMessages,
        experimental_throttle: optimalThrottle,
        generateId: generateUUID,
        transport: new DefaultChatTransport({
            api: "/api/chat",
            fetch: fetchWithErrorHandlers,
            prepareSendMessagesRequest(request) {
                return {
                    body: {
                        id: request.id,
                        message: request.messages.at(-1),
                        selectedChatModel: currentModelIdRef.current,
                        selectedVisibilityType: visibilityType,
                        settings,
                        ...request.body,
                    },
                };
            },
        }),
        onData: (dataPart) => {
            if (settings.streamArtifacts) {
                setDataStream((ds) => (ds ? [...ds, dataPart] : []));
            }
            if (dataPart.type === "data-usage") {
                setUsage(dataPart.data);
            }
            if (isDataChatTitlePart(dataPart)) {
                updateOptimisticChatTitle(chatId, dataPart.data);
            }
            if (isDataAppendMessagePart(dataPart)) {
                const data = dataPart.data;
                if (typeof data === "string") {
                    try {
                        const message = JSON.parse(data);
                        if (message?.id && message?.role) {
                            setMessages((prev) => [...prev, message]);
                        }
                    } catch (error) {
                        logWarn("Failed to parse data-appendMessage", error);
                    }
                } else if (typeof data === "object" && data !== null) {
                    const obj = data as Record<string, unknown>;
                    if (obj.id && obj.role) {
                        setMessages((prev) => [
                            ...prev,
                            data as unknown as ChatMessage,
                        ]);
                    }
                }
            }
        },
        onFinish: () => {
            if (
                initialMessages.length === 0 &&
                messagesLengthRef.current >= 1
            ) {
                for (const timerId of titlePollTimersRef.current) {
                    clearTimeout(timerId);
                }
                titlePollTimersRef.current = [];
                const pollDelays = [500, 1500, 3000];
                for (const delay of pollDelays) {
                    const timerId = setTimeout(() => {
                        window.dispatchEvent(new Event("chat-title-updated"));
                    }, delay);
                    titlePollTimersRef.current.push(timerId);
                }
            }
        },
        onError: (error) => {
            removeOptimisticChat(chatId);
            if (error instanceof ChatSDKError) {
                const isGatewayCreditCardError = error.message?.includes(
                    "AI Gateway requires a valid credit card"
                );
                if (isGatewayCreditCardError) {
                    logError("Model invocation rejected", {
                        modelId: currentModelIdRef.current,
                    });
                    toast({
                        type: "error",
                        description: "AI Gateway requires billing setup.",
                    });
                    return;
                }
                logError("Chat model error", {
                    modelId: currentModelIdRef.current,
                    message: error.message,
                });
                toast({ type: "error", description: error.message });
                return;
            }
            logError("Unexpected chat error", error);
            toast({
                type: "error",
                description:
                    "Unexpected error while contacting model provider.",
            });
        },
    });

    // Sync message length ref
    useEffect(() => {
        messagesLengthRef.current = messages.length;
    }, [messages.length]);

    // Add optimistic chat on first message
    useEffect(() => {
        if (
            status === "submitted" &&
            initialMessages.length === 0 &&
            messages.length === 1
        ) {
            const firstMessage = messages[0];
            const textPart = firstMessage?.parts?.find(
                (p): p is { type: "text"; text: string } =>
                    p.type === "text" && typeof p.text === "string"
            );
            const initialTitle =
                textPart?.text?.slice(0, 80).trim() || "New Chat";
            addOptimisticChat(chatId, initialTitle);
            clearNewSessionFlag();
        }
    }, [
        status,
        messages,
        initialMessages.length,
        chatId,
        addOptimisticChat,
        clearNewSessionFlag,
    ]);

    // Build context values
    const stateValue = useMemo<ChatState>(
        () => ({
            chatId,
            messages,
            status: status as ChatState["status"],
            error: chatError ?? undefined,
            isReadonly,
            isGuest,
            usage,
        }),
        [chatId, messages, status, chatError, isReadonly, isGuest, usage]
    );

    const actionsValue = useMemo<ChatActions>(
        () => ({
            sendMessage,
            setMessages,
            regenerate,
            stop,
            clearError,
        }),
        [sendMessage, setMessages, regenerate, stop, clearError]
    );

    const modelValue = useMemo<ModelState>(
        () => ({
            currentModelId,
            availableModels,
            setModelId: handleModelChange,
        }),
        [currentModelId, availableModels, handleModelChange]
    );

    const inputValue = useMemo<InputState>(
        () => ({
            input,
            setInput,
            attachments,
            setAttachments,
        }),
        [input, attachments]
    );

    return (
        <ChatStateContext.Provider value={stateValue}>
            <ChatActionsContext.Provider value={actionsValue}>
                <ModelContext.Provider value={modelValue}>
                    <InputContext.Provider value={inputValue}>
                        {children}
                    </InputContext.Provider>
                </ModelContext.Provider>
            </ChatActionsContext.Provider>
        </ChatStateContext.Provider>
    );
}
