// Flow: artifact-handling | Step: sheet-handler
import { describe, expect, it } from "vitest"

import { sheetHandler } from "./sheet-handler"

// ── Tests ──────────────────────────────────────────────────────

describe("sheetHandler", () => {
	it("has a create method", () => {
		expect(typeof sheetHandler.create).toBe("function")
	})

	it("has an update method", () => {
		expect(typeof sheetHandler.update).toBe("function")
	})

	it("conforms to ArtifactHandler shape", () => {
		expect(sheetHandler).toEqual(
			expect.objectContaining({
				create: expect.any(Function),
				update: expect.any(Function),
			}),
		)
	})

	it("has exactly two methods", () => {
		const keys = Object.keys(sheetHandler)
		expect(keys).toHaveLength(2)
		expect(keys).toContain("create")
		expect(keys).toContain("update")
	})
})
