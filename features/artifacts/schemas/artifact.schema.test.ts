// Flow: artifact-validation | Step: schema-validation
import { describe, expect, it } from "vitest"

import {
	artifactPostBodySchema,
	createArtifactSchema,
	deleteArtifactVersionSchema,
	getArtifactSchema,
	restoreArtifactSchema,
	saveArtifactSchema,
	updateArtifactSchema,
} from "./artifact.schema"

// ── Helpers ────────────────────────────────────────────────────

const VALID_UUID = "00000000-0000-0000-0000-000000000001"
const VALID_TIMESTAMP = "2025-01-01T00:00:00Z"

// ── createArtifactSchema ───────────────────────────────────────

describe("createArtifactSchema", () => {
	it("accepts valid input with text kind", () => {
		const result = createArtifactSchema.safeParse({ title: "My artifact", kind: "text" })
		expect(result.success).toBe(true)
	})

	it("accepts valid input with code kind", () => {
		const result = createArtifactSchema.safeParse({ title: "Code", kind: "code" })
		expect(result.success).toBe(true)
	})

	it("accepts valid input with sheet kind", () => {
		const result = createArtifactSchema.safeParse({ title: "Sheet", kind: "sheet" })
		expect(result.success).toBe(true)
	})

	it("rejects image kind (not allowed for creation)", () => {
		const result = createArtifactSchema.safeParse({ title: "Image", kind: "image" })
		expect(result.success).toBe(false)
	})

	it("rejects empty title", () => {
		const result = createArtifactSchema.safeParse({ title: "", kind: "text" })
		expect(result.success).toBe(false)
	})

	it("rejects title exceeding 200 characters", () => {
		const result = createArtifactSchema.safeParse({ title: "a".repeat(201), kind: "text" })
		expect(result.success).toBe(false)
	})

	it("rejects missing fields", () => {
		const result = createArtifactSchema.safeParse({})
		expect(result.success).toBe(false)
	})
})

// ── updateArtifactSchema ───────────────────────────────────────

describe("updateArtifactSchema", () => {
	it("accepts valid input", () => {
		const result = updateArtifactSchema.safeParse({
			id: VALID_UUID,
			description: "Update description",
		})
		expect(result.success).toBe(true)
	})

	it("rejects non-UUID id", () => {
		const result = updateArtifactSchema.safeParse({
			id: "not-a-uuid",
			description: "desc",
		})
		expect(result.success).toBe(false)
	})

	it("rejects empty description", () => {
		const result = updateArtifactSchema.safeParse({
			id: VALID_UUID,
			description: "",
		})
		expect(result.success).toBe(false)
	})

	it("rejects description exceeding 2000 characters", () => {
		const result = updateArtifactSchema.safeParse({
			id: VALID_UUID,
			description: "a".repeat(2001),
		})
		expect(result.success).toBe(false)
	})
})

// ── getArtifactSchema ──────────────────────────────────────────

describe("getArtifactSchema", () => {
	it("accepts valid input with optional view", () => {
		const result = getArtifactSchema.safeParse({ id: VALID_UUID, view: "latest" })
		expect(result.success).toBe(true)
	})

	it("accepts valid input without view", () => {
		const result = getArtifactSchema.safeParse({ id: VALID_UUID })
		expect(result.success).toBe(true)
	})

	it("accepts versions view", () => {
		const result = getArtifactSchema.safeParse({ id: VALID_UUID, view: "versions" })
		expect(result.success).toBe(true)
	})

	it("rejects invalid view value", () => {
		const result = getArtifactSchema.safeParse({ id: VALID_UUID, view: "unknown" })
		expect(result.success).toBe(false)
	})

	it("rejects non-UUID id", () => {
		const result = getArtifactSchema.safeParse({ id: "invalid" })
		expect(result.success).toBe(false)
	})
})

// ── deleteArtifactVersionSchema ────────────────────────────────

describe("deleteArtifactVersionSchema", () => {
	it("accepts valid input", () => {
		const result = deleteArtifactVersionSchema.safeParse({
			id: VALID_UUID,
			timestamp: VALID_TIMESTAMP,
		})
		expect(result.success).toBe(true)
	})

	it("rejects non-UUID id", () => {
		const result = deleteArtifactVersionSchema.safeParse({
			id: "bad",
			timestamp: VALID_TIMESTAMP,
		})
		expect(result.success).toBe(false)
	})

	it("rejects invalid timestamp", () => {
		const result = deleteArtifactVersionSchema.safeParse({
			id: VALID_UUID,
			timestamp: "not-a-date",
		})
		expect(result.success).toBe(false)
	})
})

// ── saveArtifactSchema ─────────────────────────────────────────

describe("saveArtifactSchema", () => {
	const validSave = {
		mode: "save" as const,
		id: VALID_UUID,
		title: "Title",
		content: "console.log('hello')",
		kind: "code" as const,
		chatId: VALID_UUID,
	}

	it("accepts valid save input", () => {
		const result = saveArtifactSchema.safeParse(validSave)
		expect(result.success).toBe(true)
	})

	it("accepts all valid kinds (text, code, image, sheet)", () => {
		for (const kind of ["text", "code", "image", "sheet"] as const) {
			const result = saveArtifactSchema.safeParse({ ...validSave, kind })
			expect(result.success).toBe(true)
		}
	})

	it("rejects empty title", () => {
		const result = saveArtifactSchema.safeParse({ ...validSave, title: "" })
		expect(result.success).toBe(false)
	})

	it("rejects invalid kind", () => {
		const result = saveArtifactSchema.safeParse({ ...validSave, kind: "video" })
		expect(result.success).toBe(false)
	})

	it("rejects non-UUID chatId", () => {
		const result = saveArtifactSchema.safeParse({ ...validSave, chatId: "bad" })
		expect(result.success).toBe(false)
	})
})

// ── restoreArtifactSchema ──────────────────────────────────────

describe("restoreArtifactSchema", () => {
	it("accepts valid restore input", () => {
		const result = restoreArtifactSchema.safeParse({
			mode: "restore",
			id: VALID_UUID,
			timestamp: VALID_TIMESTAMP,
		})
		expect(result.success).toBe(true)
	})

	it("rejects missing timestamp", () => {
		const result = restoreArtifactSchema.safeParse({
			mode: "restore",
			id: VALID_UUID,
		})
		expect(result.success).toBe(false)
	})

	it("rejects invalid mode", () => {
		const result = restoreArtifactSchema.safeParse({
			mode: "delete",
			id: VALID_UUID,
			timestamp: VALID_TIMESTAMP,
		})
		expect(result.success).toBe(false)
	})
})

// ── artifactPostBodySchema (discriminated union) ───────────────

describe("artifactPostBodySchema", () => {
	it("accepts a valid save body", () => {
		const result = artifactPostBodySchema.safeParse({
			mode: "save",
			id: VALID_UUID,
			title: "Saved",
			content: "data",
			kind: "text",
			chatId: VALID_UUID,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.mode).toBe("save")
		}
	})

	it("accepts a valid restore body", () => {
		const result = artifactPostBodySchema.safeParse({
			mode: "restore",
			id: VALID_UUID,
			timestamp: VALID_TIMESTAMP,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.mode).toBe("restore")
		}
	})

	it("rejects unknown mode", () => {
		const result = artifactPostBodySchema.safeParse({
			mode: "update",
			id: VALID_UUID,
		})
		expect(result.success).toBe(false)
	})

	it("rejects save body with missing required fields", () => {
		const result = artifactPostBodySchema.safeParse({
			mode: "save",
			id: VALID_UUID,
			// Missing title, content, kind, chatId
		})
		expect(result.success).toBe(false)
	})
})
