/**
 * Chat Completion Executor
 *
 * Core chat execution function with AI SDK streaming, tool support,
 * and provider-specific options for reasoning models.
 *
 * @module lib/ai/chat-completion
 */

import type { LanguageModelV2Usage } from "@ai-sdk/provider"
import {
	convertToModelMessages,
	smoothStream,
	stepCountIs,
	streamText,
	type UIMessage,
	type UIMessageStreamWriter,
} from "ai"
import type { ModelCatalog } from "tokenlens/core"
// Import tool factory for chat tools
import { createChatTools } from "@/features/chat/lib/tools"
import type { AppSession } from "@/lib/auth/session"
import { logWarn } from "@/lib/log"
import { type RequestHints, systemPrompt } from "./prompts"
import type { ModelDefinition } from "./registry"
import { getModel, getModelById } from "./registry"
import type { ModelMetadata } from "./types"

// =============================================================================
// Constants
// =============================================================================

/**
 * AI completion timeout in milliseconds.
 * 55 seconds allows for cleanup before maxDuration.
 */
const AI_COMPLETION_TIMEOUT_MS = 55_000

// =============================================================================
// Types
// =============================================================================

/**
 * Usage data from TokenLens enrichment.
 */
export interface UsageData {
	/** Input token cost */
	inputCost?: number
	/** Output token cost */
	outputCost?: number
	/** Total token cost */
	totalCost?: number
}

/**
 * Server-merged usage: base usage + TokenLens summary + optional modelId.
 * Uses AI SDK 5.0 LanguageModelUsage (LanguageModelV2Usage) properties.
 */
export type AppUsage = LanguageModelV2Usage & UsageData & { modelId?: string }

/**
 * Message metadata for UI messages.
 */
export interface MessageMetadata {
	/** Creation timestamp */
	createdAt: string
}

/**
 * Custom UI data types for streaming.
 * Uses index signature to satisfy UIDataTypes constraint.
 */
export interface CustomUIDataTypes {
	[key: string]: unknown
	textDelta: string
	imageDelta: string
	sheetDelta: string
	codeDelta: string
	id: string
	title: string
	chatTitle: string
	kind: string
	clear: null
	finish: null
	usage: AppUsage
}

/**
 * Chat message type for UI streaming.
 */
export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes>

/**
 * Tool ID type for enabled tools list.
 * TODO: Expand when tools are implemented (Task 1.6).
 */
type ToolId = string

/**
 * Settings from request body.
 */
export interface ChatSettings {
	/** Custom system prompt */
	systemPrompt?: string
	/** Sampling settings */
	sampling?: {
		temperature?: number
		topP?: number
		maxOutputTokens?: number
	}
}

/**
 * Parameters for chat completion execution.
 */
export interface ChatCompletionParams {
	/** Selected chat model ID */
	selectedChatModel: string
	/** Geographic request hints */
	requestHints: RequestHints
	/** Request body with settings */
	requestBody: {
		settings?: ChatSettings
	}
	/** UI messages for conversation */
	uiMessages: UIMessage[]
	/** Chat ID for context */
	chatId: string
	/** User session */
	session: AppSession
	/** Data stream writer for UI updates */
	dataStream: UIMessageStreamWriter<ChatMessage>
	/** Promise for TokenLens model catalog */
	tokenlensCatalogPromise: Promise<ModelCatalog | undefined>
	/** Callback when usage is calculated */
	onUsageCalculated: (usage: AppUsage) => void
}

// =============================================================================
// Tool Enablement
// =============================================================================

/**
 * Tool names for chat tools
 */
const CHAT_TOOL_NAMES = [
	"createDocument",
	"updateDocument",
	"requestSuggestions",
	"getWeather",
] as const

/**
 * Get enabled tools based on model capabilities.
 *
 * Disables tools for:
 * - Pure reasoning models (only have reasoning capability)
 * - Gemma models on Google (no tool support)
 *
 * @param model - Model definition with capabilities
 * @returns Array of enabled tool IDs
 */
export function getEnabledTools(model: ModelDefinition | undefined): ToolId[] {
	if (!model) {
		return []
	}

	// Disable tools only for pure reasoning models without other capabilities
	if (
		model.capabilities.reasoning &&
		!model.capabilities.tools &&
		!model.capabilities.vision
	) {
		return []
	}

	// Gemma models on Google don't support tools
	if (model.provider === "google" && model.modelId.startsWith("gemma-")) {
		return []
	}

	// Enable tools if model supports them
	if (model.capabilities.tools) {
		return [...CHAT_TOOL_NAMES]
	}

	return []
}

// =============================================================================
// Provider Options
// =============================================================================

/**
 * Build provider-specific options for reasoning models.
 *
 * Handles different reasoning/thinking implementations:
 * - OpenAI: reasoningEffort
 * - Anthropic: thinkingBudget
 * - Gemini: thinkingConfig
 * - DeepSeek: reasoningLevel
 *
 * @param selectedModel - Model definition with reasoning type
 * @returns Provider options object for streamText
 */
export function buildProviderOptions(
	selectedModel: ModelDefinition | undefined,
): Record<string, Record<string, unknown>> {
	const providerOptions: Record<string, Record<string, unknown>> = {}

	if (!selectedModel?.reasoningType) {
		return providerOptions
	}

	switch (selectedModel.reasoningType) {
		case "openai-thinking":
			providerOptions.openai = {
				reasoningEffort: "high",
			}
			break

		case "anthropic-thinking":
			providerOptions.anthropic = {
				thinkingBudget: selectedModel.thinkingBudget ?? 8000,
			}
			break

		case "gemini-thinking":
			providerOptions.google = {
				thinkingConfig: {
					type: "enabled",
					includeThoughts: true,
					budgetTokens: selectedModel.thinkingBudget ?? 1024,
				},
			}
			break

		case "deepseek-thinking":
			providerOptions.deepseek = {
				reasoningLevel: "high",
			}
			break

		case "internal-thinking":
			providerOptions.reasoning = {
				enabled: true,
				budget: selectedModel.thinkingBudget ?? 6000,
			}
			break

		default:
			break
	}

	return providerOptions
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ModelDefinition to ModelMetadata for systemPrompt.
 * Only includes optional properties when they have defined values.
 */
function toModelMetadata(model: ModelDefinition): ModelMetadata {
	const result: ModelMetadata = {
		id: model.id,
		providerId: model.provider as ModelMetadata["providerId"],
		providerName: model.provider,
		modelId: model.modelId,
		name: model.name,
		description: model.description ?? "",
		modalities: model.modalities ?? [],
		capabilities: model.capabilityList ?? [],
		tags: model.tags ?? [],
		source: model.source ?? "curated",
		isCurated: model.isCurated ?? false,
	}

	// Only add optional properties if they have defined values
	if (model.reasoningType !== undefined) {
		result.reasoningType = model.reasoningType
	}
	if (model.thinkingBudget !== undefined) {
		result.thinkingBudget = model.thinkingBudget
	}

	return result
}

/**
 * Create final usage object with model ID.
 * Uses AI SDK 5.0 LanguageModelV2Usage properties (inputTokens, outputTokens, totalTokens).
 */
function createFinalUsage(
	usage: LanguageModelV2Usage,
	modelId: string,
): AppUsage {
	return {
		inputTokens: usage.inputTokens,
		outputTokens: usage.outputTokens,
		totalTokens: usage.totalTokens,
		reasoningTokens: usage.reasoningTokens,
		cachedInputTokens: usage.cachedInputTokens,
		modelId,
	}
}

// =============================================================================
// Chat Completion Executor
// =============================================================================

/**
 * Execute AI chat completion with streaming.
 *
 * This is the core chat execution function that:
 * 1. Resolves the model from the registry
 * 2. Builds provider-specific options for reasoning models
 * 3. Prepares tools if enabled for the model
 * 4. Streams the response with smoothStream for better UX
 * 5. Reports usage data via onFinish callback
 *
 * @param params - Chat completion parameters
 * @returns Stream result for merging with data stream
 *
 * @example
 * ```typescript
 * const result = executeChatCompletion({
 *   selectedChatModel: "openai:gpt-4o",
 *   requestHints: { latitude: 37.7749, longitude: -122.4194, city: "San Francisco", country: "US" },
 *   requestBody: { settings: { sampling: { temperature: 0.7 } } },
 *   uiMessages: messages,
 *   chatId: "chat-123",
 *   session,
 *   dataStream,
 *   tokenlensCatalogPromise,
 *   onUsageCalculated: (usage) => console.log("Usage:", usage),
 * })
 * ```
 */
export function executeChatCompletion(params: ChatCompletionParams) {
	const {
		selectedChatModel,
		requestHints,
		requestBody,
		uiMessages,
		chatId,
		session,
		dataStream,
		tokenlensCatalogPromise,
		onUsageCalculated,
	} = params

	const selectedModel = getModelById(selectedChatModel)
	const providerOptions = buildProviderOptions(selectedModel)

	// Prepare tools only if enabled for the selected model
	const enabledTools = getEnabledTools(selectedModel)

	// Create chat tools if the model supports them
	const tools =
		enabledTools.length > 0
			? createChatTools({
					userId: session.user?.id ?? "",
					isGuest: !session.user?.id,
					chatId,
					dataStream,
				})
			: undefined

	// Build system prompt options
	const systemPromptOptions: {
		selectedChatModel: string
		requestHints: RequestHints
		selectedModel?: ModelMetadata
		userSystemPrompt?: string
	} = {
		selectedChatModel,
		requestHints,
	}

	// Only add optional properties if they have defined values
	if (selectedModel) {
		systemPromptOptions.selectedModel = toModelMetadata(selectedModel)
	}
	if (requestBody.settings?.systemPrompt) {
		systemPromptOptions.userSystemPrompt = requestBody.settings.systemPrompt
	}

	// Build base options
	const baseOptions = {
		model: getModel(selectedChatModel),
		system: systemPrompt(systemPromptOptions),
		messages: convertToModelMessages(uiMessages),
		stopWhen: stepCountIs(5),
		// Timeout handling for AI completions
		// Uses AbortSignal.timeout() to prevent runaway completions
		abortSignal: AbortSignal.timeout(AI_COMPLETION_TIMEOUT_MS),
		experimental_transform: smoothStream({
			delayInMs: 2,
			chunking: "word",
		}),
		experimental_telemetry: {
			isEnabled: true,
			functionId: "chat-stream-text",
			recordInputs: true,
			recordOutputs: true,
		},
	}

	// Build optional settings conditionally
	const optionalOptions: Record<string, unknown> = {}

	if (tools) {
		optionalOptions.tools = tools
		optionalOptions.experimental_activeTools = enabledTools
	}

	if (requestBody.settings?.sampling?.temperature !== undefined) {
		optionalOptions.temperature = requestBody.settings.sampling.temperature
	}

	if (requestBody.settings?.sampling?.topP !== undefined) {
		optionalOptions.topP = requestBody.settings.sampling.topP
	}

	if (requestBody.settings?.sampling?.maxOutputTokens !== undefined) {
		optionalOptions.maxOutputTokens =
			requestBody.settings.sampling.maxOutputTokens
	}

	if (Object.keys(providerOptions).length > 0) {
		optionalOptions.providerOptions = providerOptions as Record<
			string,
			Record<string, string | number | boolean>
		>
	}

	const streamTextOptions = {
		...baseOptions,
		...optionalOptions,
		onFinish: async (callResult: { usage: LanguageModelV2Usage }) => {
			const usage = callResult.usage

			try {
				const providers = await tokenlensCatalogPromise
				const model = getModel(selectedChatModel)
				const modelId = model.modelId

				if (!modelId) {
					const finalUsage = createFinalUsage(
						usage,
						selectedChatModel,
					)
					onUsageCalculated(finalUsage)
					dataStream.write({
						type: "data-usage",
						data: finalUsage,
					})
					return
				}

				if (!providers) {
					const finalUsage = createFinalUsage(
						usage,
						selectedChatModel,
					)
					onUsageCalculated(finalUsage)
					dataStream.write({
						type: "data-usage",
						data: finalUsage,
					})
					return
				}

				const { getUsage } = await import("tokenlens/helpers")
				// Convert AI SDK 5.0 usage format to tokenlens format
				// AI SDK 5.0 uses inputTokens/outputTokens, tokenlens expects promptTokens/completionTokens
				const tokenlensUsage: {
					promptTokens: number
					completionTokens: number
					totalTokens: number
					reasoningTokens?: number
				} = {
					promptTokens: usage.inputTokens ?? 0,
					completionTokens: usage.outputTokens ?? 0,
					totalTokens: usage.totalTokens ?? 0,
				}
				// Only add reasoningTokens if defined (for exactOptionalPropertyTypes)
				if (usage.reasoningTokens !== undefined) {
					tokenlensUsage.reasoningTokens = usage.reasoningTokens
				}
				const summary = getUsage({
					modelId,
					usage: tokenlensUsage,
					providers,
				})
				const finalUsage: AppUsage = {
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					totalTokens: usage.totalTokens,
					reasoningTokens: usage.reasoningTokens,
					cachedInputTokens: usage.cachedInputTokens,
					...summary,
					modelId: selectedChatModel,
				}
				onUsageCalculated(finalUsage)
				dataStream.write({
					type: "data-usage",
					data: finalUsage,
				})
			} catch (err) {
				logWarn(
					"TokenLens enrichment failed",
					err as Record<string, unknown>,
				)
				const finalUsage = createFinalUsage(usage, selectedChatModel)
				onUsageCalculated(finalUsage)
				dataStream.write({
					type: "data-usage",
					data: finalUsage,
				})
			}
		},
	}

	const result = streamText(streamTextOptions)

	result.consumeStream()

	dataStream.merge(
		result.toUIMessageStream({
			sendReasoning: true,
		}),
	)

	return result
}
