/**
 * Dynamic Model Discovery
 *
 * Runtime model discovery from provider APIs to dynamically fetch available models
 * from OpenAI, Google Gemini, OpenRouter, and Cloudflare Workers AI.
 *
 * Features:
 * - Parallel discovery via Promise.allSettled
 * - 1-hour cache for model lists
 * - Graceful per-provider error handling
 *
 * @module lib/ai/model-discovery
 */

import { AppError } from "@/lib/errors"
import { MODEL_CACHE_TTL_MS, MODEL_DISCOVERY_TIMEOUT_MS } from "./constants"
import type {
	ModelCapability,
	ModelMetadata,
	ProviderCatalog,
	ProviderId,
} from "./types"
import { PROVIDER_DISPLAY_NAMES } from "./types"

// =============================================================================
// Discovery Types
// =============================================================================

/**
 * Options for model discovery operations.
 */
export interface DiscoveryOptions {
	/** AbortSignal for cancellation */
	signal?: AbortSignal
	/** Force refresh bypassing cache */
	forceRefresh?: boolean
}

/**
 * Cached catalog entry with expiration.
 */
interface CachedCatalog {
	catalog: ProviderCatalog
	expiresAt: number
}

/**
 * Result of provider discovery operation.
 */
export interface DiscoveryResult {
	/** Successfully fetched provider catalogs */
	catalogs: ProviderCatalog[]
	/** Errors by provider ID */
	errors: Record<ProviderId, Error>
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * In-memory cache for provider catalogs.
 * Uses Map for O(1) lookups by provider ID.
 */
const providerCaches = new Map<ProviderId, CachedCatalog>()

/**
 * Global catalog cache for aggregated results.
 */
let globalCatalogCache: {
	catalog: DiscoveryResult
	expiresAt: number
} | null = null

/**
 * Check if a cache entry is still valid.
 *
 * @param cache - Cached catalog entry
 * @returns true if cache is valid and not expired
 */
const isCacheValid = (cache: CachedCatalog | null): boolean => {
	if (!cache) return false
	return Date.now() < cache.expiresAt
}

/**
 * Wrap a fetcher with caching logic.
 *
 * @param providerId - Provider identifier
 * @param fetcher - Function to fetch catalog if cache miss
 * @param options - Discovery options
 * @returns Provider catalog (cached or fresh)
 */
const withCache = async (
	providerId: ProviderId,
	fetcher: () => Promise<ProviderCatalog>,
	options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
	const existing = providerCaches.get(providerId)

	if (!options?.forceRefresh && isCacheValid(existing ?? null) && existing) {
		return existing.catalog
	}

	const catalog = await fetcher()
	providerCaches.set(providerId, {
		catalog,
		expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
	})

	return catalog
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get current ISO timestamp.
 */
const getTimestamp = (): string => new Date().toISOString()

/**
 * Regex to strip 'models/' prefix from Gemini model names.
 */
const MODEL_PREFIX_REGEX = /^models\//

/**
 * Default headers for API requests.
 */
const defaultHeaders = {
	"Content-Type": "application/json",
}

/**
 * Fetch JSON from a URL with error handling.
 *
 * @param input - URL or RequestInfo
 * @param init - Fetch options
 * @returns Parsed JSON response
 * @throws AppError if request fails
 */
const fetchJson = async <T>(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<T> => {
	const response = await fetch(input, init)
	if (!response.ok) {
		throw new AppError(
			"SERVICE_UNAVAILABLE",
			`Failed to fetch ${input.toString()}: ${response.status}`,
			response.status,
		)
	}
	return response.json() as Promise<T>
}

/**
 * Map partial model data to ModelMetadata.
 *
 * @param providerId - Provider identifier
 * @param data - Partial model metadata
 * @returns Complete ModelMetadata object
 */
const mapModel = (
	providerId: ProviderId,
	data: Partial<ModelMetadata>,
): ModelMetadata => {
	const result: ModelMetadata = {
		id: data.id ?? `${providerId}:${data.modelId ?? "unknown"}`,
		providerId,
		providerName: PROVIDER_DISPLAY_NAMES[providerId],
		modelId: data.modelId ?? "unknown",
		name: data.name ?? data.modelId ?? "Unnamed model",
		description: data.description ?? "",
		modalities: data.modalities ?? ["text"],
		capabilities: data.capabilities ?? ["chat"],
		tags: data.tags ?? [],
		source: data.source ?? "discovered",
		isCurated: Boolean(data.isCurated ?? false),
	}

	// Only add optional properties if they have values
	if (data.release !== undefined) {
		result.release = data.release
	}
	if (data.contextWindow !== undefined) {
		result.contextWindow = data.contextWindow
	}
	if (data.maxOutputTokens !== undefined) {
		result.maxOutputTokens = data.maxOutputTokens
	}
	if (data.price !== undefined) {
		result.price = data.price
	}

	return result
}

// =============================================================================
// Provider Discovery Functions
// =============================================================================

/**
 * Discover models from OpenAI API.
 *
 * @param options - Discovery options
 * @returns OpenAI provider catalog
 * @throws AppError if API key not configured or request fails
 */
export const discoverOpenAI = async (
	options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		throw new AppError(
			"CONFIGURATION_ERROR",
			"OPENAI_API_KEY is not configured",
			500,
		)
	}

	return withCache(
		"openai",
		async () => {
			type OpenAIModel = {
				id: string
				created: number
				owned_by: string
			}

			const data = await fetchJson<{ data: OpenAIModel[] }>(
				"https://api.openai.com/v1/models",
				{
					headers: {
						...defaultHeaders,
						Authorization: `Bearer ${apiKey}`,
					},
					signal: options?.signal ?? null,
				},
			)

			const models = data.data.map((model) =>
				mapModel("openai", {
					id: `openai:${model.id}`,
					modelId: model.id,
					release: new Date(model.created * 1000)
						.toISOString()
						.slice(0, 10),
					tags: [model.owned_by],
				}),
			)

			return {
				providerId: "openai",
				displayName: PROVIDER_DISPLAY_NAMES.openai,
				models,
				fetchedAt: getTimestamp(),
			} satisfies ProviderCatalog
		},
		options,
	)
}

/**
 * Discover models from Google Gemini API.
 *
 * @param options - Discovery options
 * @returns Google provider catalog
 * @throws AppError if API key not configured or request fails
 */
export const discoverGoogleGemini = async (
	options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
	const apiKey = process.env.GEMINI_API_KEY
	if (!apiKey) {
		throw new AppError(
			"CONFIGURATION_ERROR",
			"GEMINI_API_KEY is not configured",
			500,
		)
	}

	return withCache(
		"google",
		async () => {
			type GeminiModel = {
				name: string // e.g. models/gemini-2.0-flash
				version?: string
				displayName?: string
				description?: string
				outputTokenLimit?: number
				inputTokenLimit?: number
				supportedGenerationMethods?: string[]
				modality?: string
			}

			const data = await fetchJson<{ models: GeminiModel[] }>(
				`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
				{ signal: options?.signal ?? null },
			)

			const models = data.models.map((model) => {
				const modelId = model.name.replace(MODEL_PREFIX_REGEX, "")
				const capabilities: ModelCapability[] = ["chat"]

				if (model.supportedGenerationMethods?.includes("reasoning")) {
					capabilities.push("reasoning")
				}

				const modelData: Partial<ModelMetadata> = {
					id: `google:${modelId}`,
					modelId,
					name: model.displayName ?? modelId,
					description: model.description ?? "",
					capabilities,
					modalities:
						model.modality === "multimodal"
							? ["text", "vision", "audio"]
							: ["text"],
				}

				if (model.inputTokenLimit !== undefined) {
					modelData.contextWindow = model.inputTokenLimit
				}
				if (model.outputTokenLimit !== undefined) {
					modelData.maxOutputTokens = model.outputTokenLimit
				}

				return mapModel("google", modelData)
			})

			return {
				providerId: "google",
				displayName: PROVIDER_DISPLAY_NAMES.google,
				models,
				fetchedAt: getTimestamp(),
			} satisfies ProviderCatalog
		},
		options,
	)
}

/**
 * Discover models from OpenRouter API.
 *
 * @param options - Discovery options
 * @returns OpenRouter provider catalog
 * @throws AppError if API key not configured or request fails
 */
export const discoverOpenRouter = async (
	options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
	const apiKey = process.env.OPENROUTER_API_KEY
	if (!apiKey) {
		throw new AppError(
			"CONFIGURATION_ERROR",
			"OPENROUTER_API_KEY is not configured",
			500,
		)
	}

	return withCache(
		"openrouter",
		async () => {
			type OpenRouterModel = {
				id: string
				name?: string
				description?: string
				context_length?: number
				pricing?: {
					prompt: number
					completion: number
				}
				capabilities?: {
					reasoning?: boolean
					vision?: boolean
					tool_usage?: boolean
				}
			}

			const data = await fetchJson<{ data: OpenRouterModel[] }>(
				"https://openrouter.ai/api/v1/models",
				{
					headers: {
						...defaultHeaders,
						Authorization: `Bearer ${apiKey}`,
					},
					signal: options?.signal ?? null,
				},
			)

			const models = data.data.map((model) => {
				const capabilities: ModelCapability[] = ["chat"]
				if (model.capabilities?.reasoning) {
					capabilities.push("reasoning")
				}
				if (model.capabilities?.vision) {
					capabilities.push("vision")
				}
				if (model.capabilities?.tool_usage) {
					capabilities.push("tooling")
				}

				const modelData: Partial<ModelMetadata> = {
					id: `openrouter:${model.id}`,
					modelId: model.id,
					name: model.name ?? model.id,
					description: model.description ?? "",
					capabilities,
				}

				if (model.context_length !== undefined) {
					modelData.contextWindow = model.context_length
				}
				if (model.pricing) {
					modelData.price = `$${model.pricing.prompt.toFixed(4)}/$${model.pricing.completion.toFixed(4)}`
				}

				return mapModel("openrouter", modelData)
			})

			return {
				providerId: "openrouter",
				displayName: PROVIDER_DISPLAY_NAMES.openrouter,
				models,
				fetchedAt: getTimestamp(),
			} satisfies ProviderCatalog
		},
		options,
	)
}

/**
 * Discover models from Cloudflare Workers AI API.
 *
 * @param options - Discovery options
 * @returns Cloudflare Workers provider catalog
 * @throws AppError if credentials not configured or request fails
 */
export const discoverCloudflareWorkers = async (
	options?: DiscoveryOptions,
): Promise<ProviderCatalog> => {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const apiKey = process.env.CLOUDFLARE_API_KEY
	if (!accountId || !apiKey) {
		throw new AppError(
			"CONFIGURATION_ERROR",
			"Cloudflare account credentials are not configured",
			500,
		)
	}

	return withCache(
		"cloudflare-workers",
		async () => {
			type WorkersModel = {
				meta: {
					name: string
					description?: string
					capabilities?: string[]
				}
				id: string
			}

			const data = await fetchJson<{ result: WorkersModel[] }>(
				`https://ai.cloudflare.com/client/v4/accounts/${accountId}/ai/models`,
				{
					headers: {
						...defaultHeaders,
						Authorization: `Bearer ${apiKey}`,
					},
					signal: options?.signal ?? null,
				},
			)

			const models = data.result.map((model) =>
				mapModel("cloudflare-workers", {
					id: `cloudflare-workers:${model.id}`,
					modelId: model.id,
					name: model.meta.name,
					description: model.meta.description ?? "",
					capabilities: (model.meta
						.capabilities as ModelCapability[]) ?? ["chat"],
				}),
			)

			return {
				providerId: "cloudflare-workers",
				displayName: PROVIDER_DISPLAY_NAMES["cloudflare-workers"],
				models,
				fetchedAt: getTimestamp(),
			} satisfies ProviderCatalog
		},
		options,
	)
}

// =============================================================================
// Main Discovery Functions
// =============================================================================

/**
 * Discover models from all configured providers in parallel.
 *
 * Uses Promise.allSettled to ensure one provider failure doesn't break
 * discovery for other providers. Returns both successful catalogs and errors.
 *
 * @param options - Discovery options
 * @returns Discovery result with catalogs and errors
 */
export const discoverProviders = async (
	options?: DiscoveryOptions,
): Promise<DiscoveryResult> => {
	// Check global cache first
	if (
		!options?.forceRefresh &&
		globalCatalogCache &&
		Date.now() < globalCatalogCache.expiresAt
	) {
		return globalCatalogCache.catalog
	}

	const results: ProviderCatalog[] = []
	const errors: Record<ProviderId, Error> = {} as Record<ProviderId, Error>

	// Create abort controller for timeout
	const controller = new AbortController()
	const upstreamSignal = options?.signal
	const relayAbort = () => controller.abort()

	if (upstreamSignal) {
		if (upstreamSignal.aborted) {
			controller.abort()
		} else {
			upstreamSignal.addEventListener("abort", relayAbort, {
				once: true,
			})
		}
	}

	const timeoutId = setTimeout(
		() => controller.abort(),
		MODEL_DISCOVERY_TIMEOUT_MS,
	)

	const discoveryOptions: DiscoveryOptions = {
		...options,
		signal: controller.signal,
	}

	const discoverers: Array<{
		providerId: ProviderId
		run: () => Promise<ProviderCatalog>
	}> = [
		{ providerId: "openai", run: () => discoverOpenAI(discoveryOptions) },
		{
			providerId: "google",
			run: () => discoverGoogleGemini(discoveryOptions),
		},
		{
			providerId: "openrouter",
			run: () => discoverOpenRouter(discoveryOptions),
		},
		{
			providerId: "cloudflare-workers",
			run: () => discoverCloudflareWorkers(discoveryOptions),
		},
	]

	try {
		// Discover all providers in parallel
		const settled = await Promise.allSettled(
			discoverers.map((d) => d.run()),
		)

		settled.forEach((result, index) => {
			const discoverer = discoverers[index]
			if (!discoverer) return

			if (result.status === "fulfilled") {
				results.push(result.value)
			} else {
				errors[discoverer.providerId] = result.reason as Error
			}
		})

		// Add Vercel Gateway placeholder (no discovery API)
		results.push({
			providerId: "vercel-gateway",
			displayName: PROVIDER_DISPLAY_NAMES["vercel-gateway"],
			models: [],
			fetchedAt: getTimestamp(),
		})

		// Add Cloudflare AI Gateway placeholder (uses same models as Google via gateway)
		results.push({
			providerId: "cloudflare-ai-gateway",
			displayName: PROVIDER_DISPLAY_NAMES["cloudflare-ai-gateway"],
			models: [],
			fetchedAt: getTimestamp(),
		})
	} finally {
		clearTimeout(timeoutId)
		if (upstreamSignal) {
			upstreamSignal.removeEventListener("abort", relayAbort)
		}
	}

	const discoveryResult: DiscoveryResult = { catalogs: results, errors }

	// Cache the result
	globalCatalogCache = {
		catalog: discoveryResult,
		expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
	}

	return discoveryResult
}

/**
 * Get the current cached model catalog.
 * Returns cached data if valid, otherwise triggers a new discovery.
 *
 * @returns Discovery result with catalogs and errors
 */
export const getModelCatalog = async (): Promise<DiscoveryResult> => {
	if (globalCatalogCache && Date.now() < globalCatalogCache.expiresAt) {
		return globalCatalogCache.catalog
	}
	return discoverProviders()
}

/**
 * Refresh the model catalog cache.
 * Triggers a new discovery and updates the cache.
 *
 * @returns Fresh discovery result
 */
export const refreshModelCatalog = async (): Promise<DiscoveryResult> => {
	return discoverProviders()
}

/**
 * Force refresh the model catalog, bypassing all caches.
 * Clears both global and per-provider caches before discovery.
 *
 * @returns Fresh discovery result
 */
export const forceRefreshModelCatalog = async (): Promise<DiscoveryResult> => {
	// Clear all caches
	providerCaches.clear()
	globalCatalogCache = null

	return discoverProviders({ forceRefresh: true })
}

/**
 * List models by provider.
 * Returns a map of provider IDs to their model lists.
 *
 * @param options - Discovery options
 * @returns Map of provider ID to model array
 */
export const listProviderCatalogs = async (
	options?: DiscoveryOptions,
): Promise<Map<ProviderId, ModelMetadata[]>> => {
	const { catalogs } = await discoverProviders(options)
	const result = new Map<ProviderId, ModelMetadata[]>()

	for (const catalog of catalogs) {
		result.set(catalog.providerId, catalog.models)
	}

	return result
}

/**
 * Clear all cached model data.
 * Useful for testing or forced refresh scenarios.
 */
export const clearModelCache = (): void => {
	providerCaches.clear()
	globalCatalogCache = null
}
