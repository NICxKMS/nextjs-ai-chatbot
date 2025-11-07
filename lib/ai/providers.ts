import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { isTestEnvironment } from "../constants";
import { ChatSDKError } from "../errors";
import type { ReasoningType } from "./model-catalog-types";
import { getLanguageModel, getModelById } from "./model-registry";
import { DEFAULT_ARTIFACT_MODEL } from "./models";

const artifactModelId = DEFAULT_ARTIFACT_MODEL;

/**
 * Maps reasoning types to the appropriate tag names for chain-of-thought extraction.
 * This ensures the Vercel AI SDK's extractReasoningMiddleware correctly identifies
 * the reasoning/thinking tags from different providers.
 *
 * Reference: https://sdk.vercel.ai/docs/reference/reasoning
 */
const getReasoningTagName = (reasoningType?: ReasoningType): string => {
	switch (reasoningType) {
		case "openai-thinking":
			// OpenAI o1/o3 models use <think> tags in their response
			return "think";
		case "anthropic-thinking":
			// Claude with extended thinking mode uses <thinking> tags
			return "thinking";
		case "gemini-thinking":
			// Google Gemini thinking models use <think> tags
			return "think";
		case "deepseek-thinking":
			// DeepSeek R1 uses <think> tags
			return "think";
		case "internal-thinking":
			// Generic internal thinking extraction
			return "think";
		default:
			return "think"; // Fallback to generic tag
	}
};

export const myProvider = isTestEnvironment
	? (() => {
			const {
				artifactModel,
				chatModel,
				reasoningModel: mockReasoningModel,
				titleModel,
			} = require("./models.mock");
			return {
				languageModel(id: string) {
					switch (id) {
						case "chat-model":
							return chatModel;
						case "chat-model-reasoning":
							return mockReasoningModel;
						case "title-model":
							return titleModel;
						case "artifact-model":
							return artifactModel;
						default:
							throw new ChatSDKError(
								"bad_request:api:unknown_mock_model",
								`Unknown mock model id: ${id}`
							);
					}
				},
			};
		})()
	: {
			languageModel(id: string) {
				const resolvedId =
					id === "artifact-model" ? artifactModelId : id;
				const model = getLanguageModel(resolvedId);

				// Check if this model is a reasoning model
				const modelMetadata = getModelById(resolvedId);
				const isReasoningModel =
					modelMetadata?.capabilities.includes("reasoning");

				if (
					isReasoningModel &&
					modelMetadata?.reasoningType !== "none"
				) {
					// Wrap the model with reasoning middleware for chain-of-thought extraction
					const tagName = getReasoningTagName(
						modelMetadata?.reasoningType
					);
					return wrapLanguageModel({
						model,
						middleware: extractReasoningMiddleware({ tagName }),
					});
				}

				return model;
			},
		};
