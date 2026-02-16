/**
 * Update Title Action
 *
 * Server action for updating chat titles.
 *
 * @module features/chat/actions/update-title.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import { RateLimitError } from "@/lib/errors"
import { checkApiLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Input for update title action
 */
export interface UpdateTitleInput {
	/** Chat ID to update */
	chatId: string
	/** New title */
	title: string
}

/**
 * Result of update title action
 */
export interface UpdateTitleResult {
	/** Success status */
	success: boolean
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Update Title Action
// =============================================================================

/**
 * Update a chat's title.
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Verifies ownership
 * 4. Updates the chat title
 *
 * @param input - Update title input parameters
 * @returns Update title result
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 * @throws ForbiddenError if user doesn't own the chat
 *
 * @example
 * ```typescript
 * const result = await updateTitleAction({
 *   chatId: 'chat-123',
 *   title: 'My Updated Title',
 * });
 * if (result.success) {
 *   console.log('Title updated');
 * }
 * ```
 */
export async function updateTitleAction(
	input: UpdateTitleInput,
): Promise<UpdateTitleResult> {
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
		// 4. Update the title (service handles ownership verification)
		await chatService.updateTitle(input.chatId, input.title, ctx)

		// 5. Revalidate the chat page
		revalidatePath(`/chat/${input.chatId}`)
		revalidatePath("/chat")

		return {
			success: true,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update title",
		}
	}
}

/**
 * Generate a title for a chat based on its messages.
 * Uses AI to generate a contextual title.
 *
 * @param chatId - Chat ID
 * @returns Generated title or error
 */
export async function generateTitleAction(chatId: string): Promise<{
	success: boolean
	title?: string
	error?: string
}> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit (use stricter limit for AI operations)
	const rateLimitResult = await checkApiLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before generating a title.",
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

		// 5. Generate title from first user message
		const firstUserMessage = result.messages.find((m) => m.role === "user")
		if (!firstUserMessage) {
			return {
				success: false,
				error: "No user messages found",
			}
		}

		// Extract text from parts
		const parts = firstUserMessage.parts as Array<{
			type: string
			text?: string
		}>
		const textContent =
			parts
				?.filter((p) => p.type === "text" && typeof p.text === "string")
				.map((p) => p.text)
				.join(" ") ?? ""

		// Generate simple title (first 50 chars of first message)
		const generatedTitle =
			textContent.length > 50
				? `${textContent.substring(0, 50)}...`
				: textContent || "New Chat"

		// 6. Update the chat title
		await chatService.updateTitle(chatId, generatedTitle, ctx)

		// 7. Revalidate
		revalidatePath(`/chat/${chatId}`)

		return {
			success: true,
			title: generatedTitle,
		}
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to generate title",
		}
	}
}
