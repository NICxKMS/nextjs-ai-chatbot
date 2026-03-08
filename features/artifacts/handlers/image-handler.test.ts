// Flow: artifact-handling | Step: image-handler
import { describe, expect, it, vi } from "vitest"

import type { CreateArtifactParams, UpdateArtifactParams } from "@/lib/types/artifact-handler.types"

import { imageHandler } from "./image-handler"

// ── Helpers ────────────────────────────────────────────────────

const baseCreateParams: CreateArtifactParams = {
	id: "00000000-0000-0000-0000-000000000001",
	title: "Test image",
	kind: "image",
	chatId: "00000000-0000-0000-0000-000000000002",
	session: { userId: "user-1", isGuest: false },
	chatStream: { writeData: vi.fn() },
}

const baseUpdateParams: UpdateArtifactParams = {
	id: "00000000-0000-0000-0000-000000000001",
	title: "Test image",
	kind: "image",
	currentContent: "data:image/png;base64,abc",
	description: "Update image",
	session: { userId: "user-1", isGuest: false },
	chatStream: { writeData: vi.fn() },
}

// ── Tests ──────────────────────────────────────────────────────

describe("imageHandler", () => {
	it("has a create method", () => {
		expect(typeof imageHandler.create).toBe("function")
	})

	it("has an update method", () => {
		expect(typeof imageHandler.update).toBe("function")
	})

	it("conforms to ArtifactHandler shape", () => {
		expect(imageHandler).toEqual(
			expect.objectContaining({
				create: expect.any(Function),
				update: expect.any(Function),
			}),
		)
	})

	it("create returns empty string (images are created externally)", async () => {
		const result = await imageHandler.create(baseCreateParams)
		expect(result).toBe("")
	})

	it("update returns currentContent unchanged", async () => {
		const result = await imageHandler.update(baseUpdateParams)
		expect(result).toBe("data:image/png;base64,abc")
	})

	it("update returns empty string when currentContent is empty", async () => {
		const result = await imageHandler.update({ ...baseUpdateParams, currentContent: "" })
		expect(result).toBe("")
	})
})
