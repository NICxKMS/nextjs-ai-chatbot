"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type DataUIPart } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import type { UseChatHelpers } from "@ai-sdk/react";
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
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage, CustomUIDataTypes } from "@/lib/types";
import { useSettingsSnapshot } from "@/lib/ui/settings-store";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { useSidebar } from "./ui/sidebar";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
  availableModels = [],
  uploadsEnabled,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  availableModels?: ModelMetadata[];
  uploadsEnabled: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { appendDataPart, resetDataStream } = useDataStream();
  const settings = useSettingsSnapshot();
  const { open: isSidebarOpen, openMobile: isSidebarMobileOpen } = useSidebar();
  const isNewChat = initialMessages.length === 0;
  const shouldRefreshHistory = (isSidebarOpen || isSidebarMobileOpen) && isNewChat;
  const hasSyncedHistoryRef = useRef(false);

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);
  const setMessagesRef = useRef<
    UseChatHelpers<ChatMessage>["setMessages"]
  >();

  const getCurrentModel = useCallback(
    () =>
      availableModels.find((model) => model.id === currentModelIdRef.current),
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

  const prepareSendMessagesRequest = useCallback(
    (request: {
      id: string;
      messages: ChatMessage[];
      body?: Record<string, unknown>;
    }) => ({
      body: {
        id: request.id,
        message: request.messages.at(-1),
        selectedChatModel: currentModelIdRef.current,
        selectedVisibilityType: visibilityType,
        settings,
        ...request.body,
      },
    }),
    [visibilityType, settings]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest,
      }),
    [prepareSendMessagesRequest]
  );

  const handleData = useCallback(
    (dataPart: DataUIPart<CustomUIDataTypes>) => {
      if (settings.streamArtifacts) {
        appendDataPart(dataPart);
      }

      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }

      if (dataPart.type === "data-appendMessage") {
        try {
          const message = JSON.parse((dataPart as unknown as { data: string }).data);
          setMessagesRef.current?.((prev) => [...prev, message]);
        } catch {
          // ignore malformed payloads
        }
      }
    },
    [appendDataPart, settings.streamArtifacts]
  );

  const handleFinish = useCallback(() => {
    if (!shouldRefreshHistory || hasSyncedHistoryRef.current) {
      return;
    }

    mutate(unstable_serialize(getChatHistoryPaginationKey));
    hasSyncedHistoryRef.current = true;
  }, [mutate, shouldRefreshHistory]);

  const handleError = useCallback(
    (error: unknown) => {
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
          const providerName = currentModel?.providerName ?? "Model provider";

          console.error("Model invocation rejected", {
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

        console.error("Chat model error", {
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

      console.error("Unexpected chat error", error);
      toast({
        type: "error",
        description: `Unexpected error while contacting the model provider.${
          error instanceof Error ? ` ${error.message}` : ""
        }`,
      });
    },
    [getCurrentModel, isVercelGatewayModel]
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport,
    onData: handleData,
    onFinish: handleFinish,
    onError: handleError,
  });

  setMessagesRef.current = setMessages;

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  useEffect(() => {
    if (!settings.streamArtifacts) {
      return;
    }
    if (status === "submitted") {
      resetDataStream();
    }
  }, [status, settings.streamArtifacts, resetDataStream]);

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

  const shouldFetchVotes = !isReadonly && messages.length >= 2;

  const { data: votes } = useSWR<Vote[]>(
    shouldFetchVotes ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
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
              onModelChange={setCurrentModelId}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              uploadsEnabled={uploadsEnabled}
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
        uploadsEnabled={uploadsEnabled}
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
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
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
