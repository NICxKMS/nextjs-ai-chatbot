/**
 * Delete Trailing Messages Action
 *
 * Server action for deleting messages after a timestamp (for message regeneration).
 *
 * @module features/chat/actions/delete-trailing-messages.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import { RateLimitError, ValidationError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

const deleteTrailingMessagesSchema = z.object({
	chatId: z.string().uuid(),
	createdAt: z
		.string()
		.refine((value) => !Number.isNaN(new Date(value).getTime()), {
			message: "createdAt must be a valid ISO timestamp",
		}),
})

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
		const parsed = deleteTrailingMessagesSchema.safeParse(input)
		if (!parsed.success) {
			throw new ValidationError(
				"Invalid delete trailing messages input",
				{
					errors: parsed.error.flatten().fieldErrors,
				},
			)
		}

		const { chatId, createdAt } = parsed.data

		// 4. Parse timestamp
		const timestamp = new Date(createdAt)

		// 5. Delete messages after timestamp with ownership verification
		const { messagesDeleted } =
			await chatService.deleteMessagesAfterTimestamp(
				chatId,
				timestamp,
				ctx,
			)

		// 6. Revalidate paths
		revalidatePath("/chat")
		revalidatePath(`/chat/${chatId}`)

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

/**
 * Backward-compatible alias for legacy callers.
 */
export async function deleteTrailingMessages(
	input: DeleteTrailingMessagesInput,
): Promise<DeleteTrailingMessagesResult> {
	return deleteTrailingMessagesAction(input)
}
