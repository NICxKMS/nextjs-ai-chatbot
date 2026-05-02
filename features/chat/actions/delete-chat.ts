"use server"

import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { invalidateChatList } from "@/lib/cache/revalidate"
import { deleteChat as deleteChatData, getChatOwnerId } from "@/lib/data/chat"
import type { ActionResult } from "@/lib/types/result.types"

const deleteChatSchema = z.object({
	chatId: z.string().uuid(),
})

/**
 * Delete a single chat and all its associated data (messages, votes, artifacts via FK cascade).
 *
 * Validates session, checks ownership, then deletes the chat and invalidates the chat list cache.
 */
export async function deleteChat(
	input: z.infer<typeof deleteChatSchema>,
): Promise<ActionResult<void>> {
	// 1. Validate (sync — fail fast before any async work)
	const parsed = deleteChatSchema.safeParse(input)
	if (!parsed.success) {
		return {
			success: false,
			error: { code: "bad_request:validation:invalid_input", message: "Invalid chat ID" },
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
				message: "Not authorized to delete this chat",
			},
		}
	}

	// 4. Execute — FK cascade handles messages, votes, artifacts
	try {
		await deleteChatData(parsed.data.chatId)
	} catch {
		return {
			success: false,
			error: {
				code: "internal_error:database:query_failed",
				message: "Failed to delete chat",
			},
		}
	}

	// 5. Invalidate cache
	invalidateChatList(session.user.id)

	return { success: true, data: undefined }
}
