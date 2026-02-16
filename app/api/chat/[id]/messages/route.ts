/**
 * Chat Messages API Route
 *
 * Paginated message fetch endpoint. Delegates to feature actions.
 *
 * @module app/api/chat/[id]/messages
 */

import { getChatAction } from "@/features/chat/actions"
import { error, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * GET /api/chat/[id]/messages
 * Fetch paginated messages for a chat.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		await requireAuthAction()
		const { id: chatId } = await params

		const result = await getChatAction(chatId)

		if (!result.success) {
			return error(result.error ?? "Chat not found")
		}

		return success({ messages: result.messages ?? [] })
	} catch (err) {
		return error(err)
	}
}
