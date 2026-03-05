"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai"
import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import { useChatStreamDispatch } from "@/features/chat/components/chat-stream-provider"
import type {
	Attachment,
	ChatSessionValue,
	DataPart,
	VisibilityType,
} from "@/features/chat/types/chat.types"
import { useSettings } from "@/features/settings/hooks/use-settings"
import type { ModelMetadata } from "@/lib/types/model.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

// ── Params ───────────────────────────────────────────────────

export interface UseChatSessionParams {
	id: string
	initialMessages: UIMessage[]
	initialChatModel: string
	isReadonly: boolean
	initialVisibility: VisibilityType
	availableModels: ModelMetadata[]
	/** Notify sidebar when a new chat is created (wired to PendingChats in P5-T02) */
	onNewChat?: (chat: {
		id: string
		title: string
		visibility: VisibilityType
		createdAt: Date
	}) => void
	/** Notify sidebar when a chat title arrives from stream (wired to PendingChats in P5-T02) */
	onTitleUpdate?: (id: string, title: string) => void
}

// ── Adaptive throttle ────────────────────────────────────────

type NetworkNavigator = Navigator & { connection?: { effectiveType?: string } }

function getAdaptiveThrottle(): number {
	if (typeof navigator === "undefined") return 100
	const conn = (navigator as NetworkNavigator).connection
	if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") return 50
	if (conn?.effectiveType === "3g") return 150
	return 100
}

// ── Hook ─────────────────────────────────────────────────────

export function useChatSession(params: UseChatSessionParams): ChatSessionValue {
	const {
		id,
		initialMessages,
		initialChatModel,
		isReadonly,
		initialVisibility,
		availableModels,
	} = params

	// ── Local state ──────────────────────────────────────────
	const [input, setInput] = useState("")
	const [attachments, setAttachments] = useState<Attachment[]>([])
	const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility)

	// ── External hooks ───────────────────────────────────────
	const settings = useSettings()
	const { setChatStream } = useChatStreamDispatch()

	// ── Refs for stale-closure safety in transport + callbacks ─
	const settingsRef = useRef(settings)
	settingsRef.current = settings
	const visibilityRef = useRef(visibility)
	visibilityRef.current = visibility
	const callbacksRef = useRef({
		onNewChat: params.onNewChat,
		onTitleUpdate: params.onTitleUpdate,
	})
	callbacksRef.current = { onNewChat: params.onNewChat, onTitleUpdate: params.onTitleUpdate }

	// ── Adaptive throttle (computed once) ────────────────────
	const throttle = useMemo(getAdaptiveThrottle, [])

	// ── Transport (stable — uses refs for dynamic values) ────
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: "/api/chat",
				prepareSendMessagesRequest(request) {
					return {
						body: {
							id: request.id,
							message: request.messages.at(-1),
							selectedChatModel: initialChatModel,
							selectedVisibilityType: visibilityRef.current,
							settings: settingsRef.current,
							...request.body,
						},
					}
				},
			}),
		[initialChatModel],
	)

	// ── useChat (AI SDK core) ────────────────────────────────
	const {
		messages,
		setMessages,
		sendMessage: sdkSendMessage,
		status,
		stop,
		error,
		clearError,
	} = useChat({
		id,
		messages: initialMessages,
		experimental_throttle: throttle,
		generateId: generateUUID,
		transport,
		onData(dataPart) {
			// SDK data parts arrive as { type: 'data-<name>', data: unknown }.
			// Transform to our internal DataPart format (strip 'data-' prefix, map data → content).
			const sdkType = dataPart.type // e.g. 'data-artifact-id', 'data-chat-title'
			if (sdkType.startsWith("data-artifact-")) {
				const content = dataPart.data
				// Guard: DataPart content is always string or ArtifactSuggestion (object)
				if (
					typeof content === "string" ||
					(typeof content === "object" && content !== null)
				) {
					setChatStream([{ type: sdkType.slice(5), content } as DataPart])
				}
			}
			if (sdkType === "data-chat-title" && typeof dataPart.data === "string") {
				callbacksRef.current.onTitleUpdate?.(id, dataPart.data)
			}
		},
		onFinish() {
			setChatStream(() => [])
		},
		onError(err: Error) {
			toast.error(err.message || "An error occurred while generating a response.")
		},
	})

	// ── sendMessage (intent-based wrapper) ───────────────────
	const sendMessage = useCallback(
		(
			contentOrEvent?: string | { preventDefault?: () => void },
			externalFiles?: FileUIPart[],
		) => {
			if (typeof contentOrEvent !== "string") {
				contentOrEvent?.preventDefault?.()
			}
			const text = (typeof contentOrEvent === "string" ? contentOrEvent : input).trim()
			if (isReadonly || !text) return

			// Notify sidebar for new chats (PendingChats.add equivalent)
			if (messages.length === 0) {
				callbacksRef.current.onNewChat?.({
					id,
					title: text.slice(0, 50),
					visibility: visibilityRef.current,
					createdAt: new Date(),
				})
			}

			// Use externally-provided files (e.g. from ai-element) or convert from attachments state
			const files =
				externalFiles ??
				attachments.map((a) => ({
					type: "file" as const,
					mediaType: a.contentType,
					url: a.url,
					filename: a.name,
				}))

			void sdkSendMessage(files.length > 0 ? { text, files } : { text })
			setInput("")
			setAttachments([])
		},
		[id, input, isReadonly, messages.length, attachments, sdkSendMessage],
	)

	// ── appendMessage ────────────────────────────────────────
	const appendMessage = useCallback(
		(message: UIMessage) => setMessages((prev) => [...prev, message]),
		[setMessages],
	)

	// ── editMessage ──────────────────────────────────────────
	const editMessage = useCallback(
		async (messageId: string, content: string): Promise<void> => {
			// Remove target + trailing messages from local state
			setMessages((prev) => {
				const idx = prev.findIndex((m) => m.id === messageId)
				return idx === -1 ? prev : prev.slice(0, idx)
			})
			// Delete from server, then re-submit with edited content
			await deleteTrailingMessages({ chatId: id, messageId })
			void sdkSendMessage({ text: content })
		},
		[id, sdkSendMessage, setMessages],
	)

	// ── Compose ChatSessionValue (18 canonical fields) ───────
	return {
		chatId: id,
		chatModel: initialChatModel,
		isReadonly,
		messages,
		status,
		input,
		setInput,
		attachments,
		setAttachments,
		sendMessage,
		stop,
		appendMessage,
		editMessage,
		error,
		clearError,
		visibility,
		setVisibility,
		availableModels,
	}
}
