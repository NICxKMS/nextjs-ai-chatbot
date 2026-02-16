/**
 * Artifacts API Route
 *
 * CRUD operations for artifacts. Delegates to feature actions.
 *
 * @module app/api/artifacts/route
 */

import {
	createArtifact,
	deleteArtifact,
	getArtifact,
	type UpdateArtifactParams,
	updateArtifact,
} from "@/features/artifact/actions"
import { error, notFound, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"

/**
 * GET /api/artifacts?id=uuid
 * Fetch artifact by ID.
 */
export async function GET(request: Request) {
	try {
		await requireAuthAction()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		const artifact = await getArtifact(id)
		if (!artifact) return notFound("Artifact not found")
		return success(artifact)
	} catch (err) {
		return error(err)
	}
}

/**
 * POST /api/artifacts
 * Create a new artifact.
 */
export async function POST(request: Request) {
	try {
		await requireAuthAction()
		const body = await request.json()
		const artifact = await createArtifact(body)
		return success(artifact)
	} catch (err) {
		return error(err)
	}
}

/**
 * PATCH /api/artifacts
 * Update an existing artifact.
 */
export async function PATCH(request: Request) {
	try {
		await requireAuthAction()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		const body = (await request.json()) as UpdateArtifactParams
		const artifact = await updateArtifact(id, body)
		return success(artifact)
	} catch (err) {
		return error(err)
	}
}

/**
 * DELETE /api/artifacts?id=uuid
 * Delete an artifact.
 */
export async function DELETE(request: Request) {
	try {
		await requireAuthAction()
		const { searchParams } = new URL(request.url)
		const id = searchParams.get("id")
		if (!id) return error("Missing id parameter")

		const deleted = await deleteArtifact(id)
		return success({ deleted })
	} catch (err) {
		return error(err)
	}
}
