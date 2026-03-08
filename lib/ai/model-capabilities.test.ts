// Flow: ai-model-selection | Step: capability-inference
import { describe, expect, it } from "vitest"

import { getModelCapabilities } from "@/lib/ai/model-capabilities"
import type { ModelMetadata } from "@/lib/types/model.types"

describe("getModelCapabilities", () => {
	// ── Known catalog models ──

	it("resolves capabilities for a reasoning model from catalog", () => {
		const caps = getModelCapabilities("google:gemini-2.5-flash")

		expect(caps.metadata).toBeDefined()
		expect(caps.supportsReasoning).toBe(true)
		expect(caps.supportsToolCalling).toBe(true)
		expect(caps.reasoningTag).toEqual({ tagName: "thinking" })
	})

	it("resolves capabilities for a non-reasoning model from catalog", () => {
		const caps = getModelCapabilities("openai:gpt-4o")

		expect(caps.metadata).toBeDefined()
		expect(caps.supportsReasoning).toBe(false)
		expect(caps.supportsToolCalling).toBe(true)
		expect(caps.reasoningTag).toBeNull()
	})

	it("resolves capabilities for a model with no tool calling", () => {
		const caps = getModelCapabilities("google:gemma-3-4b-it")

		expect(caps.metadata).toBeDefined()
		expect(caps.supportsToolCalling).toBe(false)
		expect(caps.supportsReasoning).toBe(false)
		expect(caps.reasoningTag).toBeNull()
	})

	it('uses "think" tag for DeepSeek R1', () => {
		const caps = getModelCapabilities("openrouter:deepseek/deepseek-r1:free")

		expect(caps.supportsReasoning).toBe(true)
		expect(caps.reasoningTag).toEqual({ tagName: "think" })
	})

	// ── Explicit metadata override ──

	it("prefers explicit metadata over catalog lookup", () => {
		const customMetadata: ModelMetadata = {
			id: "openai:gpt-4o",
			provider: "openai",
			providerModelId: "gpt-4o",
			name: "Custom GPT-4o",
			supportsToolCalling: false,
			supportsReasoning: true,
			reasoningTagName: "custom-tag",
			modalities: { input: ["text"], output: ["text"] },
			contextWindow: 128_000,
			maxOutputTokens: 4_096,
			source: "static",
		}

		const caps = getModelCapabilities("openai:gpt-4o", customMetadata)

		expect(caps.metadata).toBe(customMetadata)
		expect(caps.supportsToolCalling).toBe(false) // from custom metadata
		expect(caps.supportsReasoning).toBe(true)
		expect(caps.reasoningTag).toEqual({ tagName: "custom-tag" })
	})

	// ── Unknown model (not in catalog) ──

	it("falls back to prefix inference for unknown models", () => {
		const caps = getModelCapabilities("google:gemini-2.5-some-new-model")

		expect(caps.metadata).toBeUndefined()
		expect(caps.supportsToolCalling).toBe(false) // default when no metadata
		expect(caps.supportsReasoning).toBe(true) // inferred from prefix
		expect(caps.reasoningTag).toEqual({ tagName: "thinking" })
	})

	it("returns no capabilities for completely unknown model", () => {
		const caps = getModelCapabilities("unknown:some-model")

		expect(caps.metadata).toBeUndefined()
		expect(caps.supportsToolCalling).toBe(false)
		expect(caps.supportsReasoning).toBe(false)
		expect(caps.reasoningTag).toBeNull()
	})

	// ── Edge case: metadata says supportsReasoning=false ──

	it("returns null reasoningTag when supportsReasoning is false even if tag matches prefix", () => {
		const caps = getModelCapabilities("google:gemma-3-4b-it")
		// gemma doesn't match reasoning prefix, and metadata says no reasoning
		expect(caps.reasoningTag).toBeNull()
	})
})
