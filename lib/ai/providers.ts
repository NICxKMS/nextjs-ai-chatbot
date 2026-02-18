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
import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider"
import { createXai } from "@ai-sdk/xai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createAiGateway } from "ai-gateway-provider"
import type { WorkersAISettings } from "workers-ai-provider"
import { createWorkersAI } from "workers-ai-provider"

import { AppError } from "@/lib/errors"

// =============================================================================
// Environment Configuration
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const XAI_API_KEY = process.env.XAI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const AI_GATEWAY_API_KEY =
	process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN

// Cloudflare configuration
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY
const CLOUDFLARE_WORKER_AI = process.env.CLOUDFLARE_WORKER_AI
const CLOUDFLARE_AI_GATEWAY_NAME = process.env.CLOUDFLARE_AI_GATEWAY_NAME
const CLOUDFLARE_AI_GATEWAY_API_KEY =
	process.env.CLOUDFLARE_AI_GATEWAY_API_KEY ??
	process.env.CLOUDFLARE_AI_GATEWAY_TOKEN ??
	process.env.CLOUDFLARE_API_KEY

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
 * Note: OpenRouter has a different type signature than ProviderV2.
 */
export const openrouter = OPENROUTER_API_KEY
	? createOpenRouter({ apiKey: OPENROUTER_API_KEY })
	: null

/**
 * Vercel AI Gateway provider instance.
 * Provides unified access to multiple providers.
 */
export const vercelGateway = AI_GATEWAY_API_KEY ? gateway : null

/**
 * Cloudflare Workers AI provider instance.
 * Configured with account ID and API key from environment.
 * Supports both API key auth and Worker bindings (when CLOUDFLARE_WORKER_AI is set).
 */
export const cloudflareWorkers =
	CLOUDFLARE_ACCOUNT_ID && (CLOUDFLARE_API_KEY || CLOUDFLARE_WORKER_AI)
		? createWorkersAI({
				accountId: CLOUDFLARE_ACCOUNT_ID,
				...(CLOUDFLARE_API_KEY ? { apiKey: CLOUDFLARE_API_KEY } : {}),
			} as WorkersAISettings)
		: null

// =============================================================================
// Cloudflare AI Gateway Provider (with fallback support)
// =============================================================================

/**
 * Supported Gemini models via Cloudflare AI Gateway.
 * These models can be routed through Cloudflare's AI Gateway for rate limiting,
 * logging, and fallback support.
 */
const SUPPORTED_GEMINI_MODELS_via_GATEWAY = [
	"gemini-2.5-flash",
	"gemini-2.5-flash-lite",
	"gemini-2.5-pro",
] as const

/**
 * Cloudflare AI Gateway provider instance.
 * Provides unified access with automatic fallback support.
 *
 * This provider wraps Google Gemini models with Cloudflare AI Gateway,
 * enabling features like:
 * - Rate limiting and usage tracking
 * - Automatic fallback to smaller models
 * - Request logging and analytics
 *
 * Note: Workers AI models are NOT supported via AI Gateway because they use
 * Cloudflare bindings directly, not the config.fetch pattern.
 */
export const cloudflareAiGateway =
	CLOUDFLARE_ACCOUNT_ID &&
	CLOUDFLARE_AI_GATEWAY_NAME &&
	CLOUDFLARE_AI_GATEWAY_API_KEY &&
	google // Requires Google provider for Gemini models
		? (() => {
				const aigateway = createAiGateway({
					accountId: CLOUDFLARE_ACCOUNT_ID,
					gateway: CLOUDFLARE_AI_GATEWAY_NAME,
					apiKey: CLOUDFLARE_AI_GATEWAY_API_KEY,
				})

				// Create a provider that wraps models with gateway and fallback
				// Using unknown cast since we only implement languageModel
				const gatewayProvider = {
					languageModel(id: string): LanguageModelV2 {
						// Validate that the model is supported via gateway
						if (
							!SUPPORTED_GEMINI_MODELS_via_GATEWAY.includes(
								id as (typeof SUPPORTED_GEMINI_MODELS_via_GATEWAY)[number],
							)
						) {
							throw new AppError(
								"bad_request:api:cloudflare_gateway_unsupported_model",
								`Model "${id}" is not supported via Cloudflare AI Gateway. Supported models: ${SUPPORTED_GEMINI_MODELS_via_GATEWAY.join(", ")}`,
								400,
							)
						}

						// Get the Google provider (we already checked it exists above)
						// biome-ignore lint/style/noNonNullAssertion: guarded by outer conditional
						const googleProvider = google!

						// Create primary model
						const primaryModel = googleProvider(id)

						// For flash-lite, no fallback needed (it's already the smallest)
						if (id === "gemini-2.5-flash-lite") {
							return aigateway([
								primaryModel,
							]) as unknown as LanguageModelV2
						}

						// For other models, add flash-lite as fallback
						const fallbackLite = googleProvider(
							"gemini-2.5-flash-lite",
						)
						return aigateway([
							primaryModel,
							fallbackLite,
						]) as unknown as LanguageModelV2
					},
				}

				return gatewayProvider as unknown as ProviderV2
			})()
		: null

// =============================================================================
// Provider Registry
// =============================================================================

/**
 * Registry of all available providers.
 * Only includes providers that have valid API keys configured.
 * Note: Some providers have extended interfaces beyond ProviderV2 and are cast.
 */
// biome-ignore lint/suspicious/noExplicitAny: providers have varying interfaces
export const providers: Record<string, any> = {
	openai,
	google,
	xai,
	openrouter,
	"vercel-gateway": vercelGateway,
	"cloudflare-workers": cloudflareWorkers,
	"cloudflare-ai-gateway": cloudflareAiGateway,
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
// biome-ignore lint/suspicious/noExplicitAny: provider interfaces vary
export function getProvider(name: string): any {
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
 * Priority: vercel-gateway > openai > google > openrouter > xai > cloudflare-workers > cloudflare-ai-gateway
 *
 * @returns The default provider instance or null if none configured
 */
// biome-ignore lint/suspicious/noExplicitAny: provider interfaces vary
export function getDefaultProvider(): any {
	const priorityOrder = [
		"vercel-gateway",
		"openai",
		"google",
		"openrouter",
		"xai",
		"cloudflare-workers",
		"cloudflare-ai-gateway",
	] as const

	for (const providerId of priorityOrder) {
		const provider = providers[providerId]
		if (provider) {
			return provider
		}
	}

	return null
}
