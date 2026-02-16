/**
 * Formatting utilities for dates, numbers, file sizes, and durations.
 * @module lib/utils/format
 */

/**
 * Formats a date using Intl.DateTimeFormat with customizable options.
 *
 * @param date - The date to format (Date object or ISO string)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date()) // "Feb 13, 2026"
 * formatDate(new Date(), { dateStyle: 'full' }) // "Friday, February 13, 2026"
 * formatDate('2026-02-13T10:30:00Z', { timeStyle: 'short' }) // "10:30 AM"
 * ```
 */
export function formatDate(
	date: Date | string,
	options?: Intl.DateTimeFormatOptions,
): string {
	const dateObj = typeof date === "string" ? new Date(date) : date

	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "short",
		day: "numeric",
		...options,
	}

	return new Intl.DateTimeFormat("en-US", defaultOptions).format(dateObj)
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago", "in 3 days").
 *
 * @param date - The date to format (Date object or ISO string)
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 * formatRelativeTime(new Date(Date.now() + 86400000)) // "tomorrow"
 * formatRelativeTime(new Date(Date.now() - 60000)) // "1 minute ago"
 * ```
 */
export function formatRelativeTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date
	const now = new Date()

	const diffInMs = now.getTime() - dateObj.getTime()
	const diffInSeconds = Math.floor(diffInMs / 1000)
	const diffInMinutes = Math.floor(diffInSeconds / 60)
	const diffInHours = Math.floor(diffInMinutes / 60)
	const diffInDays = Math.floor(diffInHours / 24)
	const diffInWeeks = Math.floor(diffInDays / 7)
	const diffInMonths = Math.floor(diffInDays / 30)
	const diffInYears = Math.floor(diffInDays / 365)

	const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })

	// Future dates
	if (diffInMs < 0) {
		const futureSeconds = Math.abs(diffInSeconds)
		const futureMinutes = Math.abs(diffInMinutes)
		const futureHours = Math.abs(diffInHours)
		const futureDays = Math.abs(diffInDays)

		if (futureSeconds < 60) return rtf.format(futureSeconds, "second")
		if (futureMinutes < 60) return rtf.format(futureMinutes, "minute")
		if (futureHours < 24) return rtf.format(futureHours, "hour")
		if (futureDays < 7) return rtf.format(futureDays, "day")
		if (futureDays < 30) return rtf.format(futureDays, "day")
		return rtf.format(Math.abs(diffInYears), "year")
	}

	// Past dates
	if (diffInSeconds < 60) return rtf.format(-diffInSeconds, "second")
	if (diffInMinutes < 60) return rtf.format(-diffInMinutes, "minute")
	if (diffInHours < 24) return rtf.format(-diffInHours, "hour")
	if (diffInDays < 7) return rtf.format(-diffInDays, "day")
	if (diffInWeeks < 4) return rtf.format(-diffInWeeks, "week")
	if (diffInMonths < 12) return rtf.format(-diffInMonths, "month")
	return rtf.format(-diffInYears, "year")
}

/**
 * File size units for formatting.
 */
const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const

/**
 * Formats a byte count as a human-readable file size string.
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size string (e.g., "1.5 MB")
 *
 * @example
 * ```ts
 * formatFileSize(0) // "0 B"
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1 MB"
 * formatFileSize(1572864, 2) // "1.50 MB"
 * ```
 */
export function formatFileSize(bytes: number, decimals = 1): string {
	if (bytes === 0) return "0 B"

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	const size = Number.parseFloat((bytes / k ** i).toFixed(dm))
	const unit = FILE_SIZE_UNITS[i] ?? "B"

	return `${size} ${unit}`
}

/**
 * Formats a duration in seconds to a time string (e.g., "2:30", "1:15:45").
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 *
 * @example
 * ```ts
 * formatDuration(30) // "0:30"
 * formatDuration(90) // "1:30"
 * formatDuration(3661) // "1:01:01"
 * formatDuration(0) // "0:00"
 * ```
 */
export function formatDuration(seconds: number): string {
	if (seconds < 0) return "0:00"

	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)

	const paddedMinutes = minutes.toString().padStart(2, "0")
	const paddedSeconds = secs.toString().padStart(2, "0")

	if (hours > 0) {
		return `${hours}:${paddedMinutes}:${paddedSeconds}`
	}

	return `${minutes}:${paddedSeconds}`
}

/**
 * Formats a number using Intl.NumberFormat with customizable options.
 *
 * @param num - The number to format
 * @param options - Intl.NumberFormatOptions for customization
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.56, { style: 'currency', currency: 'USD' }) // "$1,234.56"
 * formatNumber(0.1234, { style: 'percent', minimumFractionDigits: 2 }) // "12.34%"
 * ```
 */
export function formatNumber(
	num: number,
	options?: Intl.NumberFormatOptions,
): string {
	return new Intl.NumberFormat("en-US", options).format(num)
}
