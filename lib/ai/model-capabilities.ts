import { getReasoningTag, type ReasoningTag } from "@/lib/ai/model-capability-inference"
import { getModelById } from "@/lib/ai/models"
import type { ModelMetadata } from "@/lib/types/model.types"

export interface ModelCapabilities {
	metadata?: ModelMetadata
	supportsToolCalling: boolean
	supportsReasoning: boolean
	reasoningTag: ReasoningTag | null
}

/**
 * Resolve model capabilities from metadata or by inference.
 *
 * Prefers `metadata.reasoningTagName` (the catalog is the source of truth).
 * Falls back to prefix-based `getReasoningTag` inference for models not in the catalog
 * (e.g. dynamically discovered OpenRouter models without metadata).
 */
export function getModelCapabilities(modelId: string, metadata?: ModelMetadata): ModelCapabilities {
	const resolvedMetadata = metadata ?? getModelById(modelId)

	// Prefer catalog's reasoningTagName; fall back to prefix inference
	const catalogTag: ReasoningTag | null = resolvedMetadata?.reasoningTagName
		? { tagName: resolvedMetadata.reasoningTagName }
		: null
	const reasoningTag = catalogTag ?? getReasoningTag(modelId)

	const supportsToolCalling = resolvedMetadata?.supportsToolCalling ?? false
	const supportsReasoning = resolvedMetadata?.supportsReasoning ?? reasoningTag !== null

	return {
		metadata: resolvedMetadata,
		supportsToolCalling,
		supportsReasoning,
		reasoningTag: supportsReasoning ? reasoningTag : null,
	}
}
