/**
 * File Upload API Route
 *
 * Handles file uploads via multipart form data. Uses Vercel Blob storage.
 *
 * @module app/api/files/upload/route
 */

import { randomUUID } from "node:crypto"
import { put } from "@vercel/blob"
import { error, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import { ValidationError } from "@/lib/errors"

/** Maximum file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed file types */
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"text/plain",
	"text/markdown",
]

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(name: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: null byte removal for security
	const sanitized = name.replace(/[/\\:\x00]/g, "")
	const lastDot = sanitized.lastIndexOf(".")
	const hasExtension = lastDot > 0 && lastDot < sanitized.length - 1
	const extension = hasExtension ? sanitized.slice(lastDot) : ""
	const baseName = hasExtension ? sanitized.slice(0, lastDot) : sanitized
	const cleanBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_")
	const maxBaseLength = 100 - extension.length
	const truncatedBase = cleanBaseName.slice(0, maxBaseLength)
	return truncatedBase + extension
}

/**
 * POST /api/files/upload
 * Upload a file to Vercel Blob storage.
 */
export async function POST(request: Request) {
	try {
		await requireAuthAction()

		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			throw new ValidationError("File storage not configured")
		}

		const formData = await request.formData()
		const file = formData.get("file")

		if (!(file instanceof Blob)) {
			throw new ValidationError("No file uploaded")
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			throw new ValidationError("File size exceeds 10MB limit")
		}

		// Validate file type
		const contentType = file.type || "application/octet-stream"
		if (!ALLOWED_TYPES.includes(contentType)) {
			throw new ValidationError(`Unsupported file type: ${contentType}`)
		}

		// Sanitize filename
		const rawFilename =
			file instanceof File && file.name
				? file.name
				: `upload-${randomUUID()}`
		const filename = sanitizeFilename(rawFilename)

		// Upload to Vercel Blob
		const blob = await put(filename, file, {
			access: "public",
			contentType,
			token: process.env.BLOB_READ_WRITE_TOKEN,
		})

		return success({
			url: blob.url,
			pathname: blob.pathname,
			contentType,
			filename,
		})
	} catch (err) {
		return error(err)
	}
}
