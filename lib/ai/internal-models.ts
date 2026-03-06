import { myProvider } from "@/lib/ai/provider"
import { ARTIFACT_MODEL, TITLE_MODEL } from "@/lib/types/model.types"

const internalLanguageModels = {
	artifact: ARTIFACT_MODEL,
	title: TITLE_MODEL,
} as const

export type InternalLanguageModel = keyof typeof internalLanguageModels

export function getInternalLanguageModelId(kind: InternalLanguageModel): string {
	return internalLanguageModels[kind]
}

export function getInternalLanguageModel(kind: InternalLanguageModel) {
	return myProvider.languageModel(getInternalLanguageModelId(kind))
}
