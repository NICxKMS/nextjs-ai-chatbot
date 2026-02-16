/**
 * Save Message Action
 *
 * Server action for saving messages to the database.
 * Handles both new chat creation and message appending.
 *
 * @module features/chat/actions/save-message.action
 */

"use server"

import { revalidatePath } from "next/cache"
import { requireAuthAction } from "@/lib/auth/guards"
import type { RepositoryContext } from "@/lib/data/repositories"
import {
	chatService,
	type SaveChatParams,
} from "@/lib/data/services/chat.service"
import type { DBMessage } from "@/lib/db/schema"
import { RateLimitError } from "@/lib/errors"
import { checkChatLimit, getRetryAfter } from "@/lib/rate-limit"

// =============================================================================
// Types
// =============================================================================

/**
 * Message part for structured content
 */
export interface MessagePart {
	/** Part type */
	type: string
	/** Text content */
	text?: string
	/** Additional data */
	[key: string]: unknown
}

/**
 * Message to save
 */
export interface MessageToSave {
	/** Message ID */
	id?: string
	/** Message role */
	role: "user" | "assistant" | "system"
	/** Message content as text */
	content: string
	/** Optional creation timestamp */
	createdAt?: Date
	/** Optional structured parts */
	parts?: MessagePart[]
	/** Optional attachments */
	attachments?: unknown[]
}

/**
 * Input for save message action
 */
export interface SaveMessageInput {
	/** Chat ID */
	chatId: string
	/** Whether this is a new chat */
	isNewChat?: boolean
	/** Messages to save */
	messages: MessageToSave[]
	/** Optional title for new chat */
	title?: string
	/** Optional visibility setting */
	visibility?: "public" | "private"
}

/**
 * Result of save message action
 */
export interface SaveMessageResult {
	/** Success status */
	success: boolean
	/** Number of messages saved */
	count: number
	/** Error message if failed */
	error?: string
}

// =============================================================================
// Save Message Action
// =============================================================================

/**
 * Save messages to a chat.
 *
 * This action:
 * 1. Authenticates the user
 * 2. Checks rate limits
 * 3. Saves messages to the database
 *
 * @param input - Save message input parameters
 * @returns Save message result with status
 * @throws UnauthorizedError if not authenticated
 * @throws RateLimitError if rate limit exceeded
 *
 * @example
 * ```typescript
 * const result = await saveMessageAction({
 *   chatId: 'chat-123',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export async function saveMessageAction(
	input: SaveMessageInput,
): Promise<SaveMessageResult> {
	// 1. Authenticate user
	const userId = await requireAuthAction()

	// 2. Check rate limit
	const rateLimitResult = await checkChatLimit(userId)
	if (!rateLimitResult.success) {
		const retryAfter = getRetryAfter(rateLimitResult.reset)
		throw new RateLimitError(
			"Too many requests. Please wait before sending another message.",
			{ retryAfter },
		)
	}

	// 3. Create repository context
	const ctx: RepositoryContext = {
		userId,
		isGuest: false,
	}

	try {
		// 4. Prepare messages for storage
		const messagesToSave: DBMessage[] = input.messages.map((msg) => ({
			id: msg.id ?? crypto.randomUUID(),
			chatId: input.chatId,
			role: msg.role,
			parts: msg.parts ?? [{ type: "text", text: msg.content }],
			attachments: msg.attachments ?? [],
			createdAt: msg.createdAt ?? new Date(),
		}))

		// 5. Save chat and messages
		const saveParams: SaveChatParams = {
			chatId: input.chatId,
			isNewChat: input.isNewChat ?? false,
			messages: messagesToSave,
			...(input.title !== undefined && { title: input.title }),
			...(input.visibility !== undefined && {
				visibility: input.visibility,
			}),
		}

		await chatService.saveChat(saveParams, ctx)

		// 6. Revalidate the chat page
		revalidatePath(`/chat/${input.chatId}`)

		return {
			success: true,
			count: messagesToSave.length,
		}
	} catch (error) {
		return {
			success: false,
			count: 0,
			error:
				error instanceof Error
					? error.message
					: "Failed to save messages",
		}
	}
}

/**
 * Save a single message to an existing chat.
 * Convenience wrapper around saveMessageAction.
 *
 * @param chatId - Chat ID
 * @param message - Message to save
 * @returns Save message result
 */
export async function saveSingleMessage(
	chatId: string,
	message: MessageToSave,
): Promise<SaveMessageResult> {
	return saveMessageAction({
		chatId,
		messages: [message],
		isNewChat: false,
	})
}
