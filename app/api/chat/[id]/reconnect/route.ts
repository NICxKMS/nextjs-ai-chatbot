/**
 * Chat Reconnect API Route
 *
 * SSE reconnection endpoint for resuming chat streams. Delegates to feature actions.
 *
 * @module app/api/chat/[id]/reconnect
 */

import { getChatAction } from "@/features/chat/actions"
import { error, stream } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * GET /api/chat/[id]/reconnect
 * Reconnect to a chat stream via SSE.
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

		// Return SSE stream with latest message if recent
		return stream(() => {
			return new ReadableStream({
				start(controller) {
					const encoder = new TextEncoder()
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ chatId })}\n\n`,
						),
					)
					controller.close()
				},
			})
		})
	} catch (err) {
		return error(err)
	}
}
