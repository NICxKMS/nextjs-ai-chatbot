/**
 * ISO 8601 date format validation regex
 */
const ISO_DATE_REGEX =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Safely parses a date string or timestamp into a Date object.
 * Returns null if the input is invalid.
 *
 * @param input - The date string, timestamp, or Date to parse
 * @returns Parsed Date or null if invalid
 *
 * @example
 * parseDate('2024-03-15') // Date object
 * parseDate(1710460800000) // Date object
 * parseDate('invalid') // null
 */
export function parseDate(
    input: string | number | Date | null | undefined
): Date | null {
    if (input === null || input === undefined) {
        return null;
    }

    if (input instanceof Date) {
        return Number.isNaN(input.getTime()) ? null : input;
    }

    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Checks if a value represents a valid date.
 *
 * @param input - The value to check
 * @returns True if the input can be parsed as a valid date
 *
 * @example
 * isValidDate('2024-03-15') // true
 * isValidDate('not a date') // false
 */
export function isValidDate(
    input: string | number | Date | null | undefined
): boolean {
    return parseDate(input) !== null;
}

/**
 * Parses an ISO date string to a Date object.
 *
 * @param isoString - The ISO 8601 date string
 * @returns Parsed Date or null if invalid
 *
 * @example
 * parseISO('2024-03-15T10:30:00Z') // Date object
 */
export function parseISO(isoString: string): Date | null {
    // Basic ISO 8601 validation
    if (!ISO_DATE_REGEX.test(isoString)) {
        return null;
    }

    return parseDate(isoString);
}

/**
 * Gets the start of a day (midnight) for a given date.
 *
 * @param date - The date to get the start of day for
 * @returns Date set to midnight
 *
 * @example
 * startOfDay(new Date('2024-03-15T14:30:00')) // Date at 2024-03-15T00:00:00
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Gets the end of a day (23:59:59.999) for a given date.
 *
 * @param date - The date to get the end of day for
 * @returns Date set to end of day
 *
 * @example
 * endOfDay(new Date('2024-03-15T14:30:00')) // Date at 2024-03-15T23:59:59.999
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Checks if two dates are the same day.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 *
 * @example
 * isSameDay(new Date('2024-03-15T10:00'), new Date('2024-03-15T22:00')) // true
 */
export function isSameDay(date1: Date, date2: Date): boolean {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}
