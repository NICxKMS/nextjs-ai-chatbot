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
	getArtifactVersion,
	rollbackToVersion,
	type UpdateArtifactParams,
	updateArtifact,
} from "@/features/artifact/actions"
import { getVersionHistory } from "@/features/artifact/actions/versions"
import {
	type ArtifactKind,
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

const ARTIFACT_CONTENT_TYPES: Record<ArtifactKind, string[]> = {
	text: ["text/plain", "text/markdown"],
	code: [
		"text/plain",
		"text/markdown",
		"application/javascript",
		"application/typescript",
	],
	image: ["image/*"],
	sheet: ["text/csv", "application/csv", "application/vnd.ms-excel"],
}

function normalizeMimeType(contentType: string | null): string | undefined {
	if (!contentType) {
		return undefined
	}

	return contentType.split(";")[0]?.trim().toLowerCase()
}

function resolveArtifactContentType(request: Request): string | undefined {
	const explicitArtifactType = normalizeMimeType(
		request.headers.get("x-artifact-content-type"),
	)

	if (explicitArtifactType) {
		return explicitArtifactType
	}

	const requestContentType = normalizeMimeType(
		request.headers.get("content-type"),
	)

	if (requestContentType && requestContentType !== "application/json") {
		return requestContentType
	}

	return undefined
}

function validateArtifactContentType(
	kind: ArtifactKind,
	artifactContentType: string | undefined,
): ValidationError | null {
	if (!artifactContentType) {
		return null
	}

	const allowedTypes = ARTIFACT_CONTENT_TYPES[kind]
	if (!allowedTypes) {
		return null
	}

	const isAllowed = allowedTypes.some((allowedType) => {
		if (allowedType.endsWith("/*")) {
			const prefix = allowedType.slice(0, -1)
			return artifactContentType.startsWith(prefix)
		}

		return artifactContentType === allowedType
	})

	if (isAllowed) {
		return null
	}

	return new ValidationError(
		`Content type '${artifactContentType}' is not compatible with artifact kind '${kind}'`,
		{
			field: "contentType",
			code: "artifact:content_type_mismatch",
			expected: allowedTypes,
			received: artifactContentType,
		},
	)
}

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
		if (!id) {
			return error(
				new ValidationError("Missing id parameter", {
					field: "id",
				}),
			)
		}

		// Validate UUID format
		if (!isValidUUID(id)) {
			return error(
				new ValidationError("Invalid id format: must be a valid UUID", {
					field: "id",
				}),
			)
		}

		const versionParam = searchParams.get("version")
		const versionTimestamp = versionParam
			? new Date(versionParam)
			: undefined

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

		const versions = versionTimestamp
			? await (async () => {
					const artifactVersion = await getArtifactVersion(
						id,
						versionTimestamp,
					)
					return artifactVersion ? [artifactVersion] : []
				})()
			: await getVersionHistory(id)
		if (!versions || versions.length === 0) {
			return notFound(
				versionTimestamp
					? "Artifact version not found"
					: "Artifact not found",
			)
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

		const { searchParams } = new URL(request.url)
		const idParam = searchParams.get("id")
		const versionParam = searchParams.get("version")
		if (idParam || versionParam) {
			if (!idParam || !versionParam) {
				return error(
					new ValidationError(
						"Both id and version are required for version-targeted POST requests",
						{
							field: !idParam ? "id" : "version",
						},
					),
				)
			}

			const uuidValidation = ArtifactUUIDSchema.safeParse(idParam)
			if (!uuidValidation.success) {
				return error(
					new ValidationError(
						"Invalid id format: must be a valid UUID",
						{
							field: "id",
						},
					),
				)
			}

			const parsedVersion = new Date(versionParam)
			if (Number.isNaN(parsedVersion.getTime())) {
				return error(
					new ValidationError("Invalid version timestamp format", {
						field: "version",
					}),
				)
			}

			const artifactContentType = normalizeMimeType(
				request.headers.get("x-artifact-content-type"),
			)

			const body = await validateBody(request, UpdateArtifactSchema)
			const baseVersion = await getArtifactVersion(idParam, parsedVersion)

			if (!baseVersion) {
				return notFound("Artifact version not found")
			}

			if (body.kind && body.kind !== baseVersion.kind) {
				return error(
					new ValidationError(
						`Cannot change artifact kind from '${baseVersion.kind}' to '${body.kind}'`,
						{
							field: "kind",
							code: "document:kind_mismatch",
							expected: baseVersion.kind,
							received: body.kind,
						},
					),
				)
			}

			const effectiveKind = (body.kind ??
				baseVersion.kind) as ArtifactKind
			const contentTypeValidation = validateArtifactContentType(
				effectiveKind,
				artifactContentType,
			)
			if (contentTypeValidation) {
				return error(contentTypeValidation)
			}

			const artifact = await updateArtifact(idParam, {
				title: body.title ?? baseVersion.title,
				content: body.content ?? baseVersion.content ?? "",
				kind: effectiveKind,
			})

			const response = success(artifact)
			response.headers.set(
				"X-Artifact-Version-Base",
				baseVersion.createdAt.toISOString(),
			)
			const headers = createRateLimitHeaders(rateLimitResult)
			headers.forEach((value, key) => {
				response.headers.set(key, value)
			})
			return response
		}

		const artifactContentType = resolveArtifactContentType(request)

		// Validate request body (P6-FNC-021)
		const body = await validateBody(request, CreateArtifactSchema)

		const contentTypeValidation = validateArtifactContentType(
			body.kind,
			artifactContentType,
		)
		if (contentTypeValidation) {
			return error(contentTypeValidation)
		}

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
		if (!id) {
			return error(
				new ValidationError("Missing id parameter", {
					field: "id",
				}),
			)
		}

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
		const artifactContentType = resolveArtifactContentType(request)

		const existingVersions = await getVersionHistory(id)
		if (!existingVersions || existingVersions.length === 0) {
			return notFound("Artifact not found")
		}

		const latestVersion = existingVersions[existingVersions.length - 1]

		const targetVersion = versionTimestamp
			? await getArtifactVersion(id, versionTimestamp)
			: null

		if (versionTimestamp && !targetVersion) {
			return notFound("Artifact version not found")
		}

		const updateBaseVersion = targetVersion ?? latestVersion
		if (!updateBaseVersion) {
			return notFound("Artifact not found")
		}

		// If kind is provided, validate it matches the existing artifact (P6-FNC-016)
		if (body.kind && updateBaseVersion.kind !== body.kind) {
			return error(
				new ValidationError(
					`Cannot change artifact kind from '${updateBaseVersion.kind}' to '${body.kind}'`,
					{
						field: "kind",
						code: "document:kind_mismatch",
						expected: updateBaseVersion.kind,
						received: body.kind,
					},
				),
			)
		}

		const effectiveKind = (body.kind ?? updateBaseVersion.kind) as
			| ArtifactKind
			| undefined
		if (effectiveKind) {
			const contentTypeValidation = validateArtifactContentType(
				effectiveKind,
				artifactContentType,
			)
			if (contentTypeValidation) {
				return error(contentTypeValidation)
			}
		}

		const updateParams: UpdateArtifactParams = versionTimestamp
			? {
					title: body.title ?? updateBaseVersion.title,
					content: body.content ?? updateBaseVersion.content ?? "",
					kind: body.kind ?? updateBaseVersion.kind,
				}
			: (() => {
					const params: UpdateArtifactParams = {}
					if (body.title !== undefined) params.title = body.title
					if (body.content !== undefined)
						params.content = body.content
					if (body.kind !== undefined) params.kind = body.kind
					return params
				})()

		const artifact = await updateArtifact(id, updateParams)

		const response = success(artifact)
		if (updateBaseVersion) {
			response.headers.set(
				"X-Artifact-Version-Base",
				updateBaseVersion.createdAt.toISOString(),
			)
		}
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
 * PUT /api/artifacts?id=uuid[&version=timestamp]
 * Compatibility alias for PATCH semantics.
 */
export async function PUT(request: Request) {
	return PATCH(request)
}

/**
 * DELETE /api/artifacts?id=uuid[&timestamp=iso]
 * Delete an artifact or rollback to a timestamp.
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
		if (!id) {
			return error(
				new ValidationError("Missing id parameter", {
					field: "id",
				}),
			)
		}
		const timestampParam = searchParams.get("timestamp")

		// Validate UUID format (P6-FNC-018)
		const uuidValidation = ArtifactUUIDSchema.safeParse(id)
		if (!uuidValidation.success) {
			return error(
				new ValidationError("Invalid id format: must be a valid UUID", {
					field: "id",
				}),
			)
		}

		if (timestampParam) {
			const timestamp = new Date(timestampParam)
			if (Number.isNaN(timestamp.getTime())) {
				return error(
					new ValidationError("Invalid timestamp format", {
						field: "timestamp",
					}),
				)
			}

			const deletedVersions = await rollbackToVersion(id, timestamp)

			const response = success(deletedVersions)
			const headers = createRateLimitHeaders(rateLimitResult)
			headers.forEach((value, key) => {
				response.headers.set(key, value)
			})
			return response
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
