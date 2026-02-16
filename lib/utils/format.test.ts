/**
 * Tests for format utilities
 *
 * @module lib/utils/format.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	formatDate,
	formatDuration,
	formatFileSize,
	formatNumber,
	formatRelativeTime,
} from "./format"

describe("formatDate", () => {
	describe("basic formatting", () => {
		it("should format date with default options", () => {
			const date = new Date("2026-02-13T12:00:00Z")
			const result = formatDate(date)
			// Result depends on locale, but should contain month, day, year
			expect(result).toMatch(/Feb.*13.*2026/)
		})

		it("should format ISO string date", () => {
			const result = formatDate("2026-02-13T12:00:00Z")
			expect(result).toMatch(/Feb.*13.*2026/)
		})

		it("should format Date object", () => {
			const date = new Date(2026, 1, 13) // Feb 13, 2026 (month is 0-indexed)
			const result = formatDate(date)
			expect(result).toMatch(/Feb.*13.*2026/)
		})
	})

	describe("custom options", () => {
		it("should format with long month", () => {
			const date = new Date("2026-02-13T12:00:00Z")
			const result = formatDate(date, { month: "long" })
			expect(result).toMatch(/February.*13.*2026/)
		})

		it("should format with 2-digit day", () => {
			const date = new Date("2026-02-13T14:30:00Z")
			const result = formatDate(date, { day: "2-digit" })
			expect(result).toMatch(/Feb.*13.*2026/)
		})

		it("should format with custom year/month/day options", () => {
			const date = new Date("2026-02-13T12:00:00Z")
			const result = formatDate(date, {
				year: "numeric",
				month: "long",
				day: "2-digit",
			})
			expect(result).toMatch(/February.*13.*2026/)
		})

		it("should override default options with custom options", () => {
			const date = new Date("2026-02-13T12:00:00Z")
			const result = formatDate(date, { month: "long" })
			expect(result).toMatch(/February/)
		})
	})

	describe("edge cases", () => {
		it("should handle leap year date", () => {
			const date = new Date("2024-02-29T12:00:00Z")
			const result = formatDate(date)
			expect(result).toMatch(/Feb.*29.*2024/)
		})

		it("should handle year boundary", () => {
			const date = new Date("2026-01-01T00:00:00Z")
			const result = formatDate(date)
			expect(result).toMatch(/Jan.*1.*2026/)
		})

		it("should handle end of year", () => {
			// Use a date that's clearly Dec 31 in any timezone
			const date = new Date("2026-12-31T12:00:00Z")
			const result = formatDate(date)
			expect(result).toMatch(/Dec.*31.*2026/)
		})
	})
})

describe("formatRelativeTime", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-02-13T12:00:00Z"))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe("past times", () => {
		it('should return "just now" for seconds ago', () => {
			const date = new Date("2026-02-13T11:59:30Z") // 30 seconds ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/30 seconds? ago/)
		})

		it("should return minutes ago", () => {
			const date = new Date("2026-02-13T11:30:00Z") // 30 minutes ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/30 minutes? ago/)
		})

		it("should return hours ago", () => {
			const date = new Date("2026-02-13T10:00:00Z") // 2 hours ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/2 hours? ago/)
		})

		it("should return days ago", () => {
			const date = new Date("2026-02-11T12:00:00Z") // 2 days ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/2 days? ago/)
		})

		it("should return weeks ago", () => {
			const date = new Date("2026-02-06T12:00:00Z") // 1 week ago
			const result = formatRelativeTime(date)
			// Intl.RelativeTimeFormat with numeric: "auto" returns "last week" for 1 week
			expect(result).toMatch(/last week|1 week ago/)
		})

		it("should return months ago", () => {
			const date = new Date("2025-12-13T12:00:00Z") // 2 months ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/2 months? ago/)
		})

		it("should return years ago", () => {
			const date = new Date("2024-02-13T12:00:00Z") // 2 years ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/2 years? ago/)
		})
	})

	describe("future times", () => {
		it("should return seconds from now", () => {
			const date = new Date("2026-02-13T12:00:30Z") // 30 seconds in future
			const result = formatRelativeTime(date)
			expect(result).toMatch(/in 30 seconds?/)
		})

		it("should return minutes from now", () => {
			const date = new Date("2026-02-13T12:30:00Z") // 30 minutes in future
			const result = formatRelativeTime(date)
			expect(result).toMatch(/in 30 minutes?/)
		})

		it("should return hours from now", () => {
			const date = new Date("2026-02-13T14:00:00Z") // 2 hours in future
			const result = formatRelativeTime(date)
			expect(result).toMatch(/in 2 hours?/)
		})

		it("should return days from now", () => {
			const date = new Date("2026-02-15T12:00:00Z") // 2 days in future
			const result = formatRelativeTime(date)
			expect(result).toMatch(/in 2 days?/)
		})
	})

	describe("input types", () => {
		it("should handle Date object input", () => {
			const date = new Date("2026-02-13T11:00:00Z") // 1 hour ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/1 hour ago/)
		})

		it("should handle ISO string input", () => {
			const result = formatRelativeTime("2026-02-13T11:00:00Z")
			expect(result).toMatch(/1 hour ago/)
		})
	})

	describe("edge cases", () => {
		it("should handle exactly now", () => {
			const date = new Date("2026-02-13T12:00:00Z")
			const result = formatRelativeTime(date)
			expect(result).toMatch(/now|0 seconds? ago/)
		})

		it("should handle 1 minute boundary", () => {
			const date = new Date("2026-02-13T11:59:00Z") // exactly 1 minute ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/1 minute ago/)
		})

		it("should handle 1 hour boundary", () => {
			const date = new Date("2026-02-13T11:00:00Z") // exactly 1 hour ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/1 hour ago/)
		})

		it("should handle 1 day boundary", () => {
			const date = new Date("2026-02-12T12:00:00Z") // exactly 1 day ago
			const result = formatRelativeTime(date)
			expect(result).toMatch(/yesterday|1 day ago/)
		})
	})
})

describe("formatFileSize", () => {
	describe("basic formatting", () => {
		it('should return "0 B" for zero bytes', () => {
			expect(formatFileSize(0)).toBe("0 B")
		})

		it("should format bytes", () => {
			expect(formatFileSize(500)).toBe("500 B")
		})

		it("should format kilobytes", () => {
			expect(formatFileSize(1024)).toBe("1 KB")
			expect(formatFileSize(1536)).toBe("1.5 KB")
		})

		it("should format megabytes", () => {
			expect(formatFileSize(1048576)).toBe("1 MB")
			expect(formatFileSize(1572864)).toBe("1.5 MB")
		})

		it("should format gigabytes", () => {
			expect(formatFileSize(1073741824)).toBe("1 GB")
		})

		it("should format terabytes", () => {
			expect(formatFileSize(1099511627776)).toBe("1 TB")
		})
	})

	describe("decimal places", () => {
		it("should use 1 decimal place by default", () => {
			expect(formatFileSize(1536)).toBe("1.5 KB")
		})

		it("should allow custom decimal places", () => {
			// Note: toFixed() removes trailing zeros, so 1.50 becomes 1.5
			expect(formatFileSize(1536, 2)).toBe("1.5 KB")
			expect(formatFileSize(1536, 0)).toBe("2 KB")
		})

		it("should handle negative decimals (treat as 0)", () => {
			expect(formatFileSize(1536, -1)).toBe("2 KB")
		})
	})

	describe("edge cases", () => {
		it("should handle very small values", () => {
			expect(formatFileSize(1)).toBe("1 B")
		})

		it("should handle values just below unit threshold", () => {
			expect(formatFileSize(1023)).toBe("1023 B")
		})

		it("should handle values at exact unit boundaries", () => {
			expect(formatFileSize(1024)).toBe("1 KB")
			expect(formatFileSize(1048576)).toBe("1 MB")
		})

		it("should handle large file sizes", () => {
			expect(formatFileSize(1125899906842624)).toBe("1 PB")
		})
	})
})

describe("formatDuration", () => {
	describe("basic formatting", () => {
		it('should return "0:00" for zero seconds', () => {
			expect(formatDuration(0)).toBe("0:00")
		})

		it("should format seconds only", () => {
			expect(formatDuration(30)).toBe("0:30")
			expect(formatDuration(59)).toBe("0:59")
		})

		it("should format minutes and seconds", () => {
			expect(formatDuration(60)).toBe("1:00")
			expect(formatDuration(90)).toBe("1:30")
			expect(formatDuration(599)).toBe("9:59")
		})

		it("should format hours, minutes, and seconds", () => {
			expect(formatDuration(3600)).toBe("1:00:00")
			expect(formatDuration(3661)).toBe("1:01:01")
			expect(formatDuration(7322)).toBe("2:02:02")
		})
	})

	describe("edge cases", () => {
		it("should handle negative values (return 0:00)", () => {
			expect(formatDuration(-1)).toBe("0:00")
			expect(formatDuration(-100)).toBe("0:00")
		})

		it("should handle fractional seconds (truncate)", () => {
			expect(formatDuration(90.9)).toBe("1:30")
		})

		it("should handle large durations", () => {
			expect(formatDuration(86400)).toBe("24:00:00") // 1 day
			expect(formatDuration(169200)).toBe("47:00:00") // 47 hours
		})

		it("should pad seconds with zero", () => {
			expect(formatDuration(5)).toBe("0:05")
		})

		it("should pad minutes with zero when hours present", () => {
			expect(formatDuration(3605)).toBe("1:00:05")
			expect(formatDuration(3665)).toBe("1:01:05")
		})
	})
})

describe("formatNumber", () => {
	describe("basic formatting", () => {
		it("should format integer with thousand separators", () => {
			expect(formatNumber(1234567)).toBe("1,234,567")
		})

		it("should format small numbers without separators", () => {
			expect(formatNumber(123)).toBe("123")
		})

		it("should handle zero", () => {
			expect(formatNumber(0)).toBe("0")
		})
	})

	describe("currency formatting", () => {
		it("should format as USD currency", () => {
			const result = formatNumber(1234.56, {
				style: "currency",
				currency: "USD",
			})
			expect(result).toBe("$1,234.56")
		})

		it("should format as EUR currency", () => {
			const result = formatNumber(1234.56, {
				style: "currency",
				currency: "EUR",
			})
			// EUR formatting varies by locale
			expect(result).toMatch(/1.*234.*56/)
		})
	})

	describe("percentage formatting", () => {
		it("should format as percentage", () => {
			const result = formatNumber(0.1234, { style: "percent" })
			expect(result).toBe("12%")
		})

		it("should format percentage with decimal places", () => {
			const result = formatNumber(0.1234, {
				style: "percent",
				minimumFractionDigits: 2,
			})
			expect(result).toBe("12.34%")
		})
	})

	describe("decimal formatting", () => {
		it("should respect minimum fraction digits", () => {
			const result = formatNumber(1234, { minimumFractionDigits: 2 })
			expect(result).toBe("1,234.00")
		})

		it("should respect maximum fraction digits", () => {
			const result = formatNumber(1234.5678, { maximumFractionDigits: 2 })
			expect(result).toBe("1,234.57")
		})
	})

	describe("edge cases", () => {
		it("should handle negative numbers", () => {
			expect(formatNumber(-1234)).toBe("-1,234")
		})

		it("should handle very large numbers", () => {
			const result = formatNumber(1234567890123)
			expect(result).toBe("1,234,567,890,123")
		})

		it("should handle decimal numbers", () => {
			expect(formatNumber(1234.56)).toBe("1,234.56")
		})
	})
})
