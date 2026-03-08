// Flow: ai-tool-selection | Step: tool-enablement

import { describe, expect, it } from "vitest"

import { getEnabledTools, TOOL_IDS, type ToolId } from "@/lib/ai/tools"
import type { ModelMetadata } from "@/lib/types/model.types"

// ── Helpers ──────────────────────────────────────────────────

function createModelMetadata(overrides: Partial<ModelMetadata> = {}): ModelMetadata {
	return {
		id: "test:model-1",
		provider: "openai",
		providerModelId: "model-1",
		name: "Test Model",
		supportsToolCalling: true,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 4096,
		source: "static",
		...overrides,
	}
}

// ── TOOL_IDS ─────────────────────────────────────────────────

describe("TOOL_IDS", () => {
	it("is a non-empty readonly array", () => {
		expect(Array.isArray(TOOL_IDS)).toBe(true)
		expect(TOOL_IDS.length).toBeGreaterThan(0)
	})

	it("contains expected tool IDs", () => {
		const expected: ToolId[] = [
			"getWeather",
			"createArtifact",
			"updateArtifact",
			"requestSuggestions",
		]
		for (const id of expected) {
			expect(TOOL_IDS).toContain(id)
		}
	})

	it("uses artifact naming, not document naming", () => {
		for (const id of TOOL_IDS) {
			expect(id).not.toContain("Document")
			expect(id).not.toContain("document")
		}
	})
})

// ── getEnabledTools ──────────────────────────────────────────

describe("getEnabledTools", () => {
	it("returns all tool IDs when model supports tool calling", () => {
		const model = createModelMetadata({ supportsToolCalling: true })
		const result = getEnabledTools(model)

		expect(result).toEqual(TOOL_IDS)
	})

	it("returns empty array when model does not support tool calling", () => {
		const model = createModelMetadata({ supportsToolCalling: false })
		const result = getEnabledTools(model)

		expect(result).toEqual([])
	})

	it("returns readonly array", () => {
		const model = createModelMetadata({ supportsToolCalling: true })
		const result = getEnabledTools(model)

		// Result should be the same reference as TOOL_IDS (frozen/readonly)
		expect(result).toBe(TOOL_IDS)
	})

	it("does not depend on modalities — only supportsToolCalling matters", () => {
		const modelWithImage = createModelMetadata({
			supportsToolCalling: true,
			modalities: { input: ["text", "image"], output: ["text"] },
		})
		const modelTextOnly = createModelMetadata({
			supportsToolCalling: true,
			modalities: { input: ["text"], output: ["text"] },
		})

		expect(getEnabledTools(modelWithImage)).toEqual(getEnabledTools(modelTextOnly))
	})

	it("does not depend on supportsReasoning", () => {
		const reasoningModel = createModelMetadata({
			supportsToolCalling: true,
			supportsReasoning: true,
		})
		const standardModel = createModelMetadata({
			supportsToolCalling: true,
			supportsReasoning: false,
		})

		expect(getEnabledTools(reasoningModel)).toEqual(getEnabledTools(standardModel))
	})
})
