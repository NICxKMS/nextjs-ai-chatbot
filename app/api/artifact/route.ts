import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { refreshArtifact } from "@/lib/cache/revalidate"
import {
	deleteArtifactVersion,
	getArtifactById,
	getArtifactVersions,
	saveArtifactVersion,
} from "@/lib/data/artifact"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactKind } from "@/lib/types/models.types"

// ── Zod schemas for POST body ───────────────────────────────

const saveBodySchema = z.object({
	mode: z.literal("save"),
	id: z.string().uuid(),
	title: z.string().min(1).max(200),
	content: z.string(),
	kind: z.enum(["text", "code", "image", "sheet"]),
	chatId: z.string().uuid(),
})

const restoreBodySchema = z.object({
	mode: z.literal("restore"),
	id: z.string().uuid(),
	timestamp: z.string().datetime(),
})

const postBodySchema = z.discriminatedUnion("mode", [saveBodySchema, restoreBodySchema])

// ── GET /api/artifact?id= — Fetch all versions ─────────────

export async function GET(request: Request) {
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:chat:auth_required").toResponse()
	}

	const url = new URL(request.url)
	const artifactId = url.searchParams.get("id")

	if (!artifactId) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Missing required query parameter: id",
		).toResponse()
	}

	const uuidResult = z.string().uuid().safeParse(artifactId)
	if (!uuidResult.success) {
		return AppError.badRequest(
			"bad_request:validation:invalid_input",
			"Invalid artifact id format",
		).toResponse()
	}

	try {
		const latest = await getArtifactById(artifactId)
		if (!latest) {
			return AppError.notFound(
				"not_found:artifact:artifact_not_found",
				"Artifact not found",
			).toResponse()
		}

		if (latest.userId !== session.user.id) {
			return AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied").toResponse()
		}

		const versions = await getArtifactVersions(artifactId)

		return Response.json(versions, { status: 200 })
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

	const parsed = postBodySchema.safeParse(body)
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

async function handleSave(data: z.infer<typeof saveBodySchema>, userId: string): Promise<Response> {
	// Ownership check: if artifact already exists, verify the user owns it
	const existing = await getArtifactById(data.id)
	if (existing && existing.userId !== userId) {
		throw AppError.forbidden("forbidden:chat:owner_mismatch", "Access denied")
	}

	const artifact = await saveArtifactVersion({
		id: data.id,
		title: data.title,
		content: data.content,
		kind: data.kind as ArtifactKind,
		userId,
		chatId: data.chatId,
	})

	refreshArtifact(artifact.id)

	return Response.json({ artifact }, { status: 200 })
}

// ── Restore mode ────────────────────────────────────────────

async function handleRestore(
	data: z.infer<typeof restoreBodySchema>,
	userId: string,
): Promise<Response> {
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

	refreshArtifact(data.id)

	return Response.json({ success: true }, { status: 200 })
}
