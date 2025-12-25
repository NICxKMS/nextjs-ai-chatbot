/**
 * Stream Response Handler
 * Handles AI streaming and response generation.
 *
 * @module app/api/chat/handlers/stream-response
 */

import {
    type CoreMessage,
    createUIMessageStream,
    JsonToSseTransformStream,
    smoothStream,
    stepCountIs,
    streamText,
} from "ai";
import {
    buildProviderOptions,
    getTools,
    isReasoningModel,
    MODEL_REGISTRY,
} from "@/lib/ai";
import type { UserType } from "@/lib/auth/types";
import {
    appendMessagesCached,
    createChatCached,
    createContext,
} from "@/lib/data";
import type { Message } from "@/lib/db";
import { createTimer, generateUUID, mark, PerfMarks } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { createStreamAbortSignal, SSE_HEADERS } from "@/lib/utils/streaming";
import {
    AI_COMPLETION_TIMEOUT_MS,
    type StreamContext,
    SYSTEM_PROMPT,
} from "../types";
import { generateTitle, getFallbackTitle, getModel } from "../utils";

// =============================================================================
// MESSAGE PERSISTENCE
// =============================================================================

interface PersistenceContext {
    chatId: string;
    userId: string | undefined;
    userType: UserType;
    effectiveUserId: string;
    isNewChat: boolean;
    chatTitle?: string;
    messages: StreamContext["request"]["messages"];
}

/**
 * Save chat and messages to the database
 */
async function persistMessages(
    ctx: PersistenceContext,
    responseText: string
): Promise<void> {
    const persistTimer = createTimer(PerfMarks.CHAT_PERSIST_START, ctx.chatId);
    const dataCtx = createContext(ctx.effectiveUserId, ctx.userType);

    // Create chat record for new chats
    if (ctx.isNewChat && ctx.chatTitle) {
        await createChatCached(
            { id: ctx.chatId, title: ctx.chatTitle },
            dataCtx
        );
    }

    // Get the last user message from the original messages
    const lastUserMsg = ctx.messages.findLast((m) => m.role === "user");
    // UIMessage uses parts array, extract them directly
    const userMessageParts = lastUserMsg?.parts ?? [];

    // Extract attachments from file parts for persistence
    // File parts contain url, name, mediaType - store separately for querying
    const userAttachments = userMessageParts
        .filter((part) => part.type === "file")
        .map((part) => {
            // Type assertion safe because we filtered by type === "file"
            const filePart = part as {
                type: "file";
                url: string;
                name?: string;
                mediaType: string;
            };
            return {
                url: filePart.url,
                name: filePart.name ?? "attachment",
                contentType: filePart.mediaType ?? "application/octet-stream",
            };
        });

    // Create message records
    const now = new Date();
    const messagesToSave: Message[] = [
        // User message
        {
            id: lastUserMsg?.id ?? generateUUID(),
            chatId: ctx.chatId,
            role: "user",
            parts: userMessageParts,
            attachments: userAttachments,
            createdAt: now,
        },
        // Assistant message
        {
            id: generateUUID(),
            chatId: ctx.chatId,
            role: "assistant",
            parts: [{ type: "text", text: responseText }],
            attachments: [],
            createdAt: new Date(now.getTime() + 1), // Ensure ordering
        },
    ];

    await appendMessagesCached(ctx.chatId, messagesToSave, dataCtx);
    const persistDuration = persistTimer.stop();

    logger.info("[Chat API] Messages saved", {
        chatId: ctx.chatId,
        messageCount: messagesToSave.length,
        isNewChat: ctx.isNewChat,
        persistDuration: `${persistDuration.toFixed(2)}ms`,
    });
}

// =============================================================================
// STREAM SETUP HELPERS
// =============================================================================

type ToolNames = ReturnType<typeof getTools>;

interface ModelSetup {
    model: ReturnType<typeof getModel>;
    supportsTools: boolean;
    hasReasoning: boolean;
    enabledToolNames: Array<keyof NonNullable<ToolNames>>;
    providerOptions: ReturnType<typeof buildProviderOptions>;
}

/**
 * Configure model and tool settings based on model capabilities
 */
function setupModelConfig(
    modelId: string,
    toolSession: StreamContext["toolSession"],
    chatId: string
): ModelSetup {
    const model = getModel(modelId);
    const modelMetadata = MODEL_REGISTRY[modelId];
    const supportsTools = modelMetadata?.capabilities?.supportsTools ?? false;
    const hasReasoning = isReasoningModel(modelId);

    // Only get tools if model supports them (for tool name extraction)
    const tools = supportsTools
        ? getTools({
              session: toolSession,
              dataStream: undefined as unknown as Parameters<
                  typeof getTools
              >[0]["dataStream"],
              chatId,
              modelId,
          })
        : undefined;

    const enabledToolNames = tools
        ? (Object.keys(tools) as Array<keyof typeof tools>)
        : [];

    const providerOptions = buildProviderOptions(modelId);

    return {
        model,
        supportsTools,
        hasReasoning,
        enabledToolNames,
        providerOptions,
    };
}

/**
 * Generate and write chat title for new conversations
 */
async function generateChatTitle(
    isNewChat: boolean,
    userMessageContent: string | undefined,
    modelId: string,
    writer: Parameters<
        Parameters<typeof createUIMessageStream>[0]["execute"]
    >[0]["writer"]
): Promise<string | undefined> {
    if (!isNewChat || !userMessageContent) {
        return;
    }

    try {
        const chatTitle = await generateTitle(userMessageContent, modelId);
        writer.write({
            type: "data-chat-title",
            data: chatTitle,
            transient: true,
        });
        return chatTitle;
    } catch (titleError) {
        logger.warn("[Chat API] Title generation failed", {
            error: titleError,
        });
        return getFallbackTitle(userMessageContent);
    }
}

interface UsageData {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

/**
 * Write usage data to stream and log token metrics
 */
function handleTokenUsage(
    usage: UsageData | undefined,
    writer: Parameters<
        Parameters<typeof createUIMessageStream>[0]["execute"]
    >[0]["writer"],
    chatId: string,
    userId: string | undefined,
    modelId: string
): void {
    if (!usage) {
        return;
    }

    writer.write({
        type: "data-usage",
        data: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
        },
        transient: true,
    });

    logger.info("[Chat API] Token usage", {
        chatId,
        userId: userId ?? "guest",
        modelId,
        promptTokens: usage.inputTokens,
        completionTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
    });
}

/**
 * Persist messages after stream completion
 */
async function handleStreamFinish(
    ctx: {
        chatId: string;
        userId: string | undefined;
        modelId: string;
        session: StreamContext["request"]["session"];
        toolSession: StreamContext["toolSession"];
        isNewChat: boolean;
        chatTitle: string | undefined;
        messages: StreamContext["request"]["messages"];
    },
    text: string,
    usage: UsageData | undefined,
    writer: Parameters<
        Parameters<typeof createUIMessageStream>[0]["execute"]
    >[0]["writer"]
): Promise<void> {
    const {
        chatId,
        userId,
        modelId,
        session,
        toolSession,
        isNewChat,
        chatTitle,
        messages,
    } = ctx;

    // Handle token usage
    handleTokenUsage(usage, writer, chatId, userId, modelId);

    // Save chat and messages to database
    try {
        const userType = session?.user?.type ?? "guest";
        const effectiveUserId = userId ?? toolSession.user.id;

        await persistMessages(
            {
                chatId,
                userId,
                userType,
                effectiveUserId,
                isNewChat,
                chatTitle,
                messages,
            },
            text
        );
    } catch (saveError) {
        logger.error("[Chat API] Failed to save messages", {
            error: saveError,
        });
        // Don't throw - the stream response is already sent
    }

    // P3-072: Performance mark for stream end
    mark(PerfMarks.CHAT_STREAM_END, chatId);

    logger.info("[Chat API] Stream complete", {
        chatId,
        responseLength: text.length,
    });
}

/**
 * Handle stream errors with logging
 */
function handleStreamError(error: unknown): string {
    logger.error("[Chat API] Stream error", { error });
    return "An error occurred while generating the response.";
}

// =============================================================================
// STREAM CREATION
// =============================================================================

/**
 * Create the AI streaming response
 */
export function createStreamResponse(
    httpRequest: Request,
    context: StreamContext,
    coreMessages: CoreMessage[]
): Response {
    const { request, toolSession } = context;
    const { chatId, modelId, isNewChat, userMessageContent, session, userId } =
        request;

    // P3-072: Performance mark for stream start
    mark(PerfMarks.CHAT_STREAM_START, chatId);

    // Setup model configuration
    const {
        model,
        supportsTools,
        hasReasoning,
        enabledToolNames,
        providerOptions,
    } = setupModelConfig(modelId, toolSession, chatId);

    // Create streaming response with data parts
    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            // Get active tools with the actual writer
            const activeTools = supportsTools
                ? getTools({
                      session: toolSession,
                      dataStream: writer,
                      chatId,
                      modelId,
                  })
                : undefined;

            // Generate title for new chats
            const chatTitle = await generateChatTitle(
                isNewChat,
                userMessageContent,
                modelId,
                writer
            );

            // PERF-003: Stream the AI response with optimized abort handling
            const result = streamText({
                model,
                messages: coreMessages,
                system: SYSTEM_PROMPT,
                ...(activeTools && { tools: activeTools }),
                experimental_activeTools: enabledToolNames,
                experimental_transform: smoothStream({
                    delayInMs: 2,
                    chunking: "word",
                }),
                abortSignal: createStreamAbortSignal(
                    httpRequest,
                    AI_COMPLETION_TIMEOUT_MS
                ),
                providerOptions,
                stopWhen: stepCountIs(5),
                onFinish: async ({ text, usage }) => {
                    await handleStreamFinish(
                        {
                            chatId,
                            userId,
                            modelId,
                            session,
                            toolSession,
                            isNewChat,
                            chatTitle,
                            messages: request.messages,
                        },
                        text,
                        usage,
                        writer
                    );
                },
            });

            // CRITICAL: Consume the stream to ensure it completes
            result.consumeStream();

            // Merge the text stream into the data stream
            writer.merge(
                result.toUIMessageStream({ sendReasoning: hasReasoning })
            );
        },
        onError: handleStreamError,
    });

    // PERF-003: Return streaming response with optimized SSE headers
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
        headers: SSE_HEADERS,
    });
}
