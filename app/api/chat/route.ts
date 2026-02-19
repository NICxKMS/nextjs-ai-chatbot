/**
 * Chat API Route
 *
 * Main chat streaming endpoint. Creates AI message streams using AI SDK
 * and returns SSE responses for real-time streaming.
 *
 * @module app/api/chat/route
 */

import { geolocation } from "@vercel/functions"
import { JsonToSseTransformStream, type UIMessage } from "ai"
import type { ModelCatalog } from "tokenlens/core"
import {
	createStreamChatMessageStream,
	validateStreamChatPreflight,
} from "@/features/chat/actions/stream-chat.action"
import {
	type ChatRouteRequestInput,
	ChatRouteRequestSchema,
} from "@/features/chat/schemas"
import {
	type AppUsage,
	type ChatSettings,
	generatePlaceholderTitle,
	generateTitleFromUserMessage,
} from "@/lib/ai"
import { error as apiErrorResponse, isValidUUID } from "@/lib/api"
import { getSession } from "@/lib/auth/session"
import type { RepositoryContext } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import type { DBMessage } from "@/lib/db/schema"
import {
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	UnauthorizedError,
	ValidationError,
} from "@/lib/errors"
import { logError, logInfo, logWarn } from "@/lib/log"
import { checkChatLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Constants
// =============================================================================

/** Maximum duration for the API route */
export const maxDuration = 60

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get TokenLens model catalog for usage enrichment.
 * Cached for ~24 hours.
 */
async function getTokenlensCatalog(): Promise<ModelCatalog | undefined> {
	try {
		const { fetchModels } = await import("tokenlens/fetch")
		return await fetchModels()
	} catch (err) {
		logWarn("TokenLens: catalog fetch failed, using default catalog", {
			error: err instanceof Error ? err.message : String(err),
		})
		return undefined
	}
}

/**
 * Convert DB messages to UIMessage format.
 */
function convertToUIMessages(
	messages: Array<{
		id?: string | null
		role: string
		parts: unknown
		createdAt: Date
	}>,
): UIMessage[] {
	return messages.map((m) => {
		if (!m.id) {
			throw new ValidationError("Message is missing id")
		}

		// Cast parts to the expected format
		const parts = m.parts as UIMessage["parts"]
		return {
			id: m.id,
			role: m.role as "user" | "assistant",
			parts: parts ?? [],
			createdAt: m.createdAt,
		}
	})
}

/**
 * Generate a UUID v4.
 */
function generateUUID(): string {
	return crypto.randomUUID()
}

function normalizeRetryAfter(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return undefined
	}

	const retryAfter = Math.floor(value)
	return retryAfter > 0 ? retryAfter : undefined
}

function createChatErrorResponse(
	error: unknown,
	selectedModelId?: string,
): Response {
	let normalizedError = error

	if (
		error instanceof Error &&
		error.message.includes(
			"AI Gateway requires a valid credit card on file to service requests",
		)
	) {
		const message = selectedModelId?.startsWith("vercel-gateway:")
			? "The selected Vercel AI Gateway model requires an active gateway billing setup."
			: error.message

		normalizedError = new ValidationError(message)
	}

	const response = apiErrorResponse(normalizedError)

	if (normalizedError instanceof RateLimitError) {
		const retryAfter = normalizeRetryAfter(
			normalizedError.details?.retryAfter,
		)

		if (retryAfter !== undefined) {
			response.headers.set("Retry-After", String(retryAfter))
		}
	}

	return response
}

// =============================================================================
// POST Handler
// =============================================================================

/**
 * POST /api/chat
 * Stream chat messages with AI response via SSE.
 */
export async function POST(request: Request) {
	let selectedModelId = ""

	try {
		// Parse and validate request body
		let rawBody: unknown
		try {
			rawBody = await request.json()
		} catch {
			throw new ValidationError("Request body must be valid JSON")
		}

		const parsedBody = ChatRouteRequestSchema.safeParse(rawBody)
		if (!parsedBody.success) {
			throw new ValidationError("Invalid chat request body", {
				errors: parsedBody.error.flatten().fieldErrors,
			})
		}

		const body: ChatRouteRequestInput = parsedBody.data
		const chatId = body.id
		const selectedChatModel = body.selectedChatModel ?? body.selectedModel

		if (!selectedChatModel) {
			throw new ValidationError("Selected model is required")
		}

		const selectedVisibilityType = body.selectedVisibilityType ?? "private"

		const message: UIMessage = {
			id: body.message.id ?? generateUUID(),
			role: body.message.role,
			parts: (body.message.parts ?? [
				{
					type: "text",
					text: body.message.content ?? "",
				},
			]) as UIMessage["parts"],
			...(body.message.createdAt && {
				createdAt: body.message.createdAt,
			}),
		}

		selectedModelId = selectedChatModel

		const { session, ctx } = await validateStreamChatPreflight({
			selectedModelId: selectedChatModel,
		})

		// Check if this is a new chat
		let existingChat = null
		try {
			existingChat = await chatService.getChatById(chatId, ctx)
		} catch (error) {
			if (error instanceof NotFoundError) {
				// Chat doesn't exist, will create new
			} else if (error instanceof ForbiddenError) {
				throw error
			} else {
				throw error
			}
		}

		const isNewChat = !existingChat

		// Get existing messages if any
		let chatWithMessages = null
		if (existingChat) {
			try {
				chatWithMessages = await chatService.getWithMessages(
					chatId,
					ctx,
				)
			} catch (error) {
				if (error instanceof NotFoundError) {
					// Chat doesn't exist
				} else {
					throw error
				}
			}
		}
		const messagesFromDb = chatWithMessages?.messages ?? []

		// Build UI messages for AI
		const uiMessages: UIMessage[] = [
			...convertToUIMessages(
				messagesFromDb.map((m) => ({
					id: m.id,
					role: m.role,
					parts: m.parts,
					createdAt: m.createdAt,
				})),
			),
			message,
		]

		// Extract geo hints from request headers for location-aware responses
		const geoData = geolocation(request)
		const forwardedFor = request.headers.get("x-forwarded-for")
		const clientIp = forwardedFor?.split(",")[0]?.trim()
		const requestHints = {
			ip: clientIp,
			latitude: geoData.latitude
				? Number.parseFloat(geoData.latitude)
				: undefined,
			longitude: geoData.longitude
				? Number.parseFloat(geoData.longitude)
				: undefined,
			city: geoData.city,
			country: geoData.country,
		}

		// Placeholder title for new chats
		const placeholderTitle = isNewChat
			? generatePlaceholderTitle(message)
			: undefined

		// Track title generation
		let generatedTitlePromise: Promise<string> | null = null
		let finalUsageContext: AppUsage | undefined
		const tokenlensCatalogPromise = getTokenlensCatalog()

		const normalizedSampling = body.settings?.sampling
			? {
					...(body.settings.sampling.temperature !== undefined && {
						temperature: body.settings.sampling.temperature,
					}),
					...(body.settings.sampling.topP !== undefined && {
						topP: body.settings.sampling.topP,
					}),
					...(body.settings.sampling.maxOutputTokens !==
						undefined && {
						maxOutputTokens: body.settings.sampling.maxOutputTokens,
					}),
				}
			: undefined

		const chatSettings: ChatSettings | undefined = body.settings
			? {
					...(body.settings.systemPrompt !== undefined && {
						systemPrompt: body.settings.systemPrompt,
					}),
					...(normalizedSampling &&
						Object.keys(normalizedSampling).length > 0 && {
							sampling: normalizedSampling,
						}),
				}
			: undefined

		const requestBody: { settings?: ChatSettings } = {}
		if (chatSettings) {
			requestBody.settings = chatSettings
		}

		// Create the UI message stream
		const stream = createStreamChatMessageStream({
			completion: {
				selectedChatModel,
				requestHints,
				requestBody,
				uiMessages,
				chatId,
				session,
				tokenlensCatalogPromise,
				onUsageCalculated: (usage) => {
					finalUsageContext = usage
					logInfo("AI usage calculated", {
						chatId,
						modelId: selectedChatModel,
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						totalTokens: usage.totalTokens,
					})
				},
			},
			onBeforeExecute: (dataStream) => {
				logInfo("Starting chat completion", {
					chatId,
					modelId: selectedChatModel,
					isNewChat,
					userId: session.user.id,
				})

				if (isNewChat) {
					generatedTitlePromise = generateTitleFromUserMessage({
						message,
					})
						.then((title) => {
							try {
								dataStream.write({
									type: "data-chatTitle",
									data: title,
								})
							} catch (streamErr) {
								logWarn(
									"Title generated but stream closed, will save to DB",
									{
										error:
											streamErr instanceof Error
												? streamErr.message
												: String(streamErr),
									},
								)
							}
							return title
						})
						.catch((err) => {
							logWarn("Background title generation failed", {
								error:
									err instanceof Error
										? err.message
										: String(err),
							})
							return placeholderTitle ?? "New Chat"
						})
				}
			},
			onExecutionError: (completionError, dataStream) => {
				logError(
					"AI completion initialization failed",
					completionError as Error,
					{
						chatId,
						modelId: selectedChatModel,
						userId: session.user.id,
					},
				)

				dataStream.write({
					type: "error",
					errorText:
						"Failed to start AI completion. Please try again.",
				})
			},
			generateId: generateUUID,
			onFinish: async ({ messages }) => {
				const startTime = Date.now()
				const initialTitle = isNewChat
					? (placeholderTitle ?? "New Chat")
					: (existingChat?.title ?? "New Chat")

				try {
					// Extract text from message parts
					const messageParts = message.parts as
						| Array<{ type: string; text?: string }>
						| undefined
					const messageText =
						messageParts
							?.filter((p) => p.type === "text" && p.text)
							.map((p) => p.text)
							.join("\n") ?? ""

					// Prepare messages to save
					const messagesToSave: DBMessage[] = [
						// User message
						{
							id: message.id ?? generateUUID(),
							chatId,
							role: "user",
							parts:
								(message.parts as DBMessage["parts"]) ??
								([
									{ type: "text", text: messageText },
								] as DBMessage["parts"]),
							attachments: [],
							createdAt: new Date(),
						},
						// Assistant messages
						...messages.map((m) => ({
							id: m.id ?? generateUUID(),
							chatId,
							role: "assistant" as const,
							parts:
								(m.parts as DBMessage["parts"]) ??
								([] as DBMessage["parts"]),
							attachments: [],
							createdAt: new Date(),
						})),
					]

					// Save chat and messages
					await chatService.saveChat(
						{
							chatId,
							isNewChat,
							messages: messagesToSave,
							title: initialTitle,
							visibility: selectedVisibilityType,
							...(finalUsageContext !== undefined && {
								lastContext: finalUsageContext,
							}),
						},
						ctx,
					)

					const saveTime = Date.now() - startTime
					logInfo("Chat saved successfully", {
						chatId,
						isNewChat,
						messageCount: messages.length + 1,
						saveTime,
						userId: session.user.id,
					})

					// Update title asynchronously in background
					if (isNewChat && generatedTitlePromise) {
						generatedTitlePromise
							.then(async (generatedTitle) => {
								if (
									generatedTitle &&
									generatedTitle !== initialTitle
								) {
									try {
										// Check if chat still exists
										const existingChat =
											await chatService.getChatById(
												chatId,
												ctx,
											)
										if (!existingChat) {
											logInfo(
												"Skipping title update - chat no longer exists",
												{ chatId },
											)
											return
										}

										await chatService.updateTitle(
											chatId,
											generatedTitle,
											ctx,
										)
										logInfo("Chat title updated", {
											chatId,
											title: generatedTitle,
										})
									} catch (titleErr) {
										logWarn(
											"Title update failed - chat may have been deleted",
											{
												chatId,
												error:
													titleErr instanceof Error
														? titleErr.message
														: String(titleErr),
											},
										)
									}
								}
							})
							.catch((err) => {
								logWarn(
									"Background title generation promise rejected",
									{
										chatId,
										error:
											err instanceof Error
												? err.message
												: String(err),
									},
								)
							})
					}
				} catch (err) {
					logError("Failed to save chat", err as Error, {
						chatId,
						userId: session.user.id,
					})
				}
			},
			onError: (error: unknown) => {
				logError("Stream error in chat completion", error as Error, {
					chatId,
					modelId: selectedChatModel,
					userId: session.user.id,
				})
				return "Oops, an error occurred!"
			},
		})

		// Return SSE stream
		return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
	} catch (error) {
		logError("Chat request failed", error as Error, {
			modelId: selectedModelId,
		})

		return createChatErrorResponse(error, selectedModelId)
	}
}

// =============================================================================
// DELETE Handler
// =============================================================================

/**
 * DELETE /api/chat?id=<chatId>
 * Delete a chat conversation with all its messages and votes.
 *
 * Query Parameters:
 * - id: Chat ID (required, UUID format)
 *
 * Response:
 * - 200: { id: string } - Successfully deleted
 * - 400: { error: string } - Invalid or missing chat ID
 * - 401: { error: string } - Authentication required
 * - 403: { error: string } - Forbidden (not owner)
 * - 404: { error: string } - Chat not found
 * - 429: { error: string, retryAfter: number } - Rate limit exceeded
 * - 500: { error: string } - Server error
 */
export async function DELETE(request: Request) {
	try {
		// Parse and validate chat ID from query params
		const { searchParams } = new URL(request.url)
		const chatId = searchParams.get("id")

		if (!chatId) {
			throw new ValidationError("Chat ID is required")
		}

		// Validate UUID format
		if (!isValidUUID(chatId)) {
			throw new ValidationError("Invalid chat ID format")
		}

		// Get session
		const session = await getSession()
		if (!session?.user?.id) {
			throw new UnauthorizedError("Authentication required")
		}

		// Check rate limit
		const rateLimitResult = await checkChatLimit(session.user.id)
		if (!rateLimitResult.success) {
			const retryAfter = getRetryAfter(rateLimitResult.reset)
			throw new RateLimitError(
				"Too many requests. Please wait before deleting another chat.",
				{ retryAfter },
			)
		}

		// Create repository context
		const ctx: RepositoryContext = {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}

		// Delete the chat (service handles ownership verification and cascade)
		const result = await chatService.deleteChat(chatId, ctx)

		logInfo("Chat deleted via API", {
			chatId,
			userId: session.user.id,
			messagesDeleted: result.messagesDeleted,
			votesDeleted: result.votesDeleted,
			suggestionsDeleted: result.suggestionsDeleted,
		})

		return new Response(JSON.stringify({ id: chatId }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		logError("Chat deletion failed", error as Error)

		return createChatErrorResponse(error)
	}
}
