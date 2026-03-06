import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai"
import "@/features/artifacts/handlers"
import {
	buildChatTools,
	enforceChatRateLimit,
	logChatPersistenceFailure,
	persistChatResponse,
	readChatRequest,
	requireChatSession,
	resolveChatRouteContext,
	serializeUsage,
} from "@/features/chat/lib/chat-route"
import { composeSystemPrompt } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { generateTitle } from "@/lib/ai/title"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import { generateUUID } from "@/lib/utils/generate-uuid"
import { validateOrigin } from "@/lib/utils/validate-origin"

export const maxDuration = 60

// ── POST /api/chat — Streaming chat completion ──────────────

export async function POST(request: Request) {
	// 1. CSRF protection — validate Origin header
	if (!validateOrigin(request)) {
		return AppError.forbidden(
			"forbidden:api:csrf_failed",
			"Invalid request origin",
		).toResponse()
	}

	const session = await requireChatSession()
	if (session instanceof Response) {
		return session
	}

	const rateLimitResponse = await enforceChatRateLimit(session.user.id)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	const requestData = await readChatRequest(request)
	if (requestData instanceof Response) {
		return requestData
	}

	const chatContext = await resolveChatRouteContext({
		session,
		requestData,
	})
	if (chatContext instanceof Response) {
		return chatContext
	}

	const {
		chatId,
		message,
		selectedChatModel,
		effectiveSettings,
		allMessages,
		hasTools,
		isNewChat,
		messageText,
	} = chatContext

	let generatedTitle: string | undefined

	try {
		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				const titlePromise = isNewChat ? generateTitle(messageText) : null

				const chatStream: ArtifactStreamWriter = {
					writeData({ type, content }) {
						writer.write({
							type: `data-${type}`,
							data: content,
						} as Parameters<typeof writer.write>[0])
					},
				}

				const systemPrompt = composeSystemPrompt({
					settings: effectiveSettings,
					hasTools,
				})

				const providerOpts = getProviderOptions(selectedChatModel, effectiveSettings)
				const tools = buildChatTools({
					hasTools,
					chatId,
					chatStream,
					session: session.user,
				})

				const result = streamText({
					model: myProvider.languageModel(selectedChatModel),
					system: systemPrompt,
					messages: await convertToModelMessages(allMessages),
					tools,
					...providerOpts,
					experimental_transform: smoothStream(),
					stopWhen: stepCountIs(5),
					abortSignal: request.signal,
				})

				result.consumeStream()
				writer.merge(
					result.toUIMessageStream({
						sendReasoning: true,
						generateMessageId: generateUUID,
					}),
				)

				if (titlePromise) {
					generatedTitle = await titlePromise
					writer.write({
						type: `data-chat-title`,
						data: generatedTitle,
					} as Parameters<typeof writer.write>[0])
				}

				writer.write({
					type: "data-usage",
					data: serializeUsage(await result.usage),
				} as Parameters<typeof writer.write>[0])
			},
			generateId: generateUUID,
			onFinish: async ({ messages: responseMessages }) => {
				try {
					await persistChatResponse({
						chatId,
						userId: session.user.id,
						userMessage: message,
						responseMessages,
						isNewChat,
						generatedTitle,
					})
				} catch (error) {
					logChatPersistenceFailure({
						chatId,
						userId: session.user.id,
						isNewChat,
						responseMessages,
						error,
					})
				}
			},
			onError: () => {
				return "An error occurred while processing your request."
			},
		})

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
	} catch (error) {
		if (error instanceof AppError) {
			return error.toResponse()
		}
		return AppError.internal(
			"internal_error:database:query_failed",
			"Chat request failed",
		).toResponse()
	}
}
