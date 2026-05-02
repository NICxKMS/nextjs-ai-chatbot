import { getReasoningTag } from "@/lib/ai/model-capability-inference"
import type { ModelMetadata } from "@/lib/types/model.types"

// ── Static model catalog ────────────────────────────────────────────────────
// Curated models from all registered providers (google, openai, openrouter).
// These are guaranteed available as a baseline, even when dynamic discovery fails.

export const STATIC_MODELS: ModelMetadata[] = [
	// ── Google (always available) ──────────────────────────────────────────

	{
		id: "google:gemma-3-4b-it",
		provider: "google",
		providerModelId: "gemma-3-4b-it",
		name: "Gemma 3 4B",
		description: "Lightweight multimodal model optimized for fast responses",
		supportsToolCalling: false,
		supportsReasoning: false,
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
	{
		id: "google:gemini-2.5-flash-lite",
		provider: "google",
		providerModelId: "gemini-2.5-flash-lite",
		name: "Gemini 2.5 Flash Lite",
		description: "Ultra-fast and cost-efficient model for high-volume tasks",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 1_000_000,
		maxOutputTokens: 65_536,
		source: "static",
	},
	{
		id: "google:gemini-2.5-flash",
		provider: "google",
		providerModelId: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		description: "Fast model with reasoning and multimodal support",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image", "audio"], output: ["text"] },
		contextWindow: 1_000_000,
		maxOutputTokens: 65_536,
		source: "static",
	},
	{
		id: "google:gemini-2.5-pro",
		provider: "google",
		providerModelId: "gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		description: "Advanced model with strong reasoning and coding capabilities",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 1_000_000,
		maxOutputTokens: 65_536,
		source: "static",
	},
	{
		id: "google:gemini-3-flash-preview",
		provider: "google",
		providerModelId: "gemini-3-flash-preview",
		name: "Gemini 3 Flash",
		description: "Pro-level intelligence at Flash speed and pricing",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 1_000_000,
		maxOutputTokens: 65_536,
		source: "static",
	},
	{
		id: "google:gemini-3.1-flash-lite-preview",
		provider: "google",
		providerModelId: "gemini-3.1-flash-lite-preview",
		name: "Gemini 3.1 Flash Lite",
		description: "Fastest cost-efficient model for high-volume agentic tasks",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 1_000_000,
		maxOutputTokens: 65_536,
		source: "static",
	},

	// ── OpenAI (conditional on OPENAI_API_KEY) ─────────────────────────────

	{
		id: "openai:gpt-4o",
		provider: "openai",
		providerModelId: "gpt-4o",
		name: "GPT-4o",
		description: "Flagship multimodal model with strong general capabilities",
		supportsToolCalling: true,
		supportsReasoning: false,
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 16_384,
		source: "static",
	},
	{
		id: "openai:gpt-4.1",
		provider: "openai",
		providerModelId: "gpt-4.1",
		name: "GPT-4.1",
		description: "Reasoning model with tool and vision support",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 32_768,
		source: "static",
	},

	// ── OpenRouter (conditional on OPENROUTER_API_KEY) ─────────────────────

	{
		id: "openrouter:anthropic/claude-3.7-sonnet",
		provider: "openrouter",
		providerModelId: "anthropic/claude-3.7-sonnet",
		name: "Claude 3.7 Sonnet",
		description: "Latest Claude with extended thinking for deep reasoning",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "thinking",
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 200_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
	{
		id: "openrouter:anthropic/claude-3.5-sonnet",
		provider: "openrouter",
		providerModelId: "anthropic/claude-3.5-sonnet",
		name: "Claude 3.5 Sonnet",
		description: "High-performance model with strong coding capabilities",
		supportsToolCalling: true,
		supportsReasoning: false,
		modalities: { input: ["text", "image"], output: ["text"] },
		contextWindow: 200_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
	{
		id: "openrouter:deepseek/deepseek-r1:free",
		provider: "openrouter",
		providerModelId: "deepseek/deepseek-r1:free",
		name: "DeepSeek R1",
		description: "Open-source reasoning model with native chain-of-thought",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "think",
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
	{
		id: "openrouter:deepseek/deepseek-chat:free",
		provider: "openrouter",
		providerModelId: "deepseek/deepseek-chat:free",
		name: "DeepSeek V3",
		description: "Flagship chat model with strong reasoning and coding performance",
		supportsToolCalling: true,
		supportsReasoning: true,
		reasoningTagName: "think",
		modalities: { input: ["text"], output: ["text"] },
		contextWindow: 128_000,
		maxOutputTokens: 8_192,
		source: "static",
	},
]

const STATIC_MODEL_LOOKUP = new Map(STATIC_MODELS.map((model) => [model.id, model]))

// ── Model lookup ────────────────────────────────────────────────────────────

/** Look up a static model by its full ID (e.g. "google:gemma-3-4b-it"). */
export function getModelById(id: string): ModelMetadata | undefined {
	return STATIC_MODEL_LOOKUP.get(id)
}

// ── OpenRouter dynamic discovery ────────────────────────────────────────────

/** Shape of a single model in the OpenRouter /models response. */
type OpenRouterModel = {
	id: string
	name?: string
	description?: string
	context_length?: number
	top_provider?: {
		max_completion_tokens?: number
	}
	architecture?: {
		input_modalities?: string[]
		output_modalities?: string[]
	}
	supported_parameters?: string[]
}

type OpenRouterResponse = {
	data: OpenRouterModel[]
}

const DISCOVER_TIMEOUT_MS = 5_000
const DEFAULT_CONTEXT_WINDOW = 4_096
const DEFAULT_MAX_OUTPUT_TOKENS = 4_096

function mapOpenRouterModel(model: OpenRouterModel): ModelMetadata {
	const modelId = `openrouter:${model.id}`
	const inputModalities = model.architecture?.input_modalities ?? ["text"]
	const outputModalities = model.architecture?.output_modalities ?? ["text"]
	const reasoningTag = getReasoningTag(modelId)

	return {
		id: modelId,
		provider: "openrouter",
		providerModelId: model.id,
		name: model.name ?? model.id,
		description: model.description,
		supportsToolCalling: model.supported_parameters?.includes("tools") ?? false,
		supportsReasoning: reasoningTag !== null,
		reasoningTagName: reasoningTag?.tagName,
		modalities: {
			input: inputModalities,
			output: outputModalities,
		},
		contextWindow: model.context_length ?? DEFAULT_CONTEXT_WINDOW,
		maxOutputTokens: model.top_provider?.max_completion_tokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
		source: "dynamic",
	}
}

/**
 * Discover models from the OpenRouter API.
 *
 * Returns an empty array if:
 * - `OPENROUTER_API_KEY` is not set
 * - The request fails or times out (5s)
 * - The response is malformed
 *
 * Discovered models have `source: "dynamic"` and conservative capability defaults.
 */
export async function discoverModels(): Promise<ModelMetadata[]> {
	const apiKey = process.env.OPENROUTER_API_KEY
	if (!apiKey) return []

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), DISCOVER_TIMEOUT_MS)

	try {
		const response = await fetch("https://openrouter.ai/api/v1/models", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
			},
			signal: controller.signal,
		})

		if (!response.ok) return []

		const data = (await response.json()) as OpenRouterResponse

		if (!Array.isArray(data?.data)) return []

		return data.data.map(mapOpenRouterModel)
	} catch {
		// Timeout, network error, or abort — fail silently with empty array
		return []
	} finally {
		clearTimeout(timeout)
	}
}
