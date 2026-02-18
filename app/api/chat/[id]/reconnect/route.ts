/**
 * Chat Reconnect API Route
 *
 * SSE reconnection endpoint for resuming chat streams. Allows clients to
 * reconnect to dropped streams and resume from where they left off.
 *
 * Features:
 * - Accepts lastEventId query parameter for resume position
 * - Returns recent assistant messages within reconnect window
 * - Rate limiting to prevent reconnect abuse
 * - Exponential backoff guidance via response headers
 *
 * @module app/api/chat/[id]/reconnect
 */

import {
	createUIMessageStream,
	JsonToSseTransformStream,
	type UIMessage,
} from "ai"
import { differenceInSeconds } from "date-fns"
import { error } from "@/lib/api"
import { requireAuthAction, requireRateLimit } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import type { Message } from "@/lib/db/schema"
import {
	ForbiddenError,
	NotFoundError,
	RateLimitError,
	ValidationError,
} from "@/lib/errors"
import { logDebug, logError } from "@/lib/log"

// =============================================================================
// Constants
// =============================================================================

/** Maximum duration for the API route */
export const maxDuration = 30

/**
 * Time window in seconds for allowing stream reconnection.
 * If the last message is older than this, reconnection returns empty stream.
 */
const RECONNECT_WINDOW_SECONDS = 15

/**
 * Default retry delay in seconds for exponential backoff.
 */
const DEFAULT_RETRY_AFTER_SECONDS = 1

/**
 * Maximum retry delay in seconds for exponential backoff.
 */
const MAX_RETRY_AFTER_SECONDS = 30

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate exponential backoff delay.
 *
 * @param retryCount - Number of retry attempts
 * @returns Delay in seconds
 */
function calculateBackoffDelay(retryCount: number): number {
	// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
	const delay = 2 ** retryCount * DEFAULT_RETRY_AFTER_SECONDS
	return Math.min(delay, MAX_RETRY_AFTER_SECONDS)
}

/**
 * Convert a Message to UIMessage format for streaming.
 *
 * @param message - Database message to convert
 * @returns UIMessage compatible object
 */
function messageToUIMessage(message: Message): UIMessage {
	return {
		id: message.id,
		role: message.role as "user" | "assistant",
		parts: (message.parts as UIMessage["parts"]) ?? [],
	}
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * GET /api/chat/[id]/reconnect
 *
 * Reconnect to a chat stream via SSE.
 *
 * Query Parameters:
 * - lastEventId: Last event ID received (for future resume support)
 * - retryCount: Current retry attempt number (for backoff calculation)
 *
 * Response Headers:
 * - Retry-After: Suggested delay before next reconnect attempt
 * - X-Reconnect-Window: Time window for valid reconnection
 *
 * @param request - The incoming request
 * @param params - Route parameters containing chat ID
 * @returns SSE stream with recent message or empty stream
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
): Promise<Response> {
	try {
		// 1. Validate route parameters
		const { id: chatId } = await params

		if (!chatId) {
			return error(new ValidationError("Chat ID is required"))
		}

		// 2. Authenticate user
		const userId = await requireAuthAction()

		// 3. Apply rate limiting for stream reconnection
		// Use 'api' limiter for reconnect to prevent abuse
		try {
			await requireRateLimit("api", userId)
		} catch (err) {
			if (err instanceof RateLimitError) {
				// Return rate limit response with backoff headers
				const headers = new Headers()
				headers.set(
					"Retry-After",
					String(err.details?.retryAfter ?? 60),
				)
				headers.set(
					"X-RateLimit-Reset",
					String(err.details?.reset ?? Date.now() + 60000),
				)
				headers.set("Content-Type", "application/json")

				return new Response(
					JSON.stringify({
						success: false,
						error: {
							code: "RATE_LIMIT_EXCEEDED",
							message: err.message,
							statusCode: 429,
						},
					}),
					{ status: 429, headers },
				)
			}
			throw err
		}

		// 4. Parse query parameters
		const url = new URL(request.url)
		const lastEventId = url.searchParams.get("lastEventId") ?? undefined
		const retryCountParam = url.searchParams.get("retryCount")
		const retryCount = retryCountParam
			? Math.max(0, Number.parseInt(retryCountParam, 10) || 0)
			: 0

		// 5. Create repository context
		const ctx: RepositoryContext = {
			userId,
			isGuest: false,
		}

		// 6. Fetch chat with messages
		let result: Awaited<ReturnType<typeof chatService.getWithMessages>>
		try {
			result = await chatService.getWithMessages(chatId, ctx)
		} catch (err) {
			logError(
				"Reconnect: Failed to fetch chat with messages",
				err as Error,
				{
					chatId,
					userId,
				},
			)

			if (err instanceof ForbiddenError) {
				return error(err)
			}

			return error(new NotFoundError("Chat not found"))
		}

		if (!result) {
			return error(new NotFoundError("Chat not found"))
		}

		const { chat, messages } = result

		// 7. Verify ownership for private chats
		if (chat.visibility === "private" && chat.userId !== userId) {
			return error(
				new ForbiddenError("You do not have access to this chat"),
			)
		}

		// 8. Calculate backoff delay for response headers
		const backoffDelay = calculateBackoffDelay(retryCount)

		// 9. Create empty stream for cases where we can't reconnect
		const createEmptyResponse = (): Response => {
			const emptyStream = createUIMessageStream<UIMessage>({
				execute: () => {
					// Intentionally empty - returns empty SSE stream
				},
			})

			const headers = new Headers()
			headers.set("Content-Type", "text/event-stream; charset=utf-8")
			headers.set("Cache-Control", "no-cache")
			headers.set("Connection", "keep-alive")
			headers.set("Retry-After", String(backoffDelay))
			headers.set("X-Reconnect-Window", String(RECONNECT_WINDOW_SECONDS))

			return new Response(
				emptyStream.pipeThrough(new JsonToSseTransformStream()),
				{
					status: 200,
					headers,
				},
			)
		}

		// 10. Find the most recent message
		const mostRecentMessage = messages.at(-1)

		// 11. Determine if we can reconnect
		// No messages - return empty stream
		if (!mostRecentMessage) {
			logDebug("Reconnect: No messages in chat", { chatId })
			return createEmptyResponse()
		}

		// Only reconnect to assistant messages
		if (mostRecentMessage.role !== "assistant") {
			logDebug("Reconnect: Most recent message is not from assistant", {
				chatId,
				messageRole: mostRecentMessage.role,
			})
			return createEmptyResponse()
		}

		// Check if message is within reconnect window
		const messageCreatedAt = new Date(mostRecentMessage.createdAt)
		const reconnectRequestedAt = new Date()
		const secondsSinceMessage = differenceInSeconds(
			reconnectRequestedAt,
			messageCreatedAt,
		)

		if (secondsSinceMessage > RECONNECT_WINDOW_SECONDS) {
			logDebug("Reconnect: Message too old for reconnection", {
				chatId,
				secondsSinceMessage,
				reconnectWindow: RECONNECT_WINDOW_SECONDS,
			})

			const emptyStream = createUIMessageStream<UIMessage>({
				execute: () => {
					// Intentionally empty - returns empty SSE stream
				},
			})

			const headers = new Headers()
			headers.set("Content-Type", "text/event-stream; charset=utf-8")
			headers.set("Cache-Control", "no-cache")
			headers.set("Connection", "keep-alive")
			headers.set("Retry-After", String(backoffDelay))
			headers.set("X-Reconnect-Window", String(RECONNECT_WINDOW_SECONDS))
			headers.set("X-Message-Age", String(secondsSinceMessage))

			return new Response(
				emptyStream.pipeThrough(new JsonToSseTransformStream()),
				{
					status: 200,
					headers,
				},
			)
		}

		// 12. Log successful reconnect
		logDebug("Reconnect: Replaying recent assistant message", {
			chatId,
			messageId: mostRecentMessage.id,
			messageAge: secondsSinceMessage,
			retryCount,
			lastEventId,
		})

		// 13. Create stream with replayed message
		const restoredStream = createUIMessageStream<UIMessage>({
			execute: ({ writer }) => {
				writer.write({
					type: "data-appendMessage",
					data: messageToUIMessage(mostRecentMessage),
					transient: true,
				} as Parameters<typeof writer.write>[0])
			},
		})

		// 14. Return stream with replayed message
		const headers = new Headers()
		headers.set("Content-Type", "text/event-stream; charset=utf-8")
		headers.set("Cache-Control", "no-cache")
		headers.set("Connection", "keep-alive")
		headers.set("Retry-After", String(backoffDelay))
		headers.set("X-Reconnect-Window", String(RECONNECT_WINDOW_SECONDS))
		headers.set("X-Message-Age", String(secondsSinceMessage))
		headers.set("X-Message-Id", mostRecentMessage.id)

		return new Response(
			restoredStream.pipeThrough(new JsonToSseTransformStream()),
			{
				status: 200,
				headers,
			},
		)
	} catch (err) {
		logError("Reconnect: Unexpected error", err as Error)
		return error(err)
	}
}
