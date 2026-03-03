import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { getSuggestionsByArtifactId } from "@/lib/data/suggestion"
import { AppError } from "@/lib/errors/app-error"

const querySchema = z.object({
	artifactId: z.string().uuid(),
})

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:auth:no_session").toResponse()
	}

	// Guest users: suggestions are not persisted, return empty array
	if (session.user.type === "guest") {
		return Response.json([])
	}

	const url = new URL(request.url)
	const parsed = querySchema.safeParse({
		artifactId: url.searchParams.get("artifactId"),
	})

	if (!parsed.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid or missing artifactId query parameter",
		).toResponse()
	}

	try {
		const suggestions = await getSuggestionsByArtifactId(parsed.data.artifactId)
		return Response.json(suggestions)
	} catch {
		return AppError.internal(
			"internal_error:database:query_failed",
			"Failed to fetch suggestions",
		).toResponse()
	}
}
