// Flow: data-generation | Step: uuid
import { describe, expect, it } from "vitest"

import { generateUUID } from "@/lib/utils/generate-uuid"

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe("generateUUID", () => {
	it("returns a string", () => {
		expect(typeof generateUUID()).toBe("string")
	})

	it("returns a valid UUID v4 format", () => {
		const uuid = generateUUID()
		expect(uuid).toMatch(UUID_V4_REGEX)
	})

	it("produces unique values across multiple calls", () => {
		const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()))
		expect(uuids.size).toBe(100)
	})

	it("has correct length (36 characters with hyphens)", () => {
		expect(generateUUID()).toHaveLength(36)
	})
})
