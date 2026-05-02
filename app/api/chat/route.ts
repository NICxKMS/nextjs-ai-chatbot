import type { UIMessageStreamWriter } from "ai"
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

// ── Typed stream data helper ─────────────────────────────────
// Replaces 4 scattered `as Parameters<typeof writer.write>[0]` casts.
// The AI SDK's UIMessageStreamWriter<UIMessage> accepts `data-${string}` parts
// but TypeScript can't resolve the deeply nested InferUIMessageChunk conditional.
// This single cast point is type-safe: all callers pass known string data.

type ChatStreamDataPart =
	| { type: "data-chat-title"; data: string }
	| { type: "data-error"; data: string }
	| { type: "data-usage"; data: string }

function writeStreamData(writer: UIMessageStreamWriter, part: ChatStreamDataPart): void {
	// UIMessageChunk union includes { type: `data-${string}`; data: unknown }
	// but TS struggles to resolve the mapped-type ValueOf with string index keys.
	writer.write(part as Parameters<typeof writer.write>[0])
}

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
		modelMetadata,
		effectiveSettings,
		allMessages,
		hasTools,
		isNewChat,
		messageText,
	} = chatContext

	let generatedTitle: string | undefined
	let titlePromise: Promise<string | undefined> | undefined
	let titleEmitted = false
	// The fixture provides its own mock model + tools, so `hasTools` is not required.
	// Keep this behind a server-controlled flag so a client cookie cannot enable it.
	const useArtifactE2EFixture =
		process.env.NODE_ENV !== "production" &&
		process.env.ENABLE_E2E_ARTIFACT_FIXTURE === "1" &&
		request.headers.get("cookie")?.includes("e2e-artifact-fixture=1") === true

	// Dynamic import: keeps ~280-line E2E fixture out of the production bundle
	const e2eFixture = useArtifactE2EFixture
		? await import("@/features/chat/lib/e2e-artifact-fixture")
		: null

	try {
		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				let canEmitGeneratedTitle = false
				const getGeneratedTitle = async () => {
					if (generatedTitle) return generatedTitle
					return titlePromise
				}
				const emitGeneratedTitle = () => {
					if (!canEmitGeneratedTitle || titleEmitted || !generatedTitle) {
						return
					}

					titleEmitted = true

					try {
						writeStreamData(writer, {
							type: "data-chat-title",
							data: generatedTitle,
						})
					} catch {
						// The stream may already be closed; title generation is best-effort only.
					}
				}

				if (isNewChat) {
					titlePromise = generateTitle(messageText)
						.then((title) => {
							generatedTitle = title
							emitGeneratedTitle()
							return title
						})
						.catch(() => {
							// Title generation is optional metadata.
							return undefined
						})
				}

				const chatStream: ArtifactStreamWriter = {
					writeData({ type, content }) {
						writeStreamData(writer, {
							type: `data-${type}`,
							data: content,
						} as ChatStreamDataPart)
					},
				}

				const systemPrompt = composeSystemPrompt({
					settings: effectiveSettings,
					hasTools,
				})

				const providerOpts = getProviderOptions(
					selectedChatModel,
					effectiveSettings,
					modelMetadata,
				)
				const tools = e2eFixture
					? e2eFixture.buildArtifactFixtureTools({
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
				const model = e2eFixture
					? await e2eFixture.createArtifactFixtureModel({
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
					...(e2eFixture ? {} : providerOpts),
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
								const finalGeneratedTitle = isNewChat
									? await getGeneratedTitle()
									: undefined
								const persistedResponseMessages = e2eFixture
									? e2eFixture.toPersistedArtifactFixtureMessages(
											responseMessages,
										)
									: responseMessages

								await persistChatResponse({
									chatId,
									userId: session.user.id,
									responseMessages: persistedResponseMessages,
									isNewChat,
									generatedTitle: finalGeneratedTitle,
								})
							} catch (error) {
								const finalGeneratedTitle = isNewChat
									? await getGeneratedTitle()
									: undefined
								const recovered = await recoverChatPersistenceFailure({
									chatId,
									userId: session.user.id,
									isNewChat,
									generatedTitle: finalGeneratedTitle,
								})

								if (recovered) {
									return
								}

								try {
									writeStreamData(writer, {
										type: "data-error",
										data: CHAT_PERSISTENCE_FAILURE_SIGNAL,
									})
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

				writeStreamData(writer, {
					type: "data-usage",
					data: serializeUsage(await result.usage),
				})
			},
			generateId: generateUUID,
			onError: () => {
				return "An error occurred while processing your request."
			},
		})

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
			headers: { "Cache-Control": "no-store" },
		})
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
