import {
	artifactPostBodySchema,
	getArtifactSchema,
	type RestoreArtifactInput,
	type SaveArtifactInput,
} from "@/features/artifacts/schemas/artifact.schema"
import { getAppSession } from "@/lib/auth/session"
import {
	deleteArtifactVersion,
	getArtifactById,
	getArtifactVersions,
	saveArtifactVersion,
} from "@/lib/data/artifact"
import { AppError } from "@/lib/errors/app-error"
import { validateOrigin } from "@/lib/utils/validate-origin"

// ── GET /api/artifact?id= — Fetch all versions ─────────────

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
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

		const versions = await getArtifactVersions(id)
		const latest = versions[0] ?? (await getArtifactById(id))
		if (!latest) {
			return AppError.notFound(
				"not_found:artifact:artifact_not_found",
				"Artifact not found",
			).toResponse()
		}

		if (latest.userId !== session.user.id) {
			return AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied").toResponse()
		}

		return Response.json(versions.length > 0 ? versions : [latest], {
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

	const artifact = await saveArtifactVersion({
		id: data.id,
		title: data.title,
		content: data.content,
		kind: data.kind,
		userId,
		chatId: data.chatId,
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

	// Delete all versions strictly AFTER the restore point
	const restorePoint = new Date(data.timestamp)
	const afterRestore = new Date(restorePoint.getTime() + 1)
	await deleteArtifactVersion(data.id, afterRestore)

	return Response.json(
		{ success: true },
		{
			headers: { "Cache-Control": "no-store" },
		},
	)
}
