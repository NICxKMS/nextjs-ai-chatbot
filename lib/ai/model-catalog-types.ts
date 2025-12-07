import type { ProviderId } from "./provider-info";

export type ModelCapability =
    | "chat"
    | "reasoning"
    | "vision"
    | "audio"
    | "multimodal"
    | "code"
    | "tooling"
    | "memory"
    | "image-generation"
    | "video-generation";

export type ModelModality = "text" | "vision" | "audio";

// Supported chain-of-thought/reasoning mechanisms by provider
export type ReasoningType =
    | "openai-thinking" // OpenAI o1/o3 models - uses thinking tags
    | "anthropic-thinking" // Anthropic Claude extended thinking mode
    | "gemini-thinking" // Google Gemini thinking models
    | "deepseek-thinking" // DeepSeek R1 - uses <think> tags
    | "internal-thinking" // Generic internal thinking extraction
    | "none"; // No explicit chain-of-thought support

export type ModelMetadata = {
    id: string;
    providerId: ProviderId;
    providerName: string;
    modelId: string;
    name: string;
    description: string;
    release?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    modalities: ModelModality[];
    capabilities: ModelCapability[];
    tags: string[];
    price?: string;
    source: "curated" | "discovered";
    isCurated: boolean;
    // Chain-of-thought/reasoning mechanism type for this model
    reasoningType?: ReasoningType;
    // Recommended thinking budget (tokens) for reasoning models
    thinkingBudget?: number;
};

export type ProviderCatalog = {
    providerId: ProviderId;
    displayName: string;
    models: ModelMetadata[];
    fetchedAt: string;
};

export type ModelCatalogResponse = {
    providers: ProviderCatalog[];
    fallback: ModelMetadata[];
    fetchedAt: string;
};
