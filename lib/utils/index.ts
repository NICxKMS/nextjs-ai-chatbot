/**
 * Utility functions barrel export.
 * Re-exports all utility modules for convenient imports.
 * @module lib/utils
 */

// Classname utility
export { cn } from "./cn"

// Date utilities
export {
	addDays,
	differenceInDays,
	endOfDay,
	isToday,
	isYesterday,
	startOfDay,
} from "./date"

// Document utilities
export { getDocumentTimestampByIndex } from "./document"
// Fetcher utilities (SWR-compatible)
export { fetcher, fetchWithErrorHandlers } from "./fetcher"
// File validation utilities
export {
	ALLOWED_MIME_TYPE_PREFIXES,
	ALLOWED_MIME_TYPES,
	ALLOWED_MIME_TYPES_SET,
	ATTACHMENT_MAX_FILE_SIZE,
	DEFAULT_MAX_FILE_SIZE,
	type FileSizeValidationResult,
	type FileTypeValidationResult,
	type FileValidationOptions,
	type FileValidationResult,
	type ImageDimensionValidationResult,
	isValidMimeType,
	MAX_IMAGE_DIMENSION,
	sanitizeFilename,
	validateFile,
	validateFileSize,
	validateFileType,
	validateImageDimensions,
} from "./file-validation"
// Formatting utilities
export {
	formatDate,
	formatDuration,
	formatFileSize,
	formatNumber,
	formatRelativeTime,
} from "./format"
// Message utilities
export {
	getMostRecentUserMessage,
	getTrailingMessageId,
} from "./message"
// Network utilities (secure IP extraction)
export {
	type GetClientIpOptions,
	getClientIpForRateLimit,
	getSecureClientIp,
	type IpExtractionResult,
	isLocalRequest,
	isLoopbackIP,
	isPrivateIP,
	isValidIP,
	isValidIPv4,
	isValidIPv6,
	normalizeIP,
} from "./network"
// String utilities
export {
	capitalize,
	sanitizeHtml,
	sanitizeText,
	slugify,
	truncate,
} from "./string"
// UUID utilities
export { generateUUID } from "./uuid"

// Validation utilities
export {
	getSafeRedirectUrl,
	isValidEmail,
	isValidRedirectUrl,
	isValidUrl,
	isValidUuid,
} from "./validation"
