import { put } from "@vercel/blob"

import { getAppSession } from "@/lib/auth/session"
import { rateLimitKeys } from "@/lib/cache/keys"
import { checkRateLimit } from "@/lib/cache/rate-limit"
import { AppError } from "@/lib/errors/app-error"
import { validateOrigin } from "@/lib/utils/validate-origin"

export const maxDuration = 30

// ── Constants ──────────────────────────────────────────────────

/** Maximum file size: 5 MB. */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Rate limit: 10 uploads per hour. */
const UPLOAD_RATE_LIMIT = 10

/** Rate limit window: 1 hour in seconds. */
const UPLOAD_RATE_WINDOW_SECONDS = 3600

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

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
 * Check upload rate limit using shared utility.
 * Returns true if allowed, false if exceeded.
 */
async function checkUploadRateLimit(userId: string): Promise<boolean> {
	const key = rateLimitKeys.rateLimitUpload(userId)
	return checkRateLimit(key, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_SECONDS)
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
	return signature.every((value, index) => bytes[index] === value)
}

function isValidImageSignature(bytes: Uint8Array, contentType: string): boolean {
	switch (contentType) {
		case "image/png":
			return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
		case "image/jpeg":
			return startsWith(bytes, [0xff, 0xd8, 0xff])
		case "image/gif":
			return startsWith(bytes, [0x47, 0x49, 0x46, 0x38])
		case "image/webp":
			return (
				startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
				bytes[8] === 0x57 &&
				bytes[9] === 0x45 &&
				bytes[10] === 0x42 &&
				bytes[11] === 0x50
			)
		default:
			return false
	}
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

	// 4. Validate file (size + type) — explicit checks for precise error codes
	if (file.size === 0) {
		return AppError.badRequest("bad_request:api:no_file_uploaded", "File is empty").toResponse()
	}
	if (file.size > MAX_FILE_SIZE) {
		return AppError.badRequest(
			"bad_request:api:file_too_large",
			`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
		).toResponse()
	}
	const contentType = file.type
	if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
		return AppError.badRequest(
			"bad_request:api:file_type_unsupported",
			"Only image files are accepted",
		).toResponse()
	}

	const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
	if (!isValidImageSignature(headerBytes, contentType)) {
		return AppError.badRequest(
			"bad_request:api:file_type_unsupported",
			"File content does not match a supported image type",
		).toResponse()
	}

	// 5. Upload to Vercel Blob
	const hasName = "name" in file && typeof (file as File).name === "string"
	const rawFilename =
		hasName && (file as File).name ? (file as File).name : `upload-${Date.now()}`
	const filename = sanitizeFilename(rawFilename)

	try {
		const blob = await put(`uploads/${filename}`, file, {
			access: "public",
			contentType,
		})

		// 6. Return result
		return Response.json(
			{ url: blob.url, pathname: blob.pathname, contentType },
			{ headers: { "Cache-Control": "no-store" } },
		)
	} catch {
		return AppError.serviceUnavailable(
			"offline:upload:storage_unavailable",
			"File upload service unavailable",
		).toResponse()
	}
}
