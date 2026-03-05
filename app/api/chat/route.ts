import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
	type UIMessage,
} from "ai"
import "@/features/artifacts/handlers"
import { convertToUIMessages } from "@/features/chat/lib/message-utils"
import { createArtifactTool } from "@/features/chat/lib/tools/create-artifact"
import { requestSuggestionsTool } from "@/features/chat/lib/tools/request-suggestions"
import { updateArtifactTool } from "@/features/chat/lib/tools/update-artifact"
import { getWeather } from "@/features/chat/lib/tools/weather"
import { chatRequestSchema } from "@/features/chat/schemas/chat.schema"
import { DEFAULT_SETTINGS } from "@/features/settings/types/settings.types"
import { getModelById } from "@/lib/ai/models"
import { composeSystemPrompt } from "@/lib/ai/prompts"
import { myProvider } from "@/lib/ai/provider"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { generateTitle } from "@/lib/ai/title"
import { getEnabledTools } from "@/lib/ai/tools"
import { getAppSession } from "@/lib/auth/session"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { refreshChat, refreshChatList } from "@/lib/cache/revalidate"
import { createChat, getChatById, updateChatTitle } from "@/lib/data/chat"
import { getMessagesByChatId, saveMessages } from "@/lib/data/message"
import { ensureGuestUser } from "@/lib/data/user"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"
import type { NewMessage } from "@/lib/types/models.types"
import { generateUUID } from "@/lib/utils/generate-uuid"
import { validateOrigin } from "@/lib/utils/validate-origin"

export const maxDuration = 60

/** Rate limit: 20 chat requests per minute per user. */
const CHAT_RATE_LIMIT = 20
/** Rate limit window: 1 minute in seconds. */
const CHAT_RATE_WINDOW_SECONDS = 60

// ── POST /api/chat — Streaming chat completion ──────────────

export async function POST(request: Request) {
	// 1. CSRF protection — validate Origin header
	if (!validateOrigin(request)) {
		return AppError.forbidden(
			"forbidden:api:csrf_failed",
			"Invalid request origin",
		).toResponse()
	}

	// 2. Auth check
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	// 3. Rate limit — 20 requests/min per user (graceful: skip if Redis unavailable)
	const rateLimitKey = rateLimitKeys.rateLimitChat(session.user.id)
	const count = await incr(rateLimitKey)
	if (count !== null) {
		if (count === 1) {
			await expire(rateLimitKey, CHAT_RATE_WINDOW_SECONDS)
		}
		if (count > CHAT_RATE_LIMIT) {
			return AppError.rateLimited(
				"rate_limit:chat:too_many_requests",
				"Too many chat requests. Please try again later.",
			).toResponse()
		}
	}

	// 4. Parse and validate request body
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

	const {
		id: chatId,
		message,
		selectedChatModel,
		selectedVisibilityType,
		settings,
	} = parseResult.data

	const effectiveSettings = settings ?? DEFAULT_SETTINGS

	// 5. Resolve model metadata
	const modelMetadata = getModelById(selectedChatModel)
	if (!modelMetadata) {
		return AppError.badRequest(
			"bad_request:chat:invalid_model_id",
			"Unknown model",
		).toResponse()
	}

	// 6. Check if chat exists or create new
	const existingChat = await getChatById(chatId)
	const isNewChat = !existingChat

	if (existingChat && existingChat.userId !== session.user.id) {
		return AppError.forbidden("forbidden:chat:owner_mismatch").toResponse()
	}

	if (isNewChat) {
		// Ensure guest users have a DB record before creating their first chat
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

	// 7. Load message history and build full conversation
	const dbMessages = existingChat ? await getMessagesByChatId(chatId) : []

	const allMessages: UIMessage[] = [
		...convertToUIMessages(dbMessages),
		{
			id: message.id,
			role: "user" as const,
			parts: message.parts as UIMessage["parts"],
		},
	]

	// 8. Extract text for title generation
	const firstTextPart = message.parts.find((p) => p.type === "text")
	const messageText = firstTextPart && "text" in firstTextPart ? firstTextPart.text : ""

	// 9. Determine model capabilities
	const enabledToolIds = getEnabledTools(modelMetadata)
	const hasTools = enabledToolIds.length > 0

	// 10. Track generated title across execute and onFinish
	let generatedTitle: string | undefined

	try {
		const stream = createUIMessageStream({
			execute: async ({ writer }) => {
				// a. Start title generation in parallel for new chats
				const titlePromise = isNewChat ? generateTitle(messageText) : null

				// b. Create ArtifactStreamWriter adapter for tools
				const chatStream: ArtifactStreamWriter = {
					writeData({ type, content }) {
						writer.write({
							type: `data-${type}`,
							data: content,
						} as Parameters<typeof writer.write>[0])
					},
				}

				// c. Build tool set when model supports tool calling
				const sessionInfo = {
					userId: session.user.id,
					isGuest: session.user.type === "guest",
				}

				const tools = hasTools
					? {
							getWeather,
							createArtifact: createArtifactTool({
								session: sessionInfo,
								chatStream,
								chatId,
							}),
							updateArtifact: updateArtifactTool({
								session: sessionInfo,
								chatStream,
							}),
							requestSuggestions: requestSuggestionsTool({
								session: sessionInfo,
								chatStream,
							}),
						}
					: undefined

				// d. Compose system prompt and provider options
				const systemPrompt = composeSystemPrompt({
					settings: effectiveSettings,
					hasTools,
				})

				const providerOpts = getProviderOptions(selectedChatModel, effectiveSettings)

				// e. Start streaming AI completion
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

				// f. Consume stream and merge into writer
				result.consumeStream()
				writer.merge(result.toUIMessageStream({ sendReasoning: true }))

				// g. Await title before stream closes (no polling)
				if (titlePromise) {
					generatedTitle = await titlePromise
					writer.write({
						type: `data-chat-title`,
						data: generatedTitle,
					} as Parameters<typeof writer.write>[0])
				}
			},
			generateId: generateUUID,
			onFinish: async ({ messages: responseMessages }) => {
				try {
					// Save user message
					const userMsg: NewMessage = {
						id: message.id,
						chatId,
						role: "user",
						parts: message.parts,
						attachments: [],
					}

					// Save assistant response messages
					const assistantMsgs: NewMessage[] = responseMessages.map((msg) => ({
						id: msg.id,
						chatId,
						role: msg.role as NewMessage["role"],
						parts: msg.parts,
						attachments: [],
					}))

					await saveMessages([userMsg, ...assistantMsgs])

					// Update title for new chats
					if (isNewChat && generatedTitle) {
						await updateChatTitle(chatId, generatedTitle)
					}

					// Revalidate caches (Route Handler uses revalidateTag)
					refreshChat(chatId)
					refreshChatList(session.user.id)
				} catch (error) {
					// Stream is already closed — we cannot surface this to the client.
					// Log structured details so persistence failures are diagnosable.
					console.error(
						"[onFinish] Failed to persist chat data:",
						JSON.stringify({
							chatId,
							userId: session.user.id,
							isNewChat,
							messageCount: responseMessages.length,
							error: error instanceof Error ? error.message : String(error),
						}),
					)
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
