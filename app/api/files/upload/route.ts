import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getAppSession } from "@/lib/auth/session"
import { expire, incr } from "@/lib/cache/client"
import { rateLimitKeys } from "@/lib/cache/keys"
import { AppError } from "@/lib/errors/app-error"
import { validateOrigin } from "@/lib/utils/validate-origin"

// ── Constants ──────────────────────────────────────────────────

/** Maximum file size: 5 MB. */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Rate limit: 10 uploads per hour. */
const UPLOAD_RATE_LIMIT = 10

/** Rate limit window: 1 hour in seconds. */
const UPLOAD_RATE_WINDOW_SECONDS = 3600

/** Allowed image MIME type prefix. */
const ALLOWED_MIME_PREFIX = "image/"

// ── Validation ─────────────────────────────────────────────────

const fileUploadSchema = z.object({
	file: z
		.instanceof(Blob)
		.refine((file) => file.size > 0, { message: "File is empty" })
		.refine((file) => file.size <= MAX_FILE_SIZE, {
			message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
		})
		.refine((file) => file.type.startsWith(ALLOWED_MIME_PREFIX), {
			message: "Only image files are accepted",
		}),
})

// ── Helpers ────────────────────────────────────────────────────

/**
 * Sanitize a filename to prevent path traversal and special character issues.
 * Removes path separators, replaces special chars, and limits length.
 */
function sanitizeFilename(name: string): string {
	// Remove path separators and null bytes
	// biome-ignore lint/suspicious/noControlCharactersInRegex: null byte removal is intentional for security
	const stripped = name.replace(/[/\\:\x00]/g, "")

	const lastDot = stripped.lastIndexOf(".")
	const hasExtension = lastDot > 0 && lastDot < stripped.length - 1
	const extension = hasExtension ? stripped.slice(lastDot) : ""
	const baseName = hasExtension ? stripped.slice(0, lastDot) : stripped

	// Replace non-alphanumeric characters (except dash, underscore, dot) with underscore
	const cleanBase = baseName.replace(/[^a-zA-Z0-9._-]/g, "_")

	// Limit total length to 100 characters (including extension)
	const maxBaseLength = 100 - extension.length
	return cleanBase.slice(0, maxBaseLength) + extension
}

/**
 * Check upload rate limit using Redis. Returns true if allowed, false if exceeded.
 * Gracefully degrades (allows upload) if Redis is unavailable.
 */
async function checkUploadRateLimit(userId: string): Promise<boolean> {
	const key = rateLimitKeys.rateLimitUpload(userId)
	const count = await incr(key)

	if (count === null) {
		// Redis unavailable — allow upload (graceful degradation)
		return true
	}

	// Set TTL on first increment
	if (count === 1) {
		await expire(key, UPLOAD_RATE_WINDOW_SECONDS)
	}

	return count <= UPLOAD_RATE_LIMIT
}

// ── Route Handler ──────────────────────────────────────────────

export async function POST(request: Request) {
	// 0. CSRF protection — validate Origin header
	if (!validateOrigin(request)) {
		return AppError.forbidden(
			"forbidden:api:csrf_failed",
			"Invalid request origin",
		).toResponse()
	}

	// 1. Auth check
	const session = await getAppSession()
	if (!session?.user) {
		return AppError.unauthorized("unauthorized:auth:no_session").toResponse()
	}

	// 2. Rate limit check (10/hour)
	const withinLimit = await checkUploadRateLimit(session.user.id)
	if (!withinLimit) {
		return AppError.rateLimited(
			"rate_limit:upload:too_many_requests",
			"Upload limit exceeded. Try again later.",
		).toResponse()
	}

	// 3. Parse FormData and extract file
	let formData: FormData
	try {
		formData = await request.formData()
	} catch {
		return AppError.badRequest(
			"bad_request:api:invalid_request_body",
			"Invalid form data",
		).toResponse()
	}

	const file = formData.get("file")
	if (!(file instanceof Blob)) {
		return AppError.badRequest(
			"bad_request:api:no_file_uploaded",
			"No file provided in form data",
		).toResponse()
	}

	// 4. Validate file (size + type)
	const validation = fileUploadSchema.safeParse({ file })
	if (!validation.success) {
		const errorMessage = validation.error.errors.map((e) => e.message).join(", ")

		if (errorMessage.includes("size") || errorMessage.includes("less than")) {
			return AppError.badRequest("bad_request:api:file_too_large", errorMessage).toResponse()
		}

		return AppError.badRequest(
			"bad_request:api:file_type_unsupported",
			errorMessage,
		).toResponse()
	}

	// 5. Upload to Vercel Blob
	const hasName = "name" in file && typeof (file as File).name === "string"
	const rawFilename =
		hasName && (file as File).name ? (file as File).name : `upload-${Date.now()}`
	const filename = sanitizeFilename(rawFilename)
	const contentType = file.type || "application/octet-stream"

	try {
		const blob = await put(filename, file, {
			access: "public",
			contentType,
		})

		// 6. Return result
		return NextResponse.json({
			url: blob.url,
			pathname: blob.pathname,
			contentType,
		})
	} catch {
		return AppError.badRequest(
			"bad_request:api:invalid_request_body",
			"File upload failed",
		).toResponse()
	}
}
