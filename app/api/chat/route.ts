/**
 * Chat API Route
 * Ref: 05-ai-integration-optimal-design.md §4
 *
 * Handles streaming AI responses using Vercel AI SDK.
 * Uses createUIMessageStream for rich data streaming (title, usage, etc).
 * Supports multiple providers (OpenAI, Anthropic, Google).
 * Includes AI tools for document/artifact creation and updates.
 * Supports reasoning models with chain-of-thought extraction.
 *
 * @module app/api/chat/route
 */

import {
    convertToModelMessages,
    createUIMessageStream,
    generateText,
    JsonToSseTransformStream,
    type LanguageModel,
    smoothStream,
    stepCountIs,
    streamText,
    type UIMessage,
} from "ai";
import {
    buildProviderOptions,
    DEFAULT_MODEL_ID,
    getLanguageModel,
    getReasoningType,
    getTitleModel,
    getTools,
    isReasoningModel,
    isValidModel,
    MODEL_REGISTRY,
} from "@/lib/ai";
import { getSession } from "@/lib/auth";
import type { AppSession } from "@/lib/auth/types";
import { AppError, validationError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Timeout for AI completion requests (55 seconds to stay under serverless limits) */
const AI_COMPLETION_TIMEOUT_MS = 55000;

// =============================================================================
// MODEL INSTANTIATION
// =============================================================================

/**
 * Get the language model instance for a given model ID
 * Uses the unified provider registry pattern (like OldApp)
 * Reasoning models are automatically wrapped with chain-of-thought middleware
 */
function getModel(modelId: string): LanguageModel {
    if (!MODEL_REGISTRY[modelId]) {
        throw validationError(`Invalid model: ${modelId}`);
    }

    // Use unified getLanguageModel which handles:
    // 1. Provider resolution via registry
    // 2. Automatic reasoning middleware wrapping
    return getLanguageModel(modelId);
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and helpful responses.

Guidelines:
- Be concise but thorough
- Use markdown formatting when appropriate
- If you're unsure about something, say so
- Break down complex topics into digestible parts

Document/Artifact Guidelines:
- Use createDocument for substantial content (>10 lines) like code, documentation, or spreadsheets
- Use updateDocument to modify existing documents when the user asks for changes
- For simple inline responses, respond directly without creating a document
- Supported document kinds: text (markdown), code (programming), sheet (spreadsheets)`;

// =============================================================================
// TITLE GENERATION
// =============================================================================

/**
 * Generate a title for a new chat based on the first user message.
 * Uses auxiliary model (configurable via AUXILIARY_MODEL_ID) for speed/cost.
 * Falls back to a simple extraction if AI generation fails.
 *
 * @param userMessage - The first user message content
 * @param selectedModelId - The user's selected chat model (used if AUXILIARY_MODEL_ID=USE_SELECTED_MODEL)
 */
async function generateTitle(
    userMessage: string,
    selectedModelId: string
): Promise<string> {
    // Simple title extraction as fallback
    const fallbackTitle =
        userMessage.length > 50
            ? `${userMessage.substring(0, 47)}...`
            : userMessage;

    try {
        // Use title model for title generation (fast/cheap by default, configurable via TITLE_MODEL_ID)
        const titleModelId = getTitleModel(selectedModelId);
        const titleModel = getLanguageModel(titleModelId);

        const { text } = await generateText({
            model: titleModel,
            system: `You are a title generator. Generate a short, concise title (max 50 chars) for a chat conversation based on the user's first message. Return ONLY the title, no quotes or extra formatting.`,
            prompt: userMessage,
        });

        // Clean and validate the title
        const cleanedTitle = text.trim().replace(/^["']|["']$/g, "");
        return cleanedTitle.length > 0 ? cleanedTitle : fallbackTitle;
    } catch (error) {
        console.warn("[Chat API] AI title generation failed, using fallback:", error);
        return fallbackTitle;
    }
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

type ChatRequestBody = {
    id: string;
    messages: UIMessage[];
    modelId?: string;
};

export async function POST(request: Request): Promise<Response> {
    try {
        // Get session (optional - guests can chat)
        const session = await getSession();
        const userId = session?.user?.id;

        // Parse and validate request body
        const body = (await request.json()) as ChatRequestBody;
        const { id: chatId, messages, modelId = DEFAULT_MODEL_ID } = body;

        // Validate chat ID
        if (!chatId || typeof chatId !== "string") {
            throw validationError("Chat ID is required");
        }

        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0) {
            throw validationError(
                "Messages array is required and must not be empty"
            );
        }

        // Validate model
        if (!isValidModel(modelId)) {
            throw validationError(`Invalid model: ${modelId}`);
        }

        // Get the model instance
        const model = getModel(modelId);

        // Convert messages for AI SDK
        const coreMessages = convertToModelMessages(messages);

        // Get last user message for title generation
        const lastUserMessage = messages.find(
            (m): m is UIMessage & { role: "user"; content: string } =>
                m.role === "user" &&
                typeof (m as { content?: unknown }).content === "string"
        );
        const userMessageContent = lastUserMessage?.content ?? "";

        // Check if this is a new chat (only 1 user message)
        const isNewChat =
            messages.filter((m) => m.role === "user").length === 1;

        // Create session for tools (use real session or create guest session)
        const toolSession: AppSession = session ?? {
            user: {
                id: `guest:${generateUUID()}`,
                type: "guest",
                email: null,
            },
        };

        // Create streaming response with data parts
        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                // Generate and stream title for new chats
                if (isNewChat && userMessageContent) {
                    try {
                        const title = await generateTitle(userMessageContent, modelId);
                        writer.write({
                            type: "data-chat-title",
                            data: title,
                        });
                    } catch (titleError) {
                        console.warn(
                            "[Chat API] Title generation failed:",
                            titleError
                        );
                    }
                }

                // Get model metadata to check capabilities
                const modelMetadata = MODEL_REGISTRY[modelId];
                const supportsTools =
                    modelMetadata?.capabilities?.supportsTools ?? false;

                // Only get tools if model supports them
                const tools = supportsTools
                    ? getTools({
                          session: toolSession,
                          dataStream: writer,
                          chatId,
                          modelId,
                      })
                    : undefined;

                // Get list of enabled tool names for experimental_activeTools
                const enabledToolNames = tools
                    ? (Object.keys(tools) as Array<keyof typeof tools>)
                    : [];

                // Build provider-specific options for reasoning models
                const providerOptions = buildProviderOptions(modelId);
                const hasReasoning = isReasoningModel(modelId);

                // Debug: Log reasoning configuration
                console.log("[Chat API] Reasoning config:", {
                    modelId,
                    hasReasoning,
                    reasoningType: getReasoningType(modelId),
                    providerOptions,
                });

                // Stream the AI response
                const result = streamText({
                    model,
                    messages: coreMessages,
                    system: SYSTEM_PROMPT,
                    ...(tools && { tools }), // Only include if model supports tools
                    experimental_activeTools: enabledToolNames,
                    experimental_transform: smoothStream({
                        delayInMs: 2,
                        chunking: "word",
                    }),
                    abortSignal: AbortSignal.timeout(AI_COMPLETION_TIMEOUT_MS),
                    providerOptions,
                    stopWhen: stepCountIs(5), // Allow multi-step tool calls
                    onFinish: async ({ text, usage }) => {
                        // Stream usage data
                        if (usage) {
                            writer.write({
                                type: "data-usage",
                                data: {
                                    inputTokens: usage.inputTokens,
                                    outputTokens: usage.outputTokens,
                                    totalTokens: usage.totalTokens,
                                },
                            });

                            console.info("[Chat API] Token usage:", {
                                chatId,
                                userId: userId ?? "guest",
                                modelId,
                                promptTokens: usage.inputTokens,
                                completionTokens: usage.outputTokens,
                                totalTokens: usage.totalTokens,
                            });
                        }

                        console.info("[Chat API] Stream complete:", {
                            chatId,
                            responseLength: text.length,
                        });
                    },
                });

                // CRITICAL: Consume the stream to ensure it completes
                result.consumeStream();

                // Merge the text stream into the data stream
                // Enable reasoning streaming if model supports it
                writer.merge(
                    result.toUIMessageStream({
                        sendReasoning: hasReasoning,
                    })
                );
            },
            onError: (error) => {
                console.error("[Chat API] Stream error:", error);
                return "An error occurred while generating the response.";
            },
        });

        // Return streaming response with proper headers
        return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("[Chat API] Error:", error);

        // Handle AppError
        if (error instanceof AppError) {
            return error.toResponse();
        }

        // Handle AI SDK errors
        if (error instanceof Error) {
            // Check for rate limit errors
            if (
                error.message.includes("rate limit") ||
                error.message.includes("429")
            ) {
                return Response.json(
                    { error: "Rate limit exceeded. Please try again later." },
                    { status: 429 }
                );
            }

            // Check for authentication errors
            if (
                error.message.includes("API key") ||
                error.message.includes("authentication")
            ) {
                return Response.json(
                    { error: "AI service configuration error" },
                    { status: 503 }
                );
            }
        }

        // Generic error response
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
