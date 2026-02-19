/**
 * Delete Chat Action
 *
 * Server action for deleting chat conversations with cascade.
 *
 * @module features/chat/actions/delete-chat.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import {
	chatService,
	type DeleteChatResult,
} from "@/lib/data/services/chat.service"
import type { Chat } from "@/lib/db/schema"
import { RateLimitError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Input for delete chat action
 */
export interface DeleteChatInput {
	/** Chat ID to delete */
	chatId: string
}

/**
 * Result of delete chat action
 */
export interface DeleteChatActionResult {
	/** Success status */
	success: boolean
	/** Deleted chat */
	chat?: Chat
	/** Number of messages deleted */
	messagesDeleted?: number
	/** Number of votes deleted */
	votesDeleted?: number
	/** Number of suggestions deleted */
	suggestionsDeleted?: number
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Delete Chat Action
// =============================================================================

/**
 * Delete a chat conversation with all its messages and votes.
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Verifies ownership
 * 4. Deletes the chat with cascade
 *
 * @param input - Delete chat input parameters
 * @returns Delete chat result with deletion details
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 * @throws ForbiddenError if user doesn't own the chat
 *
 * @example
 * ```typescript
 * const result = await deleteChatAction({
 *   chatId: 'chat-123',
 * });
 * if (result.success) {
 *   console.log('Deleted chat:', result.chat?.id);
 *   console.log('Messages deleted:', result.messagesDeleted);
 * }
 * ```
 */
export async function deleteChatAction(
	input: DeleteChatInput,
): Promise<DeleteChatActionResult> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before deleting another chat.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Delete the chat (service handles ownership verification)
		const result: DeleteChatResult = await chatService.deleteChat(
			input.chatId,
			ctx,
		)

		// 5. Revalidate paths
		revalidatePath("/chat")
		revalidatePath(`/chat/${input.chatId}`)

		return {
			success: true,
			chat: result.chat,
			messagesDeleted: result.messagesDeleted,
			votesDeleted: result.votesDeleted,
			...(result.suggestionsDeleted !== undefined && {
				suggestionsDeleted: result.suggestionsDeleted,
			}),
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to delete chat",
		}
	}
}

/**
 * Delete all chats for the current user.
 *
 * @returns Result with count of deleted chats
 */
export async function deleteAllChatsAction(): Promise<{
	success: boolean
	deletedCount?: number
	error?: string
}> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before performing this action.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Delete all chats
		const result = await chatService.deleteAllChats(ctx)

		// 5. Revalidate paths
		revalidatePath("/chat")

		return {
			success: true,
			deletedCount: result.deletedCount,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to delete chats",
		}
	}
}
