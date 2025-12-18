/**
 * Formats a date using Intl.DateTimeFormat.
 *
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date('2024-03-15')) // 'Mar 15, 2024'
 */
export function formatDate(date: Date, locale = "en-US"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

/**
 * Formats a date with time using Intl.DateTimeFormat.
 *
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en-US')
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTime(new Date()) // 'Mar 15, 2024, 2:30 PM'
 */
export function formatDateTime(date: Date, locale = "en-US"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

/**
 * Returns a human-readable relative time string (e.g., "2 hours ago").
 *
 * @param date - The date to compare against now
 * @returns Relative time string
 *
 * @example
 * timeAgo(new Date(Date.now() - 3600000)) // '1 hour ago'
 * timeAgo(new Date(Date.now() - 86400000)) // '1 day ago'
 */
export function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 0) {
        return "in the future";
    }

    const intervals: Array<{ label: string; seconds: number }> = [
        { label: "year", seconds: 31_536_000 },
        { label: "month", seconds: 2_592_000 },
        { label: "week", seconds: 604_800 },
        { label: "day", seconds: 86_400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
    ];

    for (const { label, seconds: intervalSeconds } of intervals) {
        const count = Math.floor(seconds / intervalSeconds);
        if (count >= 1) {
            return `${count} ${label}${count > 1 ? "s" : ""} ago`;
        }
    }

    return "just now";
}

/**
 * Formats a date relative to now using Intl.RelativeTimeFormat.
 *
 * @param date - The date to format
 * @param locale - The locale to use (default: 'en-US')
 * @returns Relative time string
 *
 * @example
 * formatRelative(new Date(Date.now() - 86400000)) // 'yesterday'
 */
export function formatRelative(date: Date, locale = "en-US"): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const diffInSeconds = Math.floor((date.getTime() - Date.now()) / 1000);

    const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> =
        [
            { unit: "year", seconds: 31_536_000 },
            { unit: "month", seconds: 2_592_000 },
            { unit: "week", seconds: 604_800 },
            { unit: "day", seconds: 86_400 },
            { unit: "hour", seconds: 3600 },
            { unit: "minute", seconds: 60 },
            { unit: "second", seconds: 1 },
        ];

    for (const { unit, seconds } of units) {
        if (Math.abs(diffInSeconds) >= seconds) {
            const value = Math.round(diffInSeconds / seconds);
            return rtf.format(value, unit);
        }
    }

    return rtf.format(0, "second");
}
