import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    endOfDay,
    formatDate,
    formatDateTime,
    formatRelative,
    isSameDay,
    isValidDate,
    parseDate,
    parseISO,
    startOfDay,
    timeAgo,
} from "@/lib/utils/date";

// Regex patterns for month matching in tests
const JAN_REGEX = /Jan/i;
const DEC_REGEX = /Dec/i;

describe("Date Utilities", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // =========================================================================
    // formatDate
    // =========================================================================

    describe("formatDate", () => {
        it("formats date with default locale", () => {
            const date = new Date("2025-01-15T12:00:00Z");
            const result = formatDate(date);
            // Output varies by locale, but should contain Jan, 15, and 2025
            expect(result).toMatch(JAN_REGEX);
            expect(result).toContain("15");
            expect(result).toContain("2025");
        });

        it("formats date with custom locale", () => {
            const date = new Date("2025-01-15T12:00:00Z");
            const result = formatDate(date, "de-DE");
            // German locale should show date differently
            expect(result).toContain("2025");
        });

        it("handles different dates", () => {
            const date = new Date("2024-12-25T00:00:00Z");
            const result = formatDate(date);
            expect(result).toMatch(DEC_REGEX);
            expect(result).toContain("25");
            expect(result).toContain("2024");
        });
    });

    // =========================================================================
    // formatDateTime
    // =========================================================================

    describe("formatDateTime", () => {
        it("includes date and time", () => {
            const date = new Date("2025-01-15T14:30:00Z");
            const result = formatDateTime(date);
            // Should contain both date and time parts
            expect(result).toMatch(JAN_REGEX);
            expect(result).toContain("15");
            expect(result).toContain("2025");
        });

        it("formats with custom locale", () => {
            const date = new Date("2025-01-15T14:30:00Z");
            const result = formatDateTime(date, "en-GB");
            expect(result).toContain("2025");
        });
    });

    // =========================================================================
    // timeAgo
    // =========================================================================

    describe("timeAgo", () => {
        it('returns "just now" for current time', () => {
            const now = new Date();
            expect(timeAgo(now)).toBe("just now");
        });

        it('returns "just now" for time less than a minute ago', () => {
            const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
            expect(timeAgo(thirtySecondsAgo)).toBe("just now");
        });

        it("returns singular minute", () => {
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            expect(timeAgo(oneMinuteAgo)).toBe("1 minute ago");
        });

        it("returns plural minutes", () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            expect(timeAgo(fiveMinutesAgo)).toBe("5 minutes ago");
        });

        it("returns singular hour", () => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            expect(timeAgo(oneHourAgo)).toBe("1 hour ago");
        });

        it("returns plural hours", () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            expect(timeAgo(twoHoursAgo)).toBe("2 hours ago");
        });

        it("returns singular day", () => {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            expect(timeAgo(oneDayAgo)).toBe("1 day ago");
        });

        it("returns plural days", () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            expect(timeAgo(threeDaysAgo)).toBe("3 days ago");
        });

        it("returns weeks", () => {
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            expect(timeAgo(twoWeeksAgo)).toBe("2 weeks ago");
        });

        it("returns months", () => {
            const twoMonthsAgo = new Date(
                Date.now() - 60 * 24 * 60 * 60 * 1000
            );
            expect(timeAgo(twoMonthsAgo)).toBe("2 months ago");
        });

        it("returns years", () => {
            const twoYearsAgo = new Date(
                Date.now() - 730 * 24 * 60 * 60 * 1000
            );
            expect(timeAgo(twoYearsAgo)).toBe("2 years ago");
        });

        it('returns "in the future" for future dates', () => {
            const future = new Date(Date.now() + 60 * 60 * 1000);
            expect(timeAgo(future)).toBe("in the future");
        });
    });

    // =========================================================================
    // formatRelative
    // =========================================================================

    describe("formatRelative", () => {
        it("formats past dates relatively", () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = formatRelative(yesterday);
            // Should be something like "yesterday" or "1 day ago"
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        });

        it("handles future dates", () => {
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const result = formatRelative(tomorrow);
            expect(typeof result).toBe("string");
        });

        it("accepts custom locale", () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = formatRelative(yesterday, "de-DE");
            expect(typeof result).toBe("string");
        });
    });

    // =========================================================================
    // parseDate
    // =========================================================================

    describe("parseDate", () => {
        it("parses ISO date string", () => {
            const result = parseDate("2025-01-15T12:00:00Z");
            expect(result).toBeInstanceOf(Date);
            expect(result?.toISOString()).toBe("2025-01-15T12:00:00.000Z");
        });

        it("parses date-only string", () => {
            const result = parseDate("2025-01-15");
            expect(result).toBeInstanceOf(Date);
        });

        it("parses timestamp number", () => {
            const timestamp = 1_705_320_000_000; // 2025-01-15 12:00:00 UTC
            const result = parseDate(timestamp);
            expect(result).toBeInstanceOf(Date);
        });

        it("returns same Date object if valid", () => {
            const date = new Date("2025-01-15");
            const result = parseDate(date);
            expect(result).toBeInstanceOf(Date);
            expect(result?.getTime()).toBe(date.getTime());
        });

        it("returns null for invalid date string", () => {
            expect(parseDate("not-a-date")).toBeNull();
        });

        it("returns null for invalid Date object", () => {
            expect(parseDate(new Date("invalid"))).toBeNull();
        });

        it("returns null for null input", () => {
            expect(parseDate(null)).toBeNull();
        });

        it("returns null for undefined input", () => {
            expect(parseDate(undefined)).toBeNull();
        });
    });

    // =========================================================================
    // isValidDate
    // =========================================================================

    describe("isValidDate", () => {
        it("returns true for valid Date object", () => {
            expect(isValidDate(new Date())).toBe(true);
        });

        it("returns true for valid date string", () => {
            expect(isValidDate("2025-01-15")).toBe(true);
        });

        it("returns true for valid ISO string", () => {
            expect(isValidDate("2025-01-15T12:00:00Z")).toBe(true);
        });

        it("returns true for valid timestamp", () => {
            expect(isValidDate(1_705_320_000_000)).toBe(true);
        });

        it("returns false for invalid Date object", () => {
            expect(isValidDate(new Date("invalid"))).toBe(false);
        });

        it("returns false for invalid string", () => {
            expect(isValidDate("not a date")).toBe(false);
        });

        it("returns false for null", () => {
            expect(isValidDate(null)).toBe(false);
        });

        it("returns false for undefined", () => {
            expect(isValidDate(undefined)).toBe(false);
        });
    });

    // =========================================================================
    // parseISO
    // =========================================================================

    describe("parseISO", () => {
        it("parses valid ISO date string with time", () => {
            const result = parseISO("2025-01-15T12:00:00Z");
            expect(result).toBeInstanceOf(Date);
            expect(result?.toISOString()).toBe("2025-01-15T12:00:00.000Z");
        });

        it("parses valid ISO date string without time", () => {
            const result = parseISO("2025-01-15");
            expect(result).toBeInstanceOf(Date);
        });

        it("parses ISO with milliseconds", () => {
            const result = parseISO("2025-01-15T12:00:00.123Z");
            expect(result).toBeInstanceOf(Date);
        });

        it("parses ISO with timezone offset", () => {
            const result = parseISO("2025-01-15T12:00:00+05:00");
            expect(result).toBeInstanceOf(Date);
        });

        it("returns null for non-ISO format", () => {
            expect(parseISO("15/01/2025")).toBeNull();
        });

        it("returns null for invalid ISO string", () => {
            expect(parseISO("2025-13-45")).toBeNull();
        });

        it("returns null for plain text", () => {
            expect(parseISO("not a date")).toBeNull();
        });
    });

    // =========================================================================
    // startOfDay
    // =========================================================================

    describe("startOfDay", () => {
        it("sets time to midnight", () => {
            const date = new Date("2025-01-15T14:30:45.123Z");
            const result = startOfDay(date);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it("preserves date", () => {
            const date = new Date("2025-01-15T14:30:45Z");
            const result = startOfDay(date);
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(0); // January is 0
            expect(result.getDate()).toBe(15);
        });

        it("does not mutate original date", () => {
            const date = new Date("2025-01-15T14:30:45Z");
            const originalTime = date.getTime();
            startOfDay(date);
            expect(date.getTime()).toBe(originalTime);
        });
    });

    // =========================================================================
    // endOfDay
    // =========================================================================

    describe("endOfDay", () => {
        it("sets time to 23:59:59.999", () => {
            const date = new Date("2025-01-15T14:30:45.123Z");
            const result = endOfDay(date);
            expect(result.getHours()).toBe(23);
            expect(result.getMinutes()).toBe(59);
            expect(result.getSeconds()).toBe(59);
            expect(result.getMilliseconds()).toBe(999);
        });

        it("preserves date", () => {
            const date = new Date("2025-01-15T14:30:45Z");
            const result = endOfDay(date);
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(15);
        });

        it("does not mutate original date", () => {
            const date = new Date("2025-01-15T14:30:45Z");
            const originalTime = date.getTime();
            endOfDay(date);
            expect(date.getTime()).toBe(originalTime);
        });
    });

    // =========================================================================
    // isSameDay
    // =========================================================================

    describe("isSameDay", () => {
        it("returns true for same day, different times", () => {
            const date1 = new Date("2025-01-15T10:00:00Z");
            const date2 = new Date("2025-01-15T22:00:00Z");
            expect(isSameDay(date1, date2)).toBe(true);
        });

        it("returns false for different days", () => {
            const date1 = new Date("2025-01-15T23:59:59Z");
            const date2 = new Date("2025-01-16T00:00:00Z");
            expect(isSameDay(date1, date2)).toBe(false);
        });

        it("returns true for same Date object", () => {
            const date = new Date("2025-01-15T12:00:00Z");
            expect(isSameDay(date, date)).toBe(true);
        });

        it("returns false for different months", () => {
            const date1 = new Date("2025-01-15");
            const date2 = new Date("2025-02-15");
            expect(isSameDay(date1, date2)).toBe(false);
        });

        it("returns false for different years", () => {
            const date1 = new Date("2024-01-15");
            const date2 = new Date("2025-01-15");
            expect(isSameDay(date1, date2)).toBe(false);
        });
    });
});
