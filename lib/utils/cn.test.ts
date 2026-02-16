/**
 * Tests for cn (classname) utility
 *
 * @module lib/utils/cn.test
 */

import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn", () => {
	describe("basic string handling", () => {
		it("should return empty string for no arguments", () => {
			expect(cn()).toBe("")
		})

		it("should return single class unchanged", () => {
			expect(cn("text-red-500")).toBe("text-red-500")
		})

		it("should join multiple classes with space", () => {
			expect(cn("text-red-500", "bg-blue-500")).toBe(
				"text-red-500 bg-blue-500",
			)
		})

		it("should handle empty strings", () => {
			expect(cn("", "text-red-500", "")).toBe("text-red-500")
		})
	})

	describe("conditional classes", () => {
		it("should filter out falsy values", () => {
			expect(cn("text-red-500", false && "hidden", null, undefined)).toBe(
				"text-red-500",
			)
		})

		it("should include truthy conditional classes", () => {
			expect(cn("base", true && "active")).toBe("base active")
		})

		it("should handle mixed truthy and falsy conditions", () => {
			const isActive = true
			const isDisabled = false
			expect(
				cn("btn", isActive && "active", isDisabled && "disabled"),
			).toBe("btn active")
		})
	})

	describe("array handling", () => {
		it("should flatten array of classes", () => {
			expect(cn(["text-red-500", "bg-blue-500"])).toBe(
				"text-red-500 bg-blue-500",
			)
		})

		it("should handle nested arrays", () => {
			expect(cn(["base", ["nested", ["deep"]]])).toBe("base nested deep")
		})

		it("should filter falsy values in arrays", () => {
			expect(cn(["text-red-500", false, null, "bg-blue-500"])).toBe(
				"text-red-500 bg-blue-500",
			)
		})
	})

	describe("object syntax", () => {
		it("should include classes with truthy values", () => {
			expect(cn({ active: true, disabled: false })).toBe("active")
		})

		it("should handle mixed object and string arguments", () => {
			expect(cn("btn", { active: true, hidden: false })).toBe(
				"btn active",
			)
		})

		it("should handle multiple object arguments", () => {
			expect(cn({ a: true }, { b: true, c: false })).toBe("a b")
		})
	})

	describe("tailwind-merge functionality", () => {
		it("should merge conflicting tailwind classes (last wins)", () => {
			expect(cn("p-4", "p-2")).toBe("p-2")
		})

		it("should merge conflicting padding classes", () => {
			expect(cn("px-2 py-1", "p-4")).toBe("p-4")
		})

		it("should preserve non-conflicting classes", () => {
			expect(cn("text-red-500", "bg-blue-500")).toBe(
				"text-red-500 bg-blue-500",
			)
		})

		it("should handle complex tailwind overrides", () => {
			// text-lg should override text-sm
			expect(cn("text-sm font-bold", "text-lg")).toBe("font-bold text-lg")
		})

		it("should handle responsive prefixes", () => {
			expect(cn("sm:p-4", "md:p-2")).toBe("sm:p-4 md:p-2")
		})

		it("should handle state variants", () => {
			expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe(
				"hover:bg-blue-500",
			)
		})

		it("should merge margin classes correctly", () => {
			expect(cn("m-4", "m-2")).toBe("m-2")
			expect(cn("mx-4", "mx-2")).toBe("mx-2")
		})

		it("should merge width and height classes", () => {
			expect(cn("w-full", "w-1/2")).toBe("w-1/2")
			expect(cn("h-screen", "h-full")).toBe("h-full")
		})
	})

	describe("complex combinations", () => {
		it("should handle mixed input types", () => {
			const result = cn(
				"base-class",
				["array-class"],
				{ objectClass: true },
				true && "conditional-class",
			)
			expect(result).toBe(
				"base-class array-class objectClass conditional-class",
			)
		})

		it("should handle real-world button component case", () => {
			const isPrimary = true
			const isDisabled = false
			const isLarge = true

			const result = cn(
				"btn",
				"rounded-md",
				isPrimary && "btn-primary",
				isDisabled && "opacity-50 cursor-not-allowed",
				isLarge ? "px-6 py-3" : "px-4 py-2",
			)

			expect(result).toBe("btn rounded-md btn-primary px-6 py-3")
		})

		it("should handle class override patterns", () => {
			// Common pattern: base classes + override from props
			const baseClasses = "px-4 py-2 text-sm font-medium"
			const overrideClasses = "px-6 text-lg"

			expect(cn(baseClasses, overrideClasses)).toBe(
				"py-2 font-medium px-6 text-lg",
			)
		})
	})

	describe("edge cases", () => {
		it("should handle undefined argument", () => {
			expect(cn("text-red-500", undefined)).toBe("text-red-500")
		})

		it("should handle null argument", () => {
			expect(cn("text-red-500", null)).toBe("text-red-500")
		})

		it("should handle all falsy arguments", () => {
			expect(cn(false, null, undefined, "", 0)).toBe("")
		})

		it("should handle numeric class names (not typical but possible)", () => {
			// Numbers are converted to strings by clsx
			expect(cn(123 as unknown as string)).toBe("123")
		})

		it("should handle empty object", () => {
			expect(cn({})).toBe("")
		})

		it("should handle empty array", () => {
			expect(cn([])).toBe("")
		})

		it("should handle deeply nested empty structures", () => {
			expect(cn([[[[]]]])).toBe("")
		})
	})
})
