import type { ModelMetadata } from "./model-catalog-types";

/**
 * Curated list of latest reasoning and chat models from major providers (October 2025)
 * Only includes models currently available in production APIs
 * Deprecated and older versions have been removed
 */
export const curatedModels: ModelMetadata[] = [
    // Title Model (no thinking for fast title generation)
    // ============================================================================
    {
        id: "google:gemini-flash-lite-latest-title",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-flash-lite-latest",
        name: "Gemini Flash Lite Latest (Title)",
        description:
            "Ultra-fast model optimized for title generation with no thinking overhead",
        release: "2025-06",
        contextWindow: 1_000_000,
        modalities: ["text"],
        capabilities: ["chat"],
        tags: ["curated", "fast", "lightweight", "title"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
        thinkingBudget: 0,
    },
    // ============================================================================
    // OPENAI - Latest Models
    // ============================================================================
    {
        id: "openai:gpt-4o-latest",
        providerId: "openai",
        providerName: "OpenAI",
        modelId: "gpt-4o-latest",
        name: "GPT-4o Latest",
        description:
            "Latest GPT-4o with adaptive responses and multimodal capabilities",
        release: "2025-08",
        contextWindow: 128_000,
        modalities: ["text", "vision", "audio"],
        capabilities: ["chat", "multimodal", "tooling", "memory"],
        tags: ["curated", "latest"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "openai:gpt-4.1",
        providerId: "openai",
        providerName: "OpenAI",
        modelId: "gpt-4.1",
        name: "GPT-4.1",
        description: "OpenAI reasoning model with tool and vision support",
        release: "2024-12",
        contextWindow: 128_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "reasoning", "tooling"],
        tags: ["curated"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 6000,
    },

    // ============================================================================
    // GOOGLE GEMINI - Latest Models
    // ============================================================================
    {
        id: "google:gemini-3.0-pro-preview",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-3.0-pro-preview",
        name: "Gemini 3.0 Pro Preview",
        description:
            "Preview of the next-generation Gemini model with enhanced reasoning and multimodal capabilities",
        release: "2025-11",
        contextWindow: 1_000_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "reasoning", "vision", "code", "tooling"],
        tags: ["curated", "latest", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
    // ============================================================================
    // GOOGLE GEMMA 3 - Open Model Family
    // ============================================================================
    {
        id: "google:gemma-3-1b-it",
        providerId: "google",
        providerName: "Google Gemma",
        modelId: "gemma-3-1b-it",
        name: "Gemma 3 1B",
        description:
            "Lightweight text-only model optimized for on-device deployment",
        release: "2025-03",
        contextWindow: 32_000,
        modalities: ["text"],
        capabilities: ["chat"],
        tags: ["curated", "open-source", "lightweight"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:gemma-3-4b-it",
        providerId: "google",
        providerName: "Google Gemma",
        modelId: "gemma-3-4b-it",
        name: "Gemma 3 4B",
        description:
            "Multimodal model with text and vision, optimized for mobile and laptop deployment",
        release: "2025-03",
        contextWindow: 128_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "multimodal", "code"],
        tags: ["curated", "open-source", "multimodal"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:gemma-3-12b-it",
        providerId: "google",
        providerName: "Google Gemma",
        modelId: "gemma-3-12b-it",
        name: "Gemma 3 12B",
        description:
            "Balanced multimodal model with strong performance across text and vision tasks",
        release: "2025-03",
        contextWindow: 128_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "multimodal", "code"],
        tags: ["curated", "open-source", "multimodal"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:gemma-3-27b-it",
        providerId: "google",
        providerName: "Google Gemma",
        modelId: "gemma-3-27b-it",
        name: "Gemma 3 27B",
        description:
            "Flagship multimodal model with advanced understanding and 140+ language support",
        release: "2025-03",
        contextWindow: 128_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "multimodal", "code"],
        tags: ["curated", "open-source", "multimodal", "flagship"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ============================================================================
    // GOOGLE GEMINI 2.5 - Full Model Family
    // ============================================================================
    {
        id: "google:gemini-2.5-pro",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description:
            "Advanced Gemini model with strong reasoning and coding - supports thinking summaries",
        release: "2025-05",
        contextWindow: 1_000_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "reasoning", "vision", "code", "tooling"],
        tags: ["curated", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
    {
        id: "google:gemini-2.5-flash",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Fast Gemini model optimized for speed and efficiency",
        release: "2025-05",
        contextWindow: 1_000_000,
        modalities: ["text", "vision", "audio"],
        capabilities: ["chat", "multimodal", "reasoning", "tooling"],
        tags: ["curated", "fast", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
    {
        id: "google:gemini-2.5-flash-lite",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        description:
            "Ultra-fast and cost-efficient model for high-volume latency-sensitive tasks",
        release: "2025-06",
        contextWindow: 1_000_000,
        modalities: ["text"],
        capabilities: ["chat", "code", "reasoning", "tooling"],
        tags: ["curated", "fast", "lightweight", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
    {
        id: "google:gemini-2.5-flash-image",
        providerId: "google",
        providerName: "Google Gemini",
        modelId: "gemini-2.5-flash-image",
        name: "Gemini 2.5 Flash Image (Nano Banana)",
        description:
            "Advanced image generation and editing model with character consistency and multimodal blending",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text", "vision"],
        capabilities: ["image-generation", "multimodal"],
        tags: ["curated", "image-gen", "latest"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ============================================================================
    // GOOGLE IMAGE GENERATION MODELS
    // ============================================================================
    {
        id: "google:imagen-4-generation",
        providerId: "google",
        providerName: "Google Vertex AI",
        modelId: "imagen-4-generation",
        name: "Imagen 4 Generation",
        description:
            "High-quality text-to-image generation with superior prompt adherence",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text"],
        capabilities: ["image-generation"],
        tags: ["curated", "image-gen"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:imagen-4-fast",
        providerId: "google",
        providerName: "Google Vertex AI",
        modelId: "imagen-4-fast",
        name: "Imagen 4 Fast",
        description: "Optimized for low-latency image generation",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text"],
        capabilities: ["image-generation"],
        tags: ["curated", "image-gen", "fast"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:imagen-4-ultra",
        providerId: "google",
        providerName: "Google Vertex AI",
        modelId: "imagen-4-ultra",
        name: "Imagen 4 Ultra",
        description: "Premium image generation with maximum quality",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text"],
        capabilities: ["image-generation"],
        tags: ["curated", "image-gen", "premium"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ============================================================================
    // GOOGLE VIDEO GENERATION MODELS (VEO)
    // ============================================================================
    {
        id: "google:veo-3-generation",
        providerId: "google",
        providerName: "Google Vertex AI",
        modelId: "veo-3-generation",
        name: "Veo 3 Generation",
        description: "High-quality video generation from text and images",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text", "vision"],
        capabilities: ["video-generation"],
        tags: ["curated", "video-gen"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },
    {
        id: "google:veo-3-fast",
        providerId: "google",
        providerName: "Google Vertex AI",
        modelId: "veo-3-fast",
        name: "Veo 3 Fast",
        description: "Fast video generation balancing speed and quality",
        release: "2025-06",
        contextWindow: 4096,
        modalities: ["text", "vision"],
        capabilities: ["video-generation"],
        tags: ["curated", "video-gen", "fast"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ============================================================================
    // ANTHROPIC CLAUDE - Latest Models
    // ============================================================================
    {
        id: "openrouter:anthropic/claude-3.7-sonnet",
        providerId: "openrouter",
        providerName: "Anthropic (via OpenRouter)",
        modelId: "anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        description:
            "Latest Claude with extended thinking mode for deep reasoning",
        release: "2025-02",
        contextWindow: 200_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "reasoning", "vision", "tooling"],
        tags: ["curated", "latest"],
        source: "curated",
        isCurated: true,
        reasoningType: "anthropic-thinking",
        thinkingBudget: 8000,
    },
    {
        id: "openrouter:anthropic/claude-3.5-sonnet",
        providerId: "openrouter",
        providerName: "Anthropic (via OpenRouter)",
        modelId: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        description:
            "High-performance Claude model with strong coding capabilities",
        release: "2024-06",
        contextWindow: 200_000,
        modalities: ["text", "vision"],
        capabilities: ["chat", "vision", "code", "tooling"],
        tags: ["curated"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ============================================================================
    // DEEPSEEK - Latest Models
    // ============================================================================
    {
        id: "openrouter:deepseek/deepseek-r1:free",
        providerId: "openrouter",
        providerName: "DeepSeek (via OpenRouter)",
        modelId: "deepseek/deepseek-r1:free",
        name: "DeepSeek R1",
        description: "Open-source reasoning model with native chain-of-thought",
        release: "2025-01",
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "open-source", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "deepseek-thinking",
        thinkingBudget: 6000,
    },
    {
        id: "openrouter:deepseek/deepseek-chat:free",
        providerId: "openrouter",
        providerName: "DeepSeek (via OpenRouter)",
        modelId: "deepseek/deepseek-chat:free",
        name: "DeepSeek V3",
        description:
            "DeepSeek V3 flagship chat model with strong reasoning and coding performance",
        contextWindow: 128_000,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "open-source", "reasoning", "free"],
        source: "curated",
        isCurated: true,
        reasoningType: "deepseek-thinking",
        thinkingBudget: 6000,
    },
    // ============================================================================
    // ALIBABA QWEN - Latest Models
    // ============================================================================
    {
        id: "openrouter:qwen/qwen-max",
        providerId: "openrouter",
        providerName: "Alibaba Qwen (via OpenRouter)",
        modelId: "qwen/qwen-max",
        name: "Qwen Max",
        description:
            "Latest Alibaba Qwen model with strong reasoning capabilities",
        release: "2025-04",
        contextWindow: 200_000,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated"],
        source: "curated",
        isCurated: true,
        reasoningType: "internal-thinking",
    },
    // ==========================================================================
    // VENICE - Free Uncensored Model
    // ==========================================================================
    {
        id: "openrouter:venice/uncensored:free",
        providerId: "openrouter",
        providerName: "Venice (via OpenRouter)",
        modelId: "venice/uncensored:free",
        name: "Venice Uncensored (free)",
        description:
            "Uncensored Dolphin Mistral 24B Venice Edition optimized for steerable assistant-style use",
        modalities: ["text"],
        capabilities: ["chat", "code"],
        tags: ["curated", "open-source", "uncensored", "free"],
        source: "curated",
        isCurated: true,
        reasoningType: "none",
    },

    // ==========================================================================
    // OPENAI GPT-OSS - Free Open-Source Models
    // ==========================================================================
    {
        id: "openrouter:openai/gpt-oss-120b:free",
        providerId: "openrouter",
        providerName: "OpenAI (via OpenRouter)",
        modelId: "openai/gpt-oss-120b:free",
        name: "GPT-OSS 120B (free)",
        description:
            "OpenAI open-source reasoning model with 117B parameters, near-parity with o4-mini on reasoning benchmarks",
        release: "2025-06",
        contextWindow: 131_072,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "open-source", "reasoning", "free"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 6000,
    },
    {
        id: "openrouter:openai/gpt-oss-20b:free",
        providerId: "openrouter",
        providerName: "OpenAI (via OpenRouter)",
        modelId: "openai/gpt-oss-20b:free",
        name: "GPT-OSS 20B (free)",
        description:
            "OpenAI lightweight open-source model with 21B parameters, runs on 16GB devices, comparable to o3-mini",
        release: "2025-06",
        contextWindow: 131_072,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "open-source", "reasoning", "free", "lightweight"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 4000,
    },

    // ==========================================================================
    // GLM-4.5 - Free Model from THUDM/Z.AI
    // ==========================================================================
    {
        id: "openrouter:z-ai/glm-4.5-air:free",
        providerId: "openrouter",
        providerName: "Z.AI (via OpenRouter)",
        modelId: "z-ai/glm-4.5-air:free",
        name: "GLM-4.5 Air (free)",
        description:
            "Agent-centric MoE model with 106B total / 12B active parameters, supports thinking and non-thinking modes",
        release: "2025-06",
        contextWindow: 131_072,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "open-source", "reasoning", "free"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 6000,
    },

    // ==========================================================================
    // MOONSHOT KIMI K2 - Free Model
    // ==========================================================================
    {
        id: "openrouter:moonshotai/kimi-k2:free",
        providerId: "openrouter",
        providerName: "Moonshot AI (via OpenRouter)",
        modelId: "moonshotai/kimi-k2:free",
        name: "Kimi K2 (free)",
        description:
            "Moonshot AI model optimized for advanced tool use, reasoning, and code synthesis",
        release: "2025-09",
        contextWindow: 256_000,
        modalities: ["text"],
        capabilities: ["chat", "reasoning", "code", "tooling"],
        tags: ["curated", "reasoning", "free"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 6000,
    },

    // ==========================================================================
    // QWEN 3 CODER - Free Agentic Coding Model
    // ==========================================================================
    {
        id: "openrouter:qwen/qwen3-coder:free",
        providerId: "openrouter",
        providerName: "Alibaba Qwen (via OpenRouter)",
        modelId: "qwen/qwen3-coder:free",
        name: "Qwen 3 Coder 480B (free)",
        description:
            "State-of-the-art agentic coding model with 480B MoE / 35B active parameters, excels at function calling and tool use",
        release: "2025-07",
        contextWindow: 262_144,
        modalities: ["text"],
        capabilities: ["chat", "code", "tooling", "reasoning"],
        tags: ["curated", "open-source", "code", "free", "flagship"],
        source: "curated",
        isCurated: true,
        reasoningType: "openai-thinking",
        thinkingBudget: 8000,
    },

    // ============================================================================
    // CLOUDFLARE AI GATEWAY - Latest Models
    // ============================================================================
    {
        id: "cloudflare-ai-gateway:gemini-2.5-flash-lite",
        providerId: "cloudflare-ai-gateway",
        providerName: "Cloudflare AI Gateway",
        modelId: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite (CF Gateway)",
        description:
            "Google Gemini 2.5 Flash Lite via Cloudflare AI Gateway with flash-lite fallback",
        release: "2025-05",
        contextWindow: 1_000_000,
        modalities: ["text", "vision", "audio"],
        capabilities: ["chat", "multimodal", "reasoning", "tooling"],
        tags: ["curated", "gateway", "fast", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
    {
        id: "cloudflare-ai-gateway:gemini-2.5-flash",
        providerId: "cloudflare-ai-gateway",
        providerName: "Cloudflare AI Gateway",
        modelId: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash (CF Gateway)",
        description:
            "Google Gemini 2.5 Flash via Cloudflare AI Gateway with flash-lite fallback",
        release: "2025-05",
        contextWindow: 1_000_000,
        modalities: ["text", "vision", "audio"],
        capabilities: ["chat", "multimodal", "reasoning", "tooling"],
        tags: ["curated", "gateway", "fast", "reasoning"],
        source: "curated",
        isCurated: true,
        reasoningType: "gemini-thinking",
        thinkingBudget: -1,
    },
];
