"use server"

import { getAppSession } from "@/lib/auth/session"
import { invalidateChatList } from "@/lib/cache/revalidate"
import { deleteAllChats as deleteAllChatsData } from "@/lib/data/chat"
import type { ActionResult } from "@/lib/types/result.types"

/**
 * Delete all chats for the current user.
 *
 * Validates session, then deletes all chats and invalidates the chat list cache.
 * Associated messages, votes, and artifacts are removed via FK cascade.
 *
 * No input required — operates on the authenticated user's chats.
 */
export async function deleteAllChats(): Promise<ActionResult<void>> {
	// 1. Auth
	const session = await getAppSession()
	if (!session) {
		return {
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		}
	}

	// 2. Execute
	try {
		await deleteAllChatsData(session.user.id)
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete all chats",
			},
		}
	}

	// 3. Invalidate cache
	invalidateChatList(session.user.id)

	return { success: true, data: undefined }
}
