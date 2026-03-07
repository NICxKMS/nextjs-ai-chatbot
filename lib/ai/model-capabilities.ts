import { getReasoningTag, type ReasoningTag } from "@/lib/ai/model-capability-inference"
import { getModelById } from "@/lib/ai/models"
import type { ModelMetadata } from "@/lib/types/model.types"

export interface ModelCapabilities {
	metadata?: ModelMetadata
	supportsToolCalling: boolean
	supportsReasoning: boolean
	reasoningTag: ReasoningTag | null
}

export function getModelCapabilities(modelId: string, metadata?: ModelMetadata): ModelCapabilities {
	const resolvedMetadata = metadata ?? getModelById(modelId)
	const reasoningTag = getReasoningTag(modelId)
	const supportsToolCalling = resolvedMetadata?.supportsToolCalling ?? false
	const supportsReasoning = resolvedMetadata?.supportsReasoning ?? reasoningTag !== null

	return {
		metadata: resolvedMetadata,
		supportsToolCalling,
		supportsReasoning,
		reasoningTag: supportsReasoning ? reasoningTag : null,
	}
}
