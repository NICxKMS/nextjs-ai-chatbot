import { gateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { experimental_createProviderRegistry as createProviderRegistry } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import type { WorkersAISettings } from "workers-ai-provider";
import { createWorkersAI } from "workers-ai-provider";
import { ChatSDKError } from "../errors";
import { curatedModels } from "./curated-models";
import type { ModelMetadata, ProviderCatalog } from "./model-catalog-types";
import {
	discoverProviders,
	forceRefresh as forceDiscoveryRefresh,
} from "./model-discovery";
import { PROVIDER_DISPLAY_NAMES } from "./provider-info";

const GOOGLE_GENERATIVE_AI_API_KEY =
	process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_WORKER_AI = process.env.CLOUDFLARE_WORKER_AI;
const CLOUDFLARE_AI_GATEWAY_NAME = process.env.CLOUDFLARE_AI_GATEWAY_NAME;
const CLOUDFLARE_AI_GATEWAY_API_KEY =
	process.env.CLOUDFLARE_AI_GATEWAY_API_KEY ??
	process.env.CLOUDFLARE_AI_GATEWAY_TOKEN ??
	process.env.CLOUDFLARE_API_KEY;

const baseProviders: Record<string, ProviderV2> = {};
const additionalProviderIds = new Set<string>();

const hasVercelGatewayAuth = Boolean(
	process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN
);

const registerProvider = (id: string, provider: ProviderV2 | undefined) => {
	if (provider) {
		baseProviders[id] = provider;
		if (id !== "vercel-gateway") {
			additionalProviderIds.add(id);
		}
	}
};

// const logProviderState = () => {
//   //   const providerIds = Object.keys(baseProviders);
//   //   console.log("[model-registry] active providers:", providerIds);
//   //   console.log(
//   //     "[model-registry] curated models available:",
//   //     curatedModels.map((model) => model.id)
//   //   );
// };

if (hasVercelGatewayAuth) {
	registerProvider("vercel-gateway", gateway as unknown as ProviderV2);
}

if (OPENAI_API_KEY) {
	registerProvider(
		"openai",
		createOpenAI({ apiKey: OPENAI_API_KEY }) as unknown as ProviderV2
	);
}

if (GOOGLE_GENERATIVE_AI_API_KEY) {
	registerProvider(
		"google",
		createGoogleGenerativeAI({
			apiKey: GOOGLE_GENERATIVE_AI_API_KEY,
		}) as unknown as ProviderV2
	);
}

if (OPENROUTER_API_KEY) {
	registerProvider(
		"openrouter",
		createOpenRouter({
			apiKey: OPENROUTER_API_KEY,
		}) as unknown as ProviderV2
	);
}

if (CLOUDFLARE_ACCOUNT_ID && (CLOUDFLARE_API_KEY || CLOUDFLARE_WORKER_AI)) {
	const workersSettings = CLOUDFLARE_API_KEY
		? { accountId: CLOUDFLARE_ACCOUNT_ID, apiKey: CLOUDFLARE_API_KEY }
		: { accountId: CLOUDFLARE_ACCOUNT_ID };

	registerProvider(
		"cloudflare-workers",
		createWorkersAI(
			workersSettings as WorkersAISettings
		) as unknown as ProviderV2
	);
}

// Cloudflare AI Gateway provider that composes Workers AI primary with Gemini fallback
if (
	CLOUDFLARE_ACCOUNT_ID &&
	CLOUDFLARE_AI_GATEWAY_NAME &&
	CLOUDFLARE_AI_GATEWAY_API_KEY
) {
	const workersProvider = createWorkersAI({
		accountId: CLOUDFLARE_ACCOUNT_ID,
		apiKey: CLOUDFLARE_API_KEY,
	} as WorkersAISettings);

	const googleProvider = GOOGLE_GENERATIVE_AI_API_KEY
		? createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY })
		: undefined;

	const aigateway = createAiGateway({
		accountId: CLOUDFLARE_ACCOUNT_ID,
		gateway: CLOUDFLARE_AI_GATEWAY_NAME,
		apiKey: CLOUDFLARE_AI_GATEWAY_API_KEY,
	});

	const cloudflareAiGatewayProvider = {
		languageModel(id: string) {
			// Handle Google Gemini models via Cloudflare AI Gateway
			if (id === "gemini-2.5-flash" || id === "gemini-2.5-pro") {
				if (!googleProvider) {
					throw new ChatSDKError(
						"bad_request:api:cloudflare_gateway_missing_google_provider",
						"Google provider is not configured for Cloudflare AI Gateway Gemini models"
					);
				}
				const primaryGemini = googleProvider(id);
				const fallbackLite = googleProvider("gemini-2.5-flash-lite");
				return aigateway([
					primaryGemini,
					fallbackLite,
				]) as unknown as LanguageModelV2;
			}

			// Handle Cloudflare Workers AI models with Gemini fallback
			const primary = workersProvider(id);
			if (!googleProvider) {
				return aigateway([primary]) as unknown as LanguageModelV2;
			}
			const fallbackLite = googleProvider("gemini-2.5-flash-lite");
			return aigateway([
				primary,
				fallbackLite,
			]) as unknown as LanguageModelV2;
		},
	};

	registerProvider(
		"cloudflare-ai-gateway",
		cloudflareAiGatewayProvider as unknown as ProviderV2
	);
}

// logProviderState();

const providerRegistry = createProviderRegistry(baseProviders);
const availableProviderIds = new Set(Object.keys(baseProviders));

const filterByAvailableProviders = (models: ModelMetadata[]): ModelMetadata[] =>
	models.filter((model) => availableProviderIds.has(model.providerId));

let providerCatalogs: ProviderCatalog[] = [];
let modelCatalog: ModelMetadata[] = filterByAvailableProviders(curatedModels);
let discoveryErrors: Record<string, Error> = {};

const mergeCatalogs = (catalogs: ProviderCatalog[]): ModelMetadata[] => {
	const merged = new Map<string, ModelMetadata>();

	for (const model of filterByAvailableProviders(curatedModels)) {
		merged.set(model.id, model);
	}

	for (const catalog of catalogs) {
		if (!availableProviderIds.has(catalog.providerId)) {
			continue;
		}

		for (const model of filterByAvailableProviders(catalog.models)) {
			const existing = merged.get(model.id);
			if (existing) {
				merged.set(model.id, {
					...existing,
					...model,
					isCurated: existing.isCurated,
					source: "discovered",
					tags: Array.from(
						new Set([...existing.tags, ...model.tags])
					),
				});
			} else {
				merged.set(model.id, model);
			}
		}
	}

	return Array.from(merged.values());
};

export const refreshModelCatalog = async (options?: { force?: boolean }) => {
	if (options?.force) {
		forceDiscoveryRefresh();
	}

	try {
		const { catalogs, errors } = await discoverProviders({
			forceRefresh: options?.force,
		});

		providerCatalogs = catalogs.filter((catalog) =>
			availableProviderIds.has(catalog.providerId)
		);
		discoveryErrors = errors;

		const merged = mergeCatalogs(providerCatalogs);
		modelCatalog =
			merged.length > 0
				? merged
				: filterByAvailableProviders(curatedModels);
	} catch (error) {
		discoveryErrors = { fallback: error as Error };
		providerCatalogs = [];
		modelCatalog = filterByAvailableProviders(curatedModels);
	}

	return {
		models: modelCatalog,
		catalogs: providerCatalogs,
		errors: discoveryErrors,
	};
};

export const forceRefreshModelCatalog = () =>
	refreshModelCatalog({ force: true });

export const getModelCatalog = (): ModelMetadata[] => modelCatalog;

export const listProviderCatalogs = (): ProviderCatalog[] => {
	if (providerCatalogs.length > 0) {
		return providerCatalogs;
	}

	const grouped = filterByAvailableProviders(curatedModels).reduce<
		Record<string, ProviderCatalog>
	>((acc, model) => {
		if (!acc[model.providerId]) {
			acc[model.providerId] = {
				providerId: model.providerId,
				displayName:
					model.providerName ??
					PROVIDER_DISPLAY_NAMES[model.providerId] ??
					model.providerId,
				models: [],
				fetchedAt: "1970-01-01T00:00:00.000Z",
			};
		}

		const providerGroup = acc[model.providerId];
		if (providerGroup) {
			providerGroup.models.push(model);
		}
		return acc;
	}, {});

	return Object.values(grouped);
};

export const listChatModels = () => {
	const models = modelCatalog.filter((model) =>
		model.capabilities.includes("chat")
	);

	//   console.log(
	//     "[model-registry] listChatModels =>",
	//     models.map((model) => model.id)
	//   );

	return models;
};

export const getModelById = (id: string) =>
	modelCatalog.find((model) => model.id === id) ??
	filterByAvailableProviders(curatedModels).find((model) => model.id === id);

const defaultModelOrder = [
	"google:gemini-2.5-flash-lite",
	"google:gemini-2.5-flash",
	"vercel-gateway:openai/gpt-4o",
	"google:gemini-2.5-pro",
	"openai:gpt-4o",
	"openai:gpt-4o-mini",
	"google:gemini-2.0-flash",
];

export const getDefaultChatModel = () => {
	for (const id of defaultModelOrder) {
		const match = modelCatalog.find((model) => model.id === id);
		if (match) {
			return match;
		}
	}

	return modelCatalog[0] ?? filterByAvailableProviders(curatedModels)[0];
};

const reasoningPriority = [
	"openai:gpt-4.1",
	"google:gemini-1.5-pro",
	"openrouter:anthropic/claude-3.5-sonnet",
	"vercel-gateway:xai/grok-3-mini",
];

export const getReasoningModel = () => {
	for (const id of reasoningPriority) {
		const match = modelCatalog.find((model) => model.id === id);
		if (match) {
			return match;
		}
	}

	return (
		modelCatalog.find((model) =>
			model.capabilities.includes("reasoning")
		) ?? getDefaultChatModel()
	);
};

export const getLanguageModel = (id: string): LanguageModelV2 =>
	providerRegistry.languageModel(id as `${string}:${string}`);
