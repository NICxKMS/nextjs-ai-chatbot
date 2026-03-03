"use server"

import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { invalidateChat, invalidateChatList } from "@/lib/cache/revalidate"
import { getChatById, updateChatTitle } from "@/lib/data/chat"
import type { ActionResult } from "@/lib/types/result.types"

const renameChatSchema = z.object({
	chatId: z.string().uuid(),
	title: z.string().min(1).max(200),
})

/**
 * Rename a chat by updating its title.
 *
 * Validates session, checks ownership, updates the title in the DB,
 * then invalidates both the individual chat cache and the user's chat list cache.
 */
export async function renameChat(
	input: z.infer<typeof renameChatSchema>,
): Promise<ActionResult<void>> {
	// 1. Auth
	const session = await getAppSession()
	if (!session) {
		return {
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		}
	}

	// 2. Validate
	const parsed = renameChatSchema.safeParse(input)
	if (!parsed.success) {
		return {
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid input" },
		}
	}

	// 3. Authorize — ownership check
	const chat = await getChatById(parsed.data.chatId)
	if (!chat) {
		return {
			success: false,
			error: { code: "not_found:chat:chat_not_found", message: "Chat not found" },
		}
	}

	if (chat.userId !== session.user.id) {
		return {
			success: false,
			error: {
				code: "forbidden:chat:owner_mismatch",
				message: "Not authorized to rename this chat",
			},
		}
	}

	// 4. Execute
	try {
		await updateChatTitle(parsed.data.chatId, parsed.data.title)
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to rename chat",
			},
		}
	}

	// 5. Invalidate cache — both individual chat and user's chat list
	invalidateChat(parsed.data.chatId)
	invalidateChatList(session.user.id)

	return { success: true, data: undefined }
}
