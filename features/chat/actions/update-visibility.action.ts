/**
 * Update Visibility Action
 *
 * Server action for updating chat visibility (public/private).
 *
 * @module features/chat/actions/update-visibility.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import { chatRepository } from "@/lib/data/repositories"
import { NotFoundError, RateLimitError, ValidationError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Visibility type for chats
 */
export type VisibilityType = "private" | "public"

/**
 * Input for update visibility action
 */
export interface UpdateVisibilityInput {
	/** Chat ID to update */
	chatId: string
	/** New visibility setting */
	visibility: VisibilityType
}

/**
 * Result of update visibility action
 */
export interface UpdateVisibilityResult {
	/** Success status */
	success: boolean
	/** Error message if failed */
	error?: string
}

const updateVisibilityInputSchema = z.object({
	chatId: z.string().uuid(),
	visibility: z.enum(["private", "public"]),
})

// =============================================================================
// Update Visibility Action
// =============================================================================

/**
 * Update a chat's visibility (public/private).
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Verifies ownership via repository
 * 4. Updates the chat visibility
 * 5. Revalidates relevant paths
 *
 * @param input - Update visibility input parameters
 * @returns Update visibility result
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 * @throws ForbiddenError if user doesn't own the chat
 *
 * @example
 * ```typescript
 * const result = await updateVisibilityAction({
 *   chatId: 'chat-123',
 *   visibility: 'public',
 * });
 * if (result.success) {
 *   console.log('Visibility updated');
 * }
 * ```
 */
export async function updateVisibilityAction(
	input: UpdateVisibilityInput,
): Promise<UpdateVisibilityResult> {
	const parsedInput = updateVisibilityInputSchema.safeParse(input)
	if (!parsedInput.success) {
		return {
			success: false,
			error: "Invalid visibility update input",
		}
	}

	const validatedInput = parsedInput.data

	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before updating.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Update the visibility (repository handles ownership verification)
		const result = await chatRepository.updateVisibility(
			validatedInput.chatId,
			validatedInput.visibility,
			ctx,
		)

		if (!result) {
			return {
				success: false,
				error: "Chat not found",
			}
		}

		// 5. Revalidate the chat page and history
		revalidatePath(`/chat/${validatedInput.chatId}`)
		revalidatePath("/chat")
		revalidatePath("/api/history")

		return {
			success: true,
		}
	} catch (error) {
		// Handle known error types
		if (error instanceof NotFoundError) {
			return {
				success: false,
				error: "Chat not found",
			}
		}

		if (error instanceof ValidationError) {
			return {
				success: false,
				error: error.message,
			}
		}

		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update visibility",
		}
	}
}

/**
 * Backward-compatible alias for legacy callers.
 */
export async function updateChatVisibility(
	input: UpdateVisibilityInput,
): Promise<UpdateVisibilityResult> {
	return updateVisibilityAction(input)
}
