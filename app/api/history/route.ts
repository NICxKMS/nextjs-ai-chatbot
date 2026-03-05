import { getAppSession } from "@/lib/auth/session"
import { getChatsByUserId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"

const DEFAULT_LIMIT = 20
const MIN_LIMIT = 1
const MAX_LIMIT = 100

function resolveLimit(searchParams: URLSearchParams): number {
	const rawLimit = searchParams.get("limit")
	if (!rawLimit) {
		return DEFAULT_LIMIT
	}

	const parsedLimit = Number.parseInt(rawLimit, 10)
	if (Number.isNaN(parsedLimit)) {
		return DEFAULT_LIMIT
	}

	return Math.min(Math.max(parsedLimit, MIN_LIMIT), MAX_LIMIT)
}

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	const url = new URL(request.url)
	const limit = resolveLimit(url.searchParams)
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
