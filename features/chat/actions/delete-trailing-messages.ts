"use server"

import type { DeleteMessagesInput } from "@/features/chat/schemas/chat.schema"
import { deleteMessagesSchema } from "@/features/chat/schemas/chat.schema"
import { getAppSession } from "@/lib/auth/session"
import { invalidateChat } from "@/lib/cache/revalidate"
import { getChatOwnerId } from "@/lib/data/chat"
import { deleteMessagesByIdAfter } from "@/lib/data/message"
import type { ActionResult } from "@/lib/types/result.types"

/**
 * Delete a message and all subsequent messages (by createdAt) within a chat.
 *
 * Used by the message edit flow — when a user edits an earlier message,
 * all messages after it are deleted before re-submission.
 *
 * Validates session, checks chat ownership, then deletes the target message
 * and everything after it.
 */
export async function deleteTrailingMessages(
	input: DeleteMessagesInput,
): Promise<ActionResult<void>> {
	// 1. Validate (sync — fail fast before any async work)
	const parsed = deleteMessagesSchema.safeParse(input)
	if (!parsed.success) {
		return {
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid input" },
		}
	}

	// 2. Auth + Fetch (parallel — both independent)
	const [session, ownerId] = await Promise.all([
		getAppSession(),
		getChatOwnerId(parsed.data.chatId),
	])

	if (!session) {
		return {
			success: false,
			error: { code: "unauthorized:chat:auth_required", message: "Authentication required" },
		}
	}

	// 3. Authorize — ownership check
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
				message: "Not authorized to modify this chat",
			},
		}
	}

	// 4. Execute — delete target message + all after it
	try {
		await deleteMessagesByIdAfter(parsed.data.chatId, parsed.data.messageId)
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete messages",
			},
		}
	}

	// 5. Invalidate cache
	invalidateChat(parsed.data.chatId)

	return { success: true, data: undefined }
}
