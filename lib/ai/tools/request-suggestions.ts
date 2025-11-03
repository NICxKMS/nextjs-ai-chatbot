import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { revalidateTag } from "next/cache";
import type { Session } from "next-auth";
import { z } from "zod";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

type RequestSuggestionsProps = {
	session: Session;
	dataStream: UIMessageStreamWriter<ChatMessage>;
};

const activeSuggestionRequests = new Map<string, Promise<unknown>>();

export const requestSuggestions = ({
	session,
	dataStream,
}: RequestSuggestionsProps) =>
	tool({
		description: "Request suggestions for a document",
		inputSchema: z.object({
			documentId: z
				.string()
				.describe("The ID of the document to request edits"),
		}),
		execute: ({ documentId }) => {
			const existingRequest = activeSuggestionRequests.get(documentId);
			if (existingRequest) {
				return existingRequest;
			}

			const execution = (async () => {
				const document = await getDocumentById({ id: documentId });

				if (!document || !document.content) {
					return {
						error: "Document not found",
					};
				}

				const suggestions: Omit<
					Suggestion,
					"userId" | "createdAt" | "documentCreatedAt"
				>[] = [];

				const { elementStream } = streamObject({
					model: myProvider.languageModel("artifact-model"),
					system: "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
					prompt: document.content,
					output: "array",
					schema: z.object({
						originalSentence: z
							.string()
							.describe("The original sentence"),
						suggestedSentence: z
							.string()
							.describe("The suggested sentence"),
						description: z
							.string()
							.describe("The description of the suggestion"),
					}),
				});

				for await (const element of elementStream) {
					// @ts-expect-error todo: fix type
					const suggestion: Suggestion = {
						originalText: element.originalSentence,
						suggestedText: element.suggestedSentence,
						description: element.description,
						id: generateUUID(),
						documentId,
						isResolved: false,
					};

					dataStream.write({
						type: "data-suggestion",
						data: suggestion,
						transient: true,
					});

					suggestions.push(suggestion);
				}

				if (session.user?.id && suggestions.length > 0) {
					const userId = session.user.id;

					await saveSuggestions({
						suggestions: suggestions.map((suggestion) => ({
							...suggestion,
							userId,
							createdAt: new Date(),
							documentCreatedAt: document.createdAt,
						})),
					});

					revalidateTag(`suggestions:document:${documentId}`, {
						expire: 0,
					});
				}

				return {
					id: documentId,
					title: document.title,
					kind: document.kind,
					message: "Suggestions have been added to the document",
				};
			})().finally(() => {
				activeSuggestionRequests.delete(documentId);
			});

			activeSuggestionRequests.set(documentId, execution);

			return execution;
		},
	});
