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

// Formatting utilities
export {
	formatDate,
	formatDuration,
	formatFileSize,
	formatNumber,
	formatRelativeTime,
} from "./format"

// String utilities
export { capitalize, sanitizeHtml, slugify, truncate } from "./string"

// Validation utilities
export { isValidEmail, isValidUrl, isValidUuid } from "./validation"
