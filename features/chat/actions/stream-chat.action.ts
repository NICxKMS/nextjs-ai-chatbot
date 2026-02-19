/**
 * Stream Chat Action
 *
 * Server action for AI chat streaming using AI SDK.
 * Handles message streaming with rate limiting, model validation,
 * daily quota enforcement, and authentication.
 *
 * @module features/chat/actions/stream-chat.action
 */

"use server"

import { createUIMessageStream } from "ai"
import { revalidatePath } from "next/cache"
import { executeChatCompletion } from "@/lib/ai"
import { getEntitlements } from "@/lib/ai/entitlements"
import { isValidModelId, listChatModels } from "@/lib/ai/registry"
import { requireAuthAction } from "@/lib/auth/guards"
import { type AppSession, getSession } from "@/lib/auth/session"
import { checkMessageQuota } from "@/lib/cache/quota"
import type { RepositoryContext } from "@/lib/data/repositories"
import {
	chatService,
	type SaveChatParams,
} from "@/lib/data/services/chat.service"
import type { DBMessage } from "@/lib/db/schema"
import {
	RateLimitError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors"
import { checkChatLimit, getRetryAfter } from "@/lib/rate-limit"
import type { ChatSettings } from "../schemas/chat.schema"
import type { ChatMessage } from "../types"

// =============================================================================
// Types
// =============================================================================

/**
 * Message part for structured content
 */
export interface MessagePart {
	/** Part type */
	type: string
	/** Text content */
	text?: string
	/** Additional data */
	[key: string]: unknown
}

/**
 * Message for streaming input
 */
export interface StreamMessage {
	/** Message role */
	role: "user" | "assistant" | "system"
	/** Message content as text */
	content: string
	/** Optional message ID */
	id?: string
	/** Optional creation timestamp */
	createdAt?: Date
	/** Optional structured parts */
	parts?: MessagePart[]
	/** Optional attachments */
	attachments?: unknown[]
}

/**
 * Input for stream chat action
 */
export interface StreamChatInput {
	/** Chat ID (existing or new) */
	chatId: string
	/** Messages to process */
	messages: StreamMessage[]
	/** Whether this is a new chat */
	isNewChat?: boolean
	/** Optional title for new chat */
	title?: string
	/** Optional visibility setting */
	visibility?: "public" | "private"
	/** Selected AI model ID */
	selectedModel?: string
	/** Optional chat settings for customizing AI behavior */
	settings?: ChatSettings
}

/**
 * Result of stream chat action
 */
export interface StreamChatResult {
	/** Chat ID */
	chatId: string
	/** Whether a new chat was created */
	isNewChat: boolean
	/** Success status */
	success: boolean
	/** Error message if failed */
	error?: string
	/** Chat settings for AI behavior customization */
	settings?: ChatSettings | undefined
}

/**
 * Canonical preflight result for stream chat authorization and limits.
 */
export interface StreamChatPreflightResult {
	/** Authenticated user ID */
	userId: string
	/** Authenticated app session */
	session: AppSession
	/** Repository context */
	ctx: RepositoryContext
}

type ChatCompletionParams = Parameters<typeof executeChatCompletion>[0]
type ChatDataStream = ChatCompletionParams["dataStream"]
type ChatCompletionWithoutStream = Omit<ChatCompletionParams, "dataStream">

export interface CreateStreamChatMessageStreamParams {
	completion: ChatCompletionWithoutStream
	generateId: () => string
	onFinish?: Parameters<
		typeof createUIMessageStream<ChatMessage>
	>[0]["onFinish"]
	onBeforeExecute?: (dataStream: ChatDataStream) => void
	onExecutionError?: (error: unknown, dataStream: ChatDataStream) => void
	onError?: Parameters<
		typeof createUIMessageStream<ChatMessage>
	>[0]["onError"]
}

/**
 * Canonical streaming execution path for chat completions.
 *
 * Keeps `/api/chat` and server actions aligned on a single execution primitive.
 */
export function executeStreamChatCompletion(
	params: Parameters<typeof executeChatCompletion>[0],
): void {
	executeChatCompletion(params)
}

/**
 * Canonical stream factory for chat route execution.
 *
 * This centralizes createUIMessageStream + execute callback behavior so
 * API route orchestration stays aligned with the action layer contract.
 */
export function createStreamChatMessageStream(
	params: CreateStreamChatMessageStreamParams,
) {
	const streamParams: Parameters<
		typeof createUIMessageStream<ChatMessage>
	>[0] = {
		execute: ({ writer: dataStream }) => {
			try {
				params.onBeforeExecute?.(dataStream)
				executeStreamChatCompletion({
					...params.completion,
					dataStream,
				})
			} catch (error) {
				if (params.onExecutionError) {
					params.onExecutionError(error, dataStream)
					return
				}
				throw error
			}
		},
		generateId: params.generateId,
	}

	if (params.onFinish !== undefined) {
		streamParams.onFinish = params.onFinish
	}

	if (params.onError !== undefined) {
		streamParams.onError = params.onError
	}

	return createUIMessageStream<ChatMessage>(streamParams)
}

// =============================================================================
// Stream Chat Action
// =============================================================================

/**
 * Stream chat action - handles AI message streaming with rate limiting,
 * model validation, and daily quota enforcement.
 *
 * This action:
 * 1. Authenticates the user and gets user type
 * 2. Validates model ID against user entitlements
 * 3. Checks daily message quota
 * 4. Checks rate limits
 * 5. Saves messages to the database
 * 6. Returns stream result for the AI response
 *
 * @param input - Stream chat input parameters
 * @returns Stream chat result with chat ID and status
 * @throws UnauthorizedError if not authenticated
 * @throws ValidationError if model not available for user type
 * @throws RateLimitError if rate limit or daily quota exceeded
 *
 * @example
 * ```typescript
 * const result = await streamChatAction({
 *   chatId: 'new',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   isNewChat: true,
 * });
 * ```
 */
export async function streamChatAction(
	input: StreamChatInput,
): Promise<StreamChatResult> {
	try {
		const { ctx } = await validateStreamChatPreflight({
			selectedModelId: input.selectedModel,
		})

		// 6. Prepare messages for storage
		// DBMessage requires parts and attachments fields
		const messagesToSave: DBMessage[] = input.messages.map((msg) => ({
			id: msg.id ?? crypto.randomUUID(),
			chatId: input.chatId,
			role: msg.role,
			parts: msg.parts ?? [{ type: "text", text: msg.content }],
			attachments: msg.attachments ?? [],
			createdAt: msg.createdAt ?? new Date(),
		}))

		// 7. Save chat and messages
		const saveParams: SaveChatParams = {
			chatId: input.chatId,
			isNewChat: input.isNewChat ?? false,
			messages: messagesToSave,
			...(input.title !== undefined && { title: input.title }),
			...(input.visibility !== undefined && {
				visibility: input.visibility,
			}),
		}

		await chatService.saveChat(saveParams, ctx)

		// 8. Revalidate the chat page
		revalidatePath(`/chat/${input.chatId}`)

		return {
			chatId: input.chatId,
			isNewChat: input.isNewChat ?? false,
			success: true,
			...(input.settings !== undefined && { settings: input.settings }),
		}
	} catch (error) {
		return {
			chatId: input.chatId,
			isNewChat: input.isNewChat ?? false,
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to process chat",
		}
	}
}

/**
 * Canonical preflight validation for streaming chat execution paths.
 *
 * This is the single source of truth for:
 * - authentication/session resolution
 * - model entitlement checks
 * - daily quota enforcement
 * - chat route rate limiting
 */
export async function validateStreamChatPreflight(input: {
	selectedModelId?: string | undefined
}): Promise<StreamChatPreflightResult> {
	const userId = await requireAuthAction()
	const session = await getSession()

	if (!session?.user?.id) {
		throw new UnauthorizedError("Authentication required")
	}

	const entitlements = getEntitlements(session.user.type)

	if (input.selectedModelId) {
		if (!isValidModelId(input.selectedModelId)) {
			const availableModels = listChatModels()
				.map((model) => model.id)
				.slice(0, 5)
				.join(", ")

			throw new ValidationError(
				`Invalid model ID: ${input.selectedModelId}. Available models include: ${availableModels}...`,
			)
		}

		if (
			!entitlements.availableChatModelIds.includes(input.selectedModelId)
		) {
			throw new ValidationError(
				"Model not available for your account type. Please select a different model.",
			)
		}
	}

	const quotaResult = await checkMessageQuota(
		userId,
		entitlements.maxMessagesPerDay,
	)

	if (!quotaResult.allowed) {
		throw new RateLimitError(
			`Daily message limit reached (${quotaResult.quota.used}/${entitlements.maxMessagesPerDay}). Try again tomorrow.`,
			{
				limit: entitlements.maxMessagesPerDay,
				used: quotaResult.quota.used,
				remaining: quotaResult.quota.remaining,
			},
		)
	}

	const rateLimitResult = await checkChatLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before sending another message.",
			{ retryAfter },
		)
	}

	return {
		userId,
		session,
		ctx: {
			userId,
			isGuest: session.user.type === "guest",
		},
	}
}

/**
 * Prepare stream context for AI response generation.
 * This is called after the user message is saved.
 *
 * @param chatId - Chat ID
 * @param userId - User ID
 * @returns Context for streaming or null if not found
 */
export async function prepareStreamContext(
	chatId: string,
	userId: string,
): Promise<{
	chatId: string
	messages: StreamMessage[]
} | null> {
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	const result = await chatService.getWithMessages(chatId, ctx)
	if (!result) {
		return null
	}

	return {
		chatId,
		messages: result.messages.map((m) => {
			// Extract text content from parts if available
			const parts = m.parts as MessagePart[] | null
			const textContent =
				parts
					?.filter(
						(p) => p.type === "text" && typeof p.text === "string",
					)
					.map((p) => p.text)
					.join("\n") ?? ""

			const msg: StreamMessage = {
				id: m.id,
				role: m.role as "user" | "assistant" | "system",
				content: textContent,
				createdAt: m.createdAt,
			}
			if (parts) {
				msg.parts = parts
			}
			if (m.attachments) {
				msg.attachments = m.attachments as unknown[]
			}
			return msg
		}),
	}
}
