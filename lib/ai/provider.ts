import type { EmbeddingModelV3, ImageModelV3, LanguageModelV3, ProviderV3 } from "@ai-sdk/provider"
import { extractReasoningMiddleware, wrapLanguageModel } from "ai"
import { getModelCapabilities } from "@/lib/ai/model-capabilities"
import { registry } from "@/lib/ai/registry"

/**
 * Module-level cache for wrapped language model instances.
 *
 * Reasoning middleware wrapping is deterministic for a given modelId,
 * so caching avoids re-creating wrapper objects on every request.
 */
const modelCache = new Map<string, LanguageModelV3>()

type RegistryModelId = `${string}:${string}`

/** Model IDs must be in `provider:model-name` format with non-empty segments. */
const MODEL_ID_PATTERN = /^[a-z][a-z0-9]*:[a-zA-Z0-9][a-zA-Z0-9_.\-/]*$/

function assertValidModelId(modelId: string): asserts modelId is RegistryModelId {
	if (!MODEL_ID_PATTERN.test(modelId)) {
		throw new Error(
			`Invalid model ID "${modelId}". Expected format: "provider:model-name" (e.g. "google:gemini-2.5-flash").`,
		)
	}
}

/**
 * Single entry point for obtaining language models throughout the app.
 *
 * Resolves models via the AI provider registry and conditionally applies
 * `extractReasoningMiddleware` for models that support chain-of-thought
 * reasoning (matched by model metadata or ID prefix inference).
 *
 * Model instances are cached at module level — the registry model + middleware
 * combination is deterministic for a given modelId.
 *
 * Previously wrapped in a no-op `customProvider` with an empty model map
 * that fell through entirely to this logic. That indirection was removed.
 *
 * @example
 * ```ts
 * import { myProvider } from "@/lib/ai/provider"
 *
 * const model = myProvider.languageModel("google:gemini-2.5-flash")
 * ```
 */
export const myProvider: ProviderV3 = {
	specificationVersion: "v3",

	languageModel(modelId: string): LanguageModelV3 {
		const cached = modelCache.get(modelId)
		if (cached) return cached

		assertValidModelId(modelId)
		const base = registry.languageModel(modelId)
		const { reasoningTag } = getModelCapabilities(modelId)

		// Reasoning middleware is only applied when the model declares reasoning
		// support (via catalog metadata or prefix inference). For non-reasoning
		// models, `reasoningTag` is null and this branch is skipped — no overhead.
		let model: LanguageModelV3
		if (reasoningTag) {
			model = wrapLanguageModel({
				model: base,
				middleware: extractReasoningMiddleware(reasoningTag),
			})
		} else {
			model = base
		}

		modelCache.set(modelId, model)
		return model
	},

	embeddingModel(modelId: string): EmbeddingModelV3 {
		assertValidModelId(modelId)
		return registry.embeddingModel(modelId)
	},

	imageModel(modelId: string): ImageModelV3 {
		assertValidModelId(modelId)
		return registry.imageModel(modelId)
	},
}
