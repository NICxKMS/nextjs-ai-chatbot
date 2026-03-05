import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { getChatsByUserId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"

const DEFAULT_LIMIT = 20

const historyQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(DEFAULT_LIMIT),
	cursor: z.string().optional(),
})

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	const url = new URL(request.url)

	const parsed = historyQuerySchema.safeParse({
		limit: url.searchParams.get("limit") ?? undefined,
		cursor: url.searchParams.get("cursor") ?? undefined,
	})

	if (!parsed.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid query parameters",
		).toResponse()
	}

	const { limit, cursor } = parsed.data

	try {
		const result = await getChatsByUserId(session.user.id, { limit, cursor })

		return Response.json({
			chats: result.chats,
			hasMore: result.hasMore,
			nextCursor: result.nextCursor,
		})
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
