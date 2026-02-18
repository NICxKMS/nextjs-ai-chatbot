/**
 * Chat API Route
 *
 * Main chat streaming endpoint. Creates AI message streams using AI SDK
 * and returns SSE responses for real-time streaming.
 *
 * @module app/api/chat/route
 */

import { geolocation } from "@vercel/functions"
import {
	createUIMessageStream,
	JsonToSseTransformStream,
	type UIMessage,
} from "ai"
import type { ModelCatalog } from "tokenlens/core"
import {
	type ChatMessage,
	type ChatSettings,
	executeChatCompletion,
	generatePlaceholderTitle,
	generateTitleFromUserMessage,
	isValidModelId,
} from "@/lib/ai"
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
// Types
// =============================================================================

/**
 * Request body for chat POST
 */
interface ChatPostBody {
	/** Chat ID (UUID) */
	id: string
	/** User message */
	message: UIMessage
	/** Selected AI model ID */
	selectedChatModel: string
	/** Visibility type */
	selectedVisibilityType: "public" | "private"
	/** Optional settings */
	settings?: ChatSettings
}

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
		id: string
		role: string
		parts: unknown
		createdAt: Date
	}>,
): UIMessage[] {
	return messages.map((m) => {
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
		// Parse request body
		const body: ChatPostBody = await request.json()
		const {
			id: chatId,
			message,
			selectedChatModel,
			selectedVisibilityType,
		} = body

		selectedModelId = selectedChatModel

		// Validate model ID
		if (!isValidModelId(selectedChatModel)) {
			throw new ValidationError("Invalid model ID")
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
				"Too many requests. Please wait before sending another message.",
				{ retryAfter },
			)
		}

		// Create repository context
		const ctx: RepositoryContext = {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}

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
		const requestHints = {
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
		const tokenlensCatalogPromise = getTokenlensCatalog()

		// Create the UI message stream
		const stream = createUIMessageStream<ChatMessage>({
			execute: ({ writer: dataStream }) => {
				logInfo("Starting chat completion", {
					chatId,
					modelId: selectedChatModel,
					isNewChat,
					userId: session.user.id,
				})

				// Start title generation early (non-blocking)
				if (isNewChat) {
					generatedTitlePromise = generateTitleFromUserMessage({
						message,
					})
						.then((title) => {
							// Send title to client when ready
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

				// Build settings conditionally for exactOptionalPropertyTypes
				// Only include properties that are defined
				const chatSettings: ChatSettings | undefined = body.settings
					? {
							...(body.settings.systemPrompt && {
								systemPrompt: body.settings.systemPrompt,
							}),
							...(body.settings.sampling && {
								sampling: body.settings.sampling,
							}),
						}
					: undefined

				// Build request body conditionally
				const requestBody: { settings?: ChatSettings } = {}
				if (chatSettings) {
					requestBody.settings = chatSettings
				}

				// Execute AI completion
				try {
					executeChatCompletion({
						selectedChatModel,
						requestHints,
						requestBody,
						uiMessages,
						chatId,
						session,
						dataStream,
						tokenlensCatalogPromise,
						onUsageCalculated: (usage) => {
							// Usage is logged and can be stored for analytics
							logInfo("AI usage calculated", {
								chatId,
								modelId: selectedChatModel,
								inputTokens: usage.inputTokens,
								outputTokens: usage.outputTokens,
								totalTokens: usage.totalTokens,
							})
						},
					})
				} catch (completionError) {
					logError(
						"AI completion initialization failed",
						completionError as Error,
						{
							chatId,
							modelId: selectedChatModel,
							userId: session.user.id,
						},
					)

					// Write error to stream
					dataStream.write({
						type: "error",
						errorText:
							"Failed to start AI completion. Please try again.",
					})
				}
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
			onError: (error) => {
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

		if (error instanceof ValidationError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof UnauthorizedError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof ForbiddenError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof RateLimitError) {
			const retryAfter = error.details?.retryAfter ?? 60
			return new Response(JSON.stringify({ error: error.message }), {
				status: 429,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": String(retryAfter),
				},
			})
		}

		return new Response(
			JSON.stringify({ error: "An unexpected error occurred" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		)
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
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		if (!uuidRegex.test(chatId)) {
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
		})

		return new Response(JSON.stringify({ id: chatId }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		})
	} catch (error) {
		logError("Chat deletion failed", error as Error)

		if (error instanceof ValidationError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof UnauthorizedError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof ForbiddenError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof NotFoundError) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			})
		}

		if (error instanceof RateLimitError) {
			const retryAfter = error.details?.retryAfter ?? 60
			return new Response(JSON.stringify({ error: error.message }), {
				status: 429,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": String(retryAfter),
				},
			})
		}

		return new Response(
			JSON.stringify({ error: "An unexpected error occurred" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		)
	}
}
