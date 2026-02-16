/**
 * Delete Chat Server Action
 *
 * Deletes a chat and all associated data (messages, votes).
 *
 * @module features/sidebar/actions/delete-chat.action
 */

"use server"

import { getSession } from "@/lib/auth/session"
import { chatService } from "@/lib/data/services/chat.service"
import { ForbiddenError, NotFoundError } from "@/lib/errors"
import type { DeleteAllChatsResult, DeleteChatResult } from "../types"

/**
 * Delete a single chat by ID
 *
 * @param chatId - The chat ID to delete
 * @returns Result indicating success/failure
 */
export async function deleteChat(chatId: string): Promise<DeleteChatResult> {
	try {
		const session = await getSession()

		if (!session?.user?.id) {
			return { success: false, chatId }
		}

		const ctx = {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}

		await chatService.deleteChat(chatId, ctx)

		return { success: true, chatId }
	} catch (error) {
		if (error instanceof NotFoundError || error instanceof ForbiddenError) {
			return { success: false, chatId }
		}
		console.error("Failed to delete chat:", error)
		return { success: false, chatId }
	}
}

/**
 * Delete all chats for the current user
 *
 * @returns Result indicating success and count of deleted chats
 */
export async function deleteAllChats(): Promise<DeleteAllChatsResult> {
	try {
		const session = await getSession()

		if (!session?.user?.id) {
			return { success: false, deletedCount: 0 }
		}

		const ctx = {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}

		const result = await chatService.deleteAllChats(ctx)

		return { success: true, deletedCount: result.deletedCount }
	} catch (error) {
		console.error("Failed to delete all chats:", error)
		return { success: false, deletedCount: 0 }
	}
}
