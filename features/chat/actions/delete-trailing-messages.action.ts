/**
 * Delete Trailing Messages Action
 *
 * Server action for deleting messages after a timestamp (for message regeneration).
 *
 * @module features/chat/actions/delete-trailing-messages.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import { messageRepository } from "@/lib/data/repositories"
import { RateLimitError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Input for delete trailing messages action
 */
export interface DeleteTrailingMessagesInput {
	/** Chat ID */
	chatId: string
	/** Delete messages created at or after this timestamp (ISO string) */
	createdAt: string
}

/**
 * Result of delete trailing messages action
 */
export interface DeleteTrailingMessagesResult {
	/** Success status */
	success: boolean
	/** Number of messages deleted */
	messagesDeleted?: number
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Delete Trailing Messages Action
// =============================================================================

/**
 * Delete messages after a timestamp for message regeneration.
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Deletes messages created at or after the specified timestamp
 *
 * @param input - Delete trailing messages input parameters
 * @returns Delete trailing messages result
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * const result = await deleteTrailingMessagesAction({
 *   chatId: 'chat-123',
 *   createdAt: '2024-01-15T10:30:00Z',
 * });
 * if (result.success) {
 *   console.log('Messages deleted:', result.messagesDeleted);
 * }
 * ```
 */
export async function deleteTrailingMessagesAction(
	input: DeleteTrailingMessagesInput,
): Promise<DeleteTrailingMessagesResult> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before editing another message.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Parse timestamp
		const timestamp = new Date(input.createdAt)

		// 5. Delete messages after timestamp
		const messagesDeleted = await messageRepository.deleteAfterTimestamp(
			input.chatId,
			timestamp,
			ctx,
		)

		// 6. Revalidate paths
		revalidatePath("/chat")
		revalidatePath(`/chat/${input.chatId}`)

		return {
			success: true,
			messagesDeleted,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to delete trailing messages",
		}
	}
}
