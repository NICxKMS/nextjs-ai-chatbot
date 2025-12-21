/**
 * Text Document Handler
 * Ref: oldapp/artifacts/text/server.ts
 *
 * Handles streaming text document generation and updates.
 */
import "server-only";

import { type LanguageModel, smoothStream, streamText } from "ai";

import { getOpenAI } from "@/lib/ai/providers";
import { createDocumentHandler } from "./base";

const TEXT_SYSTEM_PROMPT =
    "Write about the given topic. Markdown is supported. Use headings wherever appropriate.";

/**
 * Create update prompt for text documents
 */
function createUpdatePrompt(currentContent: string | null): string {
    return `Update the document below based on the user's request.
    
${currentContent}`;
}

/**
 * Text document handler for streaming text generation
 */
export const textDocumentHandler = createDocumentHandler<"text">({
    kind: "text",

    onCreateDocument: async ({ title, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamText({
            model: getOpenAI()("gpt-4o-mini") as unknown as LanguageModel,
            system: TEXT_SYSTEM_PROMPT,
            prompt: title,
            experimental_transform: smoothStream({ chunking: "word" }),
        });

        for await (const delta of fullStream) {
            if (delta.type === "text-delta") {
                const { text } = delta;
                draftContent += text;

                dataStream.write({
                    type: "data-textDelta",
                    data: text,
                });
            }
        }

        return draftContent;
    },

    onUpdateDocument: async ({ document, description, dataStream }) => {
        let draftContent = "";

        const { fullStream } = streamText({
            model: getOpenAI()("gpt-4o-mini") as unknown as LanguageModel,
            system: createUpdatePrompt(document.content),
            prompt: description,
            experimental_transform: smoothStream({ chunking: "word" }),
        });

        for await (const delta of fullStream) {
            if (delta.type === "text-delta") {
                const { text } = delta;
                draftContent += text;

                dataStream.write({
                    type: "data-textDelta",
                    data: text,
                });
            }
        }

        return draftContent;
    },
});
