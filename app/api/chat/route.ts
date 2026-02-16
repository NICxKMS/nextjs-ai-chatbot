/**
 * Chat API Route
 *
 * Main chat streaming endpoint. Delegates to feature actions.
 *
 * @module app/api/chat/route
 */

import { streamChatAction } from "@/features/chat/actions"
import { error, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * POST /api/chat
 * Stream chat messages with AI response.
 */
export async function POST(request: Request) {
	try {
		await requireAuthAction()
		const body = await request.json()

		const result = await streamChatAction({
			chatId: body.id,
			messages: body.messages,
			isNewChat: body.isNewChat,
			title: body.title,
			visibility: body.visibility,
		})

		if (!result.success) {
			return error(result.error ?? "Failed to process chat")
		}

		return success({ chatId: result.chatId })
	} catch (err) {
		return error(err)
	}
}
