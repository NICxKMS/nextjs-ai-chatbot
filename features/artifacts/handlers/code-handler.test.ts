// Flow: artifact-handling | Step: code-handler
import { describe, expect, it } from "vitest"

import { codeHandler } from "./code-handler"

// ── Tests ──────────────────────────────────────────────────────

describe("codeHandler", () => {
	it("has a create method", () => {
		expect(typeof codeHandler.create).toBe("function")
	})

	it("has an update method", () => {
		expect(typeof codeHandler.update).toBe("function")
	})

	it("conforms to ArtifactHandler shape", () => {
		expect(codeHandler).toEqual(
			expect.objectContaining({
				create: expect.any(Function),
				update: expect.any(Function),
			}),
		)
	})

	it("has exactly two methods", () => {
		const keys = Object.keys(codeHandler)
		expect(keys).toHaveLength(2)
		expect(keys).toContain("create")
		expect(keys).toContain("update")
	})
})
