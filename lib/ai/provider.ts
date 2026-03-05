import type { ProviderV3 } from "@ai-sdk/provider"
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { registry } from "@/lib/ai/registry"

/**
 * Reasoning tag patterns keyed by model-ID prefix.
 *
 * When a requested model ID starts with one of these prefixes,
 * `extractReasoningMiddleware` is applied with the corresponding tag name
 * so the AI SDK can surface chain-of-thought reasoning from the model.
 */
const REASONING_TAGS: Record<string, { tagName: string }> = {
	"openai:o": { tagName: "thinking" },
	"google:gemini-2.5": { tagName: "thinking" },
	"openrouter:deepseek/deepseek-r1": { tagName: "think" },
}

function getReasoningTag(modelId: string): { tagName: string } | null {
	for (const [prefix, tag] of Object.entries(REASONING_TAGS)) {
		if (modelId.startsWith(prefix)) return tag
	}
	return null
}

/**
 * Intermediate provider that wraps registry models with reasoning middleware.
 *
 * Used as `fallbackProvider` for `customProvider` so every model ID is
 * resolved dynamically through the registry rather than a static map.
 */
type RegistryModelId = `${string}:${string}`

const reasoningProvider: ProviderV3 = {
	specificationVersion: "v3",
	languageModel(modelId: string) {
		const base = registry.languageModel(modelId as RegistryModelId)
		const reasoningTag = getReasoningTag(modelId)

		if (reasoningTag) {
			return wrapLanguageModel({
				model: base,
				middleware: extractReasoningMiddleware(reasoningTag),
			})
		}

		return base
	},

	embeddingModel(modelId: string) {
		return registry.embeddingModel(modelId as RegistryModelId)
	},

	imageModel(modelId: string) {
		return registry.imageModel(modelId as RegistryModelId)
	},
}

/**
 * Single entry point for obtaining language models throughout the app.
 *
 * Resolves models via the AI provider registry and conditionally applies
 * `extractReasoningMiddleware` for models that support chain-of-thought
 * reasoning (matched by model-ID prefix).
 *
 * @example
 * ```ts
 * import { myProvider } from "@/lib/ai/provider"
 *
 * const model = myProvider.languageModel("google:gemini-2.5-flash")
 * ```
 */
export const myProvider = customProvider({
	fallbackProvider: reasoningProvider,
})
