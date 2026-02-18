/**
 * AI Model Registry
 *
 * Model definitions including IDs, display names, capabilities, and defaults.
 * Provides functions to get models by ID and list available models.
 * Includes reasoning model middleware support for chain-of-thought extraction.
 *
 * @module lib/ai/registry
 */

import type { LanguageModelV2, ProviderV2 } from "@ai-sdk/provider"
import {
	createProviderRegistry,
	extractReasoningMiddleware,
	wrapLanguageModel,
} from "ai"
import { isTestEnvironment } from "@/lib/constants"
import { availableProviderIds, getProvider, providers } from "./providers"
import type {
	ModelCapabilities,
	ModelCapability,
	ModelModality,
	ReasoningType,
} from "./types"

// =============================================================================
// Re-export Types from types.ts
// =============================================================================

// Re-export types for backward compatibility and convenience
export type {
	ModelCapabilities,
	ModelCapability,
	ModelMetadata,
	ModelModality,
	ProviderId,
	ReasoningType,
} from "./types"
export {
	fromLegacyCapabilities,
	PROVIDER_DISPLAY_NAMES,
	toLegacyCapabilities,
} from "./types"

// =============================================================================
// Model Types
// =============================================================================

/**
 * Model definition with metadata.
 * Extends ModelMetadata with additional registry-specific fields.
 */
export interface ModelDefinition {
	/** Unique model identifier (provider:model format) */
	id: string
	/** Display name for UI */
	name: string
	/** Provider identifier */
	provider: string
	/** Model ID within provider (may differ from id suffix) */
	modelId: string
	/** Maximum output tokens */
	maxTokens: number
	/** Maximum context window */
	contextWindow: number
	/** Model capabilities (legacy boolean format) */
	capabilities: ModelCapabilities
	/** Optional description */
	description?: string
	/** Whether this is a curated/recommended model */
	isCurated?: boolean
	/** Optional tags for categorization */
	tags?: string[]
	/** Supported modalities (optional, for enhanced metadata) */
	modalities?: ModelModality[]
	/** Capability array (optional, for enhanced metadata) */
	capabilityList?: ModelCapability[]
	/** Reasoning type for chain-of-thought models */
	reasoningType?: ReasoningType
	/** Thinking budget for reasoning models */
	thinkingBudget?: number
	/** Source of model information */
	source?: "curated" | "discovered"
}

// =============================================================================
// Curated Models
// =============================================================================

/**
 * Curated list of recommended models with their capabilities.
 * Only includes models from available providers.
 * Last updated: February 2026
 */
const curatedModels: ModelDefinition[] = [
	// ============================================================================
	// TITLE MODEL (no thinking for fast title generation)
	// ============================================================================
	{
		id: "google:gemini-flash-lite-latest-title",
		name: "Gemini Flash Lite Latest (Title)",
		provider: "google",
		modelId: "gemini-2.0-flash-lite",
		maxTokens: 1024,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: false,
			tools: false,
			reasoning: false,
			code: false,
		},
		description:
			"Ultra-fast model optimized for title generation with no thinking overhead",
		isCurated: true,
		tags: ["curated", "fast", "lightweight", "title"],
		modalities: ["text"],
		capabilityList: ["chat"],
		reasoningType: "none",
		thinkingBudget: 0,
	},

	// ============================================================================
	// OPENAI - Latest Models
	// ============================================================================
	{
		id: "openai:gpt-4o",
		name: "GPT-4o",
		provider: "openai",
		modelId: "gpt-4o",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description:
			"Latest GPT-4o with adaptive responses and multimodal capabilities",
		isCurated: true,
		tags: ["curated", "latest", "flagship", "multimodal"],
		modalities: ["text", "vision", "audio"],
		capabilityList: ["chat", "multimodal", "tooling", "memory"],
	},
	{
		id: "openai:gpt-4o-mini",
		name: "GPT-4o Mini",
		provider: "openai",
		modelId: "gpt-4o-mini",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Fast and affordable small model",
		isCurated: true,
		tags: ["curated", "fast", "affordable"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "multimodal", "tooling"],
	},
	{
		id: "openai:o1",
		name: "o1",
		provider: "openai",
		modelId: "o1",
		maxTokens: 100000,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: false,
			tools: false,
			reasoning: true,
			code: true,
		},
		description: "Advanced reasoning model",
		isCurated: true,
		tags: ["curated", "reasoning", "advanced"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code"],
		reasoningType: "openai-thinking",
		thinkingBudget: 6000,
	},
	{
		id: "openai:gpt-4.1",
		name: "GPT-4.1",
		provider: "openai",
		modelId: "gpt-4.1",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description: "OpenAI reasoning model with tool and vision support",
		isCurated: true,
		tags: ["curated", "reasoning"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "reasoning", "tooling"],
		reasoningType: "openai-thinking",
		thinkingBudget: 6000,
	},

	// ============================================================================
	// GOOGLE GEMINI - Latest Models
	// ============================================================================
	{
		id: "google:gemini-3.0-pro-preview",
		name: "Gemini 3.0 Pro Preview",
		provider: "google",
		modelId: "gemini-3.0-pro-preview",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Preview of the next-generation Gemini model with enhanced reasoning and multimodal capabilities",
		isCurated: true,
		tags: ["curated", "latest", "reasoning"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "reasoning", "vision", "code", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},

	// ============================================================================
	// GOOGLE GEMMA 3 - Open Model Family
	// ============================================================================
	{
		id: "openrouter:google/gemma-3-1b-it:free",
		name: "Gemma 3 1B",
		provider: "openrouter",
		modelId: "google/gemma-3-1b-it:free",
		maxTokens: 8192,
		contextWindow: 32000,
		capabilities: {
			chat: true,
			vision: false,
			tools: false,
			reasoning: false,
			code: false,
		},
		description:
			"Lightweight text-only model optimized for on-device deployment",
		isCurated: true,
		tags: ["curated", "open-source", "lightweight", "free"],
		modalities: ["text"],
		capabilityList: ["chat"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/gemma-3-4b-it:free",
		name: "Gemma 3 4B",
		provider: "openrouter",
		modelId: "google/gemma-3-4b-it:free",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: false,
			reasoning: false,
			code: true,
		},
		description:
			"Multimodal model with text and vision, optimized for mobile and laptop deployment",
		isCurated: true,
		tags: ["curated", "open-source", "multimodal", "free"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "multimodal", "code"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/gemma-3-12b-it:free",
		name: "Gemma 3 12B",
		provider: "openrouter",
		modelId: "google/gemma-3-12b-it:free",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: false,
			reasoning: false,
			code: true,
		},
		description:
			"Balanced multimodal model with strong performance across text and vision tasks",
		isCurated: true,
		tags: ["curated", "open-source", "multimodal", "free"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "multimodal", "code"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/gemma-3-27b-it:free",
		name: "Gemma 3 27B",
		provider: "openrouter",
		modelId: "google/gemma-3-27b-it:free",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: false,
			reasoning: false,
			code: true,
		},
		description:
			"Flagship multimodal model with advanced understanding and 140+ language support",
		isCurated: true,
		tags: ["curated", "open-source", "multimodal", "flagship", "free"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "multimodal", "code"],
		reasoningType: "none",
	},

	// ============================================================================
	// GOOGLE GEMINI 2.5 - Full Model Family
	// ============================================================================
	{
		id: "google:gemini-2.0-flash",
		name: "Gemini 2.0 Flash",
		provider: "google",
		modelId: "gemini-2.0-flash",
		maxTokens: 8192,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "Fast and efficient multimodal model",
		isCurated: true,
		tags: ["curated", "fast", "multimodal"],
		modalities: ["text", "vision", "audio"],
		capabilityList: ["chat", "multimodal", "tooling"],
	},
	{
		id: "google:gemini-2.5-pro",
		name: "Gemini 2.5 Pro",
		provider: "google",
		modelId: "gemini-2.5-pro",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Advanced Gemini model with strong reasoning and coding - supports thinking summaries",
		isCurated: true,
		tags: ["curated", "reasoning", "flagship"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "reasoning", "vision", "code", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},
	{
		id: "google:gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		provider: "google",
		modelId: "gemini-2.5-flash",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description: "Fast Gemini model optimized for speed and efficiency",
		isCurated: true,
		tags: ["curated", "fast", "reasoning"],
		modalities: ["text", "vision", "audio"],
		capabilityList: ["chat", "multimodal", "reasoning", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},
	{
		id: "google:gemini-2.5-flash-lite",
		name: "Gemini 2.5 Flash Lite",
		provider: "google",
		modelId: "gemini-2.5-flash-lite",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Ultra-fast and cost-efficient model for high-volume latency-sensitive tasks",
		isCurated: true,
		tags: ["curated", "fast", "lightweight", "reasoning"],
		modalities: ["text"],
		capabilityList: ["chat", "code", "reasoning", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},
	{
		id: "google:gemini-2.5-flash-image",
		name: "Gemini 2.5 Flash Image",
		provider: "google",
		modelId: "gemini-2.5-flash-image",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: true,
			vision: true,
			tools: false,
			reasoning: false,
			code: false,
		},
		description:
			"Advanced image generation and editing model with character consistency and multimodal blending",
		isCurated: true,
		tags: ["curated", "image-gen", "latest"],
		modalities: ["text", "vision"],
		capabilityList: ["image-generation", "multimodal"],
	},

	// ============================================================================
	// GOOGLE IMAGE GENERATION MODELS
	// ============================================================================
	{
		id: "openrouter:google/imagen-4-generation",
		name: "Imagen 4 Generation",
		provider: "openrouter",
		modelId: "google/imagen-4-generation",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: false,
			vision: false,
			tools: false,
			reasoning: false,
			code: false,
		},
		description:
			"High-quality text-to-image generation with superior prompt adherence",
		isCurated: true,
		tags: ["curated", "image-gen"],
		modalities: ["text"],
		capabilityList: ["image-generation"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/imagen-4-fast",
		name: "Imagen 4 Fast",
		provider: "openrouter",
		modelId: "google/imagen-4-fast",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: false,
			vision: false,
			tools: false,
			reasoning: false,
			code: false,
		},
		description: "Optimized for low-latency image generation",
		isCurated: true,
		tags: ["curated", "image-gen", "fast"],
		modalities: ["text"],
		capabilityList: ["image-generation"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/imagen-4-ultra",
		name: "Imagen 4 Ultra",
		provider: "openrouter",
		modelId: "google/imagen-4-ultra",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: false,
			vision: false,
			tools: false,
			reasoning: false,
			code: false,
		},
		description: "Premium image generation with maximum quality",
		isCurated: true,
		tags: ["curated", "image-gen", "premium"],
		modalities: ["text"],
		capabilityList: ["image-generation"],
		reasoningType: "none",
	},

	// ============================================================================
	// GOOGLE VIDEO GENERATION MODELS (VEO)
	// ============================================================================
	{
		id: "openrouter:google/veo-3-generation",
		name: "Veo 3 Generation",
		provider: "openrouter",
		modelId: "google/veo-3-generation",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: false,
			vision: true,
			tools: false,
			reasoning: false,
			code: false,
		},
		description: "High-quality video generation from text and images",
		isCurated: true,
		tags: ["curated", "video-gen"],
		modalities: ["text", "vision"],
		capabilityList: ["video-generation"],
		reasoningType: "none",
	},
	{
		id: "openrouter:google/veo-3-fast",
		name: "Veo 3 Fast",
		provider: "openrouter",
		modelId: "google/veo-3-fast",
		maxTokens: 4096,
		contextWindow: 4096,
		capabilities: {
			chat: false,
			vision: true,
			tools: false,
			reasoning: false,
			code: false,
		},
		description: "Fast video generation balancing speed and quality",
		isCurated: true,
		tags: ["curated", "video-gen", "fast"],
		modalities: ["text", "vision"],
		capabilityList: ["video-generation"],
		reasoningType: "none",
	},

	// ============================================================================
	// ANTHROPIC CLAUDE - Latest Models (via OpenRouter)
	// ============================================================================
	{
		id: "openrouter:anthropic/claude-3.7-sonnet",
		name: "Claude 3.7 Sonnet",
		provider: "openrouter",
		modelId: "anthropic/claude-3.7-sonnet",
		maxTokens: 16384,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Latest Claude with extended thinking mode for deep reasoning",
		isCurated: true,
		tags: ["curated", "latest"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "reasoning", "vision", "tooling"],
		reasoningType: "anthropic-thinking",
		thinkingBudget: 8000,
	},
	{
		id: "openrouter:anthropic/claude-3.5-sonnet",
		name: "Claude 3.5 Sonnet",
		provider: "openrouter",
		modelId: "anthropic/claude-3.5-sonnet",
		maxTokens: 8192,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description:
			"High-performance Claude model with strong coding capabilities",
		isCurated: true,
		tags: ["curated"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "vision", "code", "tooling"],
	},

	// ============================================================================
	// DEEPSEEK - Latest Models (Free via OpenRouter)
	// ============================================================================
	{
		id: "openrouter:deepseek/deepseek-r1:free",
		name: "DeepSeek R1",
		provider: "openrouter",
		modelId: "deepseek/deepseek-r1:free",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description: "Open-source reasoning model with native chain-of-thought",
		isCurated: true,
		tags: ["curated", "open-source", "reasoning", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "deepseek-thinking",
		thinkingBudget: 6000,
	},
	{
		id: "openrouter:deepseek/deepseek-chat:free",
		name: "DeepSeek V3",
		provider: "openrouter",
		modelId: "deepseek/deepseek-chat:free",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"DeepSeek V3 flagship chat model with strong reasoning and coding performance",
		isCurated: true,
		tags: ["curated", "open-source", "reasoning", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "deepseek-thinking",
		thinkingBudget: 6000,
	},

	// ============================================================================
	// ALIBABA QWEN - Latest Models
	// ============================================================================
	{
		id: "openrouter:qwen/qwen-max",
		name: "Qwen Max",
		provider: "openrouter",
		modelId: "qwen/qwen-max",
		maxTokens: 8192,
		contextWindow: 200000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Latest Alibaba Qwen model with strong reasoning capabilities",
		isCurated: true,
		tags: ["curated"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "internal-thinking",
	},

	// ============================================================================
	// VENICE - Free Uncensored Model
	// ============================================================================
	{
		id: "openrouter:venice/uncensored:free",
		name: "Venice Uncensored",
		provider: "openrouter",
		modelId: "venice/uncensored:free",
		maxTokens: 4096,
		contextWindow: 32000,
		capabilities: {
			chat: true,
			vision: false,
			tools: false,
			reasoning: false,
			code: true,
		},
		description:
			"Uncensored Dolphin Mistral 24B Venice Edition optimized for steerable assistant-style use",
		isCurated: true,
		tags: ["curated", "open-source", "uncensored", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "code"],
		reasoningType: "none",
	},

	// ============================================================================
	// OPENAI GPT-OSS - Free Open-Source Models
	// ============================================================================
	{
		id: "openrouter:openai/gpt-oss-120b:free",
		name: "GPT-OSS 120B",
		provider: "openrouter",
		modelId: "openai/gpt-oss-120b:free",
		maxTokens: 16384,
		contextWindow: 131072,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"OpenAI open-source reasoning model with 117B parameters, near-parity with o4-mini on reasoning benchmarks",
		isCurated: true,
		tags: ["curated", "open-source", "reasoning", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "openai-thinking",
		thinkingBudget: 6000,
	},
	{
		id: "openrouter:openai/gpt-oss-20b:free",
		name: "GPT-OSS 20B",
		provider: "openrouter",
		modelId: "openai/gpt-oss-20b:free",
		maxTokens: 8192,
		contextWindow: 131072,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"OpenAI lightweight open-source model with 21B parameters, runs on 16GB devices, comparable to o3-mini",
		isCurated: true,
		tags: ["curated", "open-source", "reasoning", "free", "lightweight"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "openai-thinking",
		thinkingBudget: 4000,
	},

	// ============================================================================
	// GLM-4.5 - Free Model from THUDM/Z.AI
	// ============================================================================
	{
		id: "openrouter:z-ai/glm-4.5-air:free",
		name: "GLM-4.5 Air",
		provider: "openrouter",
		modelId: "z-ai/glm-4.5-air:free",
		maxTokens: 8192,
		contextWindow: 131072,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Agent-centric MoE model with 106B total / 12B active parameters, supports thinking and non-thinking modes",
		isCurated: true,
		tags: ["curated", "open-source", "reasoning", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "openai-thinking",
		thinkingBudget: 6000,
	},

	// ============================================================================
	// MOONSHOT KIMI K2 - Free Model
	// ============================================================================
	{
		id: "openrouter:moonshotai/kimi-k2:free",
		name: "Kimi K2",
		provider: "openrouter",
		modelId: "moonshotai/kimi-k2:free",
		maxTokens: 8192,
		contextWindow: 256000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Moonshot AI model optimized for advanced tool use, reasoning, and code synthesis",
		isCurated: true,
		tags: ["curated", "reasoning", "free"],
		modalities: ["text"],
		capabilityList: ["chat", "reasoning", "code", "tooling"],
		reasoningType: "openai-thinking",
		thinkingBudget: 6000,
	},

	// ============================================================================
	// QWEN 3 CODER - Free Agentic Coding Model
	// ============================================================================
	{
		id: "openrouter:qwen/qwen3-coder:free",
		name: "Qwen 3 Coder 480B",
		provider: "openrouter",
		modelId: "qwen/qwen3-coder:free",
		maxTokens: 16384,
		contextWindow: 262144,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"State-of-the-art agentic coding model with 480B MoE / 35B active parameters, excels at function calling and tool use",
		isCurated: true,
		tags: ["curated", "open-source", "code", "free", "flagship"],
		modalities: ["text"],
		capabilityList: ["chat", "code", "tooling", "reasoning"],
		reasoningType: "openai-thinking",
		thinkingBudget: 8000,
	},

	// ============================================================================
	// XAI Models
	// ============================================================================
	{
		id: "xai:grok-2",
		name: "Grok 2",
		provider: "xai",
		modelId: "grok-2",
		maxTokens: 8192,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: false,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "XAI's conversational AI",
		isCurated: true,
		tags: ["curated", "conversational"],
		modalities: ["text"],
		capabilityList: ["chat", "code", "tooling"],
	},

	// ============================================================================
	// Vercel Gateway Models (via gateway)
	// ============================================================================
	{
		id: "vercel-gateway:openai/gpt-4o",
		name: "GPT-4o (Gateway)",
		provider: "vercel-gateway",
		modelId: "openai/gpt-4o",
		maxTokens: 16384,
		contextWindow: 128000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: false,
			code: true,
		},
		description: "GPT-4o via Vercel AI Gateway",
		isCurated: true,
		tags: ["curated", "gateway", "multimodal"],
		modalities: ["text", "vision"],
		capabilityList: ["chat", "multimodal", "tooling"],
	},

	// ============================================================================
	// CLOUDFLARE AI GATEWAY - Latest Models
	// ============================================================================
	{
		id: "cloudflare-ai-gateway:gemini-2.5-flash-lite",
		name: "Gemini 2.5 Flash Lite (CF Gateway)",
		provider: "cloudflare-ai-gateway",
		modelId: "gemini-2.5-flash-lite",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Google Gemini 2.5 Flash Lite via Cloudflare AI Gateway with flash-lite fallback",
		isCurated: true,
		tags: ["curated", "gateway", "fast", "reasoning"],
		modalities: ["text", "vision", "audio"],
		capabilityList: ["chat", "multimodal", "reasoning", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},
	{
		id: "cloudflare-ai-gateway:gemini-2.5-flash",
		name: "Gemini 2.5 Flash (CF Gateway)",
		provider: "cloudflare-ai-gateway",
		modelId: "gemini-2.5-flash",
		maxTokens: 65536,
		contextWindow: 1000000,
		capabilities: {
			chat: true,
			vision: true,
			tools: true,
			reasoning: true,
			code: true,
		},
		description:
			"Google Gemini 2.5 Flash via Cloudflare AI Gateway with flash-lite fallback",
		isCurated: true,
		tags: ["curated", "gateway", "fast", "reasoning"],
		modalities: ["text", "vision", "audio"],
		capabilityList: ["chat", "multimodal", "reasoning", "tooling"],
		reasoningType: "gemini-thinking",
		thinkingBudget: -1,
	},
]

// =============================================================================
// Provider Registry
// =============================================================================

/**
 * Get available providers as a non-null record.
 * This helper ensures type safety for the provider registry.
 */
function getAvailableProvidersRecord(): Record<string, ProviderV2> {
	const available: Record<string, ProviderV2> = {}
	for (const [id, provider] of Object.entries(providers)) {
		if (provider !== null) {
			available[id] = provider
		}
	}
	return available
}

/**
 * Create provider registry from available providers.
 */
const providerRegistry = createProviderRegistry(getAvailableProvidersRecord())

// =============================================================================
// Reasoning Model Middleware
// =============================================================================

/**
 * Maps reasoning types to the appropriate tag names for chain-of-thought extraction.
 * This ensures the Vercel AI SDK's extractReasoningMiddleware correctly identifies
 * the reasoning/thinking tags from different providers.
 *
 * Reference: https://sdk.vercel.ai/docs/reference/reasoning
 *
 * @param reasoningType - The type of reasoning mechanism
 * @returns The tag name to use for extraction
 */
export function getReasoningTagName(reasoningType?: ReasoningType): string {
	switch (reasoningType) {
		case "openai-thinking":
			// OpenAI o1/o3 models use <think\> tags in their response
			return "think"
		case "anthropic-thinking":
			// Claude with extended thinking mode uses <thinking\> tags
			return "thinking"
		case "gemini-thinking":
			// Google Gemini thinking models use <think\> tags
			return "think"
		case "deepseek-thinking":
			// DeepSeek R1 uses <think\> tags
			return "think"
		case "internal-thinking":
			// Generic internal thinking extraction
			return "think"
		default:
			return "think" // Fallback to generic tag
	}
}

// =============================================================================
// Model Functions
// =============================================================================

/**
 * Filter models by available providers.
 */
function filterByAvailableProviders(
	models: ModelDefinition[],
): ModelDefinition[] {
	return models.filter((model) =>
		availableProviderIds.includes(model.provider),
	)
}

/**
 * Get all available models.
 * Returns only models from configured providers.
 *
 * @returns Array of available model definitions
 */
export function listModels(): ModelDefinition[] {
	return filterByAvailableProviders(curatedModels)
}

/**
 * Get models filtered by capability.
 *
 * @param capability - Capability to filter by
 * @returns Array of models with the specified capability
 */
export function listModelsByCapability(
	capability: keyof ModelCapabilities,
): ModelDefinition[] {
	return listModels().filter((model) => model.capabilities[capability])
}

/**
 * Get chat-capable models.
 *
 * @returns Array of models suitable for chat
 */
export function listChatModels(): ModelDefinition[] {
	return listModelsByCapability("chat")
}

/**
 * Get a model by its ID.
 *
 * @param id - Model identifier (provider:model format)
 * @returns Model definition or undefined if not found
 */
export function getModelById(id: string): ModelDefinition | undefined {
	return listModels().find((model) => model.id === id)
}

/**
 * Check if a model ID is valid.
 *
 * @param id - Model identifier
 * @returns true if model exists in available models
 */
export function isValidModelId(id: string): boolean {
	return listModels().some((model) => model.id === id)
}

/**
 * Get a language model instance by ID.
 * Automatically wraps reasoning models with chain-of-thought extraction middleware.
 * In test environment, returns mock models to avoid API calls.
 *
 * @param id - Model identifier (provider:model format)
 * @returns Language model instance for use with AI SDK
 *
 * @example
 * ```typescript
 * const model = getModel("openai:gpt-4o")
 * const { text } = await generateText({ model, prompt: "Hello!" })
 * ```
 */
export function getModel(id: string): LanguageModelV2 {
	// In test environment, return mock models
	if (isTestEnvironment) {
		// Dynamic import to avoid bundling mock models in production
		const {
			mockArtifactModel,
			mockChatModel,
			mockReasoningModel,
			mockTitleModel,
		} = require("./models.mock")

		switch (id) {
			case "chat-model":
			case "openai:gpt-4o":
			case "openai:gpt-4o-mini":
			case "google:gemini-2.0-flash":
			case "google:gemini-2.5-flash":
				return mockChatModel
			case "chat-model-reasoning":
			case "openai:o1":
				return mockReasoningModel
			case "title-model":
				return mockTitleModel
			case "artifact-model":
				return mockArtifactModel
			default:
				// Default to chat model for unknown IDs in test
				return mockChatModel
		}
	}

	const definition = getModelById(id)

	if (definition) {
		// Use the provider and modelId from definition
		const provider = getProvider(definition.provider)
		if (provider) {
			const model = provider.languageModel(
				definition.modelId,
			) as LanguageModelV2

			// Check if this model is a reasoning model that needs middleware wrapping
			const isReasoningModel =
				definition.capabilities.reasoning &&
				definition.reasoningType !== undefined &&
				definition.reasoningType !== "none"

			if (isReasoningModel) {
				// Wrap the model with reasoning middleware for chain-of-thought extraction
				const tagName = getReasoningTagName(definition.reasoningType)
				return wrapLanguageModel({
					model,
					middleware: extractReasoningMiddleware({ tagName }),
				})
			}

			return model
		}
	}

	// Fallback: try direct resolution through provider registry
	return providerRegistry.languageModel(id as `${string}:${string}`)
}

// =============================================================================
// Default Model Selection
// =============================================================================

/**
 * Default model priority order.
 * First available model from this list becomes the default.
 */
const defaultModelPriority = [
	"google:gemini-2.5-flash",
	"google:gemini-2.0-flash",
	"vercel-gateway:openai/gpt-4o",
	"openai:gpt-4o",
	"openai:gpt-4o-mini",
]

/**
 * Get the default chat model.
 * Returns the first available model from the priority list.
 *
 * @returns Default model definition or undefined if no models available
 */
export function getDefaultChatModel(): ModelDefinition | undefined {
	for (const id of defaultModelPriority) {
		const model = getModelById(id)
		if (model) {
			return model
		}
	}

	// Fallback to first available chat model
	return listChatModels()[0]
}

/**
 * Get the default model for reasoning tasks.
 *
 * @returns Reasoning-capable model or default chat model
 */
export function getReasoningModel(): ModelDefinition | undefined {
	const reasoningPriority = [
		"openai:o1",
		"google:gemini-2.5-pro",
		"google:gemini-2.5-flash",
	]

	for (const id of reasoningPriority) {
		const model = getModelById(id)
		if (model) {
			return model
		}
	}

	// Fallback to any reasoning-capable model
	return listModelsByCapability("reasoning")[0] ?? getDefaultChatModel()
}

/**
 * Get the default model for artifact generation.
 *
 * @returns Model suitable for artifact generation
 */
export function getDefaultArtifactModel(): ModelDefinition | undefined {
	// Prefer models with code and vision capabilities
	const artifactModels = listModels().filter(
		(model) => model.capabilities.code && model.capabilities.vision,
	)

	return artifactModels[0] ?? getDefaultChatModel()
}
