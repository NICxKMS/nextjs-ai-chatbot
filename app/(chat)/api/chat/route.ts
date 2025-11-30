import { geolocation } from "@vercel/functions";
import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	type LanguageModelUsage,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import type { ModelCatalog } from "tokenlens/core";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import { getModelById, isValidModelId } from "@/lib/ai/model-registry";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
// Static tool imports for faster loading (no dynamic import overhead)
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { AppUserType } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session";
import { getUserMessageCount } from "@/lib/cache/quota";
import { isRedisAvailable } from "@/lib/cache/redis";
import { isProductionEnvironment } from "@/lib/constants";
import { createContext } from "@/lib/data/base";
import { chatData, messageData } from "@/lib/data/chat";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { logError, logWarn } from "@/lib/log";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import {
	type MessagePart,
	type PostRequestBody,
	postRequestBodySchema,
} from "./schema";

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

	if (model.capabilities.includes("tooling") || model.isCurated) {
		return [...TOOL_IDS];
	}

	return [];
};

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

export async function POST(request: Request) {
	let requestBody: PostRequestBody;
	let selectedModelId = "";

	try {
		const json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (_) {
		return new ChatSDKError("bad_request:api:invalid_json").toResponse();
	}

	try {
		const {
			id,
			message,
			selectedChatModel,
			selectedVisibilityType,
		}: {
			id: string;
			message: ChatMessage;
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
			placeholderTitle = (() => {
				try {
					const parts = message.parts as MessagePart[];
					const textPart = parts?.find(
						(
							p
						): p is MessagePart & { type: "text"; text: string } =>
							p?.type === "text" && typeof p.text === "string"
					);
					const base = (textPart?.text || "").trim();
					const trimmed =
						base.length > 0 ? base.slice(0, 80) : "New Chat";
					return trimmed;
				} catch {
					return "New Chat";
				}
			})();

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
				const selectedModel = getModelById(selectedChatModel);

				// Start title generation early (non-blocking)
				// OPTIMIZATION: Title generation runs in parallel with streaming
				// Even if response is short, we ensure title is sent when ready
				if (isNewChat) {
					generatedTitlePromise = generateTitleFromUserMessage({
						message,
					})
						.then((title) => {
							// Send title to client when ready (may be during or after streaming)
							try {
								dataStream.write({
									type: "data-chatTitle",
									data: title,
									transient: true,
								});
							} catch (streamErr) {
								// Stream may be closed for very short responses
								// Title will still be saved to DB in onFinish
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

				const providerOptions: Record<
					string,
					Record<string, unknown>
				> = {};

				if (
					selectedModel?.reasoningType &&
					selectedModel.reasoningType !== "none"
				) {
					switch (selectedModel.reasoningType) {
						case "openai-thinking":
							providerOptions.openai = {
								reasoningEffort: "high",
							};
							break;

						case "anthropic-thinking":
							providerOptions.anthropic = {
								thinkingBudget:
									selectedModel.thinkingBudget ?? 8000,
							};
							break;

						case "gemini-thinking":
							providerOptions.google = {
								thinkingConfig: {
									type: "enabled",
									includeThoughts: true,
									budgetTokens:
										selectedModel.thinkingBudget ?? 1024,
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
				}

				// Prepare tools only if enabled for the selected model
				// OPTIMIZATION: Using static imports (no async overhead)
				const enabledTools = getEnabledTools(selectedModel);
				let tools: Partial<ToolSetShape> | undefined;
				if (enabledTools.length > 0) {
					tools = {
						getWeather,
						createDocument: createDocument({
							session,
							dataStream,
							chatId: id,
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
					experimental_transform: smoothStream<Partial<ToolSetShape>>(
						{
							delayInMs: 2,
							chunking: "word",
						}
					),
					...(tools ? { tools } : {}),
					experimental_telemetry: {
						isEnabled: isProductionEnvironment,
						functionId: "stream-text",
					},
					temperature: requestBody.settings?.sampling.temperature,
					topP: requestBody.settings?.sampling.topP,
					maxOutputTokens:
						requestBody.settings?.sampling.maxOutputTokens,
					...(Object.keys(providerOptions).length > 0
						? {
								providerOptions: providerOptions as Record<
									string,
									Record<string, string | number | boolean>
								>,
							}
						: {}),
					onFinish: async (callResult: {
						usage: LanguageModelUsage;
					}) => {
						const usage = callResult.usage;
						try {
							const providers = await tokenlensCatalogPromise;
							const modelId =
								myProvider.languageModel(
									selectedChatModel
								).modelId;
							if (!modelId) {
								finalMergedUsage = {
									...usage,
									modelId: selectedChatModel,
								};
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							if (!providers) {
								finalMergedUsage = {
									...usage,
									modelId: selectedChatModel,
								};
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							const { getUsage } = await import(
								"tokenlens/helpers"
							);
							const summary = getUsage({
								modelId,
								usage,
								providers,
							});
							finalMergedUsage = {
								...usage,
								...summary,
								modelId: selectedChatModel,
							} as AppUsage;
							dataStream.write({
								type: "data-usage",
								data: finalMergedUsage,
							});
						} catch (err) {
							logWarn("TokenLens enrichment failed", err);
							finalMergedUsage = {
								...usage,
								modelId: selectedChatModel,
							};
							dataStream.write({
								type: "data-usage",
								data: finalMergedUsage,
							});
						}
					},
				};

				const result =
					streamText<Partial<ToolSetShape>>(streamTextOptions);

				result.consumeStream();

				dataStream.merge(
					result.toUIMessageStream({
						sendReasoning: true,
					})
				);
			},
			generateId: generateUUID,
			onFinish: async ({ messages }) => {
				// OPTIMIZATION: Use placeholder title immediately to avoid blocking
				// Title will be updated asynchronously in the background once generated
				const initialTitle = placeholderTitle || "New Chat";

				// Include the user message that was sent (not in messages from AI SDK)
				const userMessage = {
					id: message.id,
					role: "user" as const,
					parts: [
						...message.parts,
						{ type: "model", id: selectedModelId },
					],
					createdAt: new Date(),
					attachments: [],
					chatId: id,
				};

				const messagesToSave: DBMessage[] = [
					userMessage,
					...messages.map((currentMessage) => {
						const partsWithModel = [
							...currentMessage.parts,
							{ type: "model", id: selectedModelId },
						];
						return {
							id: currentMessage.id,
							role: currentMessage.role as
								| "user"
								| "assistant"
								| "system",
							parts: partsWithModel,
							createdAt: new Date(),
							attachments: [],
							chatId: id,
						};
					}),
				];

				try {
					// Save chat immediately with placeholder title (non-blocking)
					await messageData.saveWithContext(
						{
							messages: messagesToSave,
							chatId: id,
							lastContext: finalMergedUsage,
							isNewChat,
							title: initialTitle,
							visibility: selectedVisibilityType,
							createdAt: chatCreatedAt,
						},
						ctx
					);

					// OPTIMIZATION: Update title asynchronously in background (fire-and-forget)
					// This removes the 3s race condition and ensures proper titles without blocking
					if (isNewChat && generatedTitlePromise) {
						generatedTitlePromise
							.then(async (generatedTitle) => {
								// Only update if we got a meaningful title different from placeholder
								if (
									generatedTitle &&
									generatedTitle !== initialTitle
								) {
									try {
										await chatData.updateTitle(
											id,
											generatedTitle,
											ctx
										);
									} catch (titleUpdateErr) {
										logWarn(
											"Background title update failed",
											{
												chatId: id,
												error: titleUpdateErr,
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
					logWarn("Unable to persist messages and context for chat", {
						chatId: id,
						error: err,
					});
				}
			},
			onError: () => {
				return "Oops, an error occurred!";
			},
		});

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
	} catch (error) {
		const vercelId = request.headers.get("x-vercel-id");
		const isVercelGatewayModel =
			selectedModelId.startsWith("vercel-gateway:");

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

	if (chat?.userId !== session.user.id) {
		return new ChatSDKError("forbidden:chat:owner_mismatch").toResponse();
	}

	// Delete chat
	await chatData.delete(id, ctx);

	return Response.json({ id }, { status: 200 });
}
