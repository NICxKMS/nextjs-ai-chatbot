import type { ProviderV3 } from "@ai-sdk/provider"
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { getModelCapabilities } from "@/lib/ai/model-capabilities"
import { registry } from "@/lib/ai/registry"

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
		const { reasoningTag } = getModelCapabilities(modelId)

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
