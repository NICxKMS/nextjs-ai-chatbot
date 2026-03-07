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
	CHAT_PERSISTENCE_FAILURE_SIGNAL,
	enforceChatRateLimit,
	logChatPersistenceFailure,
	persistChatResponse,
	readChatRequest,
	recoverChatPersistenceFailure,
	requireChatSession,
	resolveChatRouteContext,
	serializeUsage,
} from "@/features/chat/lib/chat-route"
import {
	buildArtifactFixtureTools,
	createArtifactFixtureModel,
	toPersistedArtifactFixtureMessages,
} from "@/features/chat/lib/e2e-artifact-fixture"
import { ARTIFACT_E2E_COOKIE_NAME } from "@/features/chat/lib/e2e-artifact-fixture-cookie"
import { composeSystemPrompt } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { generateTitle } from "@/lib/ai/title"
import { getLatestArtifactByChatId } from "@/lib/data/artifact-chat"
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
		selectedChatModel,
		effectiveSettings,
		allMessages,
		hasTools,
		isNewChat,
		messageText,
	} = chatContext

	let generatedTitle: string | undefined
	let titleEmitted = false
	const useArtifactE2EFixture =
		hasTools &&
		request.headers.get("cookie")?.includes(`${ARTIFACT_E2E_COOKIE_NAME}=1`) === true

	try {
		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				let canEmitGeneratedTitle = false
				const emitGeneratedTitle = () => {
					if (!canEmitGeneratedTitle || titleEmitted || !generatedTitle) {
						return
					}

					titleEmitted = true

					try {
						writer.write({
							type: "data-chat-title",
							data: generatedTitle,
						} as Parameters<typeof writer.write>[0])
					} catch {
						// The stream may already be closed; title generation is best-effort only.
					}
				}

				if (isNewChat) {
					void generateTitle(messageText)
						.then((title) => {
							generatedTitle = title
							emitGeneratedTitle()
						})
						.catch(() => {
							// Title generation is optional metadata.
						})
				}

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
				const tools = useArtifactE2EFixture
					? buildArtifactFixtureTools({
							chatId,
							chatStream,
							session: {
								userId: session.user.id,
								isGuest: session.user.type === "guest",
							},
						})
					: buildChatTools({
							hasTools,
							chatId,
							chatStream,
							session: session.user,
						})
				const model = useArtifactE2EFixture
					? await createArtifactFixtureModel({
							prompt: messageText,
							artifactId: (await getLatestArtifactByChatId(chatId, session.user.id))
								?.id,
						})
					: myProvider.languageModel(selectedChatModel)

				const result = streamText({
					model,
					system: systemPrompt,
					messages: await convertToModelMessages(allMessages),
					tools,
					...(useArtifactE2EFixture ? {} : providerOpts),
					experimental_transform: smoothStream(),
					stopWhen: stepCountIs(5),
					abortSignal: request.signal,
				})

				writer.merge(
					result.toUIMessageStream({
						sendReasoning: true,
						generateMessageId: generateUUID,
						onFinish: async ({ messages: responseMessages }) => {
							try {
								const persistedResponseMessages = useArtifactE2EFixture
									? toPersistedArtifactFixtureMessages(responseMessages)
									: responseMessages

								await persistChatResponse({
									chatId,
									userId: session.user.id,
									responseMessages: persistedResponseMessages,
									isNewChat,
									generatedTitle,
								})
							} catch (error) {
								const recovered = await recoverChatPersistenceFailure({
									chatId,
									userId: session.user.id,
									isNewChat,
									generatedTitle,
								})

								if (recovered) {
									return
								}

								try {
									writer.write({
										type: "data-error",
										data: CHAT_PERSISTENCE_FAILURE_SIGNAL,
									} as Parameters<typeof writer.write>[0])
								} catch {
									// If the client already disconnected, keep the server-side log only.
								}

								logChatPersistenceFailure({
									chatId,
									userId: session.user.id,
									isNewChat,
									responseMessages,
									error,
								})
							}
						},
					}),
				)

				canEmitGeneratedTitle = true
				emitGeneratedTitle()

				writer.write({
					type: "data-usage",
					data: serializeUsage(await result.usage),
				} as Parameters<typeof writer.write>[0])
			},
			generateId: generateUUID,
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
