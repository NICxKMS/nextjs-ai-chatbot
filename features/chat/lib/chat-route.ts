import "server-only"

import type { LanguageModelUsage, UIMessage } from "ai"

import { convertToUIMessages } from "@/features/chat/lib/message-utils"
import { createArtifactTool } from "@/features/chat/lib/tools/create-artifact"
import { requestSuggestionsTool } from "@/features/chat/lib/tools/request-suggestions"
import { updateArtifactTool } from "@/features/chat/lib/tools/update-artifact"
import { getWeather } from "@/features/chat/lib/tools/weather"
import { type ChatRequest, chatRequestSchema } from "@/features/chat/schemas/chat.schema"
import { getAvailableModels } from "@/features/models/lib/models"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import { getEnabledTools } from "@/lib/ai/tools"
import { type AppSession, getAppSession } from "@/lib/auth/session"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { refreshChat, refreshChatList } from "@/lib/cache/revalidate"
import { createChat, getChatById, updateChatTitle } from "@/lib/data/chat"
import { getMessagesByChatId, saveMessages } from "@/lib/data/message"
import { ensureGuestUser } from "@/lib/data/user"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { NewMessage } from "@/lib/types/models.types"

const CHAT_RATE_LIMIT = 20
const CHAT_RATE_WINDOW_SECONDS = 60

type ChatRouteContext = {
	chatId: string
	message: ChatRequest["message"]
	selectedChatModel: string
	effectiveSettings: typeof DEFAULT_SETTINGS
	allMessages: UIMessage[]
	hasTools: boolean
	isNewChat: boolean
	messageText: string
}

function getMessageText(message: ChatRequest["message"]): string {
	const firstTextPart = message.parts.find((part) => part.type === "text")
	return firstTextPart?.text ?? ""
}

function toUserMessage(message: ChatRequest["message"]): UIMessage {
	return {
		id: message.id,
		role: "user",
		parts: message.parts as UIMessage["parts"],
	}
}

export async function requireChatSession(): Promise<AppSession | Response> {
	const session = await getAppSession()

	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	return session
}

export async function enforceChatRateLimit(userId: string): Promise<Response | null> {
	const rateLimitKey = rateLimitKeys.rateLimitChat(userId)
	const count = await incr(rateLimitKey)

	if (count === null) {
		return null
	}

	if (count === 1) {
		await expire(rateLimitKey, CHAT_RATE_WINDOW_SECONDS)
	}

	if (count <= CHAT_RATE_LIMIT) {
		return null
	}

	return AppError.rateLimited(
		"rate_limit:chat:too_many_requests",
		"Too many chat requests. Please try again later.",
	).toResponse()
}

export async function readChatRequest(request: Request): Promise<ChatRequest | Response> {
	let body: unknown

	try {
		body = await request.json()
	} catch {
		return AppError.badRequest(
			"bad_request:api:invalid_request_body",
			"Invalid JSON body",
		).toResponse()
	}

	const parseResult = chatRequestSchema.safeParse(body)
	if (!parseResult.success) {
		return AppError.badRequest(
			"bad_request:api:invalid_request_body",
			"Invalid request body",
		).toResponse()
	}

	return parseResult.data
}

export async function resolveChatRouteContext({
	session,
	requestData,
}: {
	session: AppSession
	requestData: ChatRequest
}): Promise<ChatRouteContext | Response> {
	const { id: chatId, message, selectedChatModel, selectedVisibilityType, settings } = requestData
	const effectiveSettings = settings ?? DEFAULT_SETTINGS

	const availableModels = await getAvailableModels()
	const modelMetadata = availableModels.find((model) => model.id === selectedChatModel)
	if (!modelMetadata) {
		return AppError.badRequest(
			"bad_request:chat:invalid_model_id",
			"Unknown model",
		).toResponse()
	}

	const existingChat = await getChatById(chatId)
	if (existingChat && existingChat.userId !== session.user.id) {
		return AppError.forbidden("forbidden:chat:owner_mismatch").toResponse()
	}

	const isNewChat = !existingChat
	if (isNewChat) {
		if (session.user.type === "guest") {
			await ensureGuestUser(session.user.id)
		}

		await createChat({
			id: chatId,
			userId: session.user.id,
			title: "New Chat",
			model: selectedChatModel,
			visibility: selectedVisibilityType,
		})
	}

	const dbMessages = existingChat ? await getMessagesByChatId(chatId) : []

	return {
		chatId,
		message,
		selectedChatModel,
		effectiveSettings,
		allMessages: [...convertToUIMessages(dbMessages), toUserMessage(message)],
		hasTools: getEnabledTools(modelMetadata).length > 0,
		isNewChat,
		messageText: getMessageText(message),
	}
}

export function buildChatTools({
	hasTools,
	chatId,
	chatStream,
	session,
}: {
	hasTools: boolean
	chatId: string
	chatStream: ArtifactStreamWriter
	session: AppSession["user"]
}) {
	if (!hasTools) {
		return undefined
	}

	const toolSession = {
		userId: session.id,
		isGuest: session.type === "guest",
	}

	return {
		getWeather,
		createArtifact: createArtifactTool({
			session: toolSession,
			chatStream,
			chatId,
		}),
		updateArtifact: updateArtifactTool({
			session: toolSession,
			chatStream,
		}),
		requestSuggestions: requestSuggestionsTool({
			session: toolSession,
			chatStream,
		}),
	}
}

export function serializeUsage(usage: LanguageModelUsage): string {
	return JSON.stringify({
		inputTokens: usage.inputTokens,
		outputTokens: usage.outputTokens,
		totalTokens: usage.totalTokens,
		reasoningTokens: usage.reasoningTokens,
		cachedInputTokens: usage.cachedInputTokens,
	})
}

export async function persistChatResponse({
	chatId,
	userId,
	userMessage,
	responseMessages,
	isNewChat,
	generatedTitle,
}: {
	chatId: string
	userId: string
	userMessage: ChatRequest["message"]
	responseMessages: UIMessage[]
	isNewChat: boolean
	generatedTitle?: string
}) {
	const userDbMessage: NewMessage = {
		id: userMessage.id,
		chatId,
		role: "user",
		parts: userMessage.parts,
		attachments: [],
	}

	const assistantMessages: NewMessage[] = responseMessages.map((message) => ({
		id: message.id,
		chatId,
		role: message.role as NewMessage["role"],
		parts: message.parts,
		attachments: [],
	}))

	await saveMessages([userDbMessage, ...assistantMessages])

	if (isNewChat && generatedTitle) {
		await updateChatTitle(chatId, generatedTitle)
	}

	refreshChat(chatId)
	refreshChatList(userId)
}

export function logChatPersistenceFailure({
	chatId,
	userId,
	isNewChat,
	responseMessages,
	error,
}: {
	chatId: string
	userId: string
	isNewChat: boolean
	responseMessages: UIMessage[]
	error: unknown
}) {
	console.error(
		"[onFinish] Failed to persist chat data:",
		JSON.stringify({
			chatId,
			userId,
			isNewChat,
			messageCount: responseMessages.length,
			error: error instanceof Error ? error.message : String(error),
		}),
	)
}
