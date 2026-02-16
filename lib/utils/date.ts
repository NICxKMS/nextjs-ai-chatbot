/**
 * Date utility functions for common date operations.
 * @module lib/utils/date
 */

/**
 * Checks if a date is today.
 *
 * @param date - The date to check
 * @returns True if the date is today, false otherwise
 *
 * @example
 * ```ts
 * isToday(new Date()) // true
 * isToday(new Date(Date.now() - 86400000)) // false (yesterday)
 * ```
 */
export function isToday(date: Date): boolean {
	const today = new Date()
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	)
}

/**
 * Checks if a date is yesterday.
 *
 * @param date - The date to check
 * @returns True if the date is yesterday, false otherwise
 *
 * @example
 * ```ts
 * isYesterday(new Date(Date.now() - 86400000)) // true
 * isYesterday(new Date()) // false (today)
 * ```
 */
export function isYesterday(date: Date): boolean {
	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)
	return (
		date.getFullYear() === yesterday.getFullYear() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getDate() === yesterday.getDate()
	)
}

/**
 * Returns the start of the day (midnight) for a given date.
 *
 * @param date - The date to get the start of day for
 * @returns New Date object set to midnight of the same day
 *
 * @example
 * ```ts
 * const date = new Date('2026-02-13T15:30:45')
 * startOfDay(date) // 2026-02-13T00:00:00.000Z
 * ```
 */
export function startOfDay(date: Date): Date {
	const result = new Date(date)
	result.setHours(0, 0, 0, 0)
	return result
}

/**
 * Returns the end of the day (23:59:59.999) for a given date.
 *
 * @param date - The date to get the end of day for
 * @returns New Date object set to the last millisecond of the day
 *
 * @example
 * ```ts
 * const date = new Date('2026-02-13T15:30:45')
 * endOfDay(date) // 2026-02-13T23:59:59.999Z
 * ```
 */
export function endOfDay(date: Date): Date {
	const result = new Date(date)
	result.setHours(23, 59, 59, 999)
	return result
}

/**
 * Adds a specified number of days to a date.
 *
 * @param date - The starting date
 * @param days - Number of days to add (can be negative to subtract)
 * @returns New Date object with days added
 *
 * @example
 * ```ts
 * const date = new Date('2026-02-13')
 * addDays(date, 5) // 2026-02-18
 * addDays(date, -3) // 2026-02-10
 * ```
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date)
	result.setDate(result.getDate() + days)
	return result
}

/**
 * Calculates the difference in days between two dates.
 * Returns a positive number if dateA is after dateB, negative if before.
 *
 * @param dateA - The first date
 * @param dateB - The second date
 * @returns Number of days between dates (can be negative)
 *
 * @example
 * ```ts
 * const date1 = new Date('2026-02-15')
 * const date2 = new Date('2026-02-10')
 * differenceInDays(date1, date2) // 5
 * differenceInDays(date2, date1) // -5
 * ```
 */
export function differenceInDays(dateA: Date, dateB: Date): number {
	const msPerDay = 24 * 60 * 60 * 1000
	const diffMs = dateA.getTime() - dateB.getTime()
	return Math.floor(diffMs / msPerDay)
}
