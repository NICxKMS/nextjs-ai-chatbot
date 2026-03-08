// Flow: artifact-handling | Step: text-handler
import { describe, expect, it } from "vitest"

import { textHandler } from "./text-handler"

// ── Tests ──────────────────────────────────────────────────────

describe("textHandler", () => {
	it("has a create method", () => {
		expect(typeof textHandler.create).toBe("function")
	})

	it("has an update method", () => {
		expect(typeof textHandler.update).toBe("function")
	})

	it("conforms to ArtifactHandler shape", () => {
		expect(textHandler).toEqual(
			expect.objectContaining({
				create: expect.any(Function),
				update: expect.any(Function),
			}),
		)
	})

	it("has exactly two methods", () => {
		const keys = Object.keys(textHandler)
		expect(keys).toHaveLength(2)
		expect(keys).toContain("create")
		expect(keys).toContain("update")
	})
})
