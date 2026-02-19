/**
 * File Upload API Route
 *
 * Handles file uploads via multipart form data. Uses Vercel Blob storage.
 * Rate limited to 10 uploads per hour per user to prevent abuse.
 *
 * Uses centralized file validation from lib/utils/file-validation.ts for:
 * - MIME type validation (16 explicit types + image/audio/video prefixes)
 * - File size limits (5MB for attachments)
 * - Filename sanitization (path traversal prevention)
 *
 * @module app/api/files/upload/route
 */

import { randomUUID } from "node:crypto"
import { put } from "@vercel/blob"
import { error, rateLimit, success } from "@/lib/api"
import { requireAuthAction } from "@/lib/auth/guards"
import { ValidationError } from "@/lib/errors"
import {
	checkUploadLimit,
	createRateLimitHeaders,
	getRetryAfter,
} from "@/lib/rate-limit"
import {
	ATTACHMENT_MAX_FILE_SIZE,
	validateAttachment,
} from "@/lib/utils/file-validation"

/**
 * POST /api/files/upload
 * Upload a file to Vercel Blob storage.
 * Rate limited to 10 uploads per hour per user.
 */
export async function POST(request: Request) {
	try {
		const userId = await requireAuthAction()

		// Check rate limit before processing upload
		const rateLimitResult = await checkUploadLimit(userId)
		if (!rateLimitResult.success) {
			const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
			return rateLimit(retryAfterSeconds)
		}

		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			throw new ValidationError("File storage not configured")
		}

		const formData = await request.formData()
		const file = formData.get("file")

		if (!(file instanceof Blob)) {
			throw new ValidationError("No file uploaded")
		}

		// Convert Blob to File if needed for validation
		const blobFile = file as Blob
		const fileToValidate: File =
			file instanceof File
				? file
				: new File([blobFile], `upload-${randomUUID()}`, {
						type: blobFile.type || "application/octet-stream",
					})

		// Validate file using centralized validation utilities
		const validationResult = await validateAttachment({
			file: fileToValidate,
			maxSize: ATTACHMENT_MAX_FILE_SIZE,
		})

		if (!validationResult.valid) {
			const errorMessage = validationResult.errors.join("; ")

			// Return appropriate HTTP status codes based on error type
			// 413 Payload Too Large for file size errors
			if (!validationResult.size.valid) {
				return error(new ValidationError(errorMessage), { status: 413 })
			}

			// 415 Unsupported Media Type for MIME type errors
			if (!validationResult.type.valid) {
				return error(new ValidationError(errorMessage), { status: 415 })
			}

			// 400 Bad Request for other validation failures
			throw new ValidationError(errorMessage)
		}

		// Use sanitized filename from validation
		const filename = validationResult.sanitizedFilename
		const contentType = file.type || "application/octet-stream"

		// Upload to Vercel Blob
		const blob = await put(filename, file, {
			access: "public",
			contentType,
			token: process.env.BLOB_READ_WRITE_TOKEN,
		})

		// Return success with rate limit headers
		const response = success({
			url: blob.url,
			pathname: blob.pathname,
			contentType,
			filename,
		})

		// Add rate limit headers to response
		const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)
		rateLimitHeaders.forEach((value, key) => {
			response.headers.set(key, value)
		})

		return response
	} catch (err) {
		return error(err)
	}
}
