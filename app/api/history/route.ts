import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { getChatsByUserId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"

const DEFAULT_LIMIT = 20
const MIN_LIMIT = 1
const MAX_LIMIT = 100

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
			{ headers: { "Cache-Control": "private, no-cache" } },
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
