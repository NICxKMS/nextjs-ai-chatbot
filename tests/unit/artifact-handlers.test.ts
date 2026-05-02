import { beforeEach, describe, expect, it, vi } from "vitest"

import { getArtifactHandler, registerArtifactHandler } from "@/lib/ai/artifact-handlers"
import { AppError } from "@/lib/errors/app-error"
import type { ArtifactHandler } from "@/lib/types/artifact-handler.types"

function createHandler(): ArtifactHandler {
	return {
		create: vi.fn<ArtifactHandler["create"]>(),
		update: vi.fn<ArtifactHandler["update"]>(),
	}
}

describe("artifact handler registry", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("registers and retrieves handlers by artifact kind", () => {
		const handler = createHandler()

		registerArtifactHandler("text", handler)

		expect(getArtifactHandler("text")).toBe(handler)
	})

	it("rejects duplicate registrations for the same artifact kind", () => {
		registerArtifactHandler("code", createHandler())

		expect(() => registerArtifactHandler("code", createHandler())).toThrow(
			'Artifact handler already registered for kind "code"',
		)
	})

	it("throws a typed not-found error when no handler is registered", () => {
		try {
			getArtifactHandler("sheet")
		} catch (error) {
			expect(error).toBeInstanceOf(AppError)
			if (error instanceof AppError) {
				expect(error.code).toBe("not_found:artifact:artifact_not_found")
				expect(error.message).toBe('No artifact handler registered for kind "sheet"')
			}
		}
	})
})
