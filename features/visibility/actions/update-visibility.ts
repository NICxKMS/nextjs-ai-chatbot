"use server"

import { updateVisibilitySchema } from "@/features/visibility/types/visibility.types"
import { getAppSession } from "@/lib/auth/session"
import { invalidateChat, invalidateChatList } from "@/lib/cache/revalidate"
import { getChatOwnerId, updateChatVisibility as updateVisibilityInDb } from "@/lib/data/chat"
import type { ActionResult } from "@/lib/types/result.types"

/**
 * Update the visibility of a chat (public or private).
 *
 * Flow: auth check → input validation → ownership verification →
 * DB update → invalidate chat + chat-list cache tags.
 *
 * Returns ActionResult<void> — never throws.
 */
export async function updateChatVisibility(input: unknown): Promise<ActionResult<void>> {
	// 1. Auth — reject unauthenticated
	const session = await getAppSession()
	if (!session) {
		return {
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		}
	}

	// 2. Validate input
	const parsed = updateVisibilitySchema.safeParse(input)
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "bad_request:validation:invalid_input",
				message: "Invalid visibility input",
			},
		}
	}

	const { chatId, visibility } = parsed.data

	// 3. Authorize — verify chat ownership
	const ownerId = await getChatOwnerId(chatId)
	if (!ownerId) {
		return {
			success: false,
			error: { code: "not_found:chat:chat_not_found", message: "Chat not found" },
		}
	}

	if (ownerId !== session.user.id) {
		return {
			success: false,
			error: {
				code: "forbidden:chat:owner_mismatch",
				message: "Not authorized to update this chat's visibility",
			},
		}
	}

	// 4. Execute — update visibility in DB
	try {
		await updateVisibilityInDb(chatId, visibility)
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to update chat visibility",
			},
		}
	}

	// 5. Invalidate cache — both individual chat and user's chat list
	invalidateChat(chatId)
	invalidateChatList(session.user.id)

	return { success: true, data: undefined }
}
