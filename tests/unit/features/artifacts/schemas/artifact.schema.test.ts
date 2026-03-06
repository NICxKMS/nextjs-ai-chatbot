import { describe, expect, it } from "vitest"

import {
	artifactPostBodySchema,
	createArtifactSchema,
	deleteArtifactVersionSchema,
	getArtifactSchema,
	restoreArtifactSchema,
	saveArtifactSchema,
	suggestionResponseSchema,
	updateArtifactSchema,
} from "@/features/artifacts/schemas/artifact.schema"

const ARTIFACT_ID = "33333333-3333-4333-8333-333333333333"

describe("createArtifactSchema", () => {
	it("accepts all supported artifact kinds", () => {
		for (const kind of ["text", "code", "sheet"] as const) {
			expect(() =>
				createArtifactSchema.parse({
					title: "My Artifact",
					kind,
				}),
			).not.toThrow()
		}
	})

	it("rejects empty titles", () => {
		expect(() =>
			createArtifactSchema.parse({
				title: "",
				kind: "text",
			}),
		).toThrow()
	})

	it("rejects titles longer than 200 characters", () => {
		expect(() =>
			createArtifactSchema.parse({
				title: "a".repeat(201),
				kind: "text",
			}),
		).toThrow()
	})

	it("rejects unsupported kinds", () => {
		expect(() =>
			createArtifactSchema.parse({
				title: "My Artifact",
				kind: "image",
			}),
		).toThrow()
	})
})

describe("updateArtifactSchema", () => {
	it("accepts valid update payload", () => {
		expect(() =>
			updateArtifactSchema.parse({
				id: ARTIFACT_ID,
				description: "Updated artifact description",
			}),
		).not.toThrow()
	})

	it("rejects invalid artifact IDs", () => {
		expect(() =>
			updateArtifactSchema.parse({
				id: "not-a-uuid",
				description: "Updated artifact description",
			}),
		).toThrow()
	})

	it("rejects empty descriptions", () => {
		expect(() =>
			updateArtifactSchema.parse({
				id: ARTIFACT_ID,
				description: "",
			}),
		).toThrow()
	})

	it("rejects descriptions longer than 2000 characters", () => {
		expect(() =>
			updateArtifactSchema.parse({
				id: ARTIFACT_ID,
				description: "a".repeat(2001),
			}),
		).toThrow()
	})
})

describe("getArtifactSchema", () => {
	it("accepts valid IDs", () => {
		expect(() =>
			getArtifactSchema.parse({
				id: ARTIFACT_ID,
			}),
		).not.toThrow()
	})

	it("rejects invalid IDs", () => {
		expect(() =>
			getArtifactSchema.parse({
				id: "invalid",
			}),
		).toThrow()
	})
})

describe("deleteArtifactVersionSchema", () => {
	it("accepts valid UUID and ISO datetime", () => {
		expect(() =>
			deleteArtifactVersionSchema.parse({
				id: ARTIFACT_ID,
				timestamp: "2026-01-01T12:34:56.789Z",
			}),
		).not.toThrow()
	})

	it("rejects invalid timestamp values", () => {
		expect(() =>
			deleteArtifactVersionSchema.parse({
				id: ARTIFACT_ID,
				timestamp: "not-a-datetime",
			}),
		).toThrow()
	})
})

describe("saveArtifactSchema", () => {
	it("accepts valid save payloads for persisted artifact kinds", () => {
		expect(() =>
			saveArtifactSchema.parse({
				mode: "save",
				id: ARTIFACT_ID,
				title: "Saved artifact",
				content: "artifact content",
				kind: "image",
				chatId: "44444444-4444-4444-8444-444444444444",
			}),
		).not.toThrow()
	})

	it("rejects invalid save payloads", () => {
		expect(() =>
			saveArtifactSchema.parse({
				mode: "save",
				id: ARTIFACT_ID,
				title: "Saved artifact",
				content: "artifact content",
				kind: "invalid",
				chatId: "44444444-4444-4444-8444-444444444444",
			}),
		).toThrow()
	})
})

describe("restoreArtifactSchema", () => {
	it("accepts valid restore payload", () => {
		expect(() =>
			restoreArtifactSchema.parse({
				mode: "restore",
				id: ARTIFACT_ID,
				timestamp: "2026-01-01T12:34:56.789Z",
			}),
		).not.toThrow()
	})

	it("rejects invalid restore timestamps", () => {
		expect(() =>
			restoreArtifactSchema.parse({
				mode: "restore",
				id: ARTIFACT_ID,
				timestamp: "not-a-datetime",
			}),
		).toThrow()
	})
})

describe("artifactPostBodySchema", () => {
	it("accepts both save and restore modes", () => {
		const save = artifactPostBodySchema.parse({
			mode: "save",
			id: ARTIFACT_ID,
			title: "Saved artifact",
			content: "artifact content",
			kind: "text",
			chatId: "44444444-4444-4444-8444-444444444444",
		})
		const restore = artifactPostBodySchema.parse({
			mode: "restore",
			id: ARTIFACT_ID,
			timestamp: "2026-01-01T12:34:56.789Z",
		})

		expect(save.mode).toBe("save")
		expect(restore.mode).toBe("restore")
	})

	it("rejects unsupported modes", () => {
		expect(() =>
			artifactPostBodySchema.parse({
				mode: "delete",
				id: ARTIFACT_ID,
			}),
		).toThrow()
	})
})

describe("suggestionResponseSchema", () => {
	it("accepts up to five suggestion items", () => {
		const parsed = suggestionResponseSchema.parse([
			{ originalText: "a", suggestedText: "b", description: "1" },
			{ originalText: "c", suggestedText: "d", description: "2" },
			{ originalText: "e", suggestedText: "f", description: "3" },
			{ originalText: "g", suggestedText: "h", description: "4" },
			{ originalText: "i", suggestedText: "j", description: "5" },
		])

		expect(parsed).toHaveLength(5)
	})

	it("rejects more than five suggestion items", () => {
		expect(() =>
			suggestionResponseSchema.parse([
				{ originalText: "a", suggestedText: "b", description: "1" },
				{ originalText: "c", suggestedText: "d", description: "2" },
				{ originalText: "e", suggestedText: "f", description: "3" },
				{ originalText: "g", suggestedText: "h", description: "4" },
				{ originalText: "i", suggestedText: "j", description: "5" },
				{ originalText: "k", suggestedText: "l", description: "6" },
			]),
		).toThrow()
	})

	it("rejects items missing required string fields", () => {
		expect(() =>
			suggestionResponseSchema.parse([
				{ originalText: "a", suggestedText: "b", description: 123 },
			]),
		).toThrow()
	})
})
