"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type FileUIPart, type LanguageModelUsage, type UIMessage } from "ai"
import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { artifactStore } from "@/features/artifacts/lib/artifact-store"
import { deleteTrailingMessages } from "@/features/chat/actions/delete-trailing-messages"
import {
	collapseReplaceDeltas,
	DEFAULT_ARTIFACT,
	processStreamDelta,
} from "@/features/chat/lib/process-stream-deltas"
import type { ChatSessionValue, DataPart, VisibilityType } from "@/features/chat/types/chat.types"
import { settingsStore } from "@/features/settings/hooks/use-settings"
import type { UIArtifact } from "@/lib/types/artifact.types"
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
	const [chatModel, setChatModel] = useState(initialChatModel)
	const [visibility, setVisibility] = useState<VisibilityType>(initialVisibility)
	const [usage, setUsage] = useState<LanguageModelUsage | undefined>(undefined)

	// ── External hooks ───────────────────────────────────────

	// ── Artifact delta processing (moved from StreamBridge) ──
	// Deltas are collected per-microtask, collapsed (REPLACE optimization),
	// then flushed to artifactStore in a single batch emission.
	const artifactRef = useRef<UIArtifact>(DEFAULT_ARTIFACT)
	const pendingDeltasRef = useRef<DataPart[]>([])
	const flushScheduledRef = useRef(false)
	const chatIdRef = useRef(id)

	// Reset artifact accumulator on chat ID change
	if (chatIdRef.current !== id) {
		chatIdRef.current = id
		artifactRef.current = DEFAULT_ARTIFACT
		pendingDeltasRef.current = []
		flushScheduledRef.current = false
	}

	// ── Refs for stale-closure safety in transport + callbacks ─
	const chatModelRef = useRef(chatModel)
	chatModelRef.current = chatModel
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
							selectedChatModel: chatModelRef.current,
							selectedVisibilityType: visibilityRef.current,
							settings: settingsStore.getSnapshot(),
							...request.body,
						},
					}
				},
			}),
		[],
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
					const delta = { type: sdkType.slice(5), content } as DataPart

					// Collect deltas and schedule a microtask flush.
					// Multiple onData calls within the same microtask (e.g., from a single
					// SSE chunk) are coalesced into one artifactStore batch emission.
					pendingDeltasRef.current.push(delta)
					if (!flushScheduledRef.current) {
						flushScheduledRef.current = true
						queueMicrotask(() => {
							const raw = pendingDeltasRef.current
							pendingDeltasRef.current = []
							flushScheduledRef.current = false

							// Collapse REPLACE-semantic deltas: only keep the last per kind
							const deltas = collapseReplaceDeltas(raw)

							// Process all deltas and emit a single store notification
							artifactStore.batchUpdate(() => {
								for (const d of deltas) {
									const next = processStreamDelta(d, artifactRef.current)
									artifactRef.current = next
									artifactStore.setState(() => next)
								}
							})
						})
					}
				}
			}
			if (sdkType === "data-chat-title" && typeof dataPart.data === "string") {
				callbacksRef.current.onTitleUpdate?.(id, dataPart.data)
			}
			if (sdkType === "data-usage" && typeof dataPart.data === "string") {
				try {
					setUsage(JSON.parse(dataPart.data) as LanguageModelUsage)
				} catch {
					// Ignore malformed usage data
				}
			}
			if (sdkType === "data-error" && typeof dataPart.data === "string") {
				toast.error(dataPart.data)
			}
		},
		onFinish() {
			// Stream complete — no cleanup needed. Artifact state persists
			// in artifactStore until the next chat or explicit reset.
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

			const files = externalFiles ?? []

			void sdkSendMessage(files.length > 0 ? { text, files } : { text })
			setInput("")
			setUsage(undefined)
		},
		[id, input, isReadonly, messages.length, sdkSendMessage],
	)

	// ── appendMessage ────────────────────────────────────────
	const appendMessage = useCallback(
		(message: UIMessage) => setMessages((prev) => [...prev, message]),
		[setMessages],
	)

	// ── editMessage ──────────────────────────────────────────
	const editMessage = useCallback(
		async (messageId: string, content: string): Promise<void> => {
			const text = content.trim()
			if (!text) return

			// Delete on server first so we don't flash the local empty state while
			// the round-trip is in-flight.
			const result = await deleteTrailingMessages({ chatId: id, messageId })
			if (!result.success) {
				throw new Error(result.error.message)
			}

			// Trim target + trailing messages, then submit the edited text.
			setMessages((prev) => {
				const idx = prev.findIndex((m) => m.id === messageId)
				return idx === -1 ? prev : prev.slice(0, idx)
			})
			setUsage(undefined)
			void sdkSendMessage({ text })
		},
		[id, sdkSendMessage, setMessages],
	)

	// ── Compose ChatSessionValue ─────────────────────────────
	return useMemo<ChatSessionValue>(
		() => ({
			chatId: id,
			chatModel,
			setChatModel,
			isReadonly,
			messages,
			status,
			input,
			setInput,
			sendMessage,
			stop,
			appendMessage,
			editMessage,
			error,
			clearError,
			visibility,
			setVisibility,
			availableModels,
			usage,
		}),
		[
			id,
			chatModel,
			isReadonly,
			messages,
			status,
			input,
			sendMessage,
			stop,
			appendMessage,
			editMessage,
			error,
			clearError,
			visibility,
			availableModels,
			usage,
		],
	)
}
