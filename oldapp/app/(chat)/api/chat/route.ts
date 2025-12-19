import { geolocation } from "@vercel/functions";
import {
    createUIMessageStream,
    JsonToSseTransformStream,
    type UIMessage,
} from "ai";
import { cacheLife, cacheTag } from "next/cache";
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
import {
    requireAuthForRoute,
    requireRateLimitForRoute,
    requireResourceForRoute,
    verifyOwnershipForRoute,
} from "@/lib/api/guards";
import {
    parseJsonBodyForRoute,
    requireQueryParamForRoute,
} from "@/lib/api/validators";
import type { AppUserType } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session";
import { getUserMessageCount } from "@/lib/cache/quota";
import { isRedisAvailable } from "@/lib/cache/redis";
import { createContext } from "@/lib/data/base";
import { chatData } from "@/lib/data/chat";
import { saveChat, updateChatTitle } from "@/lib/data/chat-operations";
import { ChatSDKError } from "@/lib/errors";
import { logError, logInfo, logWarn } from "@/lib/log";
import { RateLimiters } from "@/lib/middleware/rate-limit";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

async function getTokenlensCatalog(): Promise<ModelCatalog | undefined> {
    "use cache";
    cacheTag("tokenlens-catalog");
    cacheLife("days"); // ~24 hours

    try {
        const { fetchModels } = await import("tokenlens/fetch");
        return await fetchModels();
    } catch (err) {
        logWarn("TokenLens: catalog fetch failed, using default catalog", err);
        return; // tokenlens helpers will fall back to defaultCatalog
    }
}

export async function POST(request: Request) {
    let selectedModelId = "";

    // Parse and validate request body using centralized validator
    const bodyResult = await parseJsonBodyForRoute(
        request,
        postRequestBodySchema,
        "chat"
    );
    if (bodyResult instanceof Response) {
        return bodyResult;
    }
    const requestBody = bodyResult as PostRequestBody;

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

        // Apply per-user rate limiting (50 requests per minute)
        const rateLimitResult = await RateLimiters.chat(session.user.id);
        if (!rateLimitResult.allowed) {
            return new ChatSDKError(
                "rate_limit:chat:too_many_requests",
                `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`
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
        const [userMessageCount, chatWithMessages] = await Promise.all([
            getUserMessageCount(session.user.id),
            chatData.getWithMessages(id, ctx),
        ]);

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

        const uiMessages = [...convertToUIMessages(messagesFromDb), message];

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
                logInfo("Starting chat completion", {
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
                            logWarn("Background title generation failed", err);
                            return placeholderTitle || "New Chat";
                        });
                }

                // Task 3.13 Fix (Issue #1): Wrap AI completion in try-catch for better error handling
                // This catches initialization errors before streaming begins
                try {
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
                } catch (completionError) {
                    // Log the error and write a user-friendly message to the stream
                    logError(
                        "AI completion initialization failed",
                        completionError,
                        {
                            chatId: id,
                            modelId: selectedChatModel,
                            userId: session.user.id,
                        }
                    );

                    // Write error to stream so client receives feedback
                    dataStream.write({
                        type: "error",
                        errorText:
                            "Failed to start AI completion. Please try again.",
                    });
                }
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
                    logInfo("Chat saved successfully", {
                        chatId: id,
                        isNewChat,
                        messageCount: messages.length + 1,
                        saveTime,
                        userId: session.user.id,
                    });

                    // OPTIMIZATION: Update title asynchronously in background
                    // Issue #2 Fix: Handle race condition where chat might be deleted
                    // before title generation completes. This is a fire-and-forget
                    // operation - title update failures should not affect the user.
                    if (isNewChat && generatedTitlePromise) {
                        // Verify chat still exists before updating title
                        // This prevents race conditions when user deletes chat quickly
                        generatedTitlePromise
                            .then(async (generatedTitle) => {
                                if (
                                    generatedTitle &&
                                    generatedTitle !== initialTitle
                                ) {
                                    try {
                                        // Issue #2 Fix: Check if chat still exists
                                        // The updateChatTitle function filters by userId,
                                        // so it will gracefully no-op if chat is deleted
                                        const existingChat = await chatData.get(
                                            id,
                                            ctx,
                                            {
                                                warmCache: false,
                                            }
                                        );
                                        if (!existingChat) {
                                            logInfo(
                                                "Skipping title update - chat no longer exists",
                                                { chatId: id }
                                            );
                                            return;
                                        }

                                        await updateChatTitle({
                                            chatId: id,
                                            title: generatedTitle,
                                            ctx,
                                        });
                                        logInfo("Chat title updated", {
                                            chatId: id,
                                            title: generatedTitle,
                                        });
                                    } catch (titleErr) {
                                        // Issue #2 Fix: Gracefully handle race condition
                                        // errors (e.g., chat deleted between check and update)
                                        logWarn(
                                            "Title update failed - chat may have been deleted",
                                            {
                                                chatId: id,
                                                error: titleErr,
                                            }
                                        );
                                    }
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
                    logError("Failed to save chat", err, {
                        chatId: id,
                        userId: session.user.id,
                    });
                }
            },
            // Issue #3 Fix: Improved error handler with logging
            onError: (error) => {
                logError("Stream error in chat completion", error, {
                    chatId: id,
                    modelId: selectedChatModel,
                    userId: session.user.id,
                });
                return "Oops, an error occurred!";
            },
        });

        return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    } catch (error) {
        const vercelId = request.headers.get("x-vercel-id");
        const isVercelGatewayModel =
            selectedModelId.startsWith("vercel-gateway:");

        logError("Chat request failed", error, {
            modelId: selectedModelId,
            vercelId,
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

            logError("Gateway credit card error for non-Vercel model", error, {
                selectedModelId,
                vercelId,
                message: (error as Error).message,
            });

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
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);

    // Require and validate id parameter
    const idResult = requireQueryParamForRoute(searchParams, "id");
    if (idResult instanceof Response) {
        return idResult;
    }
    const id = idResult;

    // Require authenticated session
    const authResult = await requireAuthForRoute("chat");
    if (authResult instanceof Response) {
        return authResult;
    }
    const { session, ctx } = authResult;

    // Task 3.1 Fix: Add rate limiting for chat DELETE
    const rateLimitResult = await requireRateLimitForRoute(
        "standard",
        session.user.id,
        "chat"
    );
    if (rateLimitResult instanceof Response) {
        return rateLimitResult;
    }

    // Fetch and verify chat exists
    const chat = await chatData.get(id, ctx, { warmCache: false });
    const chatResource = requireResourceForRoute(chat, "chat");
    if (chatResource instanceof Response) {
        return chatResource;
    }

    // Verify ownership
    const ownershipCheck = verifyOwnershipForRoute(
        chatResource,
        session,
        "chat"
    );
    if (ownershipCheck) {
        return ownershipCheck;
    }

    // Delete chat
    await chatData.delete(id, ctx);

    logInfo("Chat deleted", {
        chatId: id,
        userId: session.user.id,
    });

    return Response.json({ id }, { status: 200 });
}
