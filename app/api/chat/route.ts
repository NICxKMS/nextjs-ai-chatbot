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
import { z } from "zod";
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
import {
    createContext,
    createChatCached,
    appendMessagesCached,
} from "@/lib/data";
import type { Message } from "@/lib/db";
import { AppError, forbiddenError, rateLimitError, validationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { generateUUID } from "@/lib/utils";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Timeout for AI completion requests (55 seconds to stay under serverless limits) */
const AI_COMPLETION_TIMEOUT_MS = 55000;

/**
 * Models allowed for guest (unauthenticated) users
 * Only fast/affordable models to prevent cost abuse
 */
const GUEST_ALLOWED_MODELS = new Set([
    "openai:gpt-4o-mini",
    "google:gemini-2.0-flash-exp",
    "google:gemini-1.5-flash",
]);

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

/**
 * Schema for validating message parts in UIMessage
 * Uses passthrough for parts to allow all valid AI SDK part types
 */
const messagePartSchema = z.object({
    type: z.string(),
}).passthrough();

/**
 * Schema for validating UIMessage objects
 * Supports user, assistant, and system roles
 */
const uiMessageSchema = z.object({
    id: z.string().min(1, "Message ID is required"),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().optional(),
    parts: z.array(messagePartSchema).optional(),
    createdAt: z.coerce.date().optional(),
}).passthrough();

/**
 * Schema for validating the chat request body
 * Requires a chat ID and at least one message
 */
const chatRequestSchema = z.object({
    id: z.string().min(1, "Chat ID is required"),
    messages: z.array(uiMessageSchema).min(1, "At least one message is required"),
    modelId: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
    try {
        // Get session (optional - guests can chat with restrictions)
        const session = await getSession();
        const userId = session?.user?.id;
        const isGuest = !session || session.user?.type === "guest";

        // Parse and validate request body with Zod schema
        const rawBody = await request.json().catch(() => null);
        if (rawBody === null) {
            throw validationError("Invalid JSON in request body");
        }
        
        const parseResult = chatRequestSchema.safeParse(rawBody);
        if (!parseResult.success) {
            const errors = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
            throw validationError(`Invalid request: ${errors}`);
        }
        
        const { id: chatId, modelId = DEFAULT_MODEL_ID } = parseResult.data;
        // Cast validated messages to UIMessage[] for AI SDK compatibility
        const messages = parseResult.data.messages as UIMessage[];

        // Validate model
        if (!isValidModel(modelId)) {
            throw validationError(`Invalid model: ${modelId}`);
        }

        // =============================================================================
        // GUEST RESTRICTIONS
        // =============================================================================
        
        // Guests have stricter rate limits (applied in addition to edge middleware)
        if (isGuest) {
            // Use IP-based identifier for guest rate limiting
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
                    ?? request.headers.get("x-real-ip") 
                    ?? "unknown";
            
            const guestRateResult = await checkRateLimit(`guest:${ip}`, "guest");
            if (!guestRateResult.success) {
                const retryAfter = Math.ceil((guestRateResult.reset - Date.now()) / 1000);
                throw rateLimitError(retryAfter, {
                    reason: "Guest rate limit exceeded",
                    limit: guestRateResult.limit,
                    remaining: guestRateResult.remaining,
                });
            }
            
            // Guests can only use affordable models to prevent cost abuse
            if (!GUEST_ALLOWED_MODELS.has(modelId)) {
                throw forbiddenError("model", {
                    reason: "This model requires authentication",
                    modelId,
                    allowedModels: Array.from(GUEST_ALLOWED_MODELS),
                });
            }
            
            console.info("[Chat API] Guest access:", {
                ip,
                modelId,
                chatId,
                rateRemaining: guestRateResult.remaining,
            });
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
                // Generate title for new chats (store for use in onFinish)
                let chatTitle: string | undefined;
                if (isNewChat && userMessageContent) {
                    try {
                        chatTitle = await generateTitle(userMessageContent, modelId);
                        writer.write({
                            type: "data-chat-title",
                            data: chatTitle,
                        });
                    } catch (titleError) {
                        console.warn(
                            "[Chat API] Title generation failed:",
                            titleError
                        );
                        // Use fallback title
                        chatTitle = userMessageContent.length > 50
                            ? `${userMessageContent.substring(0, 47)}...`
                            : userMessageContent;
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

                        // Save chat and messages to database
                        try {
                            const userType = session?.user?.type ?? "guest";
                            const effectiveUserId = userId ?? toolSession.user.id;
                            const ctx = createContext(effectiveUserId, userType);

                            // Create chat record for new chats
                            if (isNewChat && chatTitle) {
                                await createChatCached({ id: chatId, title: chatTitle }, ctx);
                            }

                            // Get the last user message from the original messages
                            const lastUserMsg = messages.findLast((m) => m.role === "user");
                            // UIMessage uses parts array, extract them directly
                            const userMessageParts = lastUserMsg?.parts ?? [];

                            // Create message records
                            const now = new Date();
                            const messagesToSave: Message[] = [
                                // User message
                                {
                                    id: lastUserMsg?.id ?? generateUUID(),
                                    chatId,
                                    role: "user",
                                    parts: userMessageParts,
                                    attachments: [],
                                    createdAt: now,
                                },
                                // Assistant message
                                {
                                    id: generateUUID(),
                                    chatId,
                                    role: "assistant",
                                    parts: [{ type: "text", text }],
                                    attachments: [],
                                    createdAt: new Date(now.getTime() + 1), // Ensure ordering
                                },
                            ];

                            await appendMessagesCached(chatId, messagesToSave, ctx);

                            console.info("[Chat API] Messages saved:", {
                                chatId,
                                messageCount: messagesToSave.length,
                                isNewChat,
                            });
                        } catch (saveError) {
                            console.error("[Chat API] Failed to save messages:", saveError);
                            // Don't throw - the stream response is already sent
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
