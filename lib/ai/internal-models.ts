import { myProvider } from "@/lib/ai/provider"
import { getRequiredProviderEnvKey, isProviderConfigured } from "@/lib/ai/registry"
import { AppError } from "@/lib/errors/app-error"
import { ARTIFACT_MODEL, type ProviderId, TITLE_MODEL } from "@/lib/types/model.types"

const internalLanguageModels = {
	artifact: { providerId: "google", modelId: ARTIFACT_MODEL },
	title: { providerId: "google", modelId: TITLE_MODEL },
} as const satisfies Record<string, { providerId: ProviderId; modelId: string }>

export type InternalLanguageModel = keyof typeof internalLanguageModels

function getInternalModelProviderId(kind: InternalLanguageModel): ProviderId {
	return internalLanguageModels[kind].providerId
}

function getInternalLanguageModelId(kind: InternalLanguageModel): string {
	const providerId = getInternalModelProviderId(kind)
	const modelId = internalLanguageModels[kind].modelId

	if (!isProviderConfigured(providerId)) {
		throw AppError.aiError(
			"ai_error:provider:failed",
			`Internal ${kind} model "${modelId}" is unavailable because ${getRequiredProviderEnvKey(providerId)} is not configured.`,
		)
	}

	return modelId
}

export function getInternalLanguageModel(kind: InternalLanguageModel) {
	return myProvider.languageModel(getInternalLanguageModelId(kind))
}
