import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderV3 } from "@ai-sdk/provider"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createProviderRegistry } from "ai"

type ProviderId = "google" | "openai" | "openrouter"

type ProviderDefinition = {
	envKey: string
	registerWithoutEnv?: boolean
	create(): ProviderV3
}

const PROVIDER_DEFINITIONS: Record<ProviderId, ProviderDefinition> = {
	google: {
		envKey: "GEMINI_API_KEY",
		registerWithoutEnv: true,
		create: () =>
			createGoogleGenerativeAI({
				apiKey: process.env.GEMINI_API_KEY,
			}),
	},
	openai: {
		envKey: "OPENAI_API_KEY",
		create: () =>
			createOpenAI({
				apiKey: process.env.OPENAI_API_KEY,
			}),
	},
	openrouter: {
		envKey: "OPENROUTER_API_KEY",
		create: () =>
			createOpenRouter({
				apiKey: process.env.OPENROUTER_API_KEY,
			}),
	},
}

function hasConfiguredProvider({ envKey }: ProviderDefinition): boolean {
	return Boolean(process.env[envKey])
}

function getProviderEntries(): Array<[ProviderId, ProviderDefinition]> {
	return Object.entries(PROVIDER_DEFINITIONS) as Array<[ProviderId, ProviderDefinition]>
}

/**
 * Builds the AI provider registry with conditional provider inclusion.
 *
 * - `google` — Always registered. Reads `GEMINI_API_KEY` env var.
 * - `openai` — Registered if `OPENAI_API_KEY` env var exists.
 * - `openrouter` — Registered if `OPENROUTER_API_KEY` env var exists.
 *   Uses `@openrouter/ai-sdk-provider` SDK for native provider support.
 *
 * Usage: `registry.languageModel("google:gemini-2.0-flash")`
 */
function buildRegistry() {
	const providers: Record<string, ProviderV3> = {}

	for (const [providerId, definition] of getProviderEntries()) {
		if (!definition.registerWithoutEnv && !hasConfiguredProvider(definition)) {
			continue
		}

		providers[providerId] = definition.create()
	}

	return createProviderRegistry(providers)
}

/** Single entry point for AI model resolution across the app. */
export const registry = buildRegistry()

/**
 * Returns the set of provider IDs that have their required API key configured.
 *
 * Used by `getAvailableModels()` to filter the model catalog to only include
 * models whose provider is actually usable.
 */
export function getAvailableProviderIds(): Set<string> {
	return new Set(
		getProviderEntries()
			.filter(([, definition]) => hasConfiguredProvider(definition))
			.map(([providerId]) => providerId),
	)
}
