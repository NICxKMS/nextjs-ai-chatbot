import { format } from "date-fns"

/**
 * Format a date value into a human-readable string.
 *
 * @param date - A Date object, ISO string, or Unix timestamp (ms).
 * @param formatStr - A date-fns format string. Defaults to "MMM d, yyyy".
 * @returns The formatted date string.
 */
export function formatDate(date: Date | string | number, formatStr = "MMM d, yyyy"): string {
	const parsed = date instanceof Date ? date : new Date(date)
	return format(parsed, formatStr)
}
