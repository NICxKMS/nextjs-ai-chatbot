import {
	artifactPostBodySchema,
	getArtifactSchema,
	type RestoreArtifactInput,
	type SaveArtifactInput,
} from "@/features/artifacts/schemas/artifact.schema"
import { getAppSession } from "@/lib/auth/session"
import { rateLimitKeys } from "@/lib/cache/keys"
import { checkRateLimitWithInfo } from "@/lib/cache/rate-limit"
import {
	deleteArtifactVersionsAfter,
	getArtifactById,
	getArtifactOwnerId,
	getArtifactVersions,
	saveArtifactVersion,
} from "@/lib/data/artifact"
import { getChatOwnerId } from "@/lib/data/chat"
import { AppError } from "@/lib/errors/app-error"
import { validateOrigin } from "@/lib/utils/validate-origin"

export const maxDuration = 10

// ── Rate limit constants ────────────────────────────────────

const ARTIFACT_GET_RATE_LIMIT = 60
const ARTIFACT_GET_RATE_WINDOW_SECONDS = 60
const ARTIFACT_POST_RATE_LIMIT = 30
const ARTIFACT_POST_RATE_WINDOW_SECONDS = 60

// ── GET /api/artifact?id= — Fetch all versions ─────────────

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	// Rate limit: 60 GET requests per minute per user
	const rateLimit = await checkRateLimitWithInfo(
		rateLimitKeys.rateLimitArtifact(session.user.id),
		ARTIFACT_GET_RATE_LIMIT,
		ARTIFACT_GET_RATE_WINDOW_SECONDS,
	)
	if (!rateLimit.allowed) {
		return AppError.rateLimited(
			"rate_limit:artifact:too_many_requests",
			"Too many artifact requests. Please try again later.",
			rateLimit.retryAfter,
		).toResponse()
	}

	const url = new URL(request.url)
	const parsed = getArtifactSchema.safeParse({
		id: url.searchParams.get("id"),
		view: url.searchParams.get("view") ?? undefined,
	})
	if (!parsed.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid or missing artifact query parameters",
		).toResponse()
	}

	const { id, view = "versions" } = parsed.data

	try {
		if (view === "latest") {
			const latest = await getArtifactById(id)
			if (!latest) {
				return AppError.notFound(
					"not_found:artifact:artifact_not_found",
					"Artifact not found",
				).toResponse()
			}

			if (latest.userId !== session.user.id) {
				return AppError.forbidden(
					"forbidden:chat:owner_mismatch",
					"Access denied",
				).toResponse()
			}

			return Response.json([latest], {
				headers: { "Cache-Control": "private, max-age=10" },
			})
		}

		const ownerId = await getArtifactOwnerId(id)
		if (!ownerId) {
			return AppError.notFound(
				"not_found:artifact:artifact_not_found",
				"Artifact not found",
			).toResponse()
		}

		if (ownerId !== session.user.id) {
			return AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied").toResponse()
		}

		const versions = await getArtifactVersions(id)

		return Response.json(versions, {
			headers: { "Cache-Control": "private, max-age=10" },
		})
	} catch (error) {
		if (error instanceof AppError) {
			return error.toResponse()
		}
		return AppError.internal(
			"internal_error:database:query_failed",
			"Failed to fetch artifact versions",
		).toResponse()
	}
}

// ── POST /api/artifact — Save or restore artifact ───────────

export async function POST(request: Request) {
	// CSRF protection — validate Origin header
	if (!validateOrigin(request)) {
		return AppError.forbidden(
			"forbidden:api:csrf_failed",
			"Invalid request origin",
		).toResponse()
	}

	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	// Rate limit: 30 POST requests per minute per user
	const rateLimit = await checkRateLimitWithInfo(
		rateLimitKeys.rateLimitArtifact(session.user.id),
		ARTIFACT_POST_RATE_LIMIT,
		ARTIFACT_POST_RATE_WINDOW_SECONDS,
	)
	if (!rateLimit.allowed) {
		return AppError.rateLimited(
			"rate_limit:artifact:too_many_requests",
			"Too many artifact requests. Please try again later.",
			rateLimit.retryAfter,
		).toResponse()
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return AppError.badRequest(
			"bad_request:api:invalid_request_body",
			"Invalid JSON body",
		).toResponse()
	}

	const parsed = artifactPostBodySchema.safeParse(body)
	if (!parsed.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid request body",
		).toResponse()
	}

	try {
		if (parsed.data.mode === "save") {
			return await handleSave(parsed.data, session.user.id)
		}
		return await handleRestore(parsed.data, session.user.id)
	} catch (error) {
		if (error instanceof AppError) {
			return error.toResponse()
		}
		return AppError.internal(
			"internal_error:database:query_failed",
			"Failed to process artifact operation",
		).toResponse()
	}
}

// ── Save mode ───────────────────────────────────────────────

async function handleSave(data: SaveArtifactInput, userId: string): Promise<Response> {
	// Ownership check: if artifact already exists, verify the user owns it
	const existing = await getArtifactById(data.id)
	if (existing && existing.userId !== userId) {
		throw AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied")
	}
	if (!existing) {
		const chatOwnerId = await getChatOwnerId(data.chatId)
		if (!chatOwnerId) {
			throw AppError.notFound("not_found:chat:chat_not_found", "Chat not found")
		}
		if (chatOwnerId !== userId) {
			throw AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied")
		}
	}

	const artifactKind = existing?.kind ?? data.kind
	const artifactChatId = existing?.chatId ?? data.chatId

	const artifact = await saveArtifactVersion({
		id: data.id,
		title: data.title,
		content: data.content,
		kind: artifactKind,
		userId,
		chatId: artifactChatId,
	})

	return Response.json(
		{ artifact },
		{
			headers: { "Cache-Control": "no-store" },
		},
	)
}

// ── Restore mode ────────────────────────────────────────────

async function handleRestore(data: RestoreArtifactInput, userId: string): Promise<Response> {
	const existing = await getArtifactById(data.id)
	if (!existing) {
		throw AppError.notFound("not_found:artifact:artifact_not_found", "Artifact not found")
	}
	if (existing.userId !== userId) {
		throw AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied")
	}

	// Delete all versions strictly AFTER the restore point (gt, not gte)
	const restorePoint = new Date(data.timestamp)
	await deleteArtifactVersionsAfter(data.id, restorePoint)

	return Response.json(
		{ success: true },
		{
			headers: { "Cache-Control": "no-store" },
		},
	)
}
