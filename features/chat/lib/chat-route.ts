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
import { rateLimitKeys } from "@/lib/cache/keys"
import { checkRateLimit } from "@/lib/cache/rate-limit"
import { refreshChat, refreshChatList } from "@/lib/cache/revalidate"
import {
	createChatWithInitialMessage,
	getChatById,
	saveMessagesAndTouchChat,
} from "@/lib/data/chat"
import { getMessagesForChatRender, saveMessages } from "@/lib/data/message"
import { ensureGuestUser } from "@/lib/data/user"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { NewMessage } from "@/lib/types/models.types"
import { generateUUID } from "@/lib/utils/generate-uuid"

const CHAT_RATE_LIMIT = 20
const CHAT_RATE_WINDOW_SECONDS = 60
const CHAT_PERSISTENCE_RETRY_DELAYS_MS = [150, 400] as const
const CHAT_PERSISTENCE_RECOVERY_MESSAGE =
	"The last assistant response could not be saved. Please resend your last message or continue the conversation from here."
export const CHAT_PERSISTENCE_FAILURE_SIGNAL =
	"The assistant response was shown, but it could not be saved. Please copy anything you need and try again once storage recovers."

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

function getRequestMessageText(message: ChatRequest["message"]): string {
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

function toUserDbMessage(chatId: string, message: ChatRequest["message"]): NewMessage {
	return {
		id: message.id,
		chatId,
		role: "user",
		parts: message.parts,
		attachments: [],
	}
}

function toAssistantDbMessages(chatId: string, messages: UIMessage[]): NewMessage[] {
	return messages.map((message) => ({
		id: message.id,
		chatId,
		role: message.role as NewMessage["role"],
		parts: message.parts,
		attachments: [],
	}))
}

function createPersistenceRecoveryMessage(chatId: string): NewMessage {
	return {
		id: generateUUID(),
		chatId,
		role: "assistant",
		parts: [{ type: "text", text: CHAT_PERSISTENCE_RECOVERY_MESSAGE }],
		attachments: [],
	}
}

async function runWithPersistenceRetries(operation: () => Promise<void>): Promise<void> {
	const maxAttempts = CHAT_PERSISTENCE_RETRY_DELAYS_MS.length + 1
	let lastError: unknown

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			await operation()
			return
		} catch (error) {
			lastError = error
			const delay = CHAT_PERSISTENCE_RETRY_DELAYS_MS[attempt]
			if (delay !== undefined) {
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
	}

	throw lastError
}

export async function requireChatSession(): Promise<AppSession | Response> {
	const session = await getAppSession()

	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	return session
}

export async function enforceChatRateLimit(userId: string): Promise<Response | null> {
	const allowed = await checkRateLimit(
		rateLimitKeys.rateLimitChat(userId),
		CHAT_RATE_LIMIT,
		CHAT_RATE_WINDOW_SECONDS,
	)

	if (allowed) return null

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

	const [availableModels, existingChat] = await Promise.all([
		getAvailableModels(),
		getChatById(chatId),
	])
	const modelMetadata = availableModels.find((model) => model.id === selectedChatModel)
	if (!modelMetadata) {
		return AppError.badRequest(
			"bad_request:chat:invalid_model_id",
			"Unknown model",
		).toResponse()
	}

	if (existingChat && existingChat.userId !== session.user.id) {
		return AppError.forbidden("forbidden:chat:owner_mismatch").toResponse()
	}

	const dbMessages = existingChat ? await getMessagesForChatRender(chatId) : []
	const userDbMessage = toUserDbMessage(chatId, message)

	const isNewChat = !existingChat
	if (isNewChat) {
		if (session.user.type === "guest") {
			await ensureGuestUser(session.user.id)
		}

		await createChatWithInitialMessage({
			id: chatId,
			userId: session.user.id,
			title: "New Chat",
			model: selectedChatModel,
			visibility: selectedVisibilityType,
			message: userDbMessage,
		})
	} else {
		await saveMessages([userDbMessage])
	}

	return {
		chatId,
		message,
		selectedChatModel,
		effectiveSettings,
		allMessages: [...convertToUIMessages(dbMessages), toUserMessage(message)],
		hasTools: getEnabledTools(modelMetadata).length > 0,
		isNewChat,
		messageText: getRequestMessageText(message),
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
	responseMessages,
	isNewChat,
	generatedTitle,
}: {
	chatId: string
	userId: string
	responseMessages: UIMessage[]
	isNewChat: boolean
	generatedTitle?: string
}) {
	const assistantMessages = toAssistantDbMessages(chatId, responseMessages)
	const title = isNewChat ? generatedTitle : undefined

	await runWithPersistenceRetries(() =>
		saveMessagesAndTouchChat({
			chatId,
			messages: assistantMessages,
			title,
		}),
	)

	refreshChat(chatId)
	refreshChatList(userId)
}

export async function recoverChatPersistenceFailure({
	chatId,
	userId,
	isNewChat,
	generatedTitle,
}: {
	chatId: string
	userId: string
	isNewChat: boolean
	generatedTitle?: string
}): Promise<boolean> {
	try {
		await runWithPersistenceRetries(() =>
			saveMessagesAndTouchChat({
				chatId,
				messages: [createPersistenceRecoveryMessage(chatId)],
				title: isNewChat ? generatedTitle : undefined,
			}),
		)

		refreshChat(chatId)
		refreshChatList(userId)
		return true
	} catch {
		return false
	}
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
