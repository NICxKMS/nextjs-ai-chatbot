/**
 * AI Model Registry
 * Ref: 05-ai-integration-optimal-design.md §3
 *
 * Central registry of available AI models with their metadata and capabilities.
 * Ported from OldApp curated-models.ts with 33+ models across providers.
 *
 * @module lib/ai/models
 */

import type { ModelMetadata } from "@/features/chat/types";

/**
 * Registry of all available AI models
 * Models are keyed by their unique identifier (provider:modelId format)
 */
export const MODEL_REGISTRY: Record<string, ModelMetadata> = {
    // ============================================================================
    // OPENAI - Latest Models
    // ============================================================================
    "openai:gpt-4o": {
        id: "openai:gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        description: "Most capable OpenAI model with multimodal capabilities",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "openai:gpt-4o-mini": {
        id: "openai:gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        description: "Fast and affordable",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "openai:gpt-4o-latest": {
        id: "openai:gpt-4o-latest",
        name: "GPT-4o Latest",
        provider: "openai",
        description:
            "Latest GPT-4o with adaptive responses and multimodal capabilities",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "openai:gpt-4.1": {
        id: "openai:gpt-4.1",
        name: "GPT-4.1",
        provider: "openai",
        description: "OpenAI reasoning model with tool and vision support",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 128_000,
        },
    },

    // ============================================================================
    // ANTHROPIC - Claude Models
    // ============================================================================
    "anthropic:claude-3-5-sonnet-20241022": {
        id: "anthropic:claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        description: "Best for coding and analysis",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 200_000,
        },
    },

    // ============================================================================
    // GOOGLE GEMINI - Latest Models
    // ============================================================================
    "google:gemini-2.0-flash-exp": {
        id: "google:gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash",
        provider: "google",
        description: "Fast multimodal model from Google",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 1_048_576,
        },
    },
    "google:gemini-3.0-pro-preview": {
        id: "google:gemini-3.0-pro-preview",
        name: "Gemini 3.0 Pro Preview",
        provider: "google",
        description:
            "Preview of next-gen Gemini with enhanced reasoning and multimodal capabilities",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },
    "google:gemini-2.5-pro": {
        id: "google:gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "google",
        description:
            "Advanced Gemini model with strong reasoning and coding - supports thinking summaries",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },
    "google:gemini-2.5-flash": {
        id: "google:gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "google",
        description: "Fast Gemini model optimized for speed and efficiency",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },
    "google:gemini-2.5-flash-lite": {
        id: "google:gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        provider: "google",
        description:
            "Ultra-fast and cost-efficient model for high-volume latency-sensitive tasks",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },

    // ============================================================================
    // GOOGLE GEMMA 3 - Open Model Family
    // ============================================================================
    "google:gemma-3-1b-it": {
        id: "google:gemma-3-1b-it",
        name: "Gemma 3 1B",
        provider: "google",
        description:
            "Lightweight text-only model optimized for on-device deployment",
        capabilities: {
            supportsImages: false,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 32_000,
        },
    },
    "google:gemma-3-4b-it": {
        id: "google:gemma-3-4b-it",
        name: "Gemma 3 4B",
        provider: "google",
        description:
            "Multimodal model with text and vision, optimized for mobile and laptop deployment",
        capabilities: {
            supportsImages: true,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "google:gemma-3-12b-it": {
        id: "google:gemma-3-12b-it",
        name: "Gemma 3 12B",
        provider: "google",
        description:
            "Balanced multimodal model with strong performance across text and vision tasks",
        capabilities: {
            supportsImages: true,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },
    "google:gemma-3-27b-it": {
        id: "google:gemma-3-27b-it",
        name: "Gemma 3 27B",
        provider: "google",
        description:
            "Flagship multimodal model with advanced understanding and 140+ language support",
        capabilities: {
            supportsImages: true,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },

    // ============================================================================
    // GOOGLE IMAGE GENERATION MODELS
    // ============================================================================
    "google:imagen-4-generation": {
        id: "google:imagen-4-generation",
        name: "Imagen 4 Generation",
        provider: "google",
        description:
            "High-quality text-to-image generation with superior prompt adherence",
        capabilities: {
            supportsImages: false,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 4096,
        },
    },
    "google:imagen-4-fast": {
        id: "google:imagen-4-fast",
        name: "Imagen 4 Fast",
        provider: "google",
        description: "Optimized for low-latency image generation",
        capabilities: {
            supportsImages: false,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 4096,
        },
    },
    "google:imagen-4-ultra": {
        id: "google:imagen-4-ultra",
        name: "Imagen 4 Ultra",
        provider: "google",
        description: "Premium image generation with maximum quality",
        capabilities: {
            supportsImages: false,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 4096,
        },
    },

    // ============================================================================
    // GOOGLE VIDEO GENERATION MODELS (VEO)
    // ============================================================================
    "google:veo-3-generation": {
        id: "google:veo-3-generation",
        name: "Veo 3 Generation",
        provider: "google",
        description: "High-quality video generation from text and images",
        capabilities: {
            supportsImages: true,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 4096,
        },
    },
    "google:veo-3-fast": {
        id: "google:veo-3-fast",
        name: "Veo 3 Fast",
        provider: "google",
        description: "Fast video generation balancing speed and quality",
        capabilities: {
            supportsImages: true,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 4096,
        },
    },

    // ============================================================================
    // OPENROUTER - ANTHROPIC CLAUDE
    // ============================================================================
    "openrouter:anthropic/claude-3.7-sonnet": {
        id: "openrouter:anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        provider: "openrouter",
        description:
            "Latest Claude with extended thinking mode for deep reasoning",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 200_000,
        },
    },
    "openrouter:anthropic/claude-3.5-sonnet": {
        id: "openrouter:anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet (OpenRouter)",
        provider: "openrouter",
        description:
            "High-performance Claude model with strong coding capabilities",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: false,
            maxTokens: 200_000,
        },
    },

    // ============================================================================
    // OPENROUTER - DEEPSEEK
    // ============================================================================
    "openrouter:deepseek/deepseek-r1:free": {
        id: "openrouter:deepseek/deepseek-r1:free",
        name: "DeepSeek R1",
        provider: "openrouter",
        description: "Open-source reasoning model with native chain-of-thought",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 128_000,
        },
    },
    "openrouter:deepseek/deepseek-chat:free": {
        id: "openrouter:deepseek/deepseek-chat:free",
        name: "DeepSeek V3",
        provider: "openrouter",
        description:
            "DeepSeek V3 flagship chat model with strong reasoning and coding performance",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 128_000,
        },
    },

    // ============================================================================
    // OPENROUTER - ALIBABA QWEN
    // ============================================================================
    "openrouter:qwen/qwen-max": {
        id: "openrouter:qwen/qwen-max",
        name: "Qwen Max",
        provider: "openrouter",
        description:
            "Latest Alibaba Qwen model with strong reasoning capabilities",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 200_000,
        },
    },
    "openrouter:qwen/qwen3-coder:free": {
        id: "openrouter:qwen/qwen3-coder:free",
        name: "Qwen 3 Coder 480B (free)",
        provider: "openrouter",
        description:
            "State-of-the-art agentic coding model with 480B MoE, excels at function calling and tool use",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 262_144,
        },
    },

    // ============================================================================
    // OPENROUTER - FREE COMMUNITY MODELS
    // ============================================================================
    "openrouter:openai/gpt-oss-120b:free": {
        id: "openrouter:openai/gpt-oss-120b:free",
        name: "GPT-OSS 120B (free)",
        provider: "openrouter",
        description:
            "OpenAI open-source reasoning model with 117B parameters, near-parity with o4-mini",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 131_072,
        },
    },
    "openrouter:openai/gpt-oss-20b:free": {
        id: "openrouter:openai/gpt-oss-20b:free",
        name: "GPT-OSS 20B (free)",
        provider: "openrouter",
        description:
            "OpenAI lightweight open-source model with 21B parameters, runs on 16GB devices",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 131_072,
        },
    },
    "openrouter:z-ai/glm-4.5-air:free": {
        id: "openrouter:z-ai/glm-4.5-air:free",
        name: "GLM-4.5 Air (free)",
        provider: "openrouter",
        description:
            "Agent-centric MoE model with 106B total / 12B active parameters",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 131_072,
        },
    },
    "openrouter:moonshotai/kimi-k2:free": {
        id: "openrouter:moonshotai/kimi-k2:free",
        name: "Kimi K2 (free)",
        provider: "openrouter",
        description:
            "Moonshot AI model optimized for advanced tool use, reasoning, and code synthesis",
        capabilities: {
            supportsImages: false,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 256_000,
        },
    },
    "openrouter:venice/uncensored:free": {
        id: "openrouter:venice/uncensored:free",
        name: "Venice Uncensored (free)",
        provider: "openrouter",
        description:
            "Uncensored Dolphin Mistral 24B Venice Edition optimized for steerable assistant-style use",
        capabilities: {
            supportsImages: false,
            supportsTools: false,
            supportsReasoning: false,
            maxTokens: 128_000,
        },
    },

    // ============================================================================
    // CLOUDFLARE AI GATEWAY - Gemini via Gateway
    // ============================================================================
    "cloudflare-ai-gateway:gemini-2.5-flash-lite": {
        id: "cloudflare-ai-gateway:gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite (CF Gateway)",
        provider: "cloudflare-ai-gateway",
        description:
            "Google Gemini 2.5 Flash Lite via Cloudflare AI Gateway with fallback",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },
    "cloudflare-ai-gateway:gemini-2.5-flash": {
        id: "cloudflare-ai-gateway:gemini-2.5-flash",
        name: "Gemini 2.5 Flash (CF Gateway)",
        provider: "cloudflare-ai-gateway",
        description:
            "Google Gemini 2.5 Flash via Cloudflare AI Gateway with flash-lite fallback",
        capabilities: {
            supportsImages: true,
            supportsTools: true,
            supportsReasoning: true,
            maxTokens: 1_000_000,
        },
    },
} as const;

// =============================================================================
// NOTE: Model configuration (DEFAULT_MODEL_ID, TOOL_MODEL_ID, TITLE_MODEL_ID)
// is now centralized in lib/ai/config.ts for environment variable override support.
// =============================================================================

/**
 * Reasoning model ID (used internally for reasoning-specific operations)
 */
export const REASONING_MODEL_ID = "google:gemini-2.5-flash";

/**
 * Get all available models as an array
 */
export function getAvailableModels(): ModelMetadata[] {
    return Object.values(MODEL_REGISTRY);
}

/**
 * Get a model by its ID
 * @param id - The model identifier
 * @returns The model metadata or undefined if not found
 */
export function getModelById(id: string): ModelMetadata | undefined {
    return MODEL_REGISTRY[id];
}

/**
 * Check if a model ID is valid
 * @param id - The model identifier to check
 */
export function isValidModel(id: string): boolean {
    return id in MODEL_REGISTRY;
}

/**
 * Get models filtered by provider
 * @param provider - The provider name
 */
export function getModelsByProvider(provider: string): ModelMetadata[] {
    return Object.values(MODEL_REGISTRY).filter((m) => m.provider === provider);
}

/**
 * Get models that support reasoning
 */
export function getReasoningModels(): ModelMetadata[] {
    return Object.values(MODEL_REGISTRY).filter(
        (m) => m.capabilities?.supportsReasoning
    );
}

/**
 * Get models that support images
 */
export function getVisionModels(): ModelMetadata[] {
    return Object.values(MODEL_REGISTRY).filter(
        (m) => m.capabilities?.supportsImages
    );
}
