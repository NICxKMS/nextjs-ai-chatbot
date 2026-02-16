/**
 * Votes API Route
 *
 * Handles message voting (upvote/downvote). Uses chat service.
 *
 * @module app/api/votes/route
 */

import { z } from "zod"
import { error, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import { voteRepository } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"

const voteQuerySchema = z.object({
	chatId: z.string().uuid(),
})

const voteBodySchema = z.object({
	chatId: z.string().uuid(),
	messageId: z.string().uuid(),
	type: z.enum(["up", "down"]),
})

/**
 * GET /api/votes?chatId=uuid
 * Get all votes for a chat.
 */
export async function GET(request: Request) {
	try {
		const userId = await requireAuthAction()
		const { searchParams } = new URL(request.url)
		const chatId = searchParams.get("chatId")

		if (!chatId) {
			return error("Missing chatId parameter")
		}

		// Validate UUID format
		const parsed = voteQuerySchema.safeParse({ chatId })
		if (!parsed.success) {
			return error("Invalid chatId format")
		}

		const votes = await voteRepository.findByChatId(chatId, {
			userId,
			isGuest: false,
		})

		return success(votes)
	} catch (err) {
		return error(err)
	}
}

/**
 * POST /api/votes
 * Create or update a vote on a message.
 */
export async function POST(request: Request) {
	try {
		const userId = await requireAuthAction()
		const body = await request.json()
		const parsed = voteBodySchema.safeParse(body)

		if (!parsed.success) {
			return error("Invalid request body")
		}

		const { chatId, messageId, type } = parsed.data
		const isUpvoted = type === "up"

		const vote = await chatService.voteMessage(
			chatId,
			messageId,
			userId,
			isUpvoted,
		)

		return success(vote)
	} catch (err) {
		return error(err)
	}
}
