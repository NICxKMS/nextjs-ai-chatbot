import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { rateLimitKeys } from "@/lib/cache/keys"
import { checkRateLimitWithInfo } from "@/lib/cache/rate-limit"
import { getChatsByUserId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"

const DEFAULT_LIMIT = 20
const MIN_LIMIT = 1
const MAX_LIMIT = 100

/** Rate limit: 30 GET requests per minute per user. */
const HISTORY_RATE_LIMIT = 30
const HISTORY_RATE_WINDOW_SECONDS = 60

const historyQuerySchema = z.object({
	limit: z.preprocess((value) => {
		if (typeof value !== "string" || value.length === 0) {
			return DEFAULT_LIMIT
		}

		const parsedLimit = Number.parseInt(value, 10)
		if (Number.isNaN(parsedLimit)) {
			return DEFAULT_LIMIT
		}

		return Math.min(Math.max(parsedLimit, MIN_LIMIT), MAX_LIMIT)
	}, z.number().int().min(MIN_LIMIT).max(MAX_LIMIT)),
	cursor: z.preprocess((value) => {
		if (typeof value !== "string") {
			return undefined
		}

		const cursor = value.trim()
		return cursor.length > 0 ? cursor : undefined
	}, z.string().optional()),
})

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	// Rate limit: 30 GET/min per user
	const rateLimit = await checkRateLimitWithInfo(
		rateLimitKeys.rateLimitHistory(session.user.id),
		HISTORY_RATE_LIMIT,
		HISTORY_RATE_WINDOW_SECONDS,
	)
	if (!rateLimit.allowed) {
		return AppError.rateLimited(
			"rate_limit:history:too_many_requests",
			"Too many history requests. Please try again later.",
			rateLimit.retryAfter,
		).toResponse()
	}

	const url = new URL(request.url)
	const parsedQuery = historyQuerySchema.safeParse({
		limit: url.searchParams.get("limit"),
		cursor: url.searchParams.get("cursor"),
	})

	if (!parsedQuery.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid history query parameters",
		).toResponse()
	}

	const { limit, cursor } = parsedQuery.data

	try {
		const result = await getChatsByUserId(session.user.id, { limit, cursor })

		return Response.json(
			{
				chats: result.chats,
				hasMore: result.hasMore,
				nextCursor: result.nextCursor,
			},
			{ headers: { "Cache-Control": "no-store" } },
		)
	} catch (error) {
		if (error instanceof AppError) {
			return error.toResponse()
		}
		return AppError.internal(
			"internal_error:database:query_failed",
			"Failed to fetch chat history",
		).toResponse()
	}
}
