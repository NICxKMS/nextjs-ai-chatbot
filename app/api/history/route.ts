import { getAppSession } from "@/lib/auth/session"
import { getChatsByUserId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"

const DEFAULT_LIMIT = 20
const MIN_LIMIT = 1
const MAX_LIMIT = 100

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	const url = new URL(request.url)

	const rawLimit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)
	const limit = Number.isNaN(rawLimit)
		? DEFAULT_LIMIT
		: Math.min(Math.max(MIN_LIMIT, rawLimit), MAX_LIMIT)

	const cursor = url.searchParams.get("cursor") ?? undefined

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
