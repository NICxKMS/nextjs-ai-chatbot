import { geolocation } from "@vercel/functions";
import {
    createUIMessageStream,
    JsonToSseTransformStream,
    type UIMessage,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import type { ModelCatalog } from "tokenlens/core";
import type { VisibilityType } from "@/components/visibility-selector";
import { executeChatCompletion } from "@/lib/ai/chat-completion";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { isValidModelId } from "@/lib/ai/model-registry";
import type { RequestHints } from "@/lib/ai/prompts";
import {
    generatePlaceholderTitle,
    generateTitleFromUserMessage,
} from "@/lib/ai/title-generation";
import type { AppUserType } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session";
import { getUserMessageCount } from "@/lib/cache/quota";
import { isRedisAvailable } from "@/lib/cache/redis";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { saveChat, updateChatTitle } from "@/lib/data/chat-operations";
import { ChatSDKError } from "@/lib/errors";
import { logError, logWarn } from "@/lib/log";
import {
    reportRequestMetrics,
    trackChatOperation,
    trackUserAction,
} from "@/lib/monitoring/dashboard";
import { logger } from "@/lib/monitoring/logger";
import { withPerformanceTracking } from "@/lib/monitoring/performance";
import {
    getMetricsSummary,
    runWithRequestMetricsAsync,
} from "@/lib/monitoring/request-metrics";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

const getTokenlensCatalog = cache(
    async (): Promise<ModelCatalog | undefined> => {
        try {
            const { fetchModels } = await import("tokenlens/fetch");
            return await fetchModels();
        } catch (err) {
            logWarn(
                "TokenLens: catalog fetch failed, using default catalog",
                err
            );
            return; // tokenlens helpers will fall back to defaultCatalog
        }
    },
    ["tokenlens-catalog"],
    { revalidate: 24 * 60 * 60 } // 24 hours
);

export function POST(request: Request) {
    // Wrap in request metrics context for DB/cache tracking
    return runWithRequestMetricsAsync(async () => {
        const requestStart = Date.now();
        const requestContext = {
            url: request.url,
            method: request.method,
            headers: {
                userAgent: request.headers.get("user-agent"),
                vercelId: request.headers.get("x-vercel-id"),
            },
        };

        let requestBody: PostRequestBody;
        let selectedModelId = "";

        logger.info("Chat request started", requestContext);

        // Track request start for New Relic observability
        trackChatOperation("request_started", {
            chatId: "pending", // Will be extracted from body
            userAgent: request.headers.get("user-agent") || "unknown",
        });

        try {
            const json = await request.json();
            requestBody = postRequestBodySchema.parse(json);
        } catch (_) {
            logger.warn("Invalid JSON in chat request", requestContext);
            return new ChatSDKError(
                "bad_request:api:invalid_json"
            ).toResponse();
        }

        try {
            const {
                id,
                message,
                selectedChatModel,
                selectedVisibilityType,
            }: {
                id: string;
                message: UIMessage;
                selectedChatModel: string;
                selectedVisibilityType: VisibilityType;
            } = requestBody;

            selectedModelId = selectedChatModel;

            // Validate model ID before proceeding
            if (!isValidModelId(selectedChatModel)) {
                return new ChatSDKError(
                    "bad_request:api:invalid_model_id"
                ).toResponse();
            }

            const session = await getAppSession();

            if (!session?.user) {
                return new ChatSDKError(
                    "unauthorized:chat:missing_session"
                ).toResponse();
            }

            const userType: AppUserType = session.user.type;
            const ctx = createContext(session);

            // For guest users, require Redis to be available
            if (ctx.isGuest && !isRedisAvailable()) {
                return new ChatSDKError(
                    "bad_request:api:guest_requires_cache",
                    "Guest sessions require cache to be enabled"
                ).toResponse();
            }

            // OPTIMIZATION: Parallelize quota check (from cache) and chat fetch
            // Uses single Redis GET for quota (~10-20ms) instead of DB query with JOIN (~100-300ms)
            const dataFetchStart = Date.now();
            const [userMessageCount, chatWithMessages] = await Promise.all([
                getUserMessageCount(session.user.id),
                chatData.getWithMessages(id, ctx),
            ]);
            const dataFetchTime = Date.now() - dataFetchStart;

            logger.perf("ChatDataFetch", dataFetchTime, {
                userId: session.user.id,
                chatId: id,
                messageCount: userMessageCount,
            });

            const userEntitlements =
                entitlementsByUserType[
                    userType as keyof typeof entitlementsByUserType
                ];
            if (
                !userEntitlements ||
                userMessageCount > userEntitlements.maxMessagesPerDay
            ) {
                return new ChatSDKError(
                    "rate_limit:chat:daily_limit_exceeded"
                ).toResponse();
            }

            let chatCreatedAt: Date | undefined;
            let placeholderTitle: string | undefined;

            const chat = chatWithMessages?.chat;
            const messagesFromDb = chatWithMessages?.messages || [];

            if (chat) {
                if (chat.userId !== session.user.id) {
                    return new ChatSDKError(
                        "forbidden:chat:owner_mismatch"
                    ).toResponse();
                }
            } else {
                placeholderTitle = generatePlaceholderTitle(message);

                // Set createdAt for new chats (will be created with messages in onFinish)
                chatCreatedAt = new Date();
            }

            const isNewChat = !chat;

            const uiMessages = [
                ...convertToUIMessages(messagesFromDb),
                message,
            ];

            const { longitude, latitude, city, country } = geolocation(request);

            const requestHints: RequestHints = {
                longitude,
                latitude,
                city,
                country,
            };

            let finalMergedUsage: AppUsage | undefined;
            let generatedTitlePromise: Promise<string> | null = null;
            const tokenlensCatalogPromise = getTokenlensCatalog();

            const stream = createUIMessageStream({
                execute: ({ writer: dataStream }) => {
                    logger.info("Starting chat completion", {
                        chatId: id,
                        modelId: selectedChatModel,
                        isNewChat,
                        userId: session.user.id,
                    });

                    // Start title generation early (non-blocking)
                    // OPTIMIZATION: Title generation runs in parallel with streaming
                    if (isNewChat) {
                        generatedTitlePromise = generateTitleFromUserMessage({
                            message,
                        })
                            .then((title) => {
                                // Send title to client when ready
                                try {
                                    dataStream.write({
                                        type: "data-chatTitle",
                                        data: title,
                                        transient: true,
                                    });
                                } catch (streamErr) {
                                    logWarn(
                                        "Title generated but stream closed, will save to DB",
                                        streamErr
                                    );
                                }
                                return title;
                            })
                            .catch((err) => {
                                logWarn(
                                    "Background title generation failed",
                                    err
                                );
                                return placeholderTitle || "New Chat";
                            });
                    }

                    // Execute AI completion using extracted module
                    executeChatCompletion({
                        selectedChatModel,
                        requestHints,
                        requestBody,
                        uiMessages,
                        chatId: id,
                        session,
                        dataStream,
                        tokenlensCatalogPromise,
                        onUsageCalculated: (usage) => {
                            finalMergedUsage = usage;
                        },
                    });
                },
                generateId: generateUUID,
                onFinish: async ({ messages }) => {
                    const startTime = Date.now();
                    const initialTitle = isNewChat
                        ? placeholderTitle || "New Chat"
                        : chat?.title || "New Chat";

                    try {
                        // Save chat immediately with placeholder title
                        await saveChat({
                            chatId: id,
                            isNewChat,
                            userMessage: message,
                            assistantMessages: messages,
                            selectedModelId,
                            title: initialTitle,
                            visibility: selectedVisibilityType,
                            createdAt: chatCreatedAt,
                            usage: finalMergedUsage,
                            ctx,
                        });

                        const saveTime = Date.now() - startTime;
                        logger.info("Chat saved successfully", {
                            chatId: id,
                            isNewChat,
                            messageCount: messages.length + 1,
                            saveTime,
                            userId: session.user.id,
                        });

                        // Track message save for New Relic
                        trackChatOperation("message_saved", {
                            chatId: id,
                            userId: session.user.id,
                            modelId: selectedModelId,
                            isNewChat,
                            durationMs: saveTime,
                            messageCount: messages.length + 1,
                        });

                        // Track user action for analytics
                        if (isNewChat) {
                            trackUserAction("create_chat", {
                                chatId: id,
                                userId: session.user.id,
                                model: selectedModelId,
                            });
                        } else {
                            trackUserAction("send_message", {
                                chatId: id,
                                userId: session.user.id,
                                model: selectedModelId,
                            });
                        }

                        // OPTIMIZATION: Update title asynchronously in background
                        if (isNewChat && generatedTitlePromise) {
                            generatedTitlePromise
                                .then(async (generatedTitle) => {
                                    if (
                                        generatedTitle &&
                                        generatedTitle !== initialTitle
                                    ) {
                                        await updateChatTitle({
                                            chatId: id,
                                            title: generatedTitle,
                                            ctx,
                                        });
                                        logger.info("Chat title updated", {
                                            chatId: id,
                                            title: generatedTitle,
                                        });
                                    }
                                })
                                .catch((err) => {
                                    logWarn(
                                        "Background title generation promise rejected",
                                        {
                                            chatId: id,
                                            error: err,
                                        }
                                    );
                                });
                        }
                    } catch (err) {
                        logger.error("Failed to save chat", err, {
                            chatId: id,
                            userId: session.user.id,
                        });
                    }
                },
                onError: () => {
                    return "Oops, an error occurred!";
                },
            });

            const totalTime = Date.now() - requestStart;

            // Report DB/cache metrics to New Relic before streaming starts
            const metrics = getMetricsSummary();
            if (Object.keys(metrics).length > 0) {
                reportRequestMetrics("POST /api/chat", {
                    dbCalls: metrics.dbCalls || 0,
                    dbTotalDurationMs: metrics.dbTotalDurationMs || 0,
                    cacheCalls: metrics.cacheCalls || 0,
                    cacheHits: metrics.cacheHits || 0,
                    cacheMisses: metrics.cacheMisses || 0,
                    cacheTotalDurationMs: metrics.cacheTotalDurationMs || 0,
                });
            }

            logger.info("Chat request completed", {
                chatId: id,
                modelId: selectedChatModel,
                totalTime,
                isNewChat,
                userId: session.user.id,
                ...metrics,
            });

            // Track chat operation for New Relic custom events
            trackChatOperation("request_completed", {
                chatId: id,
                userId: session.user.id,
                modelId: selectedChatModel,
                isNewChat,
                durationMs: totalTime,
                dbCalls: metrics.dbCalls || 0,
                cacheHits: metrics.cacheHits || 0,
                cacheMisses: metrics.cacheMisses || 0,
            });

            return new Response(
                stream.pipeThrough(new JsonToSseTransformStream())
            );
        } catch (error) {
            const totalTime = Date.now() - requestStart;
            const vercelId = request.headers.get("x-vercel-id");
            const isVercelGatewayModel =
                selectedModelId.startsWith("vercel-gateway:");

            // Report metrics even on error
            const metrics = getMetricsSummary();
            if (Object.keys(metrics).length > 0) {
                reportRequestMetrics("POST /api/chat (error)", {
                    dbCalls: metrics.dbCalls || 0,
                    dbTotalDurationMs: metrics.dbTotalDurationMs || 0,
                    cacheCalls: metrics.cacheCalls || 0,
                    cacheHits: metrics.cacheHits || 0,
                    cacheMisses: metrics.cacheMisses || 0,
                    cacheTotalDurationMs: metrics.cacheTotalDurationMs || 0,
                });
            }

            logger.error("Chat request failed", error, {
                modelId: selectedModelId,
                totalTime,
                vercelId,
                ...metrics,
            });

            // Track failed chat operation for New Relic
            trackChatOperation("request_failed", {
                chatId: requestBody?.id || "unknown",
                modelId: selectedModelId,
                durationMs: totalTime,
                errorCode:
                    error instanceof ChatSDKError ? error.code : "unknown",
                errorMessage:
                    error instanceof Error ? error.message : String(error),
                dbCalls: metrics.dbCalls || 0,
                cacheHits: metrics.cacheHits || 0,
            });

            if (error instanceof ChatSDKError) {
                return error.toResponse();
            }

            // Check for Vercel AI Gateway credit card error
            if (
                error instanceof Error &&
                error.message?.includes(
                    "AI Gateway requires a valid credit card on file to service requests"
                )
            ) {
                if (isVercelGatewayModel) {
                    return new ChatSDKError(
                        "bad_request:activate_gateway"
                    ).toResponse();
                }

                logError(
                    "Gateway credit card error for non-Vercel model",
                    error,
                    {
                        selectedModelId,
                        vercelId,
                        message: (error as Error).message,
                    }
                );

                return new ChatSDKError(
                    "bad_request:api",
                    error.message
                ).toResponse();
            }

            logError("Unhandled error in chat API", error, {
                vercelId,
                selectedModelId,
            });
            return new ChatSDKError("offline:chat:unhandled").toResponse();
        }
    }); // End of runWithRequestMetricsAsync
}

export const DELETE = withPerformanceTracking(
    "DELETE /api/chat",
    async (request: Request) => {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return new ChatSDKError("bad_request:api").toResponse();
        }

        const session = await getAppSession();

        if (!session?.user) {
            return new ChatSDKError(
                "unauthorized:chat:missing_session"
            ).toResponse();
        }

        const ctx = createContext(session);

        // Fetch chat to verify ownership
        const chat = await chatData.get(id, ctx, { warmCache: false });

        if (!chat) {
            return new ChatSDKError("not_found:chat").toResponse();
        }

        if (chat.userId !== session.user.id) {
            return new ChatSDKError(
                "forbidden:chat:owner_mismatch"
            ).toResponse();
        }

        // Delete chat
        await chatData.delete(id, ctx);

        logger.info("Chat deleted", {
            chatId: id,
            userId: session.user.id,
        });

        // Track user action for analytics
        trackUserAction("delete_chat", {
            chatId: id,
            userId: session.user.id,
        });

        return Response.json({ id }, { status: 200 });
    },
    {
        extractMetadata: (request) => {
            const { searchParams } = new URL(request.url);
            return { chatId: searchParams.get("id") ?? undefined };
        },
    }
);
