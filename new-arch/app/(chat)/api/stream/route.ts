/**
 * Chat Stream Route
 * @module new-arch/app/(chat)/api/stream/route
 *
 * API route for streaming chat completions using Vercel AI SDK.
 */

import {
    convertToModelMessages,
    createUIMessageStream,
    type LanguageModel,
    type LanguageModelUsage,
    smoothStream,
    stepCountIs,
    streamText,
    type UIMessage,
} from "ai";

import {
    AI_COMPLETION_TIMEOUT_MS,
    DEFAULT_CHAT_MODEL_ID,
    MAX_TOOL_STEPS,
    SMOOTH_STREAM_CONFIG,
} from "@/lib/ai/config";
import { getProvider } from "@/lib/ai/providers/registry";
import { getWeather } from "@/lib/ai/tools/definitions";
import type { AIProviderId } from "@/lib/ai/types";
import { badRequest, createStreamingHandler, stream } from "@/lib/api";
import { createChat, getChatWithMessages } from "@/lib/data/chat";
import { createMessages } from "@/lib/data/message";
import { AppError, ErrorCodes } from "@/lib/errors";

// ============================================================================
// Constants
// ============================================================================

export const maxDuration = 60;

/**
 * Generate a UUID v4 string
 */
function generateUUID(): string {
    return crypto.randomUUID();
}

/** System prompt for chat completions */
const SYSTEM_PROMPT = `You are a helpful AI assistant. You can help users with various tasks including:
- Answering questions
- Writing and editing text
- Analyzing information
- Creative tasks
- Technical assistance

Be concise, helpful, and accurate. If you're not sure about something, say so.`;

// ============================================================================
// Types
// ============================================================================

type StreamRequestBody = {
    id?: string;
    messages?: UIMessage[];
    model?: string;
    chatId?: string;
    settings?: {
        systemPrompt?: string;
        sampling?: {
            temperature?: number;
            topP?: number;
            maxOutputTokens?: number;
        };
    };
};

// ============================================================================
// Model Resolution
// ============================================================================

/**
 * Parse model ID into provider and model components
 * Format: "providerId:modelId" (e.g., "openai:gpt-4o")
 */
function parseModelId(
    modelId: string
): { providerId: AIProviderId; model: string } | null {
    const parts = modelId.split(":");
    if (parts.length < 2) {
        return null;
    }

    const [providerId, ...modelParts] = parts;
    return {
        providerId: providerId as AIProviderId,
        model: modelParts.join(":"),
    };
}

/**
 * Get a language model instance from a model ID
 */
function getLanguageModel(modelId: string): LanguageModel {
    const parsed = parseModelId(modelId);
    if (!parsed) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, {
            message: `Invalid model ID format: ${modelId}. Expected format: providerId:modelId`,
        });
    }

    const provider = getProvider(parsed.providerId);
    if (!provider) {
        throw new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: `Provider '${parsed.providerId}' is not available. Check your API key configuration.`,
        });
    }

    // Use the provider's languageModel method to get the model
    // The provider is a ProviderV2 which has a languageModel method
    const languageModelFn = (
        provider as unknown as {
            languageModel: (id: string) => LanguageModel;
        }
    ).languageModel;

    if (typeof languageModelFn !== "function") {
        throw new AppError(ErrorCodes.AI_PROVIDER_ERROR, {
            message: `Provider '${parsed.providerId}' does not support language models`,
        });
    }

    return languageModelFn(parsed.model);
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/stream
 *
 * Stream chat completion responses.
 */
export const POST = createStreamingHandler(
    {
        surface: "chat",
        method: "POST",
        auth: "required",
        rateLimit: "chat",
        guestAllowed: true,
        maxDuration: 60,
    },
    async ({ session, request }) => {
        const body = (await request
            .json()
            .catch(() => null)) as StreamRequestBody | null;

        if (!body) {
            return badRequest("Invalid JSON body");
        }

        const {
            id: requestId,
            messages: uiMessages,
            model: selectedModel,
            chatId,
            settings,
        } = body;

        if (!(uiMessages && Array.isArray(uiMessages))) {
            return badRequest("Messages array is required");
        }

        if (!selectedModel) {
            return badRequest("Model selection is required");
        }

        const userId = session?.user.id;

        if (!userId) {
            return badRequest("User ID is required");
        }

        // Generate or use provided chat ID
        const effectiveChatId = chatId ?? requestId ?? generateUUID();

        try {
            // Get or validate chat exists (note: authorization is handled by the route handler)
            const existingChat = chatId
                ? await getChatWithMessages(chatId)
                : null;
            const isNewChat = !existingChat;

            // Get the language model
            const model = getLanguageModel(
                selectedModel ?? DEFAULT_CHAT_MODEL_ID
            );

            // Create the AI stream
            const aiStream = createUIMessageStream({
                execute: ({ writer }) => {
                    // Prepare tools
                    const tools = {
                        getWeather,
                    };

                    const streamTextOptions = {
                        model,
                        system: settings?.systemPrompt ?? SYSTEM_PROMPT,
                        messages: convertToModelMessages(uiMessages),
                        stopWhen: stepCountIs(MAX_TOOL_STEPS),
                        abortSignal: AbortSignal.timeout(
                            AI_COMPLETION_TIMEOUT_MS
                        ),
                        tools,
                        experimental_transform: smoothStream({
                            delayInMs: SMOOTH_STREAM_CONFIG.delayInMs,
                            chunking: SMOOTH_STREAM_CONFIG.chunking,
                        }),
                        experimental_telemetry: {
                            isEnabled: true,
                            functionId: "chat-stream-text",
                            recordInputs: true,
                            recordOutputs: true,
                        },
                        ...(settings?.sampling?.temperature !== undefined && {
                            temperature: settings.sampling.temperature,
                        }),
                        ...(settings?.sampling?.topP !== undefined && {
                            topP: settings.sampling.topP,
                        }),
                        ...(settings?.sampling?.maxOutputTokens !==
                            undefined && {
                            maxOutputTokens: settings.sampling.maxOutputTokens,
                        }),
                        onFinish: (usageResult: {
                            usage: LanguageModelUsage;
                        }) => {
                            // Send usage data to client
                            writer.write({
                                type: "data-usage" as const,
                                data: {
                                    ...usageResult.usage,
                                    modelId: selectedModel,
                                },
                            });
                        },
                    };

                    const result = streamText(streamTextOptions);
                    result.consumeStream();

                    writer.merge(
                        result.toUIMessageStream({
                            sendReasoning: true,
                        })
                    );
                },
                generateId: generateUUID,
                onFinish: async ({ messages }) => {
                    // Save messages to database
                    try {
                        // Create chat if new
                        if (isNewChat) {
                            await createChat({
                                id: effectiveChatId,
                                userId,
                                title: "New Chat",
                                visibility: "private",
                            });
                        }

                        // Get the last user message and assistant response
                        const userMessage = uiMessages.at(-1);
                        const assistantMessages = messages;

                        // Save user message
                        if (userMessage) {
                            await createMessages([
                                {
                                    id: userMessage.id,
                                    chatId: effectiveChatId,
                                    role: "user",
                                    parts: userMessage.parts,
                                    attachments:
                                        (
                                            userMessage as UIMessage & {
                                                experimental_attachments?: unknown[];
                                            }
                                        ).experimental_attachments ?? [],
                                },
                            ]);
                        }

                        // Save assistant messages
                        if (assistantMessages.length > 0) {
                            await createMessages(
                                assistantMessages.map((msg) => ({
                                    id: msg.id,
                                    chatId: effectiveChatId,
                                    role: "assistant" as const,
                                    parts: msg.parts,
                                    attachments:
                                        (
                                            msg as UIMessage & {
                                                experimental_attachments?: unknown[];
                                            }
                                        ).experimental_attachments ?? [],
                                }))
                            );
                        }
                    } catch (saveError) {
                        console.error("Failed to save messages:", saveError);
                        // Don't throw - the stream already completed successfully
                    }
                },
                onError: (error) => {
                    console.error("Stream error:", error);
                    return "An error occurred during streaming. Please try again.";
                },
            });

            return stream(aiStream);
        } catch (error) {
            if (error instanceof AppError) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: error.statusCode,
                    headers: { "Content-Type": "application/json" },
                });
            }

            console.error("Chat stream error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    }
);
