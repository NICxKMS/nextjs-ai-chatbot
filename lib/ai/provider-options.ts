import type { JSONValue } from "ai"
import { getModelCapabilities } from "@/lib/ai/model-capabilities"
import type { SettingsState } from "@/lib/types/settings.types"

// ── Provider Options ─────────────────────────────────────────────────────────
// Builds the streamText options object from user settings and model ID.
// Reasoning configuration uses hardcoded defaults gated by `enableReasoning`.
// Per the Wave 4 decision (AI-W2-01), SettingsState has only `enableReasoning: boolean`,
// NOT `reasoningBudget`/`reasoningEffort` — those may be added later if needed.

/** Default reasoning budget (tokens) for Google models. */
const GOOGLE_THINKING_BUDGET = -1

/** Default reasoning effort for OpenAI models. */
const OPENAI_REASONING_EFFORT = "medium" as const

/**
 * The shape returned by `getProviderOptions`.
 *
 * These fields map directly to Vercel AI SDK `streamText` / `generateText` options.
 */
export interface ProviderOptionsResult {
	temperature?: number
	topP?: number
	maxOutputTokens?: number
	providerOptions?: Record<string, Record<string, JSONValue>>
}

/**
 * Build provider-specific options for a model + user settings combination.
 *
 * Returns an object that can be spread into `streamText()` / `generateText()`:
 * - `temperature`, `topP`, `maxOutputTokens` from user settings
 * - `providerOptions` for reasoning-capable models when reasoning is enabled
 *
 * Provider reasoning config:
 * - Google (`google:*`): `thinkingConfig.thinkingBudget`
 * - OpenAI (`openai:*`): `reasoningEffort`
 * - OpenRouter (`openrouter:*`): `openrouter.reasoning.max_tokens`
 *
 * @param modelId - Full model ID (e.g. "google:gemini-2.5-flash")
 * @param settings - Current user settings state
 */
export function getProviderOptions(
	modelId: string,
	settings: SettingsState,
): ProviderOptionsResult {
	const { supportsReasoning } = getModelCapabilities(modelId)
	const result: ProviderOptionsResult = {
		temperature: settings.temperature,
		topP: settings.topP,
		maxOutputTokens: settings.maxOutputTokens,
	}

	// ── Model generation parameters from user settings ──
	// ── Per-provider reasoning configuration ──
	if (!settings.enableReasoning || !supportsReasoning) {
		return result
	}

	if (modelId.startsWith("google:")) {
		result.providerOptions = {
			google: {
				thinkingConfig: {
					thinkingBudget: GOOGLE_THINKING_BUDGET,
				},
			},
		}
	} else if (modelId.startsWith("openai:")) {
		result.providerOptions = {
			openai: {
				reasoningEffort: OPENAI_REASONING_EFFORT,
			},
		}
	} else if (modelId.startsWith("openrouter:")) {
		result.providerOptions = {
			openrouter: {
				reasoning: {
					max_tokens: 8000,
				},
			},
		}
	}

	return result
}
