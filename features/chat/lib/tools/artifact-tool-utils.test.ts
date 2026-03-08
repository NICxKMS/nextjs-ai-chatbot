// Flow: artifact-tool-pipeline | Step: tool-utilities
import { beforeEach, describe, expect, it } from "vitest"

import {
	createDeferredArtifactClearWriter,
	ensureArtifactContent,
	writeArtifactClear,
	writeArtifactCreatePrelude,
	writeArtifactFinish,
} from "@/features/chat/lib/tools/artifact-tool-utils"
import type { ArtifactStreamWriter } from "@/lib/types/artifact-handler.types"

// ── Helpers ──────────────────────────────────────────────────────

function mockWriter(): ArtifactStreamWriter & { calls: Array<{ type: string; content: unknown }> } {
	const calls: Array<{ type: string; content: unknown }> = []
	return {
		calls,
		writeData(data: { type: string; content: unknown }) {
			calls.push(data)
		},
	}
}

// ── ensureArtifactContent ────────────────────────────────────────

describe("ensureArtifactContent", () => {
	it("returns content when non-empty", () => {
		expect(ensureArtifactContent("hello world", "create")).toBe("hello world")
	})

	it("returns content with leading/trailing whitespace (not trimmed)", () => {
		expect(ensureArtifactContent("  content  ", "update")).toBe("  content  ")
	})

	it("throws AppError for empty string", () => {
		expect(() => ensureArtifactContent("", "create")).toThrow(/no content/i)
	})

	it("throws AppError for whitespace-only string", () => {
		expect(() => ensureArtifactContent("   ", "create")).toThrow(/no content/i)
	})

	it("throws AppError for tab/newline-only string", () => {
		expect(() => ensureArtifactContent("\t\n", "update")).toThrow(/no content/i)
	})

	it("includes operation type in error message", () => {
		expect(() => ensureArtifactContent("", "create")).toThrow(/create.*no content/i)
		expect(() => ensureArtifactContent("", "update")).toThrow(/update.*no content/i)
	})
})

// ── writeArtifactClear ───────────────────────────────────────────

describe("writeArtifactClear", () => {
	it("writes artifact-clear with empty content", () => {
		const writer = mockWriter()
		writeArtifactClear(writer)
		expect(writer.calls).toEqual([{ type: "artifact-clear", content: "" }])
	})
})

// ── writeArtifactCreatePrelude ───────────────────────────────────

describe("writeArtifactCreatePrelude", () => {
	it("writes kind, id, title, and clear in correct order", () => {
		const writer = mockWriter()
		writeArtifactCreatePrelude(writer, {
			id: "art-1",
			title: "My Artifact",
			kind: "code",
		})
		expect(writer.calls).toEqual([
			{ type: "artifact-kind", content: "code" },
			{ type: "artifact-id", content: "art-1" },
			{ type: "artifact-title", content: "My Artifact" },
			{ type: "artifact-clear", content: "" },
		])
	})

	it("writes 4 data parts total", () => {
		const writer = mockWriter()
		writeArtifactCreatePrelude(writer, {
			id: "x",
			title: "y",
			kind: "text",
		})
		expect(writer.calls).toHaveLength(4)
	})
})

// ── writeArtifactFinish ──────────────────────────────────────────

describe("writeArtifactFinish", () => {
	it("writes artifact-finish with empty content", () => {
		const writer = mockWriter()
		writeArtifactFinish(writer)
		expect(writer.calls).toEqual([{ type: "artifact-finish", content: "" }])
	})
})

// ── createDeferredArtifactClearWriter ────────────────────────────

describe("createDeferredArtifactClearWriter", () => {
	let underlying: ReturnType<typeof mockWriter>
	let deferred: ArtifactStreamWriter

	beforeEach(() => {
		underlying = mockWriter()
		deferred = createDeferredArtifactClearWriter(underlying)
	})

	it("passes non-delta data through immediately", () => {
		deferred.writeData({ type: "artifact-id", content: "id-1" })
		expect(underlying.calls).toEqual([{ type: "artifact-id", content: "id-1" }])
	})

	it("defers clear until first usable delta content", () => {
		// First write: empty text delta — should be buffered, no clear yet
		deferred.writeData({ type: "artifact-textDelta", content: "" })
		expect(underlying.calls).toHaveLength(0)

		// Second write: usable text delta — triggers clear then data
		deferred.writeData({ type: "artifact-textDelta", content: "Hello" })
		expect(underlying.calls).toHaveLength(2)
		expect(underlying.calls[0]).toEqual({ type: "artifact-clear", content: "" })
		expect(underlying.calls[1]).toEqual({ type: "artifact-textDelta", content: "Hello" })
	})

	it("flushes buffered leading text with first usable textDelta", () => {
		// Buffer whitespace-only textDeltas
		deferred.writeData({ type: "artifact-textDelta", content: "  " })
		deferred.writeData({ type: "artifact-textDelta", content: "\n" })
		expect(underlying.calls).toHaveLength(0)

		// First usable delta flushes buffered text
		deferred.writeData({ type: "artifact-textDelta", content: "content" })
		expect(underlying.calls).toHaveLength(2)
		expect(underlying.calls[0]).toEqual({ type: "artifact-clear", content: "" })
		expect(underlying.calls[1]).toEqual({
			type: "artifact-textDelta",
			content: "  \ncontent",
		})
	})

	it("passes deltas through after clear has been written", () => {
		// Trigger clear
		deferred.writeData({ type: "artifact-textDelta", content: "first" })
		expect(underlying.calls).toHaveLength(2) // clear + delta

		// Subsequent deltas pass through directly
		deferred.writeData({ type: "artifact-textDelta", content: " second" })
		expect(underlying.calls).toHaveLength(3)
		expect(underlying.calls[2]).toEqual({
			type: "artifact-textDelta",
			content: " second",
		})
	})

	it("triggers clear immediately for codeDelta with usable content", () => {
		deferred.writeData({ type: "artifact-codeDelta", content: "const x = 1" })
		expect(underlying.calls).toHaveLength(2)
		expect(underlying.calls[0]).toEqual({ type: "artifact-clear", content: "" })
		expect(underlying.calls[1]).toEqual({
			type: "artifact-codeDelta",
			content: "const x = 1",
		})
	})

	it("does not buffer codeDelta with empty content (non-textDelta)", () => {
		// Empty codeDelta is not textDelta, so it's not buffered as leading text
		// But it has no usable content, so no clear is triggered
		deferred.writeData({ type: "artifact-codeDelta", content: "   " })
		expect(underlying.calls).toHaveLength(0)
	})

	it("triggers clear for non-string content delta", () => {
		deferred.writeData({ type: "artifact-codeDelta", content: 123 as unknown as string })
		expect(underlying.calls).toHaveLength(2)
		expect(underlying.calls[0]).toEqual({ type: "artifact-clear", content: "" })
	})

	it("passes non-artifact types through without deferral", () => {
		deferred.writeData({ type: "artifact-title", content: "Title" })
		deferred.writeData({ type: "artifact-kind", content: "code" })
		expect(underlying.calls).toHaveLength(2)
	})
})
