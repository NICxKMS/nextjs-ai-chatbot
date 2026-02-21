import { ChatSDKError } from "../errors";
import type { ModelMetadata, ProviderCatalog } from "./model-catalog-types";
import { PROVIDER_DISPLAY_NAMES, type ProviderId } from "./provider-info";

type DiscoveryOptions = {
    signal?: AbortSignal;
    forceRefresh?: boolean;
};

type CachedCatalog = {
    catalog: ProviderCatalog;
    expiresAt: number;
};

const HOUR_MS = 60 * 60 * 1000;

const providerCaches = new Map<ProviderId, CachedCatalog>();

const defaultHeaders = {
    "Content-Type": "application/json",
};

const getTimestamp = () => new Date().toISOString();

const MODEL_PREFIX_REGEX = /^models\//;

const isCacheValid = (cache: CachedCatalog | undefined) => {
    if (!cache) {
        return false;
    }
    return Date.now() < cache.expiresAt;
};

const withCache = async (
    providerId: ProviderId,
    fetcher: () => Promise<ProviderCatalog>,
    options?: DiscoveryOptions
): Promise<ProviderCatalog> => {
    const existing = providerCaches.get(providerId);

    if (!options?.forceRefresh && isCacheValid(existing) && existing) {
        return existing.catalog;
    }

    const catalog = await fetcher();
    providerCaches.set(providerId, {
        catalog,
        expiresAt: Date.now() + HOUR_MS,
    });

    return catalog;
};

const mapModel = (
    providerId: ProviderId,
    data: Partial<ModelMetadata>
): ModelMetadata => {
    return {
        id: data.id ?? `${providerId}:${data.modelId ?? "unknown"}`,
        providerId,
        providerName: PROVIDER_DISPLAY_NAMES[providerId],
        modelId: data.modelId ?? "unknown",
        name: data.name ?? data.modelId ?? "Unnamed model",
        description: data.description ?? "",
        release: data.release,
        contextWindow: data.contextWindow,
        maxOutputTokens: data.maxOutputTokens,
        modalities: data.modalities ?? ["text"],
        capabilities: data.capabilities ?? ["chat"],
        tags: data.tags ?? [],
        price: data.price,
        source: data.source ?? "discovered",
        isCurated: Boolean(data.isCurated ?? false),
    };
};

const fetchJson = async <T>(
    input: RequestInfo,
    init?: RequestInit
): Promise<T> => {
    const response = await fetch(input, init);
    if (!response.ok) {
        throw new ChatSDKError(
            "bad_request:api:upstream_fetch_failed",
            `Failed to fetch ${input.toString()}: ${response.status}`
        );
    }
    return response.json() as Promise<T>;
};

const discoverOpenAI = (
    options?: DiscoveryOptions
): Promise<ProviderCatalog> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new ChatSDKError(
            "bad_request:api:missing_openai_api_key",
            "OPENAI_API_KEY is not configured"
        );
    }

    return withCache(
        "openai",
        async () => {
            type OpenAIModel = {
                id: string;
                created: number;
                owned_by: string;
                permission: object[];
            };

            const data = await fetchJson<{ data: OpenAIModel[] }>(
                "https://api.openai.com/v1/models",
                {
                    headers: {
                        ...defaultHeaders,
                        Authorization: `Bearer ${apiKey}`,
                    },
                    signal: options?.signal,
                }
            );

            const models = data.data.map((model) =>
                mapModel("openai", {
                    id: `openai:${model.id}`,
                    modelId: model.id,
                    release: new Date(model.created * 1000)
                        .toISOString()
                        .slice(0, 10),
                    tags: [model.owned_by],
                })
            );

            return {
                providerId: "openai",
                displayName: PROVIDER_DISPLAY_NAMES.openai,
                models,
                fetchedAt: getTimestamp(),
            } satisfies ProviderCatalog;
        },
        options
    );
};

const discoverGoogleGemini = (
    options?: DiscoveryOptions
): Promise<ProviderCatalog> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new ChatSDKError(
            "bad_request:api:missing_google_api_key",
            "GEMINI_API_KEY is not configured"
        );
    }

    return withCache(
        "google",
        async () => {
            type GeminiModel = {
                name: string; // e.g. models/gemini-2.0-flash
                version?: string;
                displayName?: string;
                description?: string;
                outputTokenLimit?: number;
                inputTokenLimit?: number;
                supportedGenerationMethods?: string[];
                modality?: string;
            };

            const data = await fetchJson<{ models: GeminiModel[] }>(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                { signal: options?.signal }
            );

            const models = data.models.map((model) => {
                const modelId = model.name.replace(MODEL_PREFIX_REGEX, "");
                return mapModel("google", {
                    id: `google:${modelId}`,
                    modelId,
                    name: model.displayName ?? modelId,
                    description: model.description ?? "",
                    contextWindow: model.inputTokenLimit,
                    maxOutputTokens: model.outputTokenLimit,
                    capabilities: model.supportedGenerationMethods?.includes(
                        "reasoning"
                    )
                        ? ["chat", "reasoning"]
                        : ["chat"],
                    modalities:
                        model.modality === "multimodal"
                            ? ["text", "vision", "audio"]
                            : ["text"],
                });
            });

            return {
                providerId: "google",
                displayName: PROVIDER_DISPLAY_NAMES.google,
                models,
                fetchedAt: getTimestamp(),
            } satisfies ProviderCatalog;
        },
        options
    );
};

const discoverOpenRouter = (
    options?: DiscoveryOptions
): Promise<ProviderCatalog> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new ChatSDKError(
            "bad_request:api:missing_openrouter_api_key",
            "OPENROUTER_API_KEY is not configured"
        );
    }

    return withCache(
        "openrouter",
        async () => {
            type OpenRouterModel = {
                id: string;
                name?: string;
                description?: string;
                context_length?: number;
                pricing?: {
                    prompt: number;
                    completion: number;
                };
                capabilities?: {
                    reasoning?: boolean;
                    vision?: boolean;
                    tool_usage?: boolean;
                };
            };

            const data = await fetchJson<{ data: OpenRouterModel[] }>(
                "https://openrouter.ai/api/v1/models",
                {
                    headers: {
                        ...defaultHeaders,
                        Authorization: `Bearer ${apiKey}`,
                    },
                    signal: options?.signal,
                }
            );

            const models = data.data.map((model) => {
                const price = model.pricing
                    ? `$${model.pricing.prompt.toFixed(4)}/$${model.pricing.completion.toFixed(4)}`
                    : undefined;

                const capabilities: ModelMetadata["capabilities"] = ["chat"];
                if (model.capabilities?.reasoning) {
                    capabilities.push("reasoning");
                }
                if (model.capabilities?.vision) {
                    capabilities.push("vision");
                }
                if (model.capabilities?.tool_usage) {
                    capabilities.push("tooling");
                }

                return mapModel("openrouter", {
                    id: `openrouter:${model.id}`,
                    modelId: model.id,
                    name: model.name ?? model.id,
                    description: model.description ?? "",
                    contextWindow: model.context_length,
                    capabilities,
                    price,
                });
            });

            return {
                providerId: "openrouter",
                displayName: PROVIDER_DISPLAY_NAMES.openrouter,
                models,
                fetchedAt: getTimestamp(),
            } satisfies ProviderCatalog;
        },
        options
    );
};

const discoverCloudflareWorkers = (
    options?: DiscoveryOptions
): Promise<ProviderCatalog> => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    if (!accountId || !apiKey) {
        throw new ChatSDKError(
            "bad_request:api:missing_cloudflare_credentials",
            "Cloudflare account credentials are not configured"
        );
    }

    return withCache(
        "cloudflare-workers",
        async () => {
            type WorkersModel = {
                meta: {
                    name: string;
                    description?: string;
                    capabilities?: string[];
                };
                id: string;
            };

            const data = await fetchJson<{ result: WorkersModel[] }>(
                `https://ai.cloudflare.com/client/v4/accounts/${accountId}/ai/models`,
                {
                    headers: {
                        ...defaultHeaders,
                        Authorization: `Bearer ${apiKey}`,
                    },
                    signal: options?.signal,
                }
            );

            const models = data.result.map((model) =>
                mapModel("cloudflare-workers", {
                    id: `cloudflare-workers:${model.id}`,
                    modelId: model.id,
                    name: model.meta.name,
                    description: model.meta.description ?? "",
                    capabilities: (model.meta
                        .capabilities as ModelMetadata["capabilities"]) ?? [
                        "chat",
                    ],
                })
            );

            return {
                providerId: "cloudflare-workers",
                displayName: PROVIDER_DISPLAY_NAMES["cloudflare-workers"],
                models,
                fetchedAt: getTimestamp(),
            } satisfies ProviderCatalog;
        },
        options
    );
};

export type DiscoveryResult = {
    catalogs: ProviderCatalog[];
    errors: Record<ProviderId, Error>;
};

export const discoverProviders = async (
    options?: DiscoveryOptions
): Promise<DiscoveryResult> => {
    const results: ProviderCatalog[] = [];
    const errors: Record<ProviderId, Error> = {} as Record<ProviderId, Error>;

    const discoverers: Array<{
        providerId: ProviderId;
        run: () => Promise<ProviderCatalog>;
    }> = [
        { providerId: "openai", run: () => discoverOpenAI(options) },
        { providerId: "google", run: () => discoverGoogleGemini(options) },
        { providerId: "openrouter", run: () => discoverOpenRouter(options) },
        {
            providerId: "cloudflare-workers",
            run: () => discoverCloudflareWorkers(options),
        },
    ];

    // OPTIMIZATION: Discover all providers in parallel instead of sequentially
    const settled = await Promise.allSettled(discoverers.map((d) => d.run()));

    settled.forEach((result, index) => {
        const discoverer = discoverers[index];
        if (!discoverer) {
            return;
        }
        if (result.status === "fulfilled") {
            results.push(result.value);
        } else {
            errors[discoverer.providerId] = result.reason as Error;
        }
    });

    results.push({
        providerId: "vercel-gateway",
        displayName: PROVIDER_DISPLAY_NAMES["vercel-gateway"],
        models: [],
        fetchedAt: getTimestamp(),
    });

    if (results.length === 0) {
        const message = Object.entries(errors)
            .map(([providerId, err]) => `${providerId}: ${err.message}`)
            .join("; ");

        throw new ChatSDKError(
            "bad_request:api:discover_models_failed",
            message
        );
    }

    return { catalogs: results, errors };
};

export const forceRefresh = () => {
    providerCaches.clear();
};
