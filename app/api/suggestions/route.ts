/**
 * Suggestions API Route
 *
 * Gets AI suggestions for artifacts. Delegates to feature actions.
 *
 * @module app/api/suggestions/route
 */

import { getSuggestions } from "@/features/artifact/actions"
import { error, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * GET /api/suggestions?artifactId=uuid
 * Get suggestions for an artifact.
 */
export async function GET(request: Request) {
	try {
		await requireAuthAction()

		const { searchParams } = new URL(request.url)
		const artifactId = searchParams.get("artifactId")

		if (!artifactId) {
			return error("Missing artifactId parameter")
		}

		const suggestions = await getSuggestions(artifactId)
		return success(suggestions)
	} catch (err) {
		return error(err)
	}
}
