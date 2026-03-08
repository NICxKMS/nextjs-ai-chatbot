// Flow: artifact-handling | Step: handler-registry

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ArtifactKind } from "@/lib/types/artifact.types"
import type { ArtifactHandler } from "@/lib/types/artifact-handler.types"

// We need a fresh registry for each test. The module has module-level state,
// so we use dynamic import with vi.resetModules() to get a clean Map each time.

describe("artifact handler registry", () => {
	let registerArtifactHandler: (kind: ArtifactKind, handler: ArtifactHandler) => void
	let getArtifactHandler: (kind: ArtifactKind) => ArtifactHandler

	const mockHandler: ArtifactHandler = {
		create: async () => "created",
		update: async () => "updated",
	}

	const anotherHandler: ArtifactHandler = {
		create: async () => "created-2",
		update: async () => "updated-2",
	}

	beforeEach(async () => {
		// Reset modules to get a fresh Map for each test
		vi.resetModules()
		const mod = await import("@/lib/ai/artifact-handlers")
		registerArtifactHandler = mod.registerArtifactHandler
		getArtifactHandler = mod.getArtifactHandler
	})

	// ── registerArtifactHandler ──────────────────────────────

	describe("registerArtifactHandler", () => {
		it("registers a handler for a given kind", () => {
			expect(() => registerArtifactHandler("text", mockHandler)).not.toThrow()
		})

		it("throws when registering a duplicate kind", () => {
			registerArtifactHandler("code", mockHandler)
			expect(() => registerArtifactHandler("code", anotherHandler)).toThrow(
				/already registered.*"code"/,
			)
		})

		it("allows registering different kinds", () => {
			registerArtifactHandler("text", mockHandler)
			registerArtifactHandler("code", anotherHandler)
			registerArtifactHandler("sheet", mockHandler)

			// All should be retrievable
			expect(getArtifactHandler("text")).toBe(mockHandler)
			expect(getArtifactHandler("code")).toBe(anotherHandler)
			expect(getArtifactHandler("sheet")).toBe(mockHandler)
		})
	})

	// ── getArtifactHandler ───────────────────────────────────

	describe("getArtifactHandler", () => {
		it("retrieves registered handler by kind", () => {
			registerArtifactHandler("text", mockHandler)
			const handler = getArtifactHandler("text")
			expect(handler).toBe(mockHandler)
		})

		it("throws AppError for unregistered kind", () => {
			try {
				getArtifactHandler("image")
				expect.fail("Should have thrown")
			} catch (err) {
				expect(err).toHaveProperty("code", "not_found:artifact:artifact_not_found")
				expect(err).toHaveProperty("message")
				expect((err as Error).message).toContain("image")
			}
		})

		it("throws with descriptive message for unknown kind", () => {
			expect(() => getArtifactHandler("sheet")).toThrow(/No artifact handler registered/)
		})

		it("returns the exact handler instance that was registered", () => {
			registerArtifactHandler("code", mockHandler)
			const retrieved = getArtifactHandler("code")
			expect(retrieved).toBe(mockHandler)
			expect(retrieved.create).toBe(mockHandler.create)
			expect(retrieved.update).toBe(mockHandler.update)
		})
	})

	// ── Full lifecycle ───────────────────────────────────────

	describe("full lifecycle", () => {
		it("supports all artifact kinds", () => {
			const kinds: ArtifactKind[] = ["text", "code", "sheet", "image"]

			for (const kind of kinds) {
				registerArtifactHandler(kind, mockHandler)
			}

			for (const kind of kinds) {
				expect(getArtifactHandler(kind)).toBe(mockHandler)
			}
		})
	})
})
