import { geolocation } from "@vercel/functions";
import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import { unstable_cache as cache, revalidateTag } from "next/cache";
import { after } from "next/server";
import {
	createResumableStreamContext,
	type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import { getModelById } from "@/lib/ai/model-registry";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
	createStreamId,
	deleteChatById,
	getChatById,
	getMessageCountByUserId,
	getRecentMessagesByChatId,
	saveChat,
	saveMessages,
	updateChatLastContextById,
	updateChatTitleById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import {
	convertToUIMessages,
	generateUUID,
	getTextFromMessage,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

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

const MAX_MODEL_MESSAGES = 30;
const MAX_MODEL_CHARACTERS = 12_000;
const MAX_RECENT_MESSAGES_FETCH = MAX_MODEL_MESSAGES * 4;
const DEFAULT_CHAT_TITLE = "New chat";

const getInitialChatTitle = (message: ChatMessage) => {
	const normalized = getTextFromMessage(message).replace(/\s+/g, " ").trim();

	if (!normalized) {
		return DEFAULT_CHAT_TITLE;
	}

	return normalized.length > 80
		? `${normalized.slice(0, 77)}...`
		: normalized;
};

function estimateMessageCharacters(message: ChatMessage) {
	return (
		message.parts?.reduce((total, part) => {
			if (part.type === "text" && "text" in part && part.text) {
				return total + part.text.length;
			}
			return total;
		}, 0) ?? 0
	);
}

function windowMessages(messages: ChatMessage[]) {
	let totalCharacters = 0;
	const bounded: ChatMessage[] = [];

	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const current = messages[index];
		totalCharacters += estimateMessageCharacters(current);
		bounded.push(current);

		if (
			bounded.length >= MAX_MODEL_MESSAGES ||
			totalCharacters >= MAX_MODEL_CHARACTERS
		) {
			break;
		}
	}

	return bounded.reverse();
}

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
	async (): Promise<ModelCatalog | undefined> => {
		try {
			return await fetchModels();
		} catch (err) {
			console.warn(
				"TokenLens: catalog fetch failed, using default catalog",
				err
			);
			return; // tokenlens helpers will fall back to defaultCatalog
		}
	},
	["tokenlens-catalog"],
	{ revalidate: 24 * 60 * 60 } // 24 hours
);

let tokenlensCatalogPromise: Promise<ModelCatalog | undefined> | null = null;

const resolveTokenlensCatalog = () => {
	if (!tokenlensCatalogPromise) {
		tokenlensCatalogPromise = getTokenlensCatalog().catch((error) => {
			tokenlensCatalogPromise = null;
			throw error;
		});
	}

	return tokenlensCatalogPromise;
};

const reasoningProviderOptionsCache = new Map<
	string,
	Record<string, Record<string, unknown>>
>();
const MAX_REASONING_PROVIDER_OPTIONS_CACHE = 50;

const getReasoningProviderOptions = (model: ModelMetadata | undefined) => {
	if (!model?.reasoningType || model.reasoningType === "none") {
		return {} as Record<string, Record<string, unknown>>;
	}

	const cacheKey = `${model.id ?? "unknown"}:${model.reasoningType}:$${
		model.thinkingBudget ?? ""
	}`;
	const cached = reasoningProviderOptionsCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const providerOptions: Record<string, Record<string, unknown>> = {};

	switch (model.reasoningType) {
		case "openai-thinking":
			providerOptions.openai = {
				reasoningEffort: "high",
			};
			break;
		case "anthropic-thinking":
			providerOptions.anthropic = {
				thinkingBudget: model.thinkingBudget ?? 8000,
			};
			break;
		case "gemini-thinking":
			providerOptions.google = {
				thinkingConfig: {
					type: "enabled",
					includeThoughts: true,
					budgetTokens: model.thinkingBudget ?? 1024,
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
				budget: model.thinkingBudget ?? 6000,
			};
			break;
		default:
			break;
	}

	if (
		reasoningProviderOptionsCache.size >=
		MAX_REASONING_PROVIDER_OPTIONS_CACHE
	) {
		const [firstKey] = reasoningProviderOptionsCache.keys();
		if (firstKey) {
			reasoningProviderOptionsCache.delete(firstKey);
		}
	}

	const frozenOptions = Object.freeze(providerOptions);
	reasoningProviderOptionsCache.set(cacheKey, frozenOptions);

	return frozenOptions;
};

export function getStreamContext(waitUntil?: typeof after) {
	if (!globalStreamContext) {
		try {
			globalStreamContext = createResumableStreamContext({
				waitUntil: waitUntil ?? after,
			});
		} catch (error: any) {
			if (error.message.includes("REDIS_URL")) {
				console.log(
					" > Resumable streams are disabled due to missing REDIS_URL"
				);
			} else {
				console.error(error);
			}
		}
	}

	return globalStreamContext;
}

export async function POST(request: Request) {
	let requestBody: PostRequestBody;
	let selectedModelId = "";

	try {
		const json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (_) {
		return new ChatSDKError("bad_request:api").toResponse();
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

		const session = await auth();

		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const userType: UserType = session.user.type;

		const messageCount = await getMessageCountByUserId({
			id: session.user.id,
			differenceInHours: 24,
		});

		const userEntitlements =
			entitlementsByUserType[
				userType as keyof typeof entitlementsByUserType
			];
		if (
			!userEntitlements ||
			messageCount > userEntitlements.maxMessagesPerDay
		) {
			return new ChatSDKError("rate_limit:chat").toResponse();
		}

		const [chat, recentMessagesFromDb] = await Promise.all([
			getChatById({ id }),
			getRecentMessagesByChatId({
				id,
				limit: MAX_RECENT_MESSAGES_FETCH,
			}),
		]);

		let provisionalChatTitle = DEFAULT_CHAT_TITLE;
		let titleGenerationTask: Promise<string> | null = null;

		if (chat) {
			if (chat.userId !== session.user.id) {
				return new ChatSDKError("forbidden:chat").toResponse();
			}
			provisionalChatTitle = chat.title ?? DEFAULT_CHAT_TITLE;
		} else {
			provisionalChatTitle = getInitialChatTitle(message);

			if (provisionalChatTitle !== DEFAULT_CHAT_TITLE) {
				titleGenerationTask = generateTitleFromUserMessage({
					message,
				}).catch((error) => {
					console.warn("Unable to generate chat title", {
						chatId: id,
						error,
					});
					return provisionalChatTitle;
				});
			}

			await saveChat({
				id,
				userId: session.user.id,
				title: provisionalChatTitle,
				visibility: selectedVisibilityType,
			});

			revalidateTag(`history:user:${session.user.id}`, { expire: 0 });
		}

		const uiMessages = [
			...convertToUIMessages(recentMessagesFromDb),
			message,
		];
		const boundedUIMessages = windowMessages(uiMessages);

		const { longitude, latitude, city, country } = geolocation(request);

		const requestHints: RequestHints = {
			longitude,
			latitude,
			city,
			country,
		};

		const userMessageRecord = {
			chatId: id,
			id: message.id,
			role: "user" as const,
			parts: message.parts,
			attachments: [] as never[],
			createdAt: new Date(),
		};

		let userMessagePersisted = false;

		const persistMessagesWithUser = async (
			additionalMessages: {
				id: string;
				role: "assistant" | "system" | "user";
				parts: ChatMessage["parts"];
				attachments: never[];
				createdAt: Date;
				chatId: string;
			}[]
		) => {
			const messagesToPersist = userMessagePersisted
				? additionalMessages
				: [userMessageRecord, ...additionalMessages];

			if (messagesToPersist.length === 0) {
				return;
			}

			await saveMessages({ messages: messagesToPersist });

			if (!userMessagePersisted) {
				userMessagePersisted = true;
			}
		};

		after(async () => {
			if (!userMessagePersisted) {
				await persistMessagesWithUser([]);
			}
		});

		const streamContext = getStreamContext();
		const streamId = streamContext ? generateUUID() : null;

		if (streamContext && streamId) {
			after(async () => {
				await createStreamId({ streamId, chatId: id });
			});
		}

		if (titleGenerationTask) {
			after(async () => {
				try {
					const resolvedTitle = await titleGenerationTask;

					if (
						resolvedTitle &&
						resolvedTitle !== provisionalChatTitle
					) {
						await updateChatTitleById({
							chatId: id,
							title: resolvedTitle,
						});
					}
				} catch (error) {
					console.warn("Unable to update generated chat title", {
						chatId: id,
						error,
					});
				}
			});
		}

		let finalMergedUsage: AppUsage | undefined;

		const stream = createUIMessageStream({
			execute: ({ writer: dataStream }) => {
				const selectedModel = getModelById(selectedChatModel);

				const providerOptions =
					getReasoningProviderOptions(selectedModel);

				const streamTextOptions = {
					model: myProvider.languageModel(selectedChatModel),
					system: systemPrompt({
						selectedChatModel,
						requestHints,
						selectedModel,
						userSystemPrompt: requestBody.settings?.systemPrompt,
					}),
					messages: convertToModelMessages(boundedUIMessages),
					stopWhen: stepCountIs(5),
					experimental_activeTools: getEnabledTools(selectedModel),
					experimental_transform: smoothStream({
						delayInMs: 2,
						chunking: "word",
					}),
					tools: {
						getWeather,
						createDocument: createDocument({ session, dataStream }),
						updateDocument: updateDocument({ session, dataStream }),
						requestSuggestions: requestSuggestions({
							session,
							dataStream,
						}),
					},
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
					onFinish: async (callResult: any) => {
						let usage: any;
						try {
							usage = callResult.usage;
							if (!usage) {
								return;
							}
							const providers = await resolveTokenlensCatalog();
							const modelId =
								myProvider.languageModel(
									selectedChatModel
								).modelId;
							if (!modelId) {
								finalMergedUsage = usage;
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							if (!providers) {
								finalMergedUsage = usage;
								dataStream.write({
									type: "data-usage",
									data: finalMergedUsage,
								});
								return;
							}

							const summary = getUsage({
								modelId,
								usage,
								providers,
							});
							finalMergedUsage = {
								...usage,
								...summary,
								modelId,
							} as AppUsage;
							dataStream.write({
								type: "data-usage",
								data: finalMergedUsage,
							});
						} catch (err) {
							console.warn("TokenLens enrichment failed", err);
							finalMergedUsage = usage;
							dataStream.write({
								type: "data-usage",
								data: finalMergedUsage,
							});
						}
					},
				};

				const result = streamText(streamTextOptions);

				result.consumeStream();

				dataStream.merge(
					result.toUIMessageStream({
						sendReasoning: true,
					})
				);
			},
			generateId: generateUUID,
			onFinish: async ({ messages }) => {
				const persistenceTasks: Promise<unknown>[] = [];

				if (messages.length > 0) {
					const assistantMessages = messages.map(
						(currentMessage) => ({
							id: currentMessage.id,
							role: currentMessage.role,
							parts: currentMessage.parts as ChatMessage["parts"],
							createdAt: new Date(),
							attachments: [] as never[],
							chatId: id,
						})
					);

					persistenceTasks.push(
						persistMessagesWithUser(assistantMessages)
					);
				} else if (!userMessagePersisted) {
					persistenceTasks.push(persistMessagesWithUser([]));
				}

				if (finalMergedUsage) {
					persistenceTasks.push(
						updateChatLastContextById({
							chatId: id,
							context: finalMergedUsage,
						}).catch((err) => {
							console.warn(
								"Unable to persist last usage for chat",
								id,
								err
							);
						})
					);
				}

				if (persistenceTasks.length > 0) {
					await Promise.all(persistenceTasks);
				}
			},
			onError: () => {
				return "Oops, an error occurred!";
			},
		});

		if (streamContext && streamId) {
			return new Response(
				await streamContext.resumableStream(streamId, () =>
					stream.pipeThrough(new JsonToSseTransformStream())
				)
			);
		}

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

			console.error("Gateway credit card error for non-Vercel model", {
				selectedModelId,
				vercelId,
				message: error.message,
			});

			return new ChatSDKError(
				"bad_request:api",
				error.message
			).toResponse();
		}

		console.error("Unhandled error in chat API:", error, {
			vercelId,
			selectedModelId,
		});
		return new ChatSDKError("offline:chat").toResponse();
	}
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return new ChatSDKError("bad_request:api").toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const chat = await getChatById({ id });

	if (chat?.userId !== session.user.id) {
		return new ChatSDKError("forbidden:chat").toResponse();
	}

	const deletedChat = await deleteChatById({ id });

	if (deletedChat?.userId) {
		revalidateTag(`history:user:${deletedChat.userId}`, { expire: 0 });
	}

	return Response.json(deletedChat, { status: 200 });
}
