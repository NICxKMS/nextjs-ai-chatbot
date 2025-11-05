import { geolocation } from "@vercel/functions";
import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
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
	getMessagesByChatId,
	saveChat,
	saveMessages,
	updateChatLastContextById,
	updateChatTitleById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
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

export function getStreamContext() {
	if (!globalStreamContext) {
		try {
			globalStreamContext = createResumableStreamContext({
				waitUntil: after,
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

		const [messageCount, chat, messagesFromDb] = await Promise.all([
			getMessageCountByUserId({
				id: session.user.id,
				differenceInHours: 24,
			}),
			getChatById({ id }),
			getMessagesByChatId({ id }),
		]);

		const userEntitlements =
			entitlementsByUserType[
				userType as keyof typeof entitlementsByUserType
			];
		if (
			!userEntitlements ||
			(messageCount as number) > userEntitlements.maxMessagesPerDay
		) {
			return new ChatSDKError("rate_limit:chat").toResponse();
		}

		if (chat) {
			if (chat.userId !== session.user.id) {
				return new ChatSDKError("forbidden:chat").toResponse();
			}
		} else {
			const placeholderTitle = (() => {
				try {
					const textPart = (message.parts as any[])?.find(
						(p: any) =>
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

			await saveChat({
				id,
				userId: session.user.id,
				title: placeholderTitle,
				visibility: selectedVisibilityType,
			});
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

		const streamId = generateUUID();
		await Promise.all([
			saveMessages({
				messages: [
					{
						chatId: id,
						id: message.id,
						role: "user",
						parts: message.parts,
						attachments: [],
						createdAt: new Date(),
					},
				],
			}),
			createStreamId({ streamId, chatId: id }),
		]);

		let finalMergedUsage: AppUsage | undefined;
		const tokenlensCatalogPromise = getTokenlensCatalog();

		const stream = createUIMessageStream({
			execute: ({ writer: dataStream }) => {
				const selectedModel = getModelById(selectedChatModel);

				if (isNewChat) {
					(async () => {
						try {
							const generatedTitle =
								await generateTitleFromUserMessage({
									message,
								});
							await updateChatTitleById({
								chatId: id,
								title: generatedTitle,
							});
							dataStream.write({
								type: "data-chatTitle",
								data: generatedTitle,
								transient: true,
							});
						} catch (err) {
							console.warn(
								"Background title generation failed",
								err
							);
						}
					})();
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
					experimental_activeTools: getEnabledTools(selectedModel),
					experimental_transform: smoothStream({
						delayInMs: 2,
						chunking: "word",
					}),
					tools: {
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
							const providers = await tokenlensCatalogPromise;
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
				await Promise.all([
					saveMessages({
						messages: messages.map((currentMessage) => {
							const base = {
								id: currentMessage.id,
								role: currentMessage.role as
									| "user"
									| "assistant"
									| "system",
								parts: currentMessage.parts,
								createdAt: new Date(),
								attachments: [],
								chatId: id,
							};
							return base as any;
						}),
					}),
					(async () => {
						if (finalMergedUsage) {
							try {
								await updateChatLastContextById({
									chatId: id,
									context: finalMergedUsage,
								});
							} catch (err) {
								console.warn(
									"Unable to persist last usage for chat",
									id,
									err
								);
							}
						}
					})(),
				]);
			},
			onError: () => {
				return "Oops, an error occurred!";
			},
		});

		const streamContext = getStreamContext();

		if (streamContext) {
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

	const chatPromise = getChatById({ id });
	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError("unauthorized:chat").toResponse();
	}

	const chat = await chatPromise;

	if (chat?.userId !== session.user.id) {
		return new ChatSDKError("forbidden:chat").toResponse();
	}

	const deletedChat = await deleteChatById({ id });

	return Response.json(deletedChat, { status: 200 });
}
