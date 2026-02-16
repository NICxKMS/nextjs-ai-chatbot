/**
 * AI Provider Configurations
 *
 * Provider registry configuring AI SDK providers (OpenAI, Google, Gateway, etc.)
 * with their API keys and settings. Uses Vercel AI SDK 5.0 directly.
 *
 * @module lib/ai/providers
 */

import { gateway } from "@ai-sdk/gateway"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderV2 } from "@ai-sdk/provider"
import { createXai } from "@ai-sdk/xai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

// =============================================================================
// Environment Configuration
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const AI_GATEWAY_API_KEY =
	process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN

// =============================================================================
// Provider Instances
// =============================================================================

/**
 * OpenAI provider instance.
 * Configured with API key from environment.
 */
export const openai = OPENAI_API_KEY
	? createOpenAI({ apiKey: OPENAI_API_KEY })
	: null

/**
 * Google (Gemini) provider instance.
 * Configured with API key from environment.
 */
export const google = GEMINI_API_KEY
	? createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY })
	: null

/**
 * XAI (Grok) provider instance.
 * Configured with API key from environment.
 */
export const xai = XAI_API_KEY ? createXai({ apiKey: XAI_API_KEY }) : null

/**
 * OpenRouter provider instance.
 * Provides access to multiple models through a single API.
 */
export const openrouter = OPENROUTER_API_KEY
	? createOpenRouter({ apiKey: OPENROUTER_API_KEY })
	: null

/**
 * Vercel AI Gateway provider instance.
 * Provides unified access to multiple providers.
 */
export const vercelGateway = AI_GATEWAY_API_KEY ? gateway : null

// =============================================================================
// Provider Registry
// =============================================================================

/**
 * Registry of all available providers.
 * Only includes providers that have valid API keys configured.
 */
export const providers: Record<string, ProviderV2 | null> = {
	openai,
	google,
	xai,
	openrouter,
	"vercel-gateway": vercelGateway,
}

/**
 * List of available provider IDs (those with configured API keys).
 */
export const availableProviderIds: string[] = Object.entries(providers)
	.filter(([, provider]) => provider !== null)
	.map(([id]) => id)

/**
 * Get a provider by its ID.
 *
 * @param name - Provider identifier (e.g., "openai", "google", "vercel-gateway")
 * @returns The provider instance or null if not configured
 *
 * @example
 * ```typescript
 * const provider = getProvider("openai")
 * if (provider) {
 *   const model = provider.languageModel("gpt-4o")
 * }
 * ```
 */
export function getProvider(name: string): ProviderV2 | null {
	return providers[name] ?? null
}

/**
 * Check if a provider is available (has valid API key).
 *
 * @param name - Provider identifier
 * @returns true if provider is configured and available
 */
export function isProviderAvailable(name: string): boolean {
	return providers[name] !== null
}

/**
 * Get the default provider based on availability.
 * Priority: vercel-gateway > openai > google > openrouter > xai
 *
 * @returns The default provider instance or null if none configured
 */
export function getDefaultProvider(): ProviderV2 | null {
	const priorityOrder = [
		"vercel-gateway",
		"openai",
		"google",
		"openrouter",
		"xai",
	] as const

	for (const providerId of priorityOrder) {
		const provider = providers[providerId]
		if (provider) {
			return provider
		}
	}

	return null
}
