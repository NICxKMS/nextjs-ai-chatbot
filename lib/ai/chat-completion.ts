import {
    convertToModelMessages,
    type LanguageModelUsage,
    smoothStream,
    stepCountIs,
    streamText,
    type UIMessage,
    type UIMessageStreamWriter,
} from "ai";
import type { ModelCatalog } from "tokenlens/core";
import type { PostRequestBody } from "@/app/(chat)/api/chat/schema";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import { getModelById } from "@/lib/ai/model-registry";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { AppSession } from "@/lib/auth/session";
import { isProductionEnvironment } from "@/lib/constants";
import { logWarn } from "@/lib/log";
import {
    trackAICompletion,
    trackStreamingMetrics,
} from "@/lib/monitoring/dashboard";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";

// Tool type helpers
type ToolSetShape = {
    getWeather: typeof getWeather;
    createDocument: ReturnType<typeof createDocument>;
    updateDocument: ReturnType<typeof updateDocument>;
    requestSuggestions: ReturnType<typeof requestSuggestions>;
};

const TOOL_IDS = [
    "getWeather",
    "createDocument",
    "updateDocument",
    "requestSuggestions",
] as const;

type ToolId = (typeof TOOL_IDS)[number];
type ToolIdList = ToolId[];

/**
 * Get enabled tools based on model capabilities
 */
const getEnabledTools = (model: ModelMetadata | undefined): ToolIdList => {
    if (!model) {
        return [];
    }

    // Disable tools only for pure reasoning models without other capabilities
    if (
        model.capabilities.includes("reasoning") &&
        model.capabilities.length === 1
    ) {
        return [];
    }

    if (model.providerId === "google" && model.modelId.startsWith("gemma-")) {
        return [];
    }

    if (model.capabilities.includes("tooling")) {
        return [...TOOL_IDS];
    }

    return [];
};

/**
 * Build provider-specific options for reasoning models
 */
function buildProviderOptions(
    selectedModel: ModelMetadata | undefined
): Record<string, Record<string, unknown>> {
    const providerOptions: Record<string, Record<string, unknown>> = {};

    if (
        !selectedModel?.reasoningType ||
        selectedModel.reasoningType === "none"
    ) {
        return providerOptions;
    }

    switch (selectedModel.reasoningType) {
        case "openai-thinking":
            providerOptions.openai = {
                reasoningEffort: "high",
            };
            break;

        case "anthropic-thinking":
            providerOptions.anthropic = {
                thinkingBudget: selectedModel.thinkingBudget ?? 8000,
            };
            break;

        case "gemini-thinking":
            providerOptions.google = {
                thinkingConfig: {
                    type: "enabled",
                    includeThoughts: true,
                    budgetTokens: selectedModel.thinkingBudget ?? 1024,
                },
            };
            break;

        case "deepseek-thinking":
            providerOptions.deepseek = {
                reasoningLevel: "high",
            };
            break;

        case "internal-thinking":
            providerOptions.reasoning = {
                enabled: true,
                budget: selectedModel.thinkingBudget ?? 6000,
            };
            break;

        default:
            break;
    }

    return providerOptions;
}

export type ChatCompletionParams = {
    selectedChatModel: string;
    requestHints: RequestHints;
    requestBody: PostRequestBody;
    uiMessages: UIMessage[];
    chatId: string;
    session: AppSession;
    dataStream: UIMessageStreamWriter<ChatMessage>;
    tokenlensCatalogPromise: Promise<ModelCatalog | undefined>;
    onUsageCalculated: (usage: AppUsage) => void;
};

/**
 * Execute AI chat completion with streaming
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
    } = params;

    // Track completion timing for New Relic metrics
    const completionStartTime = Date.now();
    let firstTokenTime: number | undefined;
    let chunkCount = 0;

    const selectedModel = getModelById(selectedChatModel);
    const providerOptions = buildProviderOptions(selectedModel);

    // Prepare tools only if enabled for the selected model
    const enabledTools = getEnabledTools(selectedModel);
    let tools: Partial<ToolSetShape> | undefined;
    if (enabledTools.length > 0) {
        tools = {
            getWeather,
            createDocument: createDocument({
                session,
                dataStream,
                chatId,
            }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
                session,
                dataStream,
            }),
        };
    }

    const streamTextOptions = {
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({
            selectedChatModel,
            requestHints,
            selectedModel,
            userSystemPrompt: requestBody.settings?.systemPrompt,
        }),
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(5),
        experimental_activeTools: enabledTools,
        experimental_transform: smoothStream<Partial<ToolSetShape>>({
            delayInMs: 2,
            chunking: "word",
        }),
        ...(tools ? { tools } : {}),
        experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
        },
        temperature: requestBody.settings?.sampling?.temperature,
        topP: requestBody.settings?.sampling?.topP,
        maxOutputTokens: requestBody.settings?.sampling?.maxOutputTokens,
        ...(Object.keys(providerOptions).length > 0
            ? {
                  providerOptions: providerOptions as Record<
                      string,
                      Record<string, string | number | boolean>
                  >,
              }
            : {}),
        onChunk: () => {
            chunkCount++;
            // Track time to first token
            if (firstTokenTime === undefined) {
                firstTokenTime = Date.now() - completionStartTime;
            }
        },
        onFinish: async (callResult: { usage: LanguageModelUsage }) => {
            const usage = callResult.usage;
            const completionDurationMs = Date.now() - completionStartTime;

            // Track AI completion metrics for New Relic
            trackAICompletion({
                model: selectedChatModel,
                provider: selectedModel?.providerId,
                promptTokens: usage.inputTokens,
                completionTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
                durationMs: completionDurationMs,
                success: true,
                isStreaming: true,
                firstTokenMs: firstTokenTime,
                chatId,
                userId: session.user.id,
            });

            // Track streaming-specific metrics
            if (firstTokenTime !== undefined) {
                trackStreamingMetrics({
                    model: selectedChatModel,
                    firstTokenMs: firstTokenTime,
                    totalDurationMs: completionDurationMs,
                    chunkCount,
                    totalTokens: usage.totalTokens,
                });
            }

            try {
                const providers = await tokenlensCatalogPromise;
                const modelId =
                    myProvider.languageModel(selectedChatModel).modelId;
                if (!modelId) {
                    const finalUsage = {
                        ...usage,
                        modelId: selectedChatModel,
                    };
                    onUsageCalculated(finalUsage);
                    dataStream.write({
                        type: "data-usage",
                        data: finalUsage,
                    });
                    return;
                }

                if (!providers) {
                    const finalUsage = {
                        ...usage,
                        modelId: selectedChatModel,
                    };
                    onUsageCalculated(finalUsage);
                    dataStream.write({
                        type: "data-usage",
                        data: finalUsage,
                    });
                    return;
                }

                const { getUsage } = await import("tokenlens/helpers");
                const summary = getUsage({
                    modelId,
                    usage,
                    providers,
                });
                const finalUsage = {
                    ...usage,
                    ...summary,
                    modelId: selectedChatModel,
                } as AppUsage;
                onUsageCalculated(finalUsage);
                dataStream.write({
                    type: "data-usage",
                    data: finalUsage,
                });
            } catch (err) {
                logWarn("TokenLens enrichment failed", err);
                const finalUsage = {
                    ...usage,
                    modelId: selectedChatModel,
                };
                onUsageCalculated(finalUsage);
                dataStream.write({
                    type: "data-usage",
                    data: finalUsage,
                });
            }
        },
    };

    const result = streamText<Partial<ToolSetShape>>(streamTextOptions);

    result.consumeStream();

    dataStream.merge(
        result.toUIMessageStream({
            sendReasoning: true,
        })
    );
}
