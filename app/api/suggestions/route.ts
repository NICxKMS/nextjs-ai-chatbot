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
import { ForbiddenError, ValidationError } from "@/lib/errors"
import { logError } from "@/lib/log"

const suggestionQuerySchema = z
	.object({
		artifactId: z.string().uuid().optional(),
		documentId: z.string().uuid().optional(),
		documentVersion: z.string().optional(),
		legacy: z
			.preprocess(
				(value) => value === "1" || value === "true" || value === true,
				z.boolean(),
			)
			.optional()
			.default(false),
	})
	.superRefine((query, ctx) => {
		if (!query.artifactId && !query.documentId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "artifactId (or documentId alias) is required",
				path: ["artifactId"],
			})
		}

		if (
			query.artifactId &&
			query.documentId &&
			query.artifactId !== query.documentId
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"artifactId and documentId must match when both are provided",
				path: ["documentId"],
			})
		}

		if (
			query.documentVersion &&
			Number.isNaN(new Date(query.documentVersion).getTime())
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "documentVersion must be a valid timestamp",
				path: ["documentVersion"],
			})
		}
	})

/**
 * GET /api/suggestions?artifactId=uuid[&documentVersion=iso][&legacy=1]
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
 * - Default: { suggestions: [...], metadata: { artifactId, total, documentVersion } }
 * - Legacy mode: array of suggestions when `legacy=1`
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
		const parsed = suggestionQuerySchema.safeParse({
			artifactId: searchParams.get("artifactId") ?? undefined,
			documentId: searchParams.get("documentId") ?? undefined,
			documentVersion: searchParams.get("documentVersion") ?? undefined,
			legacy: searchParams.get("legacy") ?? undefined,
		})
		if (!parsed.success) {
			return error(
				new ValidationError("Invalid suggestion query parameters", {
					errors: parsed.error.flatten().fieldErrors,
				}),
			)
		}

		const artifactId = parsed.data.artifactId ?? parsed.data.documentId
		if (!artifactId) {
			return error(
				new ValidationError("artifactId is required", {
					field: "artifactId",
				}),
			)
		}

		const versionTimestamp = parsed.data.documentVersion
			? new Date(parsed.data.documentVersion)
			: undefined
		const legacyResponse = parsed.data.legacy

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

		const filteredSuggestions = versionTimestamp
			? suggestions.filter(
					(suggestion) =>
						suggestion.artifactCreatedAt.getTime() ===
						versionTimestamp.getTime(),
				)
			: suggestions

		if (legacyResponse) {
			return Response.json(filteredSuggestions, {
				status: 200,
				headers: {
					"Cache-Control": "private, max-age=300",
				},
			})
		}

		return Response.json(
			{
				suggestions: filteredSuggestions,
				metadata: {
					artifactId,
					total: filteredSuggestions.length,
					documentVersion: versionTimestamp?.toISOString() ?? null,
				},
			},
			{
				status: 200,
				headers: {
					"Cache-Control": "private, max-age=300",
				},
			},
		)
	} catch (err) {
		logError("Suggestions GET failed", err as Error)
		return error(err)
	}
}
