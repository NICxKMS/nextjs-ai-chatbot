/**
 * Suggestions API Route
 *
 * Gets AI suggestions for artifacts with ownership verification.
 * Users can only access suggestions for artifacts in their own chats.
 *
 * @module app/api/suggestions/route
 */

import { z } from "zod"
import { error } from "@/lib/api"
import {
	isGuestSession,
	requireAuthAction,
	requireRateLimit,
} from "@/lib/auth/guards"
import {
	artifactRepository,
	suggestionRepository,
} from "@/lib/data/repositories"
import { ForbiddenError } from "@/lib/errors"
import { logError } from "@/lib/log"

const suggestionQuerySchema = z.object({
	artifactId: z.string().uuid(),
})

/**
 * GET /api/suggestions?artifactId=uuid
 * Get suggestions for an artifact.
 *
 * Security:
 * - Requires authentication
 * - Rate limited to prevent abuse (100 req/min)
 * - Guest users receive empty array (no persisted data)
 * - Verifies artifact exists
 * - Verifies user owns the chat the artifact belongs to
 * - Returns suggestions filtered by user ID
 *
 * Response:
 * - Returns array of suggestions directly (not wrapped)
 * - Includes Cache-Control header for 5-minute caching
 */
export async function GET(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check if user is a guest - return empty array for guests
		// Guest users don't have persisted suggestions
		if (await isGuestSession()) {
			return Response.json([], {
				status: 200,
				headers: {
					"Cache-Control": "private, max-age=300",
				},
			})
		}

		// Apply rate limiting (100 requests per minute for API endpoints)
		await requireRateLimit("api", userId)

		const { searchParams } = new URL(request.url)
		const artifactId = searchParams.get("artifactId")

		if (!artifactId) {
			return error("Missing artifactId parameter")
		}

		// Validate UUID format
		const parsed = suggestionQuerySchema.safeParse({ artifactId })
		if (!parsed.success) {
			return error("Invalid artifactId format")
		}

		// Create context for repository operations
		const ctx = { userId, isGuest: false }

		// Verify artifact exists and user has access to it
		const artifact = await artifactRepository.findLatestVersion(
			artifactId,
			ctx,
		)
		if (!artifact) {
			// Return empty array instead of 404 to avoid information disclosure
			// (matches OLD behavior for security)
			return Response.json([], {
				status: 200,
				headers: {
					"Cache-Control": "private, max-age=300",
				},
			})
		}

		// Verify user owns the artifact (artifact.userId matches the user)
		// Note: The artifact has userId field for direct ownership verification
		if (artifact.userId !== userId) {
			throw new ForbiddenError("You do not have access to this artifact")
		}

		// Get suggestions filtered by user ID for security
		const suggestions = await suggestionRepository.findByArtifactId(
			artifactId,
			ctx,
		)

		// Return suggestions array directly (not wrapped) for backward compatibility
		// Include Cache-Control header for 5-minute private caching
		return Response.json(suggestions, {
			status: 200,
			headers: {
				"Cache-Control": "private, max-age=300",
			},
		})
	} catch (err) {
		logError("Suggestions GET failed", err as Error)
		return error(err)
	}
}
