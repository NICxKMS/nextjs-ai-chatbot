import { describe, expect, it } from "vitest"

import { getModelCapabilities } from "@/lib/ai/model-capabilities"
import { getReasoningTag } from "@/lib/ai/model-capability-inference"
import { getProviderOptions } from "@/lib/ai/provider-options"
import { getEnabledTools, TOOL_IDS } from "@/lib/ai/tools"
import type { ModelMetadata } from "@/lib/types/model.types"
import type { SettingsState } from "@/lib/types/settings.types"

function model(
	overrides: Partial<ModelMetadata> & Pick<ModelMetadata, "id" | "provider">,
): ModelMetadata {
	const { id, provider, ...rest } = overrides
	return {
		id,
		provider,
		providerModelId: id.split(":").slice(1).join(":"),
		name: id,
		supportsToolCalling: false,
		supportsReasoning: false,
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 4096,
		maxOutputTokens: 4096,
		source: "static",
		...rest,
	}
}

const settings: SettingsState = {
	temperature: 0.4,
	topP: 0.9,
	maxOutputTokens: 2048,
	systemPrompt: "",
	enableReasoning: true,
	contextDisplayMode: "compact",
}

describe("AI contract helpers", () => {
	it("gates the canonical tool list by model tool capability", () => {
		expect(getEnabledTools(model({ id: "google:no-tools", provider: "google" }))).toEqual([])
		expect(
			getEnabledTools(
				model({ id: "google:tools", provider: "google", supportsToolCalling: true }),
			),
		).toEqual(TOOL_IDS)
	})

	it("infers reasoning tag names from supported provider/model prefixes", () => {
		expect(getReasoningTag("google:gemini-3-flash-preview")).toEqual({ tagName: "thinking" })
		expect(getReasoningTag("google:gemini-2.5-flash")).toEqual({ tagName: "thinking" })
		expect(getReasoningTag("openai:o3-mini")).toEqual({ tagName: "thinking" })
		expect(getReasoningTag("openrouter:deepseek/deepseek-r1:free")).toEqual({
			tagName: "think",
		})
		expect(getReasoningTag("openrouter:anthropic/claude-3.5-sonnet")).toBeNull()
	})

	it("prefers supplied metadata over prefix inference for tool and reasoning capabilities", () => {
		const metadata = model({
			id: "google:gemini-2.5-flash",
			provider: "google",
			supportsToolCalling: true,
			supportsReasoning: false,
			reasoningTagName: "catalog-tag",
		})

		expect(getModelCapabilities(metadata.id, metadata)).toEqual({
			metadata,
			supportsToolCalling: true,
			supportsReasoning: false,
			reasoningTag: null,
		})
	})

	it("falls back to prefix reasoning inference for uncataloged models", () => {
		expect(getModelCapabilities("openai:o3-mini")).toMatchObject({
			metadata: undefined,
			supportsToolCalling: false,
			supportsReasoning: true,
			reasoningTag: { tagName: "thinking" },
		})
	})

	it("shapes provider reasoning options only for enabled reasoning-capable providers", () => {
		expect(
			getProviderOptions("google:gemini-2.5-flash", settings, {
				provider: "google",
				supportsReasoning: true,
			}),
		).toEqual({
			temperature: settings.temperature,
			topP: settings.topP,
			maxOutputTokens: settings.maxOutputTokens,
			providerOptions: { google: { thinkingConfig: { thinkingBudget: -1 } } },
		})

		expect(
			getProviderOptions("google:gemini-3-flash-preview", settings, {
				provider: "google",
				supportsReasoning: true,
			}),
		).toMatchObject({
			providerOptions: { google: { thinkingConfig: { thinkingLevel: "medium" } } },
		})

		expect(
			getProviderOptions("openai:o3-mini", settings, {
				provider: "openai",
				supportsReasoning: true,
			}),
		).toMatchObject({ providerOptions: { openai: { reasoningEffort: "medium" } } })

		expect(
			getProviderOptions("openrouter:deepseek/deepseek-r1:free", settings, {
				provider: "openrouter",
				supportsReasoning: true,
			}),
		).toMatchObject({ providerOptions: { openrouter: { reasoning: { max_tokens: 8000 } } } })

		expect(
			getProviderOptions("google:gemma-3-4b-it", settings, {
				provider: "google",
				supportsReasoning: false,
			}),
		).toEqual({
			temperature: settings.temperature,
			topP: settings.topP,
			maxOutputTokens: settings.maxOutputTokens,
		})
	})
})
