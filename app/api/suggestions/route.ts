import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { getArtifactById } from "@/lib/data/artifact"
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
		return Response.json({ suggestions: [] })
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
		// IDOR check: verify the requesting user owns the artifact
		const artifact = await getArtifactById(parsed.data.artifactId)
		if (!artifact) {
			return AppError.notFound(
				"not_found:artifact:artifact_not_found",
				"Artifact not found",
			).toResponse()
		}
		if (artifact.userId !== session.user.id) {
			return AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied").toResponse()
		}

		const suggestions = await getSuggestionsByArtifactId(parsed.data.artifactId)
		return Response.json({ suggestions })
	} catch (error) {
		if (error instanceof AppError) {
			return error.toResponse()
		}
		return AppError.internal(
			"internal_error:database:query_failed",
			"Failed to fetch suggestions",
		).toResponse()
	}
}
