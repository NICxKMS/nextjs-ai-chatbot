import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderV2 } from "@ai-sdk/provider"
import { createProviderRegistry } from "ai"

/**
 * Builds the AI provider registry with conditional provider inclusion.
 *
 * - `google` — Always registered. Reads `GOOGLE_GENERATIVE_AI_API_KEY` env var.
 * - `openai` — Registered if `OPENAI_API_KEY` env var exists.
 * - `openrouter` — Registered if `OPENROUTER_API_KEY` env var exists.
 *   Uses OpenAI-compatible API via custom baseURL.
 *
 * Usage: `registry.languageModel("google:gemini-2.0-flash")`
 */
function buildRegistry() {
	const providers: Record<string, ProviderV2> = {}

	// Google — always available (API key validated at model call time)
	providers.google = createGoogleGenerativeAI({
		apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
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
