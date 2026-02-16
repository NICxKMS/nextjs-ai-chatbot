/**
 * Get History Action
 *
 * Server action for retrieving chat history.
 *
 * @module features/chat/actions/get-history.action
 */

"use server"

import { requireAuthAction } from "@/lib/auth/guards"
import type {
	PaginatedResult,
	PaginationParams,
	RepositoryContext,
} from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import type { Chat, Message } from "@/lib/db/schema"
import { RateLimitError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Input for get history action
 */
export interface GetHistoryInput {
	/** Number of items per page */
	limit?: number
	/** Cursor for pagination (after this ID) */
	startingAfter?: string | null
	/** Cursor for pagination (before this ID) */
	endingBefore?: string | null
}

/**
 * Chat with latest message preview
 */
export interface ChatWithPreview {
	/** Chat data */
	chat: Chat
	/** Preview of latest message */
	latestMessage?: {
		content: string
		createdAt: Date
	}
}

/**
 * Result of get history action
 */
export interface GetHistoryResult {
	/** Success status */
	success: boolean
	/** Chat items */
	chats?: Chat[]
	/** Whether there are more items */
	hasMore?: boolean
	/** Error message if failed */
	error?: string
}

/**
 * Result of get chat with messages action
 */
export interface GetChatResult {
	/** Success status */
	success: boolean
	/** Chat data */
	chat?: Chat
	/** Messages */
	messages?: Message[]
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Get History Action
// =============================================================================

/**
 * Get paginated chat history for the current user.
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Retrieves paginated chat history
 *
 * @param input - Get history input parameters
 * @returns Paginated chat history
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * const result = await getHistoryAction({
 *   limit: 20,
 *   startingAfter: 'chat-cursor-id',
 * });
 * if (result.success) {
 *   console.log('Chats:', result.chats);
 *   console.log('Has more:', result.hasMore);
 * }
 * ```
 */
export async function getHistoryAction(
	input: GetHistoryInput = {},
): Promise<GetHistoryResult> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before fetching history.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Build pagination params
		const pagination: PaginationParams = {
			limit: input.limit ?? 20,
			startingAfter: input.startingAfter ?? null,
			endingBefore: input.endingBefore ?? null,
		}

		// 5. Get paginated history
		const result: PaginatedResult<Chat> = await chatService.getHistory(
			pagination,
			ctx,
		)

		return {
			success: true,
			chats: result.items,
			hasMore: result.hasMore,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get chat history",
		}
	}
}

/**
 * Get a single chat with its messages.
 *
 * @param chatId - Chat ID to retrieve
 * @returns Chat with messages
 */
export async function getChatAction(chatId: string): Promise<GetChatResult> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before fetching chat.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Get chat with messages
		const result = await chatService.getWithMessages(chatId, ctx)

		if (!result) {
			return {
				success: false,
				error: "Chat not found",
			}
		}

		return {
			success: true,
			chat: result.chat,
			messages: result.messages,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to get chat",
		}
	}
}

/**
 * Get a single chat by ID (without messages).
 *
 * @param chatId - Chat ID to retrieve
 * @returns Chat data
 */
export async function getChatByIdAction(chatId: string): Promise<{
	success: boolean
	chat?: Chat
	error?: string
}> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before fetching chat.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Get chat
		const chat = await chatService.getChatById(chatId, ctx)

		if (!chat) {
			return {
				success: false,
				error: "Chat not found",
			}
		}

		return {
			success: true,
			chat,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to get chat",
		}
	}
}
