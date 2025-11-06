"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
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
import { useOptimisticChats } from "@/hooks/use-optimistic-chats";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage, UserVote } from "@/lib/types";
import { useSettingsSnapshot } from "@/lib/ui/settings-store";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
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
}: {
	id: string;
	initialMessages: ChatMessage[];
	initialChatModel: string;
	initialVisibilityType: VisibilityType;
	isReadonly: boolean;
	autoResume: boolean;
	initialLastContext?: AppUsage;
	availableModels?: ModelMetadata[];
}) {
	const { visibilityType } = useChatVisibility({
		chatId: id,
		initialVisibilityType,
	});

	const { mutate } = useSWRConfig();
	const { setDataStream } = useDataStream();
	const settings = useSettingsSnapshot();
	const { addOptimisticChat, removeOptimisticChat } = useOptimisticChats();

	const [input, setInput] = useState<string>("");
	const [usage, setUsage] = useState<AppUsage | undefined>(
		initialLastContext
	);
	const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
	const [currentModelId, setCurrentModelId] = useState(initialChatModel);
	const currentModelIdRef = useRef(currentModelId);

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

	// Adaptive throttle based on connection speed (memoized)
	const optimalThrottle = useMemo(() => {
		if (typeof navigator !== "undefined" && "connection" in navigator) {
			const conn = (navigator as any).connection;
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
		resumeStream,
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
			if (dataPart.type === "data-chatTitle") {
				// Remove optimistic chat and trigger refetch when title is ready
				removeOptimisticChat(id);
				mutate(unstable_serialize(getChatHistoryPaginationKey));
			}
			if (dataPart.type === "data-appendMessage") {
				const data = (dataPart as any).data;
				// Validate before parsing to reduce exception overhead
				if (typeof data === "string") {
					try {
						const message = JSON.parse(data);
						// Basic validation to ensure it's a valid message
						if (message?.id && message?.role) {
							setMessages((prev) => [...prev, message]);
						}
					} catch (error) {
						if (process.env.NODE_ENV !== "production") {
							console.warn(
								"Failed to parse data-appendMessage:",
								error
							);
						}
					}
				} else if (
					typeof data === "object" &&
					data !== null &&
					data?.id &&
					data?.role
				) {
					// Already parsed object with valid structure
					setMessages((prev) => [...prev, data]);
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
				description: `Unexpected error while contacting the model provider.${error instanceof Error ? ` ${error.message}` : ""}`,
			});
		},
	});

	// Add optimistic chat when user sends first message
	useEffect(() => {
		if (
			status === "submitted" &&
			initialMessages.length === 0 &&
			messages.length === 1
		) {
			addOptimisticChat(id);
		}
	}, [
		status,
		messages.length,
		initialMessages.length,
		id,
		addOptimisticChat,
	]);

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

	const { data: votes } = useSWR<UserVote[]>(
		messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
		fetcher
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
