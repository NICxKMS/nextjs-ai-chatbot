/**
 * Chat History API Route
 *
 * Lists user's chat history with pagination. Delegates to feature actions.
 *
 * @module app/api/history/route
 */

import { deleteAllChatsAction, getHistoryAction } from "@/features/chat/actions"
import { error, paginated, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * GET /api/history
 * Get paginated chat history for the current user.
 */
export async function GET(request: Request) {
	try {
		await requireAuthAction()

		const { searchParams } = new URL(request.url)
		const limit = Number.parseInt(searchParams.get("limit") || "20", 10)
		const startingAfter = searchParams.get("starting_after")
		const endingBefore = searchParams.get("ending_before")

		const result = await getHistoryAction({
			limit: Number.isNaN(limit) ? 20 : limit,
			startingAfter: startingAfter ?? null,
			endingBefore: endingBefore ?? null,
		})

		if (!result.success) {
			return error(result.error ?? "Failed to get history")
		}

		return paginated(result.chats ?? [], {
			page: 1,
			pageSize: limit,
			total: result.chats?.length ?? 0,
			hasMore: result.hasMore ?? false,
		})
	} catch (err) {
		return error(err)
	}
}

/**
 * DELETE /api/history
 * Delete all chats for the current user.
 */
export async function DELETE() {
	try {
		await requireAuthAction()

		const result = await deleteAllChatsAction()

		if (!result.success) {
			return error(result.error ?? "Failed to delete chats")
		}

		return success({ deletedCount: result.deletedCount })
	} catch (err) {
		return error(err)
	}
}
