import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { AppSession } from "@/lib/auth/session";
import { createContext } from "@/lib/data/base";
import { documentData } from "@/lib/data/document";
import { saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

type RequestSuggestionsProps = {
	session: AppSession;
	dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const requestSuggestions = ({
	session,
	dataStream,
}: RequestSuggestionsProps) =>
	tool({
		description:
			"Generate suggestions to improve the current document's content.",
		inputSchema: z.object({
			documentId: z
				.string()
				.describe("The ID of the document to request edits"),
		}),
		execute: async ({ documentId }) => {
			const ctx = createContext(session);
			const document = await documentData.get(documentId, ctx);

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
				system: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions for improvement. Ensure suggestions are complete sentences and clearly describe the change.",
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
				const suggestion: Omit<
					Suggestion,
					"userId" | "createdAt" | "documentCreatedAt"
				> = {
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

			// Only save suggestions to database for authenticated users
			// Guest users cannot persist suggestions (cache-only constraint)
			if (session.user?.id && !ctx.isGuest) {
				const userId = session.user.id;

				await saveSuggestions({
					suggestions: suggestions.map((suggestion) => ({
						...suggestion,
						userId,
						createdAt: new Date(),
						documentCreatedAt: document.createdAt,
					})),
				});
			}

			return {
				id: documentId,
				title: document.title,
				kind: document.kind,
				message: "Suggestions have been added to the document",
			};
		},
	});
