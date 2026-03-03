// ── Provider identifiers (NO vercel-gateway / xAI) ──

export type ProviderId = "openai" | "google" | "openrouter"

// ── Model metadata ──

export interface ModelMetadata {
	/** Full model ID (e.g. "openai:gpt-4o") */
	id: string
	/** Provider identifier — widened to string for OpenRouter dynamic models. */
	provider: string
	/** Provider-specific model ID (e.g. "gpt-4o") */
	providerModelId: string
	/** Display name */
	name: string
	description?: string
	/** Whether the model supports tool/function calling */
	supportsToolCalling: boolean
	/** Whether the model supports extended reasoning */
	supportsReasoning: boolean
	/** Input/output modality lists (e.g. ["text", "image"]) */
	modalities: { input: string[]; output: string[] }
	/** Maximum context window size in tokens */
	contextWindow: number
	/** Maximum output tokens */
	maxOutputTokens: number
	/** Whether the model was statically configured or dynamically discovered */
	source: "static" | "dynamic"
}

// ── Default model constants ──

export const DEFAULT_CHAT_MODEL = "google:gemma-3-4b-it"
export const TITLE_MODEL = "google:gemma-3-4b-it"
export const ARTIFACT_MODEL = "google:gemini-2.5-flash-lite"
