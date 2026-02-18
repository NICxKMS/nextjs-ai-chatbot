/**
 * Artifacts API Route
 *
 * CRUD operations for artifacts. Delegates to feature actions.
 * Rate limited to prevent abuse.
 *
 * @module app/api/artifacts/route
 */

import {
	createArtifact,
	deleteArtifact,
	type UpdateArtifactParams,
	updateArtifact,
} from "@/features/artifact/actions"
import { getVersionHistory } from "@/features/artifact/actions/versions"
import {
	ArtifactUUIDSchema,
	CreateArtifactSchema,
	UpdateArtifactSchema,
} from "@/features/artifact/schemas/artifact.schema"
import {
	error,
	isValidUUID,
	notFound,
	rateLimit,
	success,
	validateBody,
} from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import { ValidationError } from "@/lib/errors"
import {
	checkApiLimit,
	checkStrictLimit,
	createRateLimitHeaders,
	getRetryAfter,
} from "@/lib/rate-limit"

/**
 * GET /api/artifacts?id=uuid
 * Fetch all versions of an artifact by ID.
 * Returns array of artifact versions (chronologically ordered).
 * Rate limited: 100 requests per minute per user.
 */
export async function GET(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check rate limit
		const rateLimitResult = await checkApiLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		// Validate UUID format
		if (!isValidUUID(id)) {
			return error("Invalid id format: must be a valid UUID")
		}

		// Get all versions of the artifact
		const versions = await getVersionHistory(id)
		if (!versions || versions.length === 0) {
			return notFound("Artifact not found")
		}

		// Return array of versions with cache headers (matching OLD behavior)
		const response = success(versions)
		response.headers.set("Cache-Control", "private, max-age=60")
		const headers = createRateLimitHeaders(rateLimitResult)
		headers.forEach((value, key) => {
			response.headers.set(key, value)
		})
		return response
	} catch (err) {
		return error(err)
	}
}

/**
 * POST /api/artifacts
 * Create a new artifact.
 * Rate limited: 100 requests per minute per user.
 *
 * Body:
 * - chatId: UUID of the chat this artifact belongs to (required)
 * - title: Artifact title, 1-500 chars (required)
 * - kind: Artifact kind - "text" | "code" | "image" | "sheet" (required)
 * - content: Artifact content, max 1MB (optional, defaults to "")
 */
export async function POST(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check rate limit
		const rateLimitResult = await checkApiLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		// Validate request body (P6-FNC-021)
		const body = await validateBody(request, CreateArtifactSchema)
		// Ensure content has a default value for the action
		const artifact = await createArtifact({
			chatId: body.chatId,
			title: body.title,
			kind: body.kind,
			content: body.content ?? "",
		})

		const response = success(artifact)
		const headers = createRateLimitHeaders(rateLimitResult)
		headers.forEach((value, key) => {
			response.headers.set(key, value)
		})
		return response
	} catch (err) {
		return error(err)
	}
}

/**
 * PATCH /api/artifacts?id=uuid[&version=timestamp]
 * Update an existing artifact.
 * Rate limited: 100 requests per minute per user.
 *
 * Query Parameters:
 * - id: Artifact UUID (required)
 * - version: ISO timestamp for specific version to update from (optional)
 *
 * Body:
 * - title: New title (optional)
 * - content: New content (optional)
 * - kind: New kind (optional, must match existing kind)
 */
export async function PATCH(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check rate limit
		const rateLimitResult = await checkApiLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		// Validate UUID format (P6-FNC-018)
		const uuidValidation = ArtifactUUIDSchema.safeParse(id)
		if (!uuidValidation.success) {
			return error(
				new ValidationError("Invalid id format: must be a valid UUID", {
					field: "id",
				}),
			)
		}

		// Parse optional version parameter for version-specific updates
		const versionParam = searchParams.get("version")
		const versionTimestamp = versionParam
			? new Date(versionParam)
			: undefined

		// Validate version timestamp if provided
		if (
			versionParam &&
			versionTimestamp &&
			Number.isNaN(versionTimestamp.getTime())
		) {
			return error(
				new ValidationError("Invalid version timestamp format", {
					field: "version",
				}),
			)
		}

		// Validate request body (P6-FNC-021)
		const body = await validateBody(request, UpdateArtifactSchema)

		// If kind is provided, validate it matches the existing artifact (P6-FNC-016)
		if (body.kind) {
			// Get existing artifact to check kind mismatch
			const existingVersions = await getVersionHistory(id)
			if (existingVersions && existingVersions.length > 0) {
				const latestVersion =
					existingVersions[existingVersions.length - 1]
				if (latestVersion && latestVersion.kind !== body.kind) {
					return error(
						new ValidationError(
							`Cannot change artifact kind from '${latestVersion.kind}' to '${body.kind}'`,
							{
								field: "kind",
								code: "document:kind_mismatch",
								expected: latestVersion.kind,
								received: body.kind,
							},
						),
					)
				}
			}
		}

		// If version timestamp is provided, we need to update from that specific version
		// Currently the updateArtifact action always uses the latest version
		// For now, we pass the id and params - version support can be enhanced in the action
		// Build params object with only defined values (P6-FNC-021)
		const updateParams: UpdateArtifactParams = {}
		if (body.title !== undefined) updateParams.title = body.title
		if (body.content !== undefined) updateParams.content = body.content
		if (body.kind !== undefined) updateParams.kind = body.kind

		const artifact = await updateArtifact(id, updateParams)

		const response = success(artifact)
		const headers = createRateLimitHeaders(rateLimitResult)
		headers.forEach((value, key) => {
			response.headers.set(key, value)
		})
		return response
	} catch (err) {
		return error(err)
	}
}

/**
 * DELETE /api/artifacts?id=uuid
 * Delete an artifact.
 * Rate limited: 10 requests per minute per user (strict for destructive operations).
 */
export async function DELETE(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check strict rate limit for destructive operation
		const rateLimitResult = await checkStrictLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		// Validate UUID format (P6-FNC-018)
		const uuidValidation = ArtifactUUIDSchema.safeParse(id)
		if (!uuidValidation.success) {
			return error(
				new ValidationError("Invalid id format: must be a valid UUID", {
					field: "id",
				}),
			)
		}

		const deleted = await deleteArtifact(id)

		const response = success({ deleted })
		const headers = createRateLimitHeaders(rateLimitResult)
		headers.forEach((value, key) => {
			response.headers.set(key, value)
		})
		return response
	} catch (err) {
		return error(err)
	}
}
