/**
 * Votes API Route
 *
 * Handles message voting (upvote/downvote). Uses chat service.
 * Includes proper user filtering, ownership verification, and rate limiting.
 *
 * @module app/api/votes/route
 */

import { z } from "zod"
import { error, success } from "@/lib/api"
import {
	optionalAuth,
	requireAuthAction,
	requireNonGuest,
	requireRateLimit,
} from "@/lib/auth/guards"
import { chatRepository, voteRepository } from "@/lib/data/repositories"
import { chatService } from "@/lib/data/services/chat.service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { logError, logInfo } from "@/lib/log"

// =============================================================================
// Validation Schemas
// =============================================================================

const voteQuerySchema = z.object({
	chatId: z.string().uuid(),
})

const voteBodySchema = z
	.object({
		chatId: z.string().uuid(),
		messageId: z.string().uuid(),
		type: z.enum(["up", "down"]).optional(),
		isUpvoted: z.boolean().optional(),
	})
	.superRefine((body, ctx) => {
		if (body.type === undefined && body.isUpvoted === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Either 'type' or 'isUpvoted' is required",
				path: ["type"],
			})
		}

		if (body.type !== undefined && body.isUpvoted !== undefined) {
			const derivedType = body.isUpvoted ? "up" : "down"
			if (body.type !== derivedType) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "'type' and 'isUpvoted' do not match",
					path: ["isUpvoted"],
				})
			}
		}
	})

// =============================================================================
// GET Handler - Retrieve votes for a chat
// =============================================================================

/**
 * GET /api/votes?chatId=uuid
 * Get all votes for a chat that belong to the current user.
 *
 * Security:
 * - Requires authenticated user
 * - Rate limited to prevent abuse
 * - Only returns votes owned by the authenticated user
 */
export async function GET(request: Request) {
	try {
		const { userId, isAuthenticated } = await optionalAuth()

		if (!isAuthenticated || !userId) {
			return success([])
		}

		// Apply rate limiting for vote retrieval
		await requireRateLimit("api", userId)

		const { searchParams } = new URL(request.url)
		const chatId = searchParams.get("chatId")

		if (!chatId) {
			return error(
				new ValidationError("Missing chatId parameter", {
					field: "chatId",
				}),
			)
		}

		// Validate UUID format
		const parsed = voteQuerySchema.safeParse({ chatId })
		if (!parsed.success) {
			return error(
				new ValidationError("Invalid chatId format", {
					errors: parsed.error.flatten().fieldErrors,
				}),
			)
		}

		// Verify chat ownership before returning votes
		const chat = await chatRepository.findById(chatId)
		if (!chat) {
			throw new NotFoundError("Chat", chatId)
		}

		if (chat.userId !== userId) {
			throw new ForbiddenError("You do not have access to this chat")
		}

		// Get votes filtered by user ID for security
		const votes = await voteRepository.findByChatIdAndUserId(chatId, userId)

		return success(votes)
	} catch (err) {
		logError("Vote GET failed", err as Error)
		return error(err)
	}
}

// =============================================================================
// PATCH Handler - Create or update a vote
// =============================================================================

/**
 * PATCH /api/votes
 * Create or update a vote on a message.
 *
 * Security:
 * - Requires authenticated (non-guest) user
 * - Rate limited to prevent spam voting
 * - Verifies chat ownership
 * - Verifies message belongs to the chat
 *
 * Request body:
 * - chatId: UUID of the chat
 * - messageId: UUID of the message to vote on
 * - type: "up" for upvote, "down" for downvote
 *
 * Response:
 * - success: true
 * - messageId: UUID of the voted message
 * - type: "up" or "down"
 */
export async function PATCH(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Guest users cannot vote (requires database persistence)
		await requireNonGuest()

		// Apply rate limiting for voting (use strict limiter for write operations)
		await requireRateLimit("strict", userId)

		const body = await request.json()
		const parsed = voteBodySchema.safeParse(body)

		if (!parsed.success) {
			return error(
				new ValidationError("Invalid request body", {
					errors: parsed.error.flatten().fieldErrors,
				}),
			)
		}

		const { chatId, messageId, isUpvoted: isUpvotedInput } = parsed.data
		const type = parsed.data.type ?? (isUpvotedInput ? "up" : "down")
		const isUpvoted = type === "up"

		// Verify chat exists and user owns it
		const chat = await chatRepository.findById(chatId)
		if (!chat) {
			throw new NotFoundError("Chat", chatId)
		}

		if (chat.userId !== userId) {
			throw new ForbiddenError("You do not have access to this chat")
		}

		// Verify message belongs to the chat (prevents cross-chat vote injection)
		const chatWithMessages = await chatRepository.findWithMessages(chatId, {
			userId,
			isGuest: false,
		})

		if (!chatWithMessages) {
			throw new NotFoundError("Chat", chatId)
		}

		const messageExists = chatWithMessages.messages.some(
			(m) => m.id === messageId,
		)
		if (!messageExists) {
			throw new NotFoundError("Message", messageId)
		}

		// Create or update the vote
		await chatService.voteMessage(chatId, messageId, userId, isUpvoted)

		// Log successful vote
		logInfo("Message voted", {
			chatId,
			messageId,
			type,
			userId,
		})

		// Return response matching OLD format for client compatibility
		return Response.json(
			{ success: true, messageId, type },
			{ status: 200 },
		)
	} catch (err) {
		logError("Vote PATCH failed", err as Error, {
			operation: "vote",
		})
		return error(err)
	}
}
