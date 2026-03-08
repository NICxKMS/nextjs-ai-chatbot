// Flow: UI-utility | Step: class-merge
import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils/cn"

describe("cn", () => {
	it("merges multiple class strings", () => {
		expect(cn("foo", "bar")).toBe("foo bar")
	})

	it("resolves Tailwind conflicts (last wins)", () => {
		// twMerge should resolve conflicting Tailwind utilities
		expect(cn("px-2", "px-4")).toBe("px-4")
	})

	it("handles conditional classes via clsx", () => {
		expect(cn("base", false && "hidden", "visible")).toBe("base visible")
	})

	it("handles undefined and null inputs", () => {
		expect(cn("base", undefined, null, "end")).toBe("base end")
	})

	it("returns empty string for no arguments", () => {
		expect(cn()).toBe("")
	})

	it("returns empty string for all falsy arguments", () => {
		expect(cn(false, null, undefined, "")).toBe("")
	})

	it("handles array inputs", () => {
		expect(cn(["foo", "bar"])).toBe("foo bar")
	})

	it("deduplicates identical classes via twMerge", () => {
		const result = cn("text-red-500", "text-blue-500")
		// twMerge resolves text-color conflicts, last wins
		expect(result).toBe("text-blue-500")
	})

	it("handles object syntax from clsx", () => {
		expect(cn({ hidden: true, block: false })).toBe("hidden")
	})
})
