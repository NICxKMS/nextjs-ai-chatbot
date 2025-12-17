"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ChatHeader } from "@/components/chat-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useDataStreamDispatch } from "@/components/providers/data-stream-provider";
import { useOptimisticChats } from "@/components/providers/optimistic-chats-provider";
import { useSettings } from "@/components/providers/settings-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    initialArtifactData,
    useArtifact,
    useArtifactSelector,
} from "@/hooks/use-artifact";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import { ChatSDKError } from "@/lib/errors";
import { logError, logWarn } from "@/lib/log";
import {
    type Attachment,
    type ChatMessage,
    isDataAppendMessagePart,
    isDataChatTitlePart,
    type UserVote,
} from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

const Artifact = dynamic(() => import("./artifact").then((m) => m.Artifact), {
    ssr: false,
});

// Experimental Network Information API type
type NetworkInformation = {
    effectiveType?: "slow-2g" | "2g" | "3g" | "4g" | "5g";
};

type NavigatorWithConnection = Navigator & {
    connection?: NetworkInformation;
};

export function Chat({
    id,
    initialMessages,
    initialChatModel,
    initialVisibilityType,
    isReadonly,
    initialLastContext,
    availableModels = [],
    initialVotes,
}: {
    id: string;
    initialMessages: ChatMessage[];
    initialChatModel: string;
    initialVisibilityType: VisibilityType;
    isReadonly: boolean;
    initialLastContext?: AppUsage;
    availableModels?: ModelMetadata[];
    initialVotes?: UserVote[];
}) {
    const { visibilityType } = useChatVisibility({
        chatId: id,
        initialVisibilityType,
    });

    const setDataStream = useDataStreamDispatch();
    const { settings, setSelectedModelId } = useSettings();
    const { clearNewSessionFlag } = useAuth();
    const {
        addOptimisticChat,
        removeOptimisticChat,
        updateOptimisticChatTitle,
    } = useOptimisticChats();
    const { setArtifact } = useArtifact();

    const [input, setInput] = useState<string>("");
    const [usage, setUsage] = useState<AppUsage | undefined>(
        initialLastContext
    );
    const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
    // For new chats, prefer the persisted model from settings (localStorage)
    // For existing chats, use the chat's stored model (initialChatModel)
    const [currentModelId, setCurrentModelId] = useState(initialChatModel);
    const currentModelIdRef = useRef(currentModelId);
    // Track if we've applied the persisted model (for new chats only)
    const hasAppliedPersistedModel = useRef(false);

    // Sync persisted model selection from localStorage after hydration (new chats only)
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

    // Ref to track message count for onFinish callback (avoids stale closure)
    const messagesLengthRef = useRef(0);
    // Ref to store timer IDs for cleanup
    const titlePollTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Persist model selection to localStorage for future sessions
    const handleModelChange = useCallback(
        (modelId: string) => {
            setCurrentModelId(modelId);
            setSelectedModelId(modelId);
        },
        [setSelectedModelId]
    );

    const getCurrentModel = useCallback(
        () =>
            availableModels.find(
                (model) => model.id === currentModelIdRef.current
            ),
        [availableModels]
    );

    const isVercelGatewayModel = useCallback(
        (modelId: string | undefined) => {
            if (!modelId) {
                return false;
            }
            if (modelId.startsWith("vercel-gateway:")) {
                return true;
            }
            const matchingModel = availableModels.find(
                (model) => model.id === modelId
            );
            return matchingModel?.providerId === "vercel-gateway";
        },
        [availableModels]
    );

    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    // Cleanup title poll timers on unmount
    useEffect(() => {
        return () => {
            for (const timerId of titlePollTimersRef.current) {
                clearTimeout(timerId);
            }
            titlePollTimersRef.current = [];
        };
    }, []);

    // Adaptive throttle based on connection speed (memoized)
    const optimalThrottle = useMemo(() => {
        if (typeof navigator !== "undefined" && "connection" in navigator) {
            const nav = navigator as NavigatorWithConnection;
            const conn = nav.connection;
            if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") {
                return 50; // Faster for good connections
            }
            if (conn?.effectiveType === "3g") {
                return 150; // Slower for 3G
            }
        }
        return 100; // Default
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
        id,
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
                // Update the optimistic chat title in-place from the stream.
                updateOptimisticChatTitle(id, dataPart.data);
            }
            if (isDataAppendMessagePart(dataPart)) {
                const data = dataPart.data;
                // Validate before parsing to reduce exception overhead
                if (typeof data === "string") {
                    try {
                        const message = JSON.parse(data);
                        // Basic validation to ensure it's a valid message
                        if (message?.id && message?.role) {
                            setMessages((prev) => [...prev, message]);
                        }
                    } catch (error) {
                        logWarn("Failed to parse data-appendMessage", error);
                    }
                } else if (typeof data === "object" && data !== null) {
                    // Already parsed object - validate structure
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
        onFinish: (_finishData) => {
            // OPTIMIZATION: Title is generated asynchronously in the background
            // For new chats, poll for title update to ensure it appears in sidebar
            // even when title generation completes after streaming ends
            // Use ref to avoid stale closure (messages.length would be stale here)
            if (
                initialMessages.length === 0 &&
                messagesLengthRef.current >= 1
            ) {
                // Clear any existing timers before setting new ones
                for (const timerId of titlePollTimersRef.current) {
                    clearTimeout(timerId);
                }
                titlePollTimersRef.current = [];

                // New chat - poll for title updates with increasing delays
                // First check after 500ms, then 1.5s, then 3s to catch most cases
                const pollDelays = [500, 1500, 3000];
                for (const delay of pollDelays) {
                    const timerId = setTimeout(() => {
                        // Trigger a sidebar refresh to pick up the generated title from DB/cache
                        window.dispatchEvent(new Event("chat-title-updated"));
                    }, delay);
                    titlePollTimersRef.current.push(timerId);
                }
            }
        },
        onError: (error) => {
            // Remove optimistic chat on error
            removeOptimisticChat(id);
            if (error instanceof ChatSDKError) {
                const isGatewayCreditCardError = error.message?.includes(
                    "AI Gateway requires a valid credit card"
                );

                if (isGatewayCreditCardError) {
                    if (isVercelGatewayModel(currentModelIdRef.current)) {
                        setShowCreditCardAlert(true);
                        return;
                    }

                    const currentModel = getCurrentModel();
                    const providerName =
                        currentModel?.providerName ?? "Model provider";

                    logError("Model invocation rejected", {
                        modelId: currentModelIdRef.current,
                        providerName,
                        reason: error.message,
                        cause: error.cause,
                    });

                    toast({
                        type: "error",
                        description: `${providerName} rejected the request due to billing requirements. Please verify your credentials or billing status with ${providerName}.`,
                    });
                    return;
                }

                logError("Chat model error", {
                    modelId: currentModelIdRef.current,
                    providerName: getCurrentModel()?.providerName,
                    code: error.code,
                    message: error.message,
                    cause: error.cause,
                });

                toast({
                    type: "error",
                    description: `${error.message}${error.cause ? ` — ${error.cause}` : ""}${error.code ? ` (code: ${error.code})` : ""}`,
                });
                return;
            }

            logError("Unexpected chat error", error);
            toast({
                type: "error",
                description: `Unexpected error while contacting the model provider.${error instanceof Error ? ` ${error.message}` : ""}`,
            });
        },
    });

    // Keep messagesLengthRef in sync with messages for use in onFinish callback
    useEffect(() => {
        messagesLengthRef.current = messages.length;
    }, [messages.length]);

    // Add optimistic chat when user sends first message
    // Also clear the "new session" flag to enable history fetching
    useEffect(() => {
        if (
            status === "submitted" &&
            initialMessages.length === 0 &&
            messages.length === 1
        ) {
            // Extract initial title from first message for better UX
            const firstMessage = messages[0];
            const textPart = firstMessage?.parts?.find(
                (p): p is { type: "text"; text: string } =>
                    p.type === "text" && typeof p.text === "string"
            );
            const initialTitle =
                textPart?.text?.slice(0, 80).trim() || "New Chat";

            addOptimisticChat(id, initialTitle);
            // Clear new session flag so history will fetch on subsequent sidebar opens
            clearNewSessionFlag();
        }
    }, [
        status,
        messages,
        initialMessages.length,
        id,
        addOptimisticChat,
        clearNewSessionFlag,
    ]);

    // Reset artifact visibility when navigating to a different chat
    // This prevents artifacts from auto-opening when switching chats
    // biome-ignore lint/correctness/useExhaustiveDependencies: Effect intentionally runs on id change only
    useEffect(() => {
        setArtifact({
            ...initialArtifactData,
            boundingBox: {
                ...initialArtifactData.boundingBox,
            },
        });
        // Cleanup data stream on unmount or chat change
        return () => {
            setDataStream([]);
        };
    }, [id, setArtifact, setDataStream]);

    // Note: We rely on the streaming title update without refetching history.
    const searchParams = useSearchParams();
    const query = searchParams.get("query");

    const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

    useEffect(() => {
        if (query && !hasAppendedQuery) {
            sendMessage({
                role: "user" as const,
                parts: [{ type: "text", text: query }],
            });

            setHasAppendedQuery(true);
            window.history.replaceState({}, "", `/chat/${id}`);
        }
    }, [query, sendMessage, hasAppendedQuery, id]);

    const { session } = useAuth();
    const isGuest = session?.user?.type === "guest";

    // Use server-provided votes (no client-side fetching for new messages)
    // Votes are only fetched server-side when loading existing chats
    // and updated optimistically when user votes
    const { data: votes } = useSWR<UserVote[]>(
        `/api/vote?chatId=${id}`,
        null, // No fetcher - we never fetch votes client-side
        {
            fallbackData: initialVotes || [],
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
        }
    );

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

    return (
        <>
            <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
                <ChatHeader
                    chatId={id}
                    isReadonly={isReadonly}
                    selectedVisibilityType={initialVisibilityType}
                />

                <Messages
                    chatError={chatError}
                    chatId={id}
                    clearError={clearError}
                    isArtifactVisible={isArtifactVisible}
                    isGuest={isGuest}
                    isReadonly={isReadonly}
                    messages={messages}
                    regenerate={regenerate}
                    selectedModelId={currentModelId}
                    setMessages={setMessages}
                    status={status}
                    votes={votes}
                />

                <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
                    {!isReadonly && (
                        <MultimodalInput
                            attachments={attachments}
                            availableModels={availableModels}
                            chatId={id}
                            input={input}
                            messages={messages}
                            onModelChange={handleModelChange}
                            selectedModelId={currentModelId}
                            selectedVisibilityType={visibilityType}
                            sendMessage={sendMessage}
                            setAttachments={setAttachments}
                            setInput={setInput}
                            setMessages={setMessages}
                            status={status}
                            stop={stop}
                            usage={usage}
                        />
                    )}
                </div>
            </div>

            <Artifact
                attachments={attachments}
                availableModels={availableModels}
                chatId={id}
                input={input}
                isReadonly={isReadonly}
                messages={messages}
                regenerate={regenerate}
                selectedModelId={currentModelId}
                selectedVisibilityType={visibilityType}
                sendMessage={sendMessage}
                setAttachments={setAttachments}
                setInput={setInput}
                setMessages={setMessages}
                status={status}
                stop={stop}
                votes={votes}
            />

            <AlertDialog
                onOpenChange={setShowCreditCardAlert}
                open={showCreditCardAlert}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
                        <AlertDialogDescription>
                            This application requires{" "}
                            {process.env.NODE_ENV === "production"
                                ? "the owner"
                                : "you"}{" "}
                            to activate Vercel AI Gateway.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                window.open(
                                    "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                                    "_blank",
                                    "noopener,noreferrer"
                                );
                                window.location.href = "/";
                            }}
                        >
                            Activate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
