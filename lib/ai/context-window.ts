/**
 * Context Window Management
 *
 * Provides utilities for managing context windows across different AI models,
 * including message truncation strategies and token budget tracking.
 *
 * @module lib/ai/context-window
 */

import { getModelById, type ModelDefinition } from "./registry"
import {
	calculateTokenBudget,
	countMessagesTokens,
	type TokenBudget,
} from "./token-counter"

// =============================================================================
// Context Window Types
// =============================================================================

/**
 * Message format for context window management.
 */
export interface ContextMessage {
	/** Message role */
	role: "system" | "user" | "assistant" | "tool"
	/** Message content */
	content: string
	/** Optional message ID for tracking */
	id?: string
	/** Optional timestamp */
	timestamp?: number
}

/**
 * Truncation strategy options.
 */
export type TruncationStrategy =
	| "preserve-system" // Keep system message, truncate oldest messages
	| "preserve-recent" // Keep most recent messages, truncate oldest
	| "preserve-first-last" // Keep first and last messages, truncate middle
	| "summarize" // Summarize older messages (future implementation)

/**
 * Result of message truncation.
 */
export interface TruncationResult {
	/** Truncated messages */
	messages: ContextMessage[]
	/** Original token count */
	originalTokens: number
	/** Truncated token count */
	truncatedTokens: number
	/** Number of messages removed */
	messagesRemoved: number
	/** Whether truncation occurred */
	wasTruncated: boolean
}

/**
 * Context window configuration.
 */
export interface ContextWindowConfig {
	/** Maximum tokens for the context window */
	maxTokens: number
	/** Tokens to reserve for system prompt */
	systemReserve: number
	/** Tokens to reserve for output generation */
	outputReserve: number
	/** Truncation strategy to use */
	truncationStrategy: TruncationStrategy
	/** Minimum messages to keep */
	minMessagesToKeep: number
}

// =============================================================================
// Context Window Functions
// =============================================================================

/**
 * Get the context window size for a model.
 *
 * @param modelId - Model identifier or ModelDefinition
 * @returns Context window size in tokens
 *
 * @example
 * ```typescript
 * const windowSize = getContextWindowSize("openai:gpt-4o") // 128000
 * ```
 */
export function getContextWindowSize(
	modelId: string | ModelDefinition,
): number {
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId

	if (!model) {
		// Default fallback for unknown models
		return 128_000
	}

	return model.contextWindow
}

/**
 * Get the maximum output tokens for a model.
 *
 * @param modelId - Model identifier or ModelDefinition
 * @returns Maximum output tokens
 *
 * @example
 * ```typescript
 * const maxOutput = getMaxOutputTokens("openai:gpt-4o") // 16384
 * ```
 */
export function getMaxOutputTokens(modelId: string | ModelDefinition): number {
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId

	if (!model) {
		// Default fallback for unknown models
		return 4096
	}

	return model.maxTokens
}

/**
 * Get token budget for a model with optional reserved tokens.
 *
 * @param modelId - Model identifier
 * @param reservedTokens - Tokens to reserve for system prompt and output
 * @returns Available token budget for messages
 *
 * @example
 * ```typescript
 * const budget = getTokenBudget("openai:gpt-4o", 4000) // 128000 - 4000 = 124000
 * ```
 */
export function getTokenBudget(
	modelId: string | ModelDefinition,
	reservedTokens = 4000,
): number {
	const contextWindow = getContextWindowSize(modelId)
	return Math.max(0, contextWindow - reservedTokens)
}

/**
 * Get default context window configuration for a model.
 *
 * @param modelId - Model identifier
 * @returns Context window configuration
 */
export function getDefaultContextConfig(
	modelId: string | ModelDefinition,
): ContextWindowConfig {
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId

	const contextWindow = model?.contextWindow ?? 128_000
	const maxOutput = model?.maxTokens ?? 4096

	return {
		maxTokens: contextWindow,
		systemReserve: 2000,
		outputReserve: maxOutput,
		truncationStrategy: "preserve-system",
		minMessagesToKeep: 2,
	}
}

// =============================================================================
// Message Truncation
// =============================================================================

/**
 * Truncate messages to fit within a token budget.
 *
 * @param messages - Messages to potentially truncate
 * @param maxTokens - Maximum tokens allowed
 * @param modelId - Model identifier for token counting
 * @param strategy - Truncation strategy to use
 * @returns Truncation result with truncated messages and metadata
 *
 * @example
 * ```typescript
 * const result = truncateMessages(messages, 4000, "openai:gpt-4o", "preserve-recent")
 * if (result.wasTruncated) {
 *   console.log(`Removed ${result.messagesRemoved} messages`)
 * }
 * ```
 */
export function truncateMessages(
	messages: ContextMessage[],
	maxTokens: number,
	modelId: string | ModelDefinition,
	strategy: TruncationStrategy = "preserve-system",
): TruncationResult {
	const originalTokens = countMessagesTokens(
		messages.map((m) => ({ role: m.role, content: m.content })),
		modelId,
	)

	// If already within budget, return as-is
	if (originalTokens <= maxTokens) {
		return {
			messages,
			originalTokens,
			truncatedTokens: originalTokens,
			messagesRemoved: 0,
			wasTruncated: false,
		}
	}

	// Apply truncation strategy
	let truncatedMessages: ContextMessage[]

	switch (strategy) {
		case "preserve-system":
			truncatedMessages = truncatePreserveSystem(
				messages,
				maxTokens,
				modelId,
			)
			break
		case "preserve-recent":
			truncatedMessages = truncatePreserveRecent(
				messages,
				maxTokens,
				modelId,
			)
			break
		case "preserve-first-last":
			truncatedMessages = truncatePreserveFirstLast(
				messages,
				maxTokens,
				modelId,
			)
			break
		default:
			truncatedMessages = truncatePreserveRecent(
				messages,
				maxTokens,
				modelId,
			)
	}

	const truncatedTokens = countMessagesTokens(
		truncatedMessages.map((m) => ({ role: m.role, content: m.content })),
		modelId,
	)

	return {
		messages: truncatedMessages,
		originalTokens,
		truncatedTokens,
		messagesRemoved: messages.length - truncatedMessages.length,
		wasTruncated: true,
	}
}

/**
 * Truncate preserving system message and most recent messages.
 */
function truncatePreserveSystem(
	messages: ContextMessage[],
	maxTokens: number,
	modelId: string | ModelDefinition,
): ContextMessage[] {
	// Separate system message from others
	const systemMessages = messages.filter((m) => m.role === "system")
	const otherMessages = messages.filter((m) => m.role !== "system")

	// Calculate tokens used by system messages
	const systemTokens = countMessagesTokens(
		systemMessages.map((m) => ({ role: m.role, content: m.content })),
		modelId,
	)

	// Available budget for other messages
	const availableBudget = maxTokens - systemTokens

	if (availableBudget <= 0) {
		// System messages alone exceed budget, return just system
		return systemMessages
	}

	// Keep most recent messages that fit
	const result: ContextMessage[] = [...systemMessages]
	let currentTokens = systemTokens

	// Iterate from most recent to oldest (reverse order)
	for (let i = otherMessages.length - 1; i >= 0; i--) {
		const msg = otherMessages[i]
		if (!msg) continue

		const msgTokens = countMessagesTokens(
			[{ role: msg.role, content: msg.content }],
			modelId,
		)

		if (currentTokens + msgTokens <= maxTokens) {
			result.push(msg)
			currentTokens += msgTokens
		} else {
			break
		}
	}

	// Reorder to maintain chronological order
	return result.sort((a, b) => {
		const aIndex = messages.indexOf(a)
		const bIndex = messages.indexOf(b)
		return aIndex - bIndex
	})
}

/**
 * Truncate preserving most recent messages.
 */
function truncatePreserveRecent(
	messages: ContextMessage[],
	maxTokens: number,
	modelId: string | ModelDefinition,
): ContextMessage[] {
	const result: ContextMessage[] = []
	let currentTokens = 0

	// Iterate from most recent to oldest (reverse order)
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (!msg) continue

		const msgTokens = countMessagesTokens(
			[{ role: msg.role, content: msg.content }],
			modelId,
		)

		if (currentTokens + msgTokens <= maxTokens) {
			result.unshift(msg) // Add to beginning to maintain order
			currentTokens += msgTokens
		} else {
			break
		}
	}

	return result
}

/**
 * Truncate preserving first and last messages.
 */
function truncatePreserveFirstLast(
	messages: ContextMessage[],
	maxTokens: number,
	modelId: string | ModelDefinition,
): ContextMessage[] {
	if (messages.length <= 2) {
		return messages
	}

	const firstMsg = messages[0]
	const lastMsg = messages[messages.length - 1]

	// Guard against undefined (shouldn't happen with length check above)
	if (!firstMsg || !lastMsg) {
		return messages
	}

	const middleMessages = messages.slice(1, -1)

	const firstTokens = countMessagesTokens(
		[{ role: firstMsg.role, content: firstMsg.content }],
		modelId,
	)
	const lastTokens = countMessagesTokens(
		[{ role: lastMsg.role, content: lastMsg.content }],
		modelId,
	)
	const reservedTokens = firstTokens + lastTokens

	const availableBudget = maxTokens - reservedTokens

	if (availableBudget <= 0) {
		// Can only keep first and last
		return [firstMsg, lastMsg]
	}

	// Try to fit middle messages from both ends
	const result: ContextMessage[] = [firstMsg]
	let currentTokens = reservedTokens

	// Take from the end of middle messages (more recent)
	const middleFromEnd: ContextMessage[] = []
	for (let i = middleMessages.length - 1; i >= 0; i--) {
		const msg = middleMessages[i]
		if (!msg) continue

		const msgTokens = countMessagesTokens(
			[{ role: msg.role, content: msg.content }],
			modelId,
		)

		if (currentTokens + msgTokens <= maxTokens) {
			middleFromEnd.unshift(msg)
			currentTokens += msgTokens
		} else {
			break
		}
	}

	result.push(...middleFromEnd, lastMsg)
	return result
}

// =============================================================================
// Context Validation
// =============================================================================

/**
 * Options for validating context.
 */
export interface ValidateContextOptions {
	/** System prompt text */
	systemPrompt?: string
	/** Tool definitions */
	tools?: Array<{
		name: string
		description?: string
		parameters?: Record<string, unknown>
	}>
	/** Maximum output tokens */
	maxOutputTokens?: number
}

/**
 * Validate that messages fit within context window.
 *
 * @param messages - Messages to validate
 * @param modelId - Model identifier
 * @param options - Validation options
 * @returns Validation result with budget information
 *
 * @example
 * ```typescript
 * const result = validateContext(messages, "openai:gpt-4o")
 * if (!result.isValid) {
 *   console.log(`Context exceeded by ${result.exceededBy} tokens`)
 * }
 * ```
 */
export function validateContext(
	messages: ContextMessage[],
	modelId: string | ModelDefinition,
	options: ValidateContextOptions = {},
): {
	isValid: boolean
	budget: TokenBudget
	exceededBy: number
} {
	// Build budget options, only including defined values
	const budgetOptions: {
		messages: Array<{
			role: "system" | "user" | "assistant" | "tool"
			content: string
		}>
		systemPrompt?: string
		tools?: Array<{
			name: string
			description?: string
			parameters?: Record<string, unknown>
		}>
		maxOutputTokens?: number
	} = {
		messages: messages.map((m) => ({ role: m.role, content: m.content })),
	}

	if (options.systemPrompt !== undefined) {
		budgetOptions.systemPrompt = options.systemPrompt
	}
	if (options.tools !== undefined) {
		budgetOptions.tools = options.tools
	}
	if (options.maxOutputTokens !== undefined) {
		budgetOptions.maxOutputTokens = options.maxOutputTokens
	}

	const budget = calculateTokenBudget(modelId, budgetOptions)

	const exceededBy = budget.isExceeded
		? Math.abs(budget.availableForInput)
		: 0

	return {
		isValid: !budget.isExceeded,
		budget,
		exceededBy,
	}
}

/**
 * Calculate how many messages can fit in the remaining budget.
 *
 * @param messages - Candidate messages to add
 * @param currentTokens - Current token usage
 * @param maxTokens - Maximum tokens allowed
 * @param modelId - Model identifier
 * @returns Number of messages that can fit
 *
 * @example
 * ```typescript
 * const canFit = calculateMessagesToFit(newMessages, 2000, 4000, "openai:gpt-4o")
 * console.log(`Can fit ${canFit} of ${newMessages.length} messages`)
 * ```
 */
export function calculateMessagesToFit(
	messages: ContextMessage[],
	currentTokens: number,
	maxTokens: number,
	modelId: string | ModelDefinition,
): number {
	let totalTokens = currentTokens
	let fitCount = 0

	for (const msg of messages) {
		const msgTokens = countMessagesTokens(
			[{ role: msg.role, content: msg.content }],
			modelId,
		)

		if (totalTokens + msgTokens <= maxTokens) {
			totalTokens += msgTokens
			fitCount++
		} else {
			break
		}
	}

	return fitCount
}

// =============================================================================
// Context Window Stats
// =============================================================================

/**
 * Get statistics about context window usage.
 *
 * @param messages - Current messages
 * @param modelId - Model identifier
 * @returns Context usage statistics
 */
export function getContextStats(
	messages: ContextMessage[],
	modelId: string | ModelDefinition,
): {
	totalMessages: number
	totalTokens: number
	contextWindow: number
	utilizationPercent: number
	remainingTokens: number
	byRole: Record<string, number>
} {
	const model = typeof modelId === "string" ? getModelById(modelId) : modelId
	const contextWindow = model?.contextWindow ?? 128_000

	const totalTokens = countMessagesTokens(
		messages.map((m) => ({ role: m.role, content: m.content })),
		modelId,
	)

	const byRole: Record<string, number> = {}
	for (const msg of messages) {
		byRole[msg.role] = (byRole[msg.role] ?? 0) + 1
	}

	return {
		totalMessages: messages.length,
		totalTokens,
		contextWindow,
		utilizationPercent: Math.round((totalTokens / contextWindow) * 100),
		remainingTokens: Math.max(0, contextWindow - totalTokens),
		byRole,
	}
}
