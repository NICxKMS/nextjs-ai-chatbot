/**
 * Get Chat History Server Action
 *
 * Fetches paginated chat history for the current user.
 *
 * @module features/sidebar/actions/get-history.action
 */

"use server"

import { getSession } from "@/lib/auth/session"
import { chatService } from "@/lib/data/services/chat.service"
import type { ChatHistory, ChatHistoryPagination } from "../types"

/**
 * Get paginated chat history for the current user
 *
 * @param pagination - Pagination parameters
 * @returns Chat history with pagination info
 */
export async function getChatHistory(
	pagination: ChatHistoryPagination,
): Promise<ChatHistory> {
	try {
		const session = await getSession()

		if (!session?.user?.id) {
			return { chats: [], hasMore: false }
		}

		const ctx = {
			userId: session.user.id,
			isGuest: session.user.type === "guest",
		}

		const result = await chatService.getHistory(
			{
				limit: pagination.limit,
				endingBefore: pagination.cursor ?? null,
			},
			ctx,
		)

		return {
			chats: result.items,
			hasMore: result.hasMore,
		}
	} catch (error) {
		console.error("Failed to get chat history:", error)
		return { chats: [], hasMore: false }
	}
}
