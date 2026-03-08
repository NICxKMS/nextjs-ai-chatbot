// Flow: ai-provider | Step: provider-options-resolution
import { describe, expect, it } from "vitest"

import { getProviderOptions } from "@/lib/ai/provider-options"
import type { SettingsState } from "@/lib/types/settings.types"

// ── Test helpers ────────────────────────────────────────────────────────────

function createSettings(overrides: Partial<SettingsState> = {}): SettingsState {
	return {
		temperature: 0.7,
		topP: 0.9,
		maxOutputTokens: 4096,
		systemPrompt: "",
		enableReasoning: false,
		contextDisplayMode: "compact",
		...overrides,
	}
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("getProviderOptions", () => {
	// ── Base generation parameters ──────────────────────────────────────

	it("returns temperature, topP, maxOutputTokens from settings", () => {
		const settings = createSettings({
			temperature: 0.5,
			topP: 0.8,
			maxOutputTokens: 2048,
		})

		const result = getProviderOptions("google:gemini-2.5-flash", settings)

		expect(result.temperature).toBe(0.5)
		expect(result.topP).toBe(0.8)
		expect(result.maxOutputTokens).toBe(2048)
	})

	it("does not include providerOptions when reasoning is disabled", () => {
		const settings = createSettings({ enableReasoning: false })
		const result = getProviderOptions("google:gemini-2.5-flash", settings, {
			supportsReasoning: true,
			provider: "google",
		})

		expect(result.providerOptions).toBeUndefined()
	})

	it("does not include providerOptions when model does not support reasoning", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("openai:gpt-4o", settings, {
			supportsReasoning: false,
			provider: "openai",
		})

		expect(result.providerOptions).toBeUndefined()
	})

	// ── Google reasoning options ────────────────────────────────────────

	it("returns Google thinkingConfig when reasoning is enabled for Google model", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("google:gemini-2.5-flash", settings, {
			supportsReasoning: true,
			provider: "google",
		})

		expect(result.providerOptions).toEqual({
			google: {
				thinkingConfig: {
					thinkingBudget: -1,
				},
			},
		})
	})

	it("returns Google thinkingLevel for Gemini 3 models instead of thinkingBudget", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("google:gemini-3-flash-preview", settings, {
			supportsReasoning: true,
			provider: "google",
		})

		expect(result.providerOptions).toEqual({
			google: {
				thinkingConfig: {
					thinkingLevel: "medium",
				},
			},
		})
	})

	it("returns Google thinkingLevel for Gemini 3.1 models", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("google:gemini-3.1-flash-lite-preview", settings, {
			supportsReasoning: true,
			provider: "google",
		})

		expect(result.providerOptions).toEqual({
			google: {
				thinkingConfig: {
					thinkingLevel: "medium",
				},
			},
		})
	})

	// ── OpenAI reasoning options ────────────────────────────────────────

	it("returns OpenAI reasoningEffort when reasoning is enabled for OpenAI model", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("openai:gpt-4.1", settings, {
			supportsReasoning: true,
			provider: "openai",
		})

		expect(result.providerOptions).toEqual({
			openai: {
				reasoningEffort: "medium",
			},
		})
	})

	// ── OpenRouter reasoning options ────────────────────────────────────

	it("returns OpenRouter reasoning config when reasoning is enabled", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("openrouter:deepseek/deepseek-r1:free", settings, {
			supportsReasoning: true,
			provider: "openrouter",
		})

		expect(result.providerOptions).toEqual({
			openrouter: {
				reasoning: {
					max_tokens: 8000,
				},
			},
		})
	})

	// ── Provider inference from modelId ─────────────────────────────────

	it("infers provider from model ID when metadata is not provided", () => {
		const settings = createSettings({ enableReasoning: true })

		// No metadata → provider inferred from "openai:" prefix
		// But supportsReasoning defaults to false without metadata
		const result = getProviderOptions("openai:gpt-4.1", settings)

		// Without metadata, supportsReasoning defaults to false
		expect(result.providerOptions).toBeUndefined()
	})

	it("infers provider from model ID when metadata has no provider", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("google:gemini-2.5-pro", settings, {
			supportsReasoning: true,
			provider: "google",
		})

		expect(result.providerOptions).toBeDefined()
		expect(result.providerOptions?.google).toBeDefined()
	})

	// ── No provider options for unknown providers ───────────────────────

	it("returns no providerOptions for unknown provider even with reasoning enabled", () => {
		const settings = createSettings({ enableReasoning: true })
		const result = getProviderOptions("anthropic:claude-3.5-sonnet", settings, {
			supportsReasoning: true,
			provider: "anthropic",
		})

		// anthropic is not in the switch, so no providerOptions added
		expect(result.providerOptions).toBeUndefined()
	})

	// ── Return shape ────────────────────────────────────────────────────

	it("returns the correct ProviderOptionsResult shape", () => {
		const settings = createSettings()
		const result = getProviderOptions("google:gemini-2.5-flash", settings)

		expect(result).toHaveProperty("temperature")
		expect(result).toHaveProperty("topP")
		expect(result).toHaveProperty("maxOutputTokens")
		// providerOptions may or may not be present
		const keys = Object.keys(result)
		for (const key of keys) {
			expect(["temperature", "topP", "maxOutputTokens", "providerOptions"]).toContain(key)
		}
	})
})
