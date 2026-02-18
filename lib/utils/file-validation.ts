/**
 * File validation utilities for secure file uploads.
 *
 * Provides validation for file types, sizes, image dimensions, and filename sanitization
 * to prevent malicious file uploads, oversized files, and path traversal attacks.
 *
 * @module lib/utils/file-validation
 */

// ============================================================================
// File Size Constants
// ============================================================================

/** Default maximum file size: 10MB */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024

/** Maximum file size for attachments: 5MB (matching old app) */
export const ATTACHMENT_MAX_FILE_SIZE = 5 * 1024 * 1024

/** Maximum image dimension (width or height): 4096 pixels */
export const MAX_IMAGE_DIMENSION = 4096

// ============================================================================
// Allowed MIME Types
// ============================================================================

/**
 * Allowed MIME types for file uploads.
 * Includes common image, document, and data formats.
 */
export const ALLOWED_MIME_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	// Documents
	"application/pdf",
	"text/plain",
	"text/markdown",
	"text/csv",
	// Data formats
	"application/json",
	// Office documents
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const

/** Type for allowed MIME type strings */
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

/**
 * MIME type prefixes that are always allowed.
 * Used to allow all image, audio, and video types.
 */
export const ALLOWED_MIME_TYPE_PREFIXES = [
	"image/",
	"audio/",
	"video/",
] as const

/** Type for allowed MIME type prefix strings */
export type AllowedMimeTypePrefix = (typeof ALLOWED_MIME_TYPE_PREFIXES)[number]

/**
 * Set of explicitly allowed MIME types for O(1) lookup.
 */
export const ALLOWED_MIME_TYPES_SET = new Set<string>(ALLOWED_MIME_TYPES)

// ============================================================================
// File Type Validation
// ============================================================================

/**
 * Result of file type validation.
 */
export interface FileTypeValidationResult {
	/** Whether the file type is valid */
	valid: boolean
	/** The MIME type that was validated */
	mimeType: string
	/** Error message if validation failed */
	error?: string
}

/**
 * Validate if a MIME type is allowed.
 *
 * Checks against both explicit allowed types and allowed prefixes.
 * Returns false for empty, null, or undefined MIME types to prevent bypass attacks.
 *
 * @param mimeType - The MIME type to validate
 * @returns true if the MIME type is allowed, false otherwise
 *
 * @example
 * ```typescript
 * isValidMimeType("image/jpeg") // true
 * isValidMimeType("video/mp4") // true (prefix match)
 * isValidMimeType("application/exe") // false
 * isValidMimeType(null) // false (security: reject empty)
 * ```
 */
export function isValidMimeType(mimeType: string | undefined | null): boolean {
	// Security: Reject empty/undefined MIME types to prevent bypass attacks
	if (!mimeType || typeof mimeType !== "string") {
		return false
	}

	const normalizedType = mimeType.toLowerCase().trim()

	// Check explicit allowlist
	if (ALLOWED_MIME_TYPES_SET.has(normalizedType)) {
		return true
	}

	// Check prefix allowlist (image/*, audio/*, video/*)
	return ALLOWED_MIME_TYPE_PREFIXES.some((prefix) =>
		normalizedType.startsWith(prefix),
	)
}

/**
 * Validate file type against allowed types.
 *
 * @param file - The file to validate
 * @param allowedTypes - Optional array of allowed MIME types (defaults to ALLOWED_MIME_TYPES)
 * @returns Validation result with details
 *
 * @example
 * ```typescript
 * const result = validateFileType(file);
 * if (!result.valid) {
 *   throw new ValidationError(result.error);
 * }
 * ```
 */
export function validateFileType(
	file: File,
	allowedTypes?: readonly string[],
): FileTypeValidationResult {
	const mimeType = file.type || "application/octet-stream"
	const typesToCheck = allowedTypes ?? ALLOWED_MIME_TYPES

	// Check against explicit types
	if (typesToCheck.includes(mimeType)) {
		return { valid: true, mimeType }
	}

	// Check against prefixes
	const matchesPrefix = ALLOWED_MIME_TYPE_PREFIXES.some((prefix) =>
		mimeType.startsWith(prefix),
	)

	if (matchesPrefix) {
		return { valid: true, mimeType }
	}

	return {
		valid: false,
		mimeType,
		error: `Unsupported file type: ${mimeType}`,
	}
}

// ============================================================================
// File Size Validation
// ============================================================================

/**
 * Result of file size validation.
 */
export interface FileSizeValidationResult {
	/** Whether the file size is valid */
	valid: boolean
	/** The file size in bytes */
	size: number
	/** The maximum allowed size in bytes */
	maxSize: number
	/** Error message if validation failed */
	error?: string
}

/**
 * Validate file size against maximum limit.
 *
 * @param file - The file to validate
 * @param maxSizeBytes - Maximum allowed size in bytes (defaults to DEFAULT_MAX_FILE_SIZE)
 * @returns Validation result with details
 *
 * @example
 * ```typescript
 * const result = validateFileSize(file, 5 * 1024 * 1024); // 5MB limit
 * if (!result.valid) {
 *   throw new ValidationError(result.error);
 * }
 * ```
 */
export function validateFileSize(
	file: File,
	maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE,
): FileSizeValidationResult {
	const size = file.size

	if (size <= 0) {
		return {
			valid: false,
			size,
			maxSize: maxSizeBytes,
			error: "File is empty",
		}
	}

	if (size > maxSizeBytes) {
		const sizeMB = (size / (1024 * 1024)).toFixed(2)
		const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0)
		return {
			valid: false,
			size,
			maxSize: maxSizeBytes,
			error: `File size (${sizeMB}MB) exceeds ${maxMB}MB limit`,
		}
	}

	return { valid: true, size, maxSize: maxSizeBytes }
}

// ============================================================================
// Image Dimension Validation
// ============================================================================

/**
 * Result of image dimension validation.
 */
export interface ImageDimensionValidationResult {
	/** Whether the image dimensions are valid */
	valid: boolean
	/** Image width in pixels */
	width: number
	/** Image height in pixels */
	height: number
	/** Error message if validation failed */
	error?: string
}

/**
 * Validate image dimensions.
 *
 * Uses the browser's Image API to load and check image dimensions.
 * Only works in browser environments or with appropriate polyfills.
 *
 * @param file - The image file to validate
 * @param maxWidth - Maximum allowed width (defaults to MAX_IMAGE_DIMENSION)
 * @param maxHeight - Maximum allowed height (defaults to MAX_IMAGE_DIMENSION)
 * @returns Promise resolving to validation result with details
 *
 * @example
 * ```typescript
 * const result = await validateImageDimensions(file, 1920, 1080);
 * if (!result.valid) {
 *   throw new ValidationError(result.error);
 * }
 * ```
 */
export async function validateImageDimensions(
	file: File,
	maxWidth: number = MAX_IMAGE_DIMENSION,
	maxHeight: number = MAX_IMAGE_DIMENSION,
): Promise<ImageDimensionValidationResult> {
	// Only validate image files
	if (!file.type.startsWith("image/")) {
		return {
			valid: true,
			width: 0,
			height: 0,
		}
	}

	return new Promise((resolve) => {
		const img = new Image()
		const objectUrl = URL.createObjectURL(file)

		img.onload = () => {
			URL.revokeObjectURL(objectUrl)

			const { width, height } = img

			if (width > maxWidth || height > maxHeight) {
				resolve({
					valid: false,
					width,
					height,
					error: `Image dimensions (${width}x${height}) exceed maximum (${maxWidth}x${maxHeight})`,
				})
			} else {
				resolve({ valid: true, width, height })
			}
		}

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl)
			resolve({
				valid: false,
				width: 0,
				height: 0,
				error: "Failed to load image for validation",
			})
		}

		img.src = objectUrl
	})
}

// ============================================================================
// Filename Sanitization
// ============================================================================

/**
 * Dangerous filename patterns to remove.
 */
const DANGEROUS_PATTERNS = [
	/\.\./g, // Path traversal: ..
	/\//g, // Unix path separator
	/\\/g, // Windows path separator
	/:/g, // Windows drive letter separator / stream separator
	// biome-ignore lint/suspicious/noControlCharactersInRegex: null byte removal for security
	/\x00/g, // Null byte
	/\n/g, // Newline
	/\r/g, // Carriage return
] as const

/**
 * Sanitize a filename to prevent path traversal and other attacks.
 *
 * Removes or replaces dangerous characters while preserving the file extension.
 * Truncates long filenames to a maximum length.
 *
 * @param filename - The filename to sanitize
 * @param maxLength - Maximum length for the filename (defaults to 100)
 * @returns Sanitized filename safe for filesystem use
 *
 * @example
 * ```typescript
 * sanitizeFilename("../../../etc/passwd") // "etc_passwd"
 * sanitizeFilename("my file.pdf") // "my_file.pdf"
 * sanitizeFilename("a".repeat(150) + ".txt") // truncated to 100 chars + ".txt"
 * ```
 */
export function sanitizeFilename(
	filename: string,
	maxLength: number = 100,
): string {
	if (!filename || typeof filename !== "string") {
		return `upload-${Date.now()}`
	}

	// Remove dangerous patterns
	let sanitized = filename
	for (const pattern of DANGEROUS_PATTERNS) {
		sanitized = sanitized.replace(pattern, "_")
	}

	// Extract extension for preservation
	const lastDot = sanitized.lastIndexOf(".")
	const hasExtension = lastDot > 0 && lastDot < sanitized.length - 1
	const extension = hasExtension ? sanitized.slice(lastDot) : ""
	const baseName = hasExtension ? sanitized.slice(0, lastDot) : sanitized

	// Replace remaining special characters with underscores
	// Keep alphanumeric, dots, hyphens, and underscores
	const cleanBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_")

	// Remove consecutive underscores
	const normalizedBase = cleanBaseName.replace(/_+/g, "_")

	// Truncate to max length while preserving extension
	const maxBaseLength = maxLength - extension.length
	const truncatedBase = normalizedBase.slice(0, Math.max(0, maxBaseLength))

	return truncatedBase + extension
}

// ============================================================================
// Comprehensive File Validation
// ============================================================================

/**
 * Options for comprehensive file validation.
 */
export interface FileValidationOptions {
	/** Maximum file size in bytes */
	maxSizeBytes?: number
	/** Allowed MIME types (defaults to ALLOWED_MIME_TYPES) */
	allowedTypes?: readonly string[]
	/** Maximum image width (for image files) */
	maxImageWidth?: number
	/** Maximum image height (for image files) */
	maxImageHeight?: number
	/** Whether to validate image dimensions */
	validateDimensions?: boolean
}

/**
 * Result of comprehensive file validation.
 */
export interface FileValidationResult {
	/** Whether all validations passed */
	valid: boolean
	/** File type validation result */
	type: FileTypeValidationResult
	/** File size validation result */
	size: FileSizeValidationResult
	/** Image dimension validation result (if applicable) */
	dimensions: ImageDimensionValidationResult | undefined
	/** Sanitized filename */
	sanitizedFilename: string
	/** Combined error messages */
	errors: string[]
}

/**
 * Perform comprehensive file validation.
 *
 * Validates file type, size, and optionally image dimensions.
 * Also returns a sanitized filename.
 *
 * @param file - The file to validate
 * @param options - Validation options
 * @returns Promise resolving to comprehensive validation result
 *
 * @example
 * ```typescript
 * const result = await validateFile(file, {
 *   maxSizeBytes: 5 * 1024 * 1024,
 *   validateDimensions: true,
 * });
 *
 * if (!result.valid) {
 *   throw new ValidationError(result.errors.join("; "));
 * }
 * ```
 */
export async function validateFile(
	file: File,
	options: FileValidationOptions = {},
): Promise<FileValidationResult> {
	const errors: string[] = []

	// Validate type
	const typeResult = validateFileType(file, options.allowedTypes)
	if (!typeResult.valid && typeResult.error) {
		errors.push(typeResult.error)
	}

	// Validate size
	const sizeResult = validateFileSize(file, options.maxSizeBytes)
	if (!sizeResult.valid && sizeResult.error) {
		errors.push(sizeResult.error)
	}

	// Validate dimensions for images (if requested)
	let dimensionsResult: ImageDimensionValidationResult | undefined
	if (options.validateDimensions && file.type.startsWith("image/")) {
		dimensionsResult = await validateImageDimensions(
			file,
			options.maxImageWidth,
			options.maxImageHeight,
		)
		if (!dimensionsResult.valid && dimensionsResult.error) {
			errors.push(dimensionsResult.error)
		}
	}

	// Sanitize filename
	const sanitizedFilename = sanitizeFilename(file.name)

	return {
		valid: errors.length === 0,
		type: typeResult,
		size: sizeResult,
		dimensions: dimensionsResult,
		sanitizedFilename,
		errors,
	}
}
