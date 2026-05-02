import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { rateLimitKeys } from "@/lib/cache/keys"
import { checkRateLimitWithInfo } from "@/lib/cache/rate-limit"
import { getArtifactById, getArtifactByIdAndCreatedAt } from "@/lib/data/artifact"
import { getSuggestionsByArtifactVersion } from "@/lib/data/suggestion"
import { AppError } from "@/lib/errors/app-error"

/** Rate limit: 60 GET requests per minute per user. */
const SUGGESTIONS_RATE_LIMIT = 60
const SUGGESTIONS_RATE_WINDOW_SECONDS = 60

const querySchema = z.object({
	artifactId: z.string().uuid(),
	artifactCreatedAt: z.string().datetime().optional(),
})

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:auth:no_session").toResponse()
	}

	// Rate limit: 60 GET/min per user
	const rateLimit = await checkRateLimitWithInfo(
		rateLimitKeys.rateLimitSuggestions(session.user.id),
		SUGGESTIONS_RATE_LIMIT,
		SUGGESTIONS_RATE_WINDOW_SECONDS,
	)
	if (!rateLimit.allowed) {
		return AppError.rateLimited(
			"rate_limit:suggestions:too_many_requests",
			"Too many suggestion requests. Please try again later.",
			rateLimit.retryAfter,
		).toResponse()
	}

	// Guest users: suggestions are not persisted, return empty array
	if (session.user.type === "guest") {
		return Response.json(
			{ suggestions: [] },
			{
				headers: { "Cache-Control": "private, max-age=30" },
			},
		)
	}

	const url = new URL(request.url)
	const parsed = querySchema.safeParse({
		artifactId: url.searchParams.get("artifactId"),
		artifactCreatedAt: url.searchParams.get("artifactCreatedAt") ?? undefined,
	})

	if (!parsed.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid suggestion query parameters",
		).toResponse()
	}

	try {
		const artifactCreatedAt = parsed.data.artifactCreatedAt
			? new Date(parsed.data.artifactCreatedAt)
			: undefined

		// IDOR check: verify the requesting user owns the artifact
		const artifact = artifactCreatedAt
			? await getArtifactByIdAndCreatedAt(parsed.data.artifactId, artifactCreatedAt)
			: await getArtifactById(parsed.data.artifactId)
		if (!artifact) {
			return AppError.notFound(
				"not_found:artifact:artifact_not_found",
				"Artifact not found",
			).toResponse()
		}
		if (artifact.userId !== session.user.id) {
			return AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied").toResponse()
		}

		const suggestions = await getSuggestionsByArtifactVersion(artifact.id, artifact.createdAt)
		return Response.json(
			{ suggestions },
			{
				headers: { "Cache-Control": "private, max-age=30" },
			},
		)
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
