import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderV3 } from "@ai-sdk/provider"
import { createProviderRegistry } from "ai"

/**
 * Builds the AI provider registry with conditional provider inclusion.
 *
 * - `google` — Always registered. Reads `GEMINI_API_KEY` env var.
 * - `openai` — Registered if `OPENAI_API_KEY` env var exists.
 * - `openrouter` — Registered if `OPENROUTER_API_KEY` env var exists.
 *   Uses OpenAI-compatible API via custom baseURL.
 *
 * Usage: `registry.languageModel("google:gemini-2.0-flash")`
 */
function buildRegistry() {
	const providers: Record<string, ProviderV3> = {}

	// Google — always available (API key validated at model call time)
	providers.google = createGoogleGenerativeAI({
		apiKey: process.env.GEMINI_API_KEY,
	})

	// OpenAI — conditional on API key presence
	if (process.env.OPENAI_API_KEY) {
		providers.openai = createOpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		})
	}

	// OpenRouter — conditional, uses OpenAI-compatible API with custom base URL
	if (process.env.OPENROUTER_API_KEY) {
		providers.openrouter = createOpenAI({
			apiKey: process.env.OPENROUTER_API_KEY,
			baseURL: "https://openrouter.ai/api/v1",
		})
	}

	return createProviderRegistry(providers)
}

/** Single entry point for AI model resolution across the app. */
export const registry = buildRegistry()

/**
 * Provider ID → required environment variable mapping.
 *
 * Used to determine which providers have their API keys configured.
 * Must stay in sync with the conditional logic in `buildRegistry()`.
 */
const PROVIDER_ENV_KEYS: Record<string, string> = {
	google: "GEMINI_API_KEY",
	openai: "OPENAI_API_KEY",
	openrouter: "OPENROUTER_API_KEY",
}

/**
 * Returns the set of provider IDs that have their required API key configured.
 *
 * Used by `getAvailableModels()` to filter the model catalog to only include
 * models whose provider is actually usable.
 */
export function getAvailableProviderIds(): Set<string> {
	const available = new Set<string>()
	for (const [providerId, envVar] of Object.entries(PROVIDER_ENV_KEYS)) {
		if (process.env[envVar]) {
			available.add(providerId)
		}
	}
	return available
}
