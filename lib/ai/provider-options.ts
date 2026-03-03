import type { JSONValue } from "ai"
import type { SettingsState } from "@/lib/types/settings.types"

// ── Provider Options ─────────────────────────────────────────────────────────
// Builds the streamText options object from user settings and model ID.
// Reasoning configuration uses hardcoded defaults gated by `enableReasoning`.
// Per the Wave 4 decision (AI-W2-01), SettingsState has only `enableReasoning: boolean`,
// NOT `reasoningBudget`/`reasoningEffort` — those may be added later if needed.

/** Default reasoning budget (tokens) for Google models. */
const GOOGLE_THINKING_BUDGET = 1024

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
 * - Anthropic via OpenRouter (`openrouter:anthropic/*`): `thinkingBudget`
 *
 * @param modelId - Full model ID (e.g. "google:gemini-2.5-flash")
 * @param settings - Current user settings state
 */
export function getProviderOptions(
	modelId: string,
	settings: SettingsState,
): ProviderOptionsResult {
	const result: ProviderOptionsResult = {}

	// ── Model generation parameters from user settings ──
	if (settings.temperature !== undefined) {
		result.temperature = settings.temperature
	}
	if (settings.topP !== undefined) {
		result.topP = settings.topP
	}
	if (settings.maxOutputTokens !== undefined) {
		result.maxOutputTokens = settings.maxOutputTokens
	}

	// ── Per-provider reasoning configuration ──
	if (!settings.enableReasoning) {
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
	} else if (modelId.startsWith("openrouter:anthropic/")) {
		result.providerOptions = {
			anthropic: {
				thinkingBudget: 8000,
			},
		}
	}

	return result
}
