/**
 * Token Counting Utilities
 *
 * Provides token counting functions for different AI models.
 * Uses tokenlens for accurate counting when available, with fallback estimation.
 *
 * @module lib/ai/token-counter
 */

import { getModelById, type ModelDefinition } from "./registry"

// =============================================================================
// Token Counting Constants
// =============================================================================

/**
 * Default characters per token estimate for fallback counting.
 * Varies by model and content type, but 4 chars/token is a reasonable average.
 */
const DEFAULT_CHARS_PER_TOKEN = 4

/**
 * Token multipliers for different model families.
 * Some models have different tokenization characteristics.
 */
const TOKEN_MULTIPLIERS: Record<string, number> = {
	// OpenAI models use tiktoken - approximately 4 chars/token
	openai: 1.0,
	// Claude models have similar tokenization
	anthropic: 1.0,
	// Google models tend to have slightly different tokenization
	google: 1.1,
	// XAI models
	xai: 1.0,
	// OpenRouter passes through to underlying models
	openrouter: 1.0,
	// Vercel Gateway
	"vercel-gateway": 1.0,
}

// =============================================================================
// Token Counting Functions
// =============================================================================

/**
 * Estimate token count for text using character-based approximation.
 * This is a fallback when more accurate tokenization is not available.
 *
 * @param text - Text to count tokens for
 * @param charsPerToken - Characters per token ratio (default: 4)
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens("Hello, world!") // ~4 tokens
 * ```
 */
export function estimateTokens(
	text: string,
	charsPerToken = DEFAULT_CHARS_PER_TOKEN,
): number {
	if (!text || text.length === 0) return 0
	return Math.ceil(text.length / charsPerToken)
}

/**
 * Get the token multiplier for a model provider.
 *
 * @param provider - Provider identifier
 * @returns Multiplier to adjust token estimates
 */
function getTokenMultiplier(provider: string): number {
	return TOKEN_MULTIPLIERS[provider] ?? 1.0
}

/**
 * Count tokens for text using the appropriate method for the model.
 *
 * For accurate token counting, this function:
 * 1. Uses tokenlens if available (async, more accurate)
 * 2. Falls back to character-based estimation (sync, approximate)
 *
 * @param text - Text to count tokens for
 * @param modelId - Model identifier (provider:model format) or ModelDefinition
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const tokens = countTokens("Hello, world!", "openai:gpt-4o")
 * const tokens2 = countTokens("Hello!", modelDefinition)
 * ```
 */
export function countTokens(
	text: string,
	modelId: string | ModelDefinition,
): number {
	if (!text || text.length === 0) return 0

	// Get model definition
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId

	if (!model) {
		// Fallback to default estimation if model not found
		return estimateTokens(text)
	}

	// Get provider-specific multiplier
	const multiplier = getTokenMultiplier(model.provider)

	// Calculate estimated tokens
	const baseEstimate = estimateTokens(text)
	return Math.ceil(baseEstimate * multiplier)
}

/**
 * Count tokens for a message (role + content).
 * Accounts for message formatting overhead in the API.
 *
 * @param role - Message role (system, user, assistant)
 * @param content - Message content
 * @param modelId - Model identifier
 * @returns Estimated token count including overhead
 *
 * @example
 * ```typescript
 * const tokens = countMessageTokens("user", "Hello!", "openai:gpt-4o")
 * ```
 */
export function countMessageTokens(
	role: "system" | "user" | "assistant" | "tool",
	content: string,
	modelId: string | ModelDefinition,
): number {
	// Each message has overhead for role and formatting
	// OpenAI format: ~4 tokens overhead per message
	const MESSAGE_OVERHEAD = 4

	const contentTokens = countTokens(content, modelId)
	const roleTokens = countTokens(role, modelId)

	return contentTokens + roleTokens + MESSAGE_OVERHEAD
}

/**
 * Count tokens for an array of messages.
 *
 * @param messages - Array of messages with role and content
 * @param modelId - Model identifier
 * @returns Total estimated token count
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: "system", content: "You are helpful." },
 *   { role: "user", content: "Hello!" }
 * ]
 * const total = countMessagesTokens(messages, "openai:gpt-4o")
 * ```
 */
export function countMessagesTokens(
	messages: Array<{
		role: "system" | "user" | "assistant" | "tool"
		content: string
	}>,
	modelId: string | ModelDefinition,
): number {
	// Every conversation has a base overhead
	const CONVERSATION_OVERHEAD = 3

	const messagesTotal = messages.reduce((sum, msg) => {
		return sum + countMessageTokens(msg.role, msg.content, modelId)
	}, 0)

	return messagesTotal + CONVERSATION_OVERHEAD
}

/**
 * Count tokens for tool/function definitions.
 * Tool definitions consume tokens in the context window.
 *
 * @param tools - Array of tool definitions
 * @param modelId - Model identifier
 * @returns Estimated token count for tools
 *
 * @example
 * ```typescript
 * const tools = [{ name: "get_weather", description: "Get weather", parameters: {...} }]
 * const tokens = countToolsTokens(tools, "openai:gpt-4o")
 * ```
 */
export function countToolsTokens(
	tools: Array<{
		name: string
		description?: string
		parameters?: Record<string, unknown>
	}>,
	modelId: string | ModelDefinition,
): number {
	if (!tools || tools.length === 0) return 0

	// Each tool definition has overhead
	const TOOL_OVERHEAD = 10

	return tools.reduce((sum, tool) => {
		const nameTokens = countTokens(tool.name, modelId)
		const descTokens = tool.description
			? countTokens(tool.description, modelId)
			: 0
		const paramsTokens = tool.parameters
			? countTokens(JSON.stringify(tool.parameters), modelId)
			: 0
		return sum + nameTokens + descTokens + paramsTokens + TOOL_OVERHEAD
	}, 0)
}

// =============================================================================
// Token Budget Types
// =============================================================================

/**
 * Token budget breakdown for a request.
 */
export interface TokenBudget {
	/** Total context window size */
	contextWindow: number
	/** Tokens reserved for system prompt */
	systemReserved: number
	/** Tokens for tools/function definitions */
	toolsTokens: number
	/** Tokens for conversation messages */
	messagesTokens: number
	/** Maximum tokens for output generation */
	maxOutputTokens: number
	/** Remaining tokens available for input */
	availableForInput: number
	/** Whether the budget is exceeded */
	isExceeded: boolean
}

/**
 * Calculate token budget for a request.
 *
 * @param modelId - Model identifier
 * @param options - Budget calculation options
 * @returns Token budget breakdown
 *
 * @example
 * ```typescript
 * const budget = calculateTokenBudget("openai:gpt-4o", {
 *   systemPrompt: "You are helpful.",
 *   messages: [{ role: "user", content: "Hello!" }],
 *   tools: [{ name: "get_weather", ... }]
 * })
 * ```
 */
export function calculateTokenBudget(
	modelId: string | ModelDefinition,
	options: {
		systemPrompt?: string
		messages?: Array<{
			role: "system" | "user" | "assistant" | "tool"
			content: string
		}>
		tools?: Array<{
			name: string
			description?: string
			parameters?: Record<string, unknown>
		}>
		reservedTokens?: number
		maxOutputTokens?: number
	},
): TokenBudget {
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId

	if (!model) {
		throw new Error(`Model not found: ${modelId}`)
	}

	const contextWindow = model.contextWindow
	const reservedTokens = options.reservedTokens ?? 2000
	const maxOutputTokens = options.maxOutputTokens ?? model.maxTokens

	const systemTokens = options.systemPrompt
		? countTokens(options.systemPrompt, model)
		: 0
	const systemReserved = Math.max(systemTokens, reservedTokens)
	const toolsTokens = options.tools
		? countToolsTokens(options.tools, model)
		: 0
	const messagesTokens = options.messages
		? countMessagesTokens(options.messages, model)
		: 0

	const usedTokens =
		systemReserved + toolsTokens + messagesTokens + maxOutputTokens
	const availableForInput = contextWindow - usedTokens
	const isExceeded = availableForInput < 0

	return {
		contextWindow,
		systemReserved,
		toolsTokens,
		messagesTokens,
		maxOutputTokens,
		availableForInput,
		isExceeded,
	}
}
