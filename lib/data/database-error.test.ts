// Flow: error-handling | Step: database-error-wrapping
import { describe, expect, it } from "vitest"

import { AppError } from "@/lib/errors/app-error"

import { requireDatabaseRow, throwDatabaseError } from "./database-error"

// ── throwDatabaseError ───────────────────────────────────────
describe("throwDatabaseError", () => {
	it("wraps a plain Error into AppError with correct code", () => {
		const cause = new Error("connection refused")

		expect(() => throwDatabaseError(cause, "DB call failed")).toThrow(AppError)

		try {
			throwDatabaseError(cause, "DB call failed")
		} catch (error) {
			expect(error).toBeInstanceOf(AppError)
			const appErr = error as AppError
			expect(appErr.code).toBe("internal_error:database:query_failed")
			expect(appErr.message).toBe("DB call failed")
		}
	})

	it("preserves context details in the wrapped error", () => {
		const cause = new Error("timeout")
		const details = { chatId: "abc", operation: "select" }

		try {
			throwDatabaseError(cause, "Query timed out", details)
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.details).toEqual({
				chatId: "abc",
				operation: "select",
				cause,
			})
		}
	})

	it("passes cause as details when no extra details provided", () => {
		const cause = new Error("raw error")

		try {
			throwDatabaseError(cause, "Failed")
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.details).toBe(cause)
		}
	})

	it("re-throws AppError instances without wrapping", () => {
		const original = AppError.notFound("not_found:chat:chat_not_found", "Chat not found")

		expect(() => throwDatabaseError(original, "Should not wrap")).toThrow(original)

		try {
			throwDatabaseError(original, "Should not wrap")
		} catch (error) {
			expect(error).toBe(original)
			expect((error as AppError).code).toBe("not_found:chat:chat_not_found")
		}
	})

	it("wraps non-Error values (strings, numbers)", () => {
		expect(() => throwDatabaseError("string error", "From string")).toThrow(AppError)

		try {
			throwDatabaseError(42, "From number")
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.code).toBe("internal_error:database:query_failed")
			expect(appErr.details).toBe(42)
		}
	})
})

// ── requireDatabaseRow ───────────────────────────────────────
describe("requireDatabaseRow", () => {
	it("returns the row when it is defined", () => {
		const row = { id: "abc", name: "Test" }
		expect(requireDatabaseRow(row, "Should exist")).toBe(row)
	})

	it("returns falsy non-undefined values (0, empty string, null, false)", () => {
		expect(requireDatabaseRow(0, "zero")).toBe(0)
		expect(requireDatabaseRow("", "empty")).toBe("")
		expect(requireDatabaseRow(false, "false")).toBe(false)
		expect(requireDatabaseRow(null, "null")).toBe(null)
	})

	it("throws AppError when row is undefined", () => {
		expect(() => requireDatabaseRow(undefined, "Row missing")).toThrow(AppError)

		try {
			requireDatabaseRow(undefined, "Row missing")
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.code).toBe("internal_error:database:query_failed")
			expect(appErr.message).toBe("Row missing")
		}
	})

	it("includes details in the thrown AppError", () => {
		const details = { chatId: "abc", messageId: "def" }

		try {
			requireDatabaseRow(undefined, "Missing vote", details)
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.details).toEqual(details)
		}
	})

	it("throws with no details when details are omitted", () => {
		try {
			requireDatabaseRow(undefined, "No details")
		} catch (error) {
			const appErr = error as AppError
			expect(appErr.details).toBeUndefined()
		}
	})
})
