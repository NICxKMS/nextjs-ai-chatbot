// Flow: chat-streaming | Step: delta-processing
import { describe, expect, it } from "vitest"

import {
	collapseReplaceDeltas,
	DEFAULT_ARTIFACT,
	processStreamDelta,
} from "@/features/chat/lib/process-stream-deltas"
import type { DataPart } from "@/features/chat/types/chat.types"
import type { UIArtifact } from "@/lib/types/artifact.types"

// ── Helpers ──────────────────────────────────────────────────────

function delta(type: DataPart["type"], content: string = ""): DataPart {
	return { type, content } as DataPart
}

function baseArtifact(overrides: Partial<UIArtifact> = {}): UIArtifact {
	return { ...DEFAULT_ARTIFACT, ...overrides }
}

// ── DEFAULT_ARTIFACT ─────────────────────────────────────────────

describe("DEFAULT_ARTIFACT", () => {
	it("has expected default shape", () => {
		expect(DEFAULT_ARTIFACT).toEqual({
			artifactId: "",
			title: "",
			kind: "text",
			content: "",
			isVisible: false,
			status: "idle",
			suggestions: [],
		})
	})

	it("status is idle by default", () => {
		expect(DEFAULT_ARTIFACT.status).toBe("idle")
	})

	it("isVisible is false by default", () => {
		expect(DEFAULT_ARTIFACT.isVisible).toBe(false)
	})
})

// ── collapseReplaceDeltas ────────────────────────────────────────

describe("collapseReplaceDeltas", () => {
	it("returns empty array for empty input", () => {
		expect(collapseReplaceDeltas([])).toEqual([])
	})

	it("returns single-element array unchanged", () => {
		const deltas = [delta("artifact-codeDelta", "code")]
		expect(collapseReplaceDeltas(deltas)).toEqual(deltas)
	})

	it("keeps last codeDelta when multiple are present", () => {
		const deltas = [
			delta("artifact-codeDelta", "v1"),
			delta("artifact-codeDelta", "v2"),
			delta("artifact-codeDelta", "v3"),
		]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual(delta("artifact-codeDelta", "v3"))
	})

	it("keeps last sheetDelta when multiple are present", () => {
		const deltas = [delta("artifact-sheetDelta", "s1"), delta("artifact-sheetDelta", "s2")]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual(delta("artifact-sheetDelta", "s2"))
	})

	it("keeps last imageDelta when multiple are present", () => {
		const deltas = [delta("artifact-imageDelta", "img1"), delta("artifact-imageDelta", "img2")]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual(delta("artifact-imageDelta", "img2"))
	})

	it("preserves non-replace deltas in order", () => {
		const deltas: DataPart[] = [
			delta("artifact-textDelta", "text1"),
			delta("artifact-codeDelta", "code1"),
			delta("artifact-textDelta", "text2"),
			delta("artifact-codeDelta", "code2"),
		]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toEqual([
			delta("artifact-textDelta", "text1"),
			delta("artifact-textDelta", "text2"),
			delta("artifact-codeDelta", "code2"),
		])
	})

	it("handles mixed replace types — each collapsed independently", () => {
		const deltas: DataPart[] = [
			delta("artifact-codeDelta", "c1"),
			delta("artifact-sheetDelta", "s1"),
			delta("artifact-codeDelta", "c2"),
			delta("artifact-sheetDelta", "s2"),
		]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toEqual([
			delta("artifact-codeDelta", "c2"),
			delta("artifact-sheetDelta", "s2"),
		])
	})

	it("returns as-is when no replace deltas exist", () => {
		const deltas: DataPart[] = [
			delta("artifact-textDelta", "t1"),
			delta("artifact-id", "id-1"),
			delta("artifact-title", "title"),
		]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toEqual(deltas)
	})

	it("handles all non-artifact delta types without collapsing", () => {
		const deltas: DataPart[] = [
			delta("chat-title", "New Chat"),
			delta("error", "something broke"),
			delta("usage", "{}"),
		]
		const result = collapseReplaceDeltas(deltas)
		expect(result).toEqual(deltas)
	})
})

// ── processStreamDelta ───────────────────────────────────────────

describe("processStreamDelta", () => {
	describe("SET deltas", () => {
		it("artifact-id: sets artifactId, streams, and makes visible", () => {
			const result = processStreamDelta(delta("artifact-id", "art-123"), baseArtifact())
			expect(result.artifactId).toBe("art-123")
			expect(result.status).toBe("streaming")
			expect(result.isVisible).toBe(true)
		})

		it("artifact-title: sets title", () => {
			const result = processStreamDelta(delta("artifact-title", "My Doc"), baseArtifact())
			expect(result.title).toBe("My Doc")
		})

		it("artifact-kind: sets kind", () => {
			const result = processStreamDelta(delta("artifact-kind", "code"), baseArtifact())
			expect(result.kind).toBe("code")
		})
	})

	describe("CLEAR delta", () => {
		it("artifact-clear: resets content and suggestions", () => {
			const state = baseArtifact({
				content: "old content",
				suggestions: [
					{
						originalText: "a",
						suggestedText: "b",
						description: "test",
					},
				],
			})
			const result = processStreamDelta(delta("artifact-clear"), state)
			expect(result.content).toBe("")
			expect(result.suggestions).toEqual([])
		})

		it("artifact-clear: preserves other fields", () => {
			const state = baseArtifact({
				artifactId: "x",
				title: "y",
				kind: "code",
				isVisible: true,
				status: "streaming",
				content: "will be cleared",
			})
			const result = processStreamDelta(delta("artifact-clear"), state)
			expect(result.artifactId).toBe("x")
			expect(result.title).toBe("y")
			expect(result.kind).toBe("code")
			expect(result.isVisible).toBe(true)
			expect(result.status).toBe("streaming")
		})
	})

	describe("FINISH delta", () => {
		it("artifact-finish: sets status to idle", () => {
			const state = baseArtifact({ status: "streaming" })
			const result = processStreamDelta(delta("artifact-finish"), state)
			expect(result.status).toBe("idle")
		})
	})

	describe("APPEND deltas", () => {
		it("artifact-textDelta: appends to content", () => {
			const state = baseArtifact({ content: "Hello " })
			const result = processStreamDelta(delta("artifact-textDelta", "world"), state)
			expect(result.content).toBe("Hello world")
		})

		it("artifact-textDelta: appends to empty content", () => {
			const result = processStreamDelta(delta("artifact-textDelta", "first"), baseArtifact())
			expect(result.content).toBe("first")
		})

		it("artifact-suggestion: appends to suggestions array", () => {
			const suggestion = {
				originalText: "foo",
				suggestedText: "bar",
				description: "improve",
			}
			const state = baseArtifact({ suggestions: [] })
			const result = processStreamDelta(
				{ type: "artifact-suggestion", content: suggestion } as DataPart,
				state,
			)
			expect(result.suggestions).toEqual([suggestion])
		})

		it("artifact-suggestion: accumulates multiple suggestions", () => {
			const s1 = { originalText: "a", suggestedText: "b", description: "1" }
			const s2 = { originalText: "c", suggestedText: "d", description: "2" }
			let state = baseArtifact({ suggestions: [] })
			state = processStreamDelta(
				{ type: "artifact-suggestion", content: s1 } as DataPart,
				state,
			)
			state = processStreamDelta(
				{ type: "artifact-suggestion", content: s2 } as DataPart,
				state,
			)
			expect(state.suggestions).toEqual([s1, s2])
		})
	})

	describe("REPLACE deltas", () => {
		it("artifact-codeDelta: replaces content entirely", () => {
			const state = baseArtifact({ content: "old code" })
			const result = processStreamDelta(delta("artifact-codeDelta", "new code"), state)
			expect(result.content).toBe("new code")
		})

		it("artifact-sheetDelta: replaces content entirely", () => {
			const state = baseArtifact({ content: "old sheet" })
			const result = processStreamDelta(delta("artifact-sheetDelta", "new sheet"), state)
			expect(result.content).toBe("new sheet")
		})

		it("artifact-imageDelta: replaces content entirely", () => {
			const state = baseArtifact({ content: "old image" })
			const result = processStreamDelta(delta("artifact-imageDelta", "new image"), state)
			expect(result.content).toBe("new image")
		})
	})

	describe("no-op deltas", () => {
		it("chat-title: returns current state unchanged", () => {
			const state = baseArtifact({ content: "unchanged" })
			const result = processStreamDelta(delta("chat-title", "New Title"), state)
			expect(result).toBe(state)
		})

		it("usage: returns current state unchanged", () => {
			const state = baseArtifact()
			const result = processStreamDelta(delta("usage", "{}"), state)
			expect(result).toBe(state)
		})

		it("error: returns current state unchanged", () => {
			const state = baseArtifact()
			const result = processStreamDelta(delta("error", "oops"), state)
			expect(result).toBe(state)
		})
	})

	describe("immutability", () => {
		it("does not mutate the original state", () => {
			const original = baseArtifact({ content: "original" })
			const frozen = Object.freeze({ ...original })
			const result = processStreamDelta(delta("artifact-textDelta", " appended"), frozen)
			expect(result.content).toBe("original appended")
			expect(frozen.content).toBe("original")
		})
	})
})
